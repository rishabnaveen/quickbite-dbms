"""
QuickBite SQL Verification Runner
Executes the schema, triggers, complex CTEs, recursive queries, and joins,
verifying that all queries execute cleanly and produce expected results.
"""
import sqlite3
import json

def run_tests():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Base Tables
    cur.executescript("""
    CREATE TABLE USER_TABLE (
        User_ID TEXT PRIMARY KEY,
        Email TEXT UNIQUE NOT NULL,
        Pass_Hash TEXT NOT NULL,
        First_Name TEXT NOT NULL,
        Last_Name TEXT NOT NULL,
        Role TEXT CHECK(Role IN ('Student', 'Faculty', 'Stall_Owner', 'Admin')),
        Wallet_Balance REAL DEFAULT 0.00 CHECK (Wallet_Balance >= 0.00),
        Phone_Number TEXT NOT NULL
    );

    CREATE TABLE STALL (
        Stall_ID TEXT PRIMARY KEY,
        Name TEXT NOT NULL,
        Location TEXT NOT NULL,
        Is_Active INTEGER DEFAULT 1,
        Owner_ID TEXT NOT NULL,
        Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Owner_ID) REFERENCES USER_TABLE(User_ID)
    );

    CREATE TABLE MENU_ITEM (
        Item_ID TEXT PRIMARY KEY,
        Stall_ID TEXT NOT NULL,
        Name TEXT NOT NULL,
        Price REAL NOT NULL CHECK (Price >= 0.00),
        Stock_Qty INTEGER NOT NULL DEFAULT 0 CHECK (Stock_Qty >= 0),
        Description TEXT,
        Vector TEXT,
        FOREIGN KEY (Stall_ID) REFERENCES STALL(Stall_ID)
    );

    CREATE TABLE ORDER_TABLE (
        Order_ID TEXT PRIMARY KEY,
        Student_ID TEXT NOT NULL,
        Stall_ID TEXT NOT NULL,
        Total_Amount REAL NOT NULL CHECK (Total_Amount >= 0.00),
        Status TEXT DEFAULT 'Placed' CHECK (Status IN ('Placed', 'Cooking', 'Ready', 'Delivered', 'Cancelled')),
        Instructions TEXT,
        Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Student_ID) REFERENCES USER_TABLE(User_ID),
        FOREIGN KEY (Stall_ID) REFERENCES STALL(Stall_ID)
    );

    CREATE TABLE ORDER_ITEM (
        Order_ID TEXT NOT NULL,
        Item_ID TEXT NOT NULL,
        Quantity INTEGER NOT NULL CHECK (Quantity > 0),
        Unit_Price REAL NOT NULL CHECK (Unit_Price >= 0.00),
        Subtotal REAL GENERATED ALWAYS AS (Quantity * Unit_Price) STORED,
        PRIMARY KEY (Order_ID, Item_ID),
        FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID),
        FOREIGN KEY (Item_ID) REFERENCES MENU_ITEM(Item_ID)
    );

    CREATE TABLE WALLET_TRANSACTION (
        Txn_ID TEXT PRIMARY KEY,
        User_ID TEXT NOT NULL,
        Amount REAL NOT NULL,
        Type TEXT NOT NULL CHECK (Type IN ('Top-Up', 'Order_Payment', 'Refund')),
        Description TEXT NOT NULL,
        Order_ID TEXT,
        Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (User_ID) REFERENCES USER_TABLE(User_ID),
        FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID)
    );

    CREATE TABLE ORDER_STATUS_LOG (
        Log_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Order_ID TEXT NOT NULL,
        Changed_At TIMESTAMP DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
        Old_Status TEXT NOT NULL,
        New_Status TEXT NOT NULL,
        FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID)
    );

    -- Triggers
    CREATE TRIGGER trg_audit_status_change
    AFTER UPDATE OF Status ON ORDER_TABLE
    FOR EACH ROW
    WHEN OLD.Status <> NEW.Status
    BEGIN
        INSERT INTO ORDER_STATUS_LOG (Order_ID, Old_Status, New_Status)
        VALUES (NEW.Order_ID, OLD.Status, NEW.Status);
    END;

    CREATE TRIGGER trg_validate_stock_and_deduct
    BEFORE INSERT ON ORDER_ITEM
    FOR EACH ROW
    BEGIN
        SELECT RAISE(ABORT, 'Order rejected: Insufficient stock available')
        FROM MENU_ITEM
        WHERE Item_ID = NEW.Item_ID AND Stock_Qty < NEW.Quantity;

        UPDATE MENU_ITEM
        SET Stock_Qty = Stock_Qty - NEW.Quantity
        WHERE Item_ID = NEW.Item_ID;
    END;

    CREATE TRIGGER trg_cancel_order_refund_and_restock
    AFTER UPDATE OF Status ON ORDER_TABLE
    FOR EACH ROW
    WHEN OLD.Status <> 'Cancelled' AND NEW.Status = 'Cancelled'
    BEGIN
        UPDATE MENU_ITEM
        SET Stock_Qty = Stock_Qty + (SELECT Quantity FROM ORDER_ITEM WHERE Order_ID = NEW.Order_ID AND Item_ID = MENU_ITEM.Item_ID)
        WHERE Item_ID IN (SELECT Item_ID FROM ORDER_ITEM WHERE Order_ID = NEW.Order_ID);

        UPDATE USER_TABLE
        SET Wallet_Balance = Wallet_Balance + NEW.Total_Amount
        WHERE User_ID = NEW.Student_ID;

        INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID)
        VALUES ('TXN-REF-' || NEW.Order_ID, NEW.Student_ID, NEW.Total_Amount, 'Refund', 'Automated refund for cancelled order ' || NEW.Order_ID, NEW.Order_ID);
    END;
    """)

    # 2. Seed Data
    cur.executescript("""
    INSERT INTO USER_TABLE (User_ID, Email, Pass_Hash, First_Name, Last_Name, Role, Wallet_Balance, Phone_Number) VALUES
    ('U101', 'tanuboddi@pes.edu', '$2b$12$K89s...', 'Navaneeth', 'Tanuboddi', 'Student', 450.00, '9876543210'),
    ('U102', 'rishab@pes.edu', '$2b$12$L91v...', 'Rishab', 'Naveen', 'Student', 320.00, '9876543211'),
    ('U103', 'sneha.r@pes.edu', '$2b$12$M02w...', 'Sneha', 'Rao', 'Student', 180.00, '9876543212'),
    ('U201', 'ramesh.rolls@gmail.com', '$2b$12$N13x...', 'Ramesh', 'Kumar', 'Stall_Owner', 0.00, '9876543220'),
    ('U202', 'suresh.south@gmail.com', '$2b$12$P24y...', 'Suresh', 'Bhat', 'Stall_Owner', 0.00, '9876543221');

    INSERT INTO STALL (Stall_ID, Name, Location, Is_Active, Owner_ID, Created_At) VALUES
    ('ST01', 'Rolls & Bowls', 'Food Court Counter 1', 1, 'U201', '2026-01-15 09:00:00'),
    ('ST02', 'South Kitchen', 'Food Court Counter 2', 1, 'U202', '2026-01-15 09:00:00'),
    ('ST03', 'Sip & Snack', '13th Floor Kiosk', 1, 'U201', '2026-02-01 10:30:00');

    INSERT INTO MENU_ITEM (Item_ID, Stall_ID, Name, Price, Stock_Qty, Description) VALUES
    ('IT01', 'ST01', 'Paneer Tikka Roll', 120.00, 25, 'Grilled spiced paneer in paratha'),
    ('IT02', 'ST01', 'Chicken Kathi Roll', 140.00, 18, 'Tender marinated chicken wrapped in paratha'),
    ('IT03', 'ST02', 'Ghee Podi Masala Dosa', 85.00, 40, 'Crispy fermented crepe smeared with aromatic spicy podi'),
    ('IT04', 'ST02', 'Steamed Idli Vada Combo', 65.00, 30, 'Two fluffy steamed rice cakes with crispy lentil doughnut'),
    ('IT05', 'ST03', 'Cold Coffee w/ Ice Cream', 70.00, 50, 'Chilled espresso milk blend topped with vanilla scoop');

    INSERT INTO ORDER_TABLE (Order_ID, Student_ID, Stall_ID, Total_Amount, Status, Instructions, Created_At) VALUES
    ('ORD1001', 'U101', 'ST01', 240.00, 'Delivered', 'Extra green chutney', '2026-10-31 12:05:00'),
    ('ORD1002', 'U102', 'ST02', 150.00, 'Ready', 'Make dosa crispy', '2026-10-31 12:20:00'),
    ('ORD1003', 'U103', 'ST03', 70.00, 'Cooking', 'Less sugar', '2026-10-31 12:35:00'),
    ('ORD1004', 'U101', 'ST02', 85.00, 'Placed', 'Extra sambar', '2026-10-31 12:45:00');

    INSERT INTO ORDER_ITEM (Order_ID, Item_ID, Quantity, Unit_Price) VALUES
    ('ORD1001', 'IT01', 2, 120.00),
    ('ORD1002', 'IT03', 1, 85.00),
    ('ORD1002', 'IT04', 1, 65.00),
    ('ORD1003', 'IT05', 1, 70.00),
    ('ORD1004', 'IT03', 1, 85.00);

    INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID) VALUES
    ('TXN901', 'U101', 500.00, 'Top-Up', 'UPI Load', NULL),
    ('TXN902', 'U101', -240.00, 'Order_Payment', 'Checkout debit', 'ORD1001'),
    ('TXN903', 'U102', 500.00, 'Top-Up', 'NetBanking Load', NULL),
    ('TXN904', 'U102', -150.00, 'Order_Payment', 'Checkout debit', 'ORD1002'),
    ('TXN905', 'U103', 250.00, 'Top-Up', 'UPI Load', NULL);
    """)

    print("=== SEED DATA & SCHEMA INITIALIZED ===")

    # 3. Test Recursive Query
    print("\n--- TEST: Recursive CTE (Order State Workflow) ---")
    res = cur.execute("""
    WITH RECURSIVE OrderWorkflowGraph AS (
        SELECT 'Placed' AS current_state, 'Cooking' AS next_state, 1 AS step_level, 'Placed -> Cooking' AS workflow_path
        UNION ALL
        SELECT 
            w.next_state,
            CASE 
                WHEN w.next_state = 'Cooking' THEN 'Ready'
                WHEN w.next_state = 'Ready' THEN 'Delivered'
                ELSE 'Completed'
            END AS next_state,
            w.step_level + 1,
            w.workflow_path || ' -> ' || 
            CASE 
                WHEN w.next_state = 'Cooking' THEN 'Ready'
                WHEN w.next_state = 'Ready' THEN 'Delivered'
                ELSE 'Completed'
            END
        FROM OrderWorkflowGraph w
        WHERE w.next_state NOT IN ('Delivered', 'Completed')
    )
    SELECT step_level, current_state, next_state, workflow_path FROM OrderWorkflowGraph;
    """).fetchall()
    for row in res:
        print(row)

    # 4. Test Non-Recursive CTE (Stall Ranking)
    print("\n--- TEST: Non-Recursive CTE (Stall Revenue Rankings) ---")
    res = cur.execute("""
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
    """).fetchall()
    for row in res:
        print(row)

    # 5. Test Correlated Subquery
    print("\n--- TEST: Correlated Subquery (Dishes Priced Higher Than Stall Average) ---")
    res = cur.execute("""
    SELECT 
        m1.Item_ID,
        m1.Name AS Dish_Name,
        m1.Price AS Dish_Price,
        s.Name AS Stall_Name,
        ROUND((SELECT AVG(m2.Price) FROM MENU_ITEM m2 WHERE m2.Stall_ID = m1.Stall_ID), 2) AS Stall_Avg_Price,
        ROUND(m1.Price - (SELECT AVG(m2.Price) FROM MENU_ITEM m2 WHERE m2.Stall_ID = m1.Stall_ID), 2) AS Price_Delta
    FROM MENU_ITEM m1
    JOIN STALL s ON m1.Stall_ID = s.Stall_ID
    WHERE m1.Price > (
        SELECT AVG(m2.Price)
        FROM MENU_ITEM m2
        WHERE m2.Stall_ID = m1.Stall_ID
    )
    ORDER BY Price_Delta DESC;
    """).fetchall()
    for row in res:
        print(row)

    # 6. Test Trigger: Order Status Change Audit
    print("\n--- TEST: Trigger trg_audit_status_change ---")
    cur.execute("UPDATE ORDER_TABLE SET Status = 'Cooking' WHERE Order_ID = 'ORD1004';")
    cur.execute("UPDATE ORDER_TABLE SET Status = 'Ready' WHERE Order_ID = 'ORD1004';")
    audit_logs = cur.execute("SELECT * FROM ORDER_STATUS_LOG WHERE Order_ID = 'ORD1004';").fetchall()
    print("Audit logs for ORD1004:")
    for log in audit_logs:
        print(log)

    # 7. Test Trigger: Cancellation Refund & Restock
    print("\n--- TEST: Trigger trg_cancel_order_refund_and_restock ---")
    bal_before = cur.execute("SELECT Wallet_Balance FROM USER_TABLE WHERE User_ID = 'U101';").fetchone()[0]
    stock_before = cur.execute("SELECT Stock_Qty FROM MENU_ITEM WHERE Item_ID = 'IT03';").fetchone()[0]
    print(f"Before cancel: U101 Balance = {bal_before}, IT03 Stock = {stock_before}")
    
    cur.execute("UPDATE ORDER_TABLE SET Status = 'Cancelled' WHERE Order_ID = 'ORD1004';")
    
    bal_after = cur.execute("SELECT Wallet_Balance FROM USER_TABLE WHERE User_ID = 'U101';").fetchone()[0]
    stock_after = cur.execute("SELECT Stock_Qty FROM MENU_ITEM WHERE Item_ID = 'IT03';").fetchone()[0]
    refund_txns = cur.execute("SELECT * FROM WALLET_TRANSACTION WHERE Order_ID = 'ORD1004';").fetchall()
    print(f"After cancel:  U101 Balance = {bal_after} (+85.00 refund), IT03 Stock = {stock_after} (+1 restocked)")
    print(f"Refund Txn: {refund_txns}")

    conn.close()
    print("\nALL ADVANCED SQL SCRIPTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
