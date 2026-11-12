-- =============================================================================
-- QuickBite DBMS Mini Project - Complete Database Setup Script
-- Curriculum: PES University CSE DBMS (Dr. Nagasundari S)
-- Team: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)
-- Target DBMS: MySQL 8.0 / MySQL Workbench
-- =============================================================================

CREATE DATABASE IF NOT EXISTS quickbite_db;
USE quickbite_db;

-- -----------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES (In Reverse Dependency Order)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS ORDER_STATUS_LOG;
DROP TABLE IF EXISTS ORDER_ITEM;
DROP TABLE IF EXISTS ITEM_DIETARY_TAGS;
DROP TABLE IF EXISTS WALLET_TRANSACTION;
DROP TABLE IF EXISTS ORDER_TABLE;
DROP TABLE IF EXISTS MENU_ITEM;
DROP TABLE IF EXISTS STALL;
DROP TABLE IF EXISTS USER_TABLE;

-- -----------------------------------------------------------------------------
-- 2. CREATE TABLES (In Forward Dependency Order)
-- -----------------------------------------------------------------------------

-- Table 1: USER_TABLE (Strong Entity)
CREATE TABLE USER_TABLE (
    User_ID VARCHAR(20) PRIMARY KEY,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Pass_Hash VARCHAR(255) NOT NULL,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('Student', 'Faculty', 'Stall_Owner', 'Admin')),
    Wallet_Balance DECIMAL(10,2) DEFAULT 0.00 CHECK (Wallet_Balance >= 0.00),
    Phone_Number VARCHAR(15) NOT NULL
);

-- Table 2: STALL (Strong Entity, references USER_TABLE)
CREATE TABLE STALL (
    Stall_ID VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(150) NOT NULL,
    Is_Active BOOLEAN DEFAULT TRUE,
    Owner_ID VARCHAR(20) NOT NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Owner_ID) REFERENCES USER_TABLE(User_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table 3: MENU_ITEM (Strong Entity, references STALL)
CREATE TABLE MENU_ITEM (
    Item_ID VARCHAR(20) PRIMARY KEY,
    Stall_ID VARCHAR(20) NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0.00),
    Stock_Qty INT NOT NULL DEFAULT 0 CHECK (Stock_Qty >= 0),
    Description TEXT,
    Vector TEXT, -- Stores 384-dimensional dense semantic embedding for dish recommendation
    FOREIGN KEY (Stall_ID) REFERENCES STALL(Stall_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table 4: ORDER_TABLE (Strong Entity, references USER_TABLE and STALL)
CREATE TABLE ORDER_TABLE (
    Order_ID VARCHAR(20) PRIMARY KEY,
    Student_ID VARCHAR(20) NOT NULL,
    Stall_ID VARCHAR(20) NOT NULL,
    Total_Amount DECIMAL(10,2) NOT NULL CHECK (Total_Amount >= 0.00),
    Status VARCHAR(20) DEFAULT 'Placed' CHECK (Status IN ('Placed', 'Cooking', 'Ready', 'Delivered', 'Cancelled')),
    Instructions TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Student_ID) REFERENCES USER_TABLE(User_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (Stall_ID) REFERENCES STALL(Stall_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table 5: ORDER_ITEM (Weak Entity, Identifying parent: ORDER_TABLE, references MENU_ITEM)
CREATE TABLE ORDER_ITEM (
    Order_ID VARCHAR(20) NOT NULL,
    Item_ID VARCHAR(20) NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    Unit_Price DECIMAL(10,2) NOT NULL CHECK (Unit_Price >= 0.00),
    Subtotal DECIMAL(10,2) GENERATED ALWAYS AS (Quantity * Unit_Price) STORED,
    PRIMARY KEY (Order_ID, Item_ID),
    FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES MENU_ITEM(Item_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table 6: WALLET_TRANSACTION (Strong Entity, references USER_TABLE and ORDER_TABLE)
CREATE TABLE WALLET_TRANSACTION (
    Txn_ID VARCHAR(20) PRIMARY KEY,
    User_ID VARCHAR(20) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Type VARCHAR(30) NOT NULL CHECK (Type IN ('Top-Up', 'Order_Payment', 'Refund')),
    Description VARCHAR(255) NOT NULL,
    Order_ID VARCHAR(20) NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES USER_TABLE(User_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Table 7: ITEM_DIETARY_TAGS (Decomposed Multivalued Attribute)
CREATE TABLE ITEM_DIETARY_TAGS (
    Item_ID VARCHAR(20) NOT NULL,
    Dietary_Tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (Item_ID, Dietary_Tag),
    FOREIGN KEY (Item_ID) REFERENCES MENU_ITEM(Item_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table 8: ORDER_STATUS_LOG (Weak Entity, Identifying parent: ORDER_TABLE)
CREATE TABLE ORDER_STATUS_LOG (
    Order_ID VARCHAR(20) NOT NULL,
    Changed_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Old_Status VARCHAR(20) NOT NULL,
    New_Status VARCHAR(20) NOT NULL,
    PRIMARY KEY (Order_ID, Changed_At),
    FOREIGN KEY (Order_ID) REFERENCES ORDER_TABLE(Order_ID) ON DELETE CASCADE ON UPDATE CASCADE
);


-- -----------------------------------------------------------------------------
-- 3. INSERT DUMMY DATA (Values matching PDF Section 8)
-- -----------------------------------------------------------------------------

-- 3.1 Users
INSERT INTO USER_TABLE (User_ID, Email, Pass_Hash, First_Name, Last_Name, Role, Wallet_Balance, Phone_Number) VALUES
('U101', 'tanuboddi@pes.edu', '$2b$12$K89sJ9xR.8qN...', 'Navaneeth', 'Tanuboddi', 'Student', 450.00, '9876543210'),
('U102', 'rishab@pes.edu', '$2b$12$L91vM2kP.1aQ...', 'Rishab', 'Naveen', 'Student', 320.00, '9876543211'),
('U103', 'sneha.r@pes.edu', '$2b$12$M02wN3lQ.2bR...', 'Sneha', 'Rao', 'Student', 180.00, '9876543212'),
('U201', 'ramesh.rolls@gmail.com', '$2b$12$N13xO4mR.3cS...', 'Ramesh', 'Kumar', 'Stall_Owner', 0.00, '9876543220'),
('U202', 'suresh.south@gmail.com', '$2b$12$P24yP5nS.4dT...', 'Suresh', 'Bhat', 'Stall_Owner', 0.00, '9876543221');

-- 3.2 Stalls
INSERT INTO STALL (Stall_ID, Name, Location, Is_Active, Owner_ID, Created_At) VALUES
('ST01', 'Rolls & Bowls', 'Food Court Counter 1', TRUE, 'U201', '2026-01-15 09:00:00'),
('ST02', 'South Kitchen', 'Food Court Counter 2', TRUE, 'U202', '2026-01-15 09:00:00'),
('ST03', 'Sip & Snack', '13th Floor Kiosk', TRUE, 'U201', '2026-02-01 10:30:00');

-- 3.3 Menu Items
INSERT INTO MENU_ITEM (Item_ID, Stall_ID, Name, Price, Stock_Qty, Description, Vector) VALUES
('IT01', 'ST01', 'Paneer Tikka Roll', 120.00, 25, 'Grilled spiced paneer with mint chutney in paratha', '[0.024, -0.512, 0.188]'),
('IT02', 'ST01', 'Chicken Kathi Roll', 140.00, 18, 'Tender marinated chicken wrapped in layered paratha', '[0.115, 0.389, -0.042]'),
('IT03', 'ST02', 'Ghee Podi Masala Dosa', 85.00, 40, 'Crispy fermented crepe smeared with aromatic spicy podi', '[-0.201, 0.441, 0.095]'),
('IT04', 'ST02', 'Steamed Idli Vada Combo', 65.00, 30, 'Two fluffy steamed rice cakes with crispy lentil doughnut', '[-0.145, 0.288, -0.311]'),
('IT05', 'ST03', 'Cold Coffee w/ Ice Cream', 70.00, 50, 'Chilled espresso milk blend topped with vanilla scoop', '[0.089, -0.198, 0.254]');

-- 3.4 Dietary Tags
INSERT INTO ITEM_DIETARY_TAGS (Item_ID, Dietary_Tag) VALUES
('IT01', 'Vegetarian'),
('IT01', 'High-Protein'),
('IT02', 'Non-Veg'),
('IT02', 'High-Protein'),
('IT03', 'Vegetarian'),
('IT04', 'Vegan'),
('IT05', 'Beverage');

-- 3.5 Orders
INSERT INTO ORDER_TABLE (Order_ID, Student_ID, Stall_ID, Total_Amount, Status, Instructions, Created_At) VALUES
('ORD1001', 'U101', 'ST01', 240.00, 'Delivered', 'Extra green chutney, less onions', '2026-10-31 12:05:00'),
('ORD1002', 'U102', 'ST02', 150.00, 'Ready', 'Make the dosa very crispy please', '2026-10-31 12:20:00'),
('ORD1003', 'U103', 'ST03', 70.00, 'Cooking', 'Less sugar in cold coffee', '2026-10-31 12:35:00'),
('ORD1004', 'U101', 'ST02', 85.00, 'Placed', 'Pack sambar in separate pouch', '2026-10-31 12:45:00');

-- 3.6 Order Items
INSERT INTO ORDER_ITEM (Order_ID, Item_ID, Quantity, Unit_Price) VALUES
('ORD1001', 'IT01', 2, 120.00),
('ORD1002', 'IT03', 1, 85.00),
('ORD1002', 'IT04', 1, 65.00),
('ORD1003', 'IT05', 1, 70.00),
('ORD1004', 'IT03', 1, 85.00);

-- 3.7 Wallet Transactions
INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID, Created_At) VALUES
('TXN901', 'U101', 500.00, 'Top-Up', 'UPI Wallet Load via GPay (Ref: 402911)', NULL, '2026-10-31 11:30:00'),
('TXN902', 'U101', -240.00, 'Order_Payment', 'Instant Food Checkout debit', 'ORD1001', '2026-10-31 12:05:05'),
('TXN903', 'U102', 500.00, 'Top-Up', 'NetBanking Wallet Top-up (Ref: 772109)', NULL, '2026-10-31 11:45:00'),
('TXN904', 'U102', -150.00, 'Order_Payment', 'Instant Food Checkout debit', 'ORD1002', '2026-10-31 12:20:05'),
('TXN905', 'U103', 250.00, 'Top-Up', 'UPI Wallet Load via Paytm (Ref: 882012)', NULL, '2026-10-31 12:00:00');

-- 3.8 Order Status Logs
INSERT INTO ORDER_STATUS_LOG (Order_ID, Changed_At, Old_Status, New_Status) VALUES
('ORD1001', '2026-10-31 12:05:00', 'Placed', 'Cooking'),
('ORD1001', '2026-10-31 12:12:00', 'Cooking', 'Ready'),
('ORD1001', '2026-10-31 12:15:00', 'Ready', 'Delivered'),
('ORD1002', '2026-10-31 12:20:00', 'Placed', 'Cooking'),
('ORD1002', '2026-10-31 12:28:00', 'Cooking', 'Ready');

-- =============================================================================
-- 4. VERIFICATION QUERIES (FROM SECTION 10 OF DELIVERABLE)
-- =============================================================================

-- Query 10.1: Stall Sales & Revenue Analytics
SELECT s.Stall_ID, s.Name AS Stall_Name, 
       COUNT(DISTINCT o.Order_ID) AS Total_Orders,
       COALESCE(SUM(o.Total_Amount), 0.00) AS Total_Revenue
FROM STALL s
LEFT JOIN ORDER_TABLE o ON s.Stall_ID = o.Stall_ID AND o.Status != 'Cancelled'
GROUP BY s.Stall_ID, s.Name
ORDER BY Total_Revenue DESC;

-- Query 10.2: Customer Itemized Food Receipt
SELECT o.Order_ID, CONCAT(u.First_Name, ' ', u.Last_Name) AS Customer_Name,
       m.Name AS Dish_Name, oi.Quantity, oi.Unit_Price, oi.Subtotal, o.Status
FROM ORDER_TABLE o
JOIN USER_TABLE u ON o.Student_ID = u.User_ID
JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
JOIN MENU_ITEM m ON oi.Item_ID = m.Item_ID
WHERE o.Order_ID = 'ORD1002';

-- Query 10.3: Top-Selling Cafeteria Dishes
SELECT m.Item_ID, m.Name AS Dish_Name, s.Name AS Stall_Name, SUM(oi.Quantity) AS Units_Sold
FROM MENU_ITEM m
JOIN STALL s ON m.Stall_ID = s.Stall_ID
JOIN ORDER_ITEM oi ON m.Item_ID = oi.Item_ID
GROUP BY m.Item_ID, m.Name, s.Name
HAVING SUM(oi.Quantity) >= ALL (SELECT SUM(Quantity) FROM ORDER_ITEM GROUP BY Item_ID);

-- Query 10.4: Kitchen Preparation Latency Audit
SELECT l1.Order_ID, l1.Changed_At AS Placed_Time, l2.Changed_At AS Ready_Time,
       TIMESTAMPDIFF(MINUTE, l1.Changed_At, l2.Changed_At) AS Prep_Duration_Mins
FROM ORDER_STATUS_LOG l1
JOIN ORDER_STATUS_LOG l2 ON l1.Order_ID = l2.Order_ID
WHERE l1.Old_Status = 'Placed' AND l2.New_Status = 'Ready';
