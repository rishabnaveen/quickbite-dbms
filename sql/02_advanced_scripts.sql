-- =============================================================================
-- QuickBite DBMS Mini Project - Advanced SQL Implementation Scripts
-- Curriculum: PES University CSE DBMS (Dr. Nagasundari S / Prof. Vinay Joshi)
-- Team Members: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)
-- Target DBMS: MySQL 8.0 / MySQL Workbench
-- Rubric Coverage:
--   1. Advanced SQL Concepts: Procedures, Functions, Triggers, CTE (6 Marks)
--   2. Complex SQL Queries: Nested, Correlated, Recursive & Joins (4 Marks)
-- =============================================================================

USE quickbite_db;

-- #############################################################################
-- SECTION 1: ADVANCED TRIGGERS
-- #############################################################################

-- -----------------------------------------------------------------------------
-- TRIGGER 1: trg_audit_order_status_change
-- Purpose: Automatically inserts an immutable audit trail entry into ORDER_STATUS_LOG
--          whenever an order's status transitions (e.g., Placed -> Cooking -> Ready -> Delivered).
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_order_status_change;
DELIMITER //
CREATE TRIGGER trg_audit_order_status_change
AFTER UPDATE ON ORDER_TABLE
FOR EACH ROW
BEGIN
    IF OLD.Status <> NEW.Status THEN
        INSERT INTO ORDER_STATUS_LOG (Order_ID, Changed_At, Old_Status, New_Status)
        VALUES (NEW.Order_ID, NOW(), OLD.Status, NEW.Status);
    END IF;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 2: trg_validate_stock_and_deduct
-- Purpose: BEFORE an ORDER_ITEM is inserted, verifies that adequate stock exists.
--          If sufficient, automatically decrements the stock quantity in MENU_ITEM.
--          If insufficient, signals an exception to prevent overselling.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_validate_stock_and_deduct;
DELIMITER //
CREATE TRIGGER trg_validate_stock_and_deduct
BEFORE INSERT ON ORDER_ITEM
FOR EACH ROW
BEGIN
    DECLARE current_stock INT;
    
    SELECT Stock_Qty INTO current_stock
    FROM MENU_ITEM
    WHERE Item_ID = NEW.Item_ID;
    
    IF current_stock < NEW.Quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order rejected: Insufficient stock available for selected dish.';
    ELSE
        UPDATE MENU_ITEM
        SET Stock_Qty = Stock_Qty - NEW.Quantity
        WHERE Item_ID = NEW.Item_ID;
    END IF;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 3: trg_cancel_order_refund_and_restock
-- Purpose: When an order is updated to 'Cancelled', this trigger automatically:
--          1. Restores the dish inventory stock quantities back to MENU_ITEM.
--          2. Refunds the debited amount to the student's Wallet_Balance.
--          3. Logs a 'Refund' transaction in WALLET_TRANSACTION.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_cancel_order_refund_and_restock;
DELIMITER //
CREATE TRIGGER trg_cancel_order_refund_and_restock
AFTER UPDATE ON ORDER_TABLE
FOR EACH ROW
BEGIN
    IF OLD.Status <> 'Cancelled' AND NEW.Status = 'Cancelled' THEN
        -- 1. Restock inventory for all items in the cancelled order
        UPDATE MENU_ITEM m
        JOIN ORDER_ITEM oi ON m.Item_ID = oi.Item_ID
        SET m.Stock_Qty = m.Stock_Qty + oi.Quantity
        WHERE oi.Order_ID = NEW.Order_ID;
        
        -- 2. Refund student wallet balance
        UPDATE USER_TABLE
        SET Wallet_Balance = Wallet_Balance + NEW.Total_Amount
        WHERE User_ID = NEW.Student_ID;
        
        -- 3. Record audit refund transaction
        INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID, Created_At)
        VALUES (
            CONCAT('TXN-REF-', SUBSTRING(NEW.Order_ID, 4), '-', FLOOR(RAND() * 900 + 100)),
            NEW.Student_ID,
            NEW.Total_Amount,
            'Refund',
            CONCAT('Automated refund for cancelled order ', NEW.Order_ID),
            NEW.Order_ID,
            NOW()
        );
    END IF;
END//
DELIMITER ;


-- #############################################################################
-- SECTION 2: STORED PROCEDURES & USER-DEFINED FUNCTIONS
-- #############################################################################

-- -----------------------------------------------------------------------------
-- FUNCTION 1: fn_GetCustomerLifetimeSpend
-- Purpose: Calculates and returns the aggregate amount spent by a specific student
--          on completed (Delivered) orders.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_GetCustomerLifetimeSpend;
DELIMITER //
CREATE FUNCTION fn_GetCustomerLifetimeSpend(p_student_id VARCHAR(20))
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_spend DECIMAL(10,2);
    
    SELECT COALESCE(SUM(Total_Amount), 0.00) INTO total_spend
    FROM ORDER_TABLE
    WHERE Student_ID = p_student_id AND Status = 'Delivered';
    
    RETURN total_spend;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- FUNCTION 2: fn_CheckWalletAffordability
-- Purpose: Returns TRUE (1) if a student's current wallet balance is >= order amount,
--          otherwise returns FALSE (0).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_CheckWalletAffordability;
DELIMITER //
CREATE FUNCTION fn_CheckWalletAffordability(p_user_id VARCHAR(20), p_amount DECIMAL(10,2))
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_balance DECIMAL(10,2);
    
    SELECT Wallet_Balance INTO v_balance
    FROM USER_TABLE
    WHERE User_ID = p_user_id;
    
    IF v_balance IS NOT NULL AND v_balance >= p_amount THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- STORED PROCEDURE 1: sp_PlaceOrderAtomic
-- Purpose: Atomically handles an entire cafeteria order transaction:
--          1. Verifies student wallet balance.
--          2. Deducts wallet balance and creates WALLET_TRANSACTION.
--          3. Inserts into ORDER_TABLE.
--          4. Inserts into ORDER_ITEM (which triggers inventory deduction via trg_validate_stock_and_deduct).
--          5. Commits if successful, rolls back on any constraint failure.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PlaceOrderAtomic;
DELIMITER //
CREATE PROCEDURE sp_PlaceOrderAtomic(
    IN p_order_id VARCHAR(20),
    IN p_student_id VARCHAR(20),
    IN p_stall_id VARCHAR(20),
    IN p_item_id VARCHAR(20),
    IN p_quantity INT,
    IN p_instructions TEXT,
    OUT p_status_code VARCHAR(50),
    OUT p_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_item_price DECIMAL(10,2);
    DECLARE v_item_stock INT;
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_user_balance DECIMAL(10,2);
    DECLARE v_txn_id VARCHAR(20);
    
    -- Error Handler for transaction rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'TRANSACTION_FAILED';
        SET p_message = 'Transaction aborted due to internal database constraint violation.';
    END;

    START TRANSACTION;

    -- Step A: Validate Menu Item & Price
    SELECT Price, Stock_Qty INTO v_item_price, v_item_stock
    FROM MENU_ITEM
    WHERE Item_ID = p_item_id AND Stall_ID = p_stall_id;

    IF v_item_price IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'ITEM_NOT_FOUND';
        SET p_message = 'Selected menu item does not exist or does not belong to the specified stall.';
        LEAVE proc_label;
    END IF;

    IF v_item_stock < p_quantity THEN
        ROLLBACK;
        SET p_status_code = 'INSUFFICIENT_STOCK';
        SET p_message = CONCAT('Not enough stock available. Requested: ', p_quantity, ', Available: ', v_item_stock);
        LEAVE proc_label;
    END IF;

    -- Step B: Calculate Total & Verify Wallet Balance
    SET v_total_amount = v_item_price * p_quantity;

    SELECT Wallet_Balance INTO v_user_balance
    FROM USER_TABLE
    WHERE User_ID = p_student_id FOR UPDATE;

    IF v_user_balance < v_total_amount THEN
        ROLLBACK;
        SET p_status_code = 'INSUFFICIENT_FUNDS';
        SET p_message = CONCAT('Insufficient wallet balance. Required: Rs.', v_total_amount, ', Available: Rs.', v_user_balance);
        LEAVE proc_label;
    END IF;

    -- Step C: Deduct Wallet Balance
    UPDATE USER_TABLE
    SET Wallet_Balance = Wallet_Balance - v_total_amount
    WHERE User_ID = p_student_id;

    -- Step D: Insert Order Record
    INSERT INTO ORDER_TABLE (Order_ID, Student_ID, Stall_ID, Total_Amount, Status, Instructions, Created_At)
    VALUES (p_order_id, p_student_id, p_stall_id, v_total_amount, 'Placed', p_instructions, NOW());

    -- Step E: Insert Order Line Item (invokes trg_validate_stock_and_deduct)
    INSERT INTO ORDER_ITEM (Order_ID, Item_ID, Quantity, Unit_Price)
    VALUES (p_order_id, p_item_id, p_quantity, v_item_price);

    -- Step F: Insert Debit Wallet Transaction
    SET v_txn_id = CONCAT('TXN-', SUBSTRING(MD5(UUID()), 1, 8));
    INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID, Created_At)
    VALUES (v_txn_id, p_student_id, -v_total_amount, 'Order_Payment', CONCAT('QuickBite payment for order ', p_order_id), p_order_id, NOW());

    COMMIT;
    SET p_status_code = 'SUCCESS';
    SET p_message = CONCAT('Order ', p_order_id, ' successfully placed. Debited Rs. ', v_total_amount);
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- STORED PROCEDURE 2: sp_UpdateOrderStatus
-- Purpose: Safely updates order status with validation and triggers audit logging.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateOrderStatus;
DELIMITER //
CREATE PROCEDURE sp_UpdateOrderStatus(
    IN p_order_id VARCHAR(20),
    IN p_new_status VARCHAR(20),
    OUT p_result VARCHAR(100)
)
BEGIN
    IF p_new_status NOT IN ('Placed', 'Cooking', 'Ready', 'Delivered', 'Cancelled') THEN
        SET p_result = 'INVALID_STATUS: Allowed statuses are Placed, Cooking, Ready, Delivered, Cancelled';
    ELSE
        UPDATE ORDER_TABLE
        SET Status = p_new_status
        WHERE Order_ID = p_order_id;
        
        SET p_result = CONCAT('SUCCESS: Order ', p_order_id, ' status updated to ', p_new_status);
    END IF;
END//
DELIMITER ;


-- #############################################################################
-- SECTION 3: COMPLEX SQL QUERIES (RECURSIVE, CORRELATED, CTE, ADVANCED JOINS)
-- #############################################################################

-- -----------------------------------------------------------------------------
-- QUERY 1: Recursive CTE (WITH RECURSIVE)
-- Purpose: Models an Order Workflow State Machine graph.
--          Traverses valid order lifecycle progressions starting from 'Placed'
--          to compute path length and lifecycle stages.
-- -----------------------------------------------------------------------------
WITH RECURSIVE OrderWorkflowGraph AS (
    -- Anchor member: Initial stage of an order
    SELECT 
        'Placed' AS current_state,
        'Cooking' AS next_state,
        1 AS step_level,
        CAST('Placed -> Cooking' AS CHAR(255)) AS workflow_path
    
    UNION ALL
    
    -- Recursive member: Traverse through sequential transitions
    SELECT 
        w.next_state,
        CASE 
            WHEN w.next_state = 'Cooking' THEN 'Ready'
            WHEN w.next_state = 'Ready' THEN 'Delivered'
            ELSE 'Completed'
        END AS next_state,
        w.step_level + 1,
        CAST(CONCAT(w.workflow_path, ' -> ', 
            CASE 
                WHEN w.next_state = 'Cooking' THEN 'Ready'
                WHEN w.next_state = 'Ready' THEN 'Delivered'
                ELSE 'Completed'
            END) AS CHAR(255))
    FROM OrderWorkflowGraph w
    WHERE w.next_state NOT IN ('Delivered', 'Completed')
)
SELECT step_level, current_state, next_state, workflow_path
FROM OrderWorkflowGraph;

-- -----------------------------------------------------------------------------
-- QUERY 2: Non-Recursive CTE for Multi-Tier Sales Analytics
-- Purpose: 2-stage Common Table Expression calculating stall metrics, ranking
--          stall performances, and categorizing into revenue tiers.
-- -----------------------------------------------------------------------------
WITH StallRevenueSummary AS (
    SELECT 
        s.Stall_ID,
        s.Name AS Stall_Name,
        COUNT(DISTINCT o.Order_ID) AS Total_Orders,
        COALESCE(SUM(o.Total_Amount), 0.00) AS Gross_Revenue,
        COALESCE(AVG(o.Total_Amount), 0.00) AS Avg_Order_Value
    FROM STALL s
    LEFT JOIN ORDER_TABLE o ON s.Stall_ID = o.Stall_ID AND o.Status != 'Cancelled'
    GROUP BY s.Stall_ID, s.Name
),
StallRankings AS (
    SELECT 
        Stall_ID,
        Stall_Name,
        Total_Orders,
        Gross_Revenue,
        Avg_Order_Value,
        DENSE_RANK() OVER (ORDER BY Gross_Revenue DESC) AS Revenue_Rank
    FROM StallRevenueSummary
)
SELECT 
    Revenue_Rank,
    Stall_Name,
    Total_Orders,
    Gross_Revenue,
    ROUND(Avg_Order_Value, 2) AS Avg_Order_Ticket,
    CASE 
        WHEN Gross_Revenue >= 200.00 THEN 'Tier-1 High Volume'
        WHEN Gross_Revenue > 0.00 THEN 'Tier-2 Moderate'
        ELSE 'Tier-3 Dormant'
    END AS Performance_Category
FROM StallRankings
ORDER BY Revenue_Rank;

-- -----------------------------------------------------------------------------
-- QUERY 3: Correlated Subquery
-- Purpose: Identifies dishes that are priced strictly higher than the average price
--          of dishes *within their own stall* (Premium counter offerings).
-- -----------------------------------------------------------------------------
SELECT 
    m1.Item_ID,
    m1.Name AS Dish_Name,
    m1.Price AS Dish_Price,
    s.Name AS Stall_Name,
    ROUND((SELECT AVG(m2.Price) 
           FROM MENU_ITEM m2 
           WHERE m2.Stall_ID = m1.Stall_ID), 2) AS Stall_Avg_Price,
    ROUND(m1.Price - (SELECT AVG(m2.Price) 
                      FROM MENU_ITEM m2 
                      WHERE m2.Stall_ID = m1.Stall_ID), 2) AS Price_Delta_Above_Avg
FROM MENU_ITEM m1
JOIN STALL s ON m1.Stall_ID = s.Stall_ID
WHERE m1.Price > (
    SELECT AVG(m2.Price)
    FROM MENU_ITEM m2
    WHERE m2.Stall_ID = m1.Stall_ID
)
ORDER BY Price_Delta_Above_Avg DESC;

-- -----------------------------------------------------------------------------
-- QUERY 4: Nested Subquery with NOT EXISTS (Relational Division)
-- Purpose: Finds loyal active students who have ordered from ALL available food stalls.
-- -----------------------------------------------------------------------------
SELECT 
    u.User_ID,
    CONCAT(u.First_Name, ' ', u.Last_Name) AS Student_Name,
    u.Email,
    u.Wallet_Balance
FROM USER_TABLE u
WHERE u.Role = 'Student'
  AND NOT EXISTS (
      -- All stalls that exist
      SELECT s.Stall_ID 
      FROM STALL s
      WHERE s.Is_Active = TRUE
        AND NOT EXISTS (
            -- Stalls this student has placed an order with
            SELECT o.Order_ID
            FROM ORDER_TABLE o
            WHERE o.Student_ID = u.User_ID
              AND o.Stall_ID = s.Stall_ID
        )
  );

-- -----------------------------------------------------------------------------
-- QUERY 5: Multi-Table 5-Way Join with Aggregation
-- Purpose: Produces comprehensive accounting ledger joining Students, Stalls,
--          Orders, Order Line Items, and Menu Items.
-- -----------------------------------------------------------------------------
SELECT 
    o.Order_ID,
    CONCAT(u.First_Name, ' ', u.Last_Name) AS Customer_Name,
    s.Name AS Stall_Name,
    COUNT(oi.Item_ID) AS Total_Unique_Items,
    SUM(oi.Quantity) AS Total_Quantity_Items,
    o.Total_Amount AS Final_Bill,
    o.Status AS Order_Status,
    o.Created_At AS Order_Time
FROM ORDER_TABLE o
INNER JOIN USER_TABLE u ON o.Student_ID = u.User_ID
INNER JOIN STALL s ON o.Stall_ID = s.Stall_ID
INNER JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
INNER JOIN MENU_ITEM m ON oi.Item_ID = m.Item_ID
GROUP BY o.Order_ID, u.First_Name, u.Last_Name, s.Name, o.Total_Amount, o.Status, o.Created_At
ORDER BY o.Created_At DESC;
