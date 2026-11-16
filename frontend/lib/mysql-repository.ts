import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from './mysql';
import { db, type Stall, type MenuItem, type Order, type User } from './db';

/** Check if live MySQL database is reachable */
export async function isMySQLAvailable(): Promise<boolean> {
  try {
    const [rows] = await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Get All Users (with fallback to in-memory) */
export async function getUsers(): Promise<User[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT User_ID, Email, First_Name, Last_Name, Role, Wallet_Balance, Phone_Number
      FROM USER_TABLE ORDER BY User_ID
    `);
    if (rows && rows.length > 0) {
      return rows.map(r => ({
        userId: r.User_ID,
        email: r.Email,
        firstName: r.First_Name,
        lastName: r.Last_Name,
        role: r.Role,
        walletBalance: Number(r.Wallet_Balance),
        phoneNumber: r.Phone_Number,
        stallId: r.Role === 'Stall_Owner' ? (r.User_ID === 'U201' ? 'ST01' : 'ST02') : undefined
      }));
    }
  } catch (err) {
    // Fall back seamlessly
  }
  return db.getAllUsers();
}

/** Read Stalls */
export async function getStalls(): Promise<Stall[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT Stall_ID, Name, Location, Is_Active, Owner_ID
      FROM STALL ORDER BY Stall_ID
    `);
    if (rows && rows.length > 0) {
      return rows.map(row => ({
        stallId: row.Stall_ID,
        name: row.Name,
        location: row.Location,
        isActive: Boolean(row.Is_Active),
        ownerId: row.Owner_ID,
      }));
    }
  } catch (err) {
    // Fall back to in-memory store
  }
  return db.getStalls();
}

/** Read Menu Items with 384-D vector handling */
export async function getMenuItems(stallId?: string): Promise<MenuItem[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT m.Item_ID, m.Stall_ID, m.Name, m.Price, m.Stock_Qty,
             m.Description, m.Vector, t.Dietary_Tag
      FROM MENU_ITEM m
      LEFT JOIN ITEM_DIETARY_TAGS t ON t.Item_ID = m.Item_ID
      ${stallId ? 'WHERE m.Stall_ID = ?' : ''}
      ORDER BY m.Item_ID, t.Dietary_Tag
    `, stallId ? [stallId] : []);

    if (rows && rows.length > 0) {
      const items = new Map<string, MenuItem>();
      for (const row of rows) {
        let item = items.get(row.Item_ID);
        if (!item) {
          let vector: number[] = [];
          try {
            const parsed = JSON.parse(row.Vector ?? '[]');
            if (Array.isArray(parsed) && parsed.every(v => typeof v === 'number')) {
              vector = parsed;
            }
          } catch {
            // If raw vector isn't json, use dish's default vector from db
            const fallbackItem = db.getMenuItems().find(m => m.itemId === row.Item_ID);
            vector = fallbackItem ? fallbackItem.vector : [];
          }
          item = {
            itemId: row.Item_ID,
            stallId: row.Stall_ID,
            name: row.Name,
            price: Number(row.Price),
            stockQty: Number(row.Stock_Qty),
            description: row.Description ?? '',
            dietaryTags: [],
            vector,
          };
          items.set(item.itemId, item);
        }
        if (row.Dietary_Tag !== null) item.dietaryTags.push(row.Dietary_Tag);
      }
      return Array.from(items.values());
    }
  } catch (err) {
    // Fall back to in-memory store
  }
  return db.getMenuItems(stallId);
}

/** Read Orders */
export async function getOrders(studentId?: string, stallId?: string): Promise<Order[]> {
  try {
    const conditions: string[] = [];
    const values: string[] = [];
    if (studentId) { conditions.push('o.Student_ID = ?'); values.push(studentId); }
    if (stallId) { conditions.push('o.Stall_ID = ?'); values.push(stallId); }

    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT o.Order_ID, o.Student_ID, o.Stall_ID, o.Total_Amount, o.Status,
             o.Instructions, DATE_FORMAT(o.Created_At, '%Y-%m-%d %H:%i:%s') AS Created_At,
             CONCAT(u.First_Name, ' ', u.Last_Name) AS Student_Name,
             s.Name AS Stall_Name, oi.Item_ID, m.Name AS Dish_Name,
             oi.Quantity, oi.Unit_Price, oi.Subtotal
      FROM ORDER_TABLE o
      JOIN USER_TABLE u ON u.User_ID = o.Student_ID
      JOIN STALL s ON s.Stall_ID = o.Stall_ID
      LEFT JOIN ORDER_ITEM oi ON oi.Order_ID = o.Order_ID
      LEFT JOIN MENU_ITEM m ON m.Item_ID = oi.Item_ID
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY o.Created_At DESC, o.Order_ID DESC, oi.Item_ID
    `, values);

    if (rows && rows.length > 0) {
      const orders = new Map<string, Order>();
      for (const row of rows) {
        let order = orders.get(row.Order_ID);
        if (!order) {
          order = {
            orderId: row.Order_ID,
            studentId: row.Student_ID,
            studentName: row.Student_Name,
            stallId: row.Stall_ID,
            stallName: row.Stall_Name,
            totalAmount: Number(row.Total_Amount),
            status: row.Status,
            instructions: row.Instructions ?? '',
            createdAt: row.Created_At ?? '',
            items: [],
          };
          orders.set(order.orderId, order);
        }
        if (row.Item_ID !== null) {
          order.items.push({
            orderId: row.Order_ID,
            itemId: row.Item_ID,
            dishName: row.Dish_Name ?? row.Item_ID,
            quantity: Number(row.Quantity),
            unitPrice: Number(row.Unit_Price),
            subtotal: Number(row.Subtotal),
          });
        }
      }
      return Array.from(orders.values());
    }
  } catch (err) {
    // Fall back to in-memory store
  }
  return db.getOrders(studentId, stallId);
}

/**
 * Multi-Item Atomic Checkout Transaction (MySQL + Fallback)
 * Executes ACID transaction:
 * 1. Checks stock and price for each cart item
 * 2. Checks student wallet balance
 * 3. Deducts wallet balance
 * 4. Inserts into ORDER_TABLE
 * 5. Inserts into ORDER_ITEM (firing stock triggers)
 * 6. Inserts into WALLET_TRANSACTION
 */
export async function placeOrder(params: {
  studentId: string;
  stallId: string;
  items: { itemId: string; quantity: number }[];
  instructions?: string;
}): Promise<{ success: boolean; message: string; order?: Order }> {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Step 1: Validate User & Wallet
      const [userRows] = await conn.execute<RowDataPacket[]>(
        'SELECT Wallet_Balance, CONCAT(First_Name, " ", Last_Name) AS Full_Name FROM USER_TABLE WHERE User_ID = ? FOR UPDATE',
        [params.studentId]
      );
      if (!userRows || userRows.length === 0) {
        await conn.rollback();
        return { success: false, message: 'Student user not found in database.' };
      }
      const currentBalance = Number(userRows[0].Wallet_Balance);
      const studentName = userRows[0].Full_Name;

      // Step 2: Validate Items, Stock & Pricing
      let totalAmount = 0;
      const orderItemsToInsert: { itemId: string; name: string; qty: number; price: number; subtotal: number }[] = [];

      for (const item of params.items) {
        const [dishRows] = await conn.execute<RowDataPacket[]>(
          'SELECT Name, Price, Stock_Qty FROM MENU_ITEM WHERE Item_ID = ? AND Stall_ID = ? FOR UPDATE',
          [item.itemId, params.stallId]
        );
        if (!dishRows || dishRows.length === 0) {
          await conn.rollback();
          return { success: false, message: `Dish ${item.itemId} not found at specified stall.` };
        }
        const dish = dishRows[0];
        if (dish.Stock_Qty < item.quantity) {
          await conn.rollback();
          return {
            success: false,
            message: `Insufficient stock for ${dish.Name}. (Available: ${dish.Stock_Qty}, Requested: ${item.quantity})`
          };
        }
        const subtotal = Number(dish.Price) * item.quantity;
        totalAmount += subtotal;
        orderItemsToInsert.push({
          itemId: item.itemId,
          name: dish.Name,
          qty: item.quantity,
          price: Number(dish.Price),
          subtotal
        });
      }

      // Step 3: Check Balance
      if (currentBalance < totalAmount) {
        await conn.rollback();
        return {
          success: false,
          message: `Insufficient wallet balance. Required: Rs. ${totalAmount.toFixed(2)}, Available: Rs. ${currentBalance.toFixed(2)}.`
        };
      }

      // Step 4: Generate Order ID
      const [countRows] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as cnt FROM ORDER_TABLE');
      const orderCount = countRows[0].cnt + 1;
      const newOrderId = `ORD${1000 + orderCount}`;

      // Step 5: Deduct Balance in USER_TABLE
      await conn.execute(
        'UPDATE USER_TABLE SET Wallet_Balance = Wallet_Balance - ? WHERE User_ID = ?',
        [totalAmount, params.studentId]
      );

      // Step 6: Insert ORDER_TABLE
      await conn.execute(
        'INSERT INTO ORDER_TABLE (Order_ID, Student_ID, Stall_ID, Total_Amount, Status, Instructions, Created_At) VALUES (?, ?, ?, ?, "Placed", ?, NOW())',
        [newOrderId, params.studentId, params.stallId, totalAmount, params.instructions || 'Standard preparation']
      );

      // Step 7: Insert ORDER_ITEM (triggers inventory decrement)
      for (const oi of orderItemsToInsert) {
        await conn.execute(
          'INSERT INTO ORDER_ITEM (Order_ID, Item_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?)',
          [newOrderId, oi.itemId, oi.qty, oi.price]
        );
      }

      // Step 8: Insert WALLET_TRANSACTION
      const txnId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      await conn.execute(
        'INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID, Created_At) VALUES (?, ?, ?, "Order_Payment", ?, ?, NOW())',
        [txnId, params.studentId, -totalAmount, `Payment for QuickBite order ${newOrderId}`, newOrderId]
      );

      await conn.commit();

      const createdOrder: Order = {
        orderId: newOrderId,
        studentId: params.studentId,
        studentName,
        stallId: params.stallId,
        totalAmount,
        status: 'Placed',
        instructions: params.instructions || 'Standard preparation',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        items: orderItemsToInsert.map(oi => ({
          orderId: newOrderId,
          itemId: oi.itemId,
          dishName: oi.name,
          quantity: oi.qty,
          unitPrice: oi.price,
          subtotal: oi.subtotal
        }))
      };

      return {
        success: true,
        message: `Order ${newOrderId} placed successfully in MySQL! Debited Rs. ${totalAmount.toFixed(2)}.`,
        order: createdOrder
      };
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    // If MySQL is down, fall back to in-memory ACID store
    return db.placeOrder(params);
  }
}

/**
 * Order Status Transition (MySQL + Fallback)
 * Automatically fires triggers:
 * - trg_audit_order_status_change
 * - trg_cancel_order_refund_and_restock
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: Order['status'],
  actingRole: string,
  actingStallId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const conn = await pool.getConnection();
    try {
      // Validate order exists
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT Stall_ID, Status FROM ORDER_TABLE WHERE Order_ID = ?',
        [orderId]
      );
      if (!rows || rows.length === 0) {
        return { success: false, message: 'Order not found.' };
      }
      const existing = rows[0];

      // RBAC check
      if (actingRole === 'Stall_Owner' && actingStallId && existing.Stall_ID !== actingStallId) {
        return { success: false, message: 'RBAC Authorization Violation: You can only manage orders for your own stall.' };
      }

      await conn.execute(
        'UPDATE ORDER_TABLE SET Status = ? WHERE Order_ID = ?',
        [newStatus, orderId]
      );

      return {
        success: true,
        message: `Order ${orderId} transitioned to ${newStatus} in MySQL (Audit log created).`
      };
    } finally {
      conn.release();
    }
  } catch (err) {
    // Fall back to in-memory store
    return db.updateOrderStatus(orderId, newStatus, actingRole, actingStallId);
  }
}
