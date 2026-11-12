/**
 * QuickBite Polyglot Database Service
 * Implements SQL Relational Invariants (ACID, Triggers, Cascades)
 * and NoSQL Document Reviews + Vector Cosine Recommendation Search.
 */

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Student' | 'Faculty' | 'Stall_Owner' | 'Admin';
  walletBalance: number;
  phoneNumber: string;
  stallId?: string; // If stall owner
}

export interface Stall {
  stallId: string;
  name: string;
  location: string;
  isActive: boolean;
  ownerId: string;
}

export interface MenuItem {
  itemId: string;
  stallId: string;
  name: string;
  price: number;
  stockQty: number;
  description: string;
  dietaryTags: string[];
  vector: number[]; // 8-dimensional semantic embedding
}

export interface OrderItem {
  orderId: string;
  itemId: string;
  dishName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  studentId: string;
  studentName?: string;
  stallId: string;
  stallName?: string;
  totalAmount: number;
  status: 'Placed' | 'Cooking' | 'Ready' | 'Delivered' | 'Cancelled';
  instructions: string;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderStatusLog {
  orderId: string;
  changedAt: string;
  oldStatus: string;
  newStatus: string;
}

export interface FoodReview {
  reviewId: string;
  dishId: string;
  dishName: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  reviewTitle: string;
  comment: string;
  tags: string[];
  helpfulVotes: number;
  metadata: {
    spiceLevel: string;
    portionSize: string;
    orderChannel: string;
  };
  createdAt: string;
}

// -----------------------------------------------------------------------------
// In-Memory Database State (Initialized exactly from PDF Section 8 & NoSQL data)
// -----------------------------------------------------------------------------
class QuickBiteDatabase {
  users: User[] = [
    {
      userId: 'U101',
      email: 'tanuboddi@pes.edu',
      firstName: 'Navaneeth',
      lastName: 'Tanuboddi',
      role: 'Student',
      walletBalance: 450.00,
      phoneNumber: '9876543210'
    },
    {
      userId: 'U102',
      email: 'rishab@pes.edu',
      firstName: 'Rishab',
      lastName: 'Naveen',
      role: 'Student',
      walletBalance: 320.00,
      phoneNumber: '9876543211'
    },
    {
      userId: 'U103',
      email: 'sneha.r@pes.edu',
      firstName: 'Sneha',
      lastName: 'Rao',
      role: 'Student',
      walletBalance: 180.00,
      phoneNumber: '9876543212'
    },
    {
      userId: 'U201',
      email: 'ramesh.rolls@gmail.com',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      role: 'Stall_Owner',
      walletBalance: 0.00,
      phoneNumber: '9876543220',
      stallId: 'ST01'
    },
    {
      userId: 'U202',
      email: 'suresh.south@gmail.com',
      firstName: 'Suresh',
      lastName: 'Bhat',
      role: 'Stall_Owner',
      walletBalance: 0.00,
      phoneNumber: '9876543221',
      stallId: 'ST02'
    }
  ];

  stalls: Stall[] = [
    { stallId: 'ST01', name: 'Rolls & Bowls', location: 'Food Court Counter 1', isActive: true, ownerId: 'U201' },
    { stallId: 'ST02', name: 'South Kitchen', location: 'Food Court Counter 2', isActive: true, ownerId: 'U202' },
    { stallId: 'ST03', name: 'Sip & Snack', location: '13th Floor Kiosk', isActive: true, ownerId: 'U201' },
  ];

  menuItems: MenuItem[] = [
    {
      itemId: 'IT01',
      stallId: 'ST01',
      name: 'Paneer Tikka Roll',
      price: 120.00,
      stockQty: 25,
      description: 'Grilled spiced cottage cheese wrapped in flaky paratha with mint chutney',
      dietaryTags: ['Vegetarian', 'High-Protein'],
      vector: [0.75, 0.82, 0.05, 0.85, 0.00, 0.88, 0.95, 0.20]
    },
    {
      itemId: 'IT02',
      stallId: 'ST01',
      name: 'Chicken Kathi Roll',
      price: 140.00,
      stockQty: 18,
      description: 'Tender marinated shredded chicken wrapped in layered paratha with spicy sauce',
      dietaryTags: ['Non-Veg', 'High-Protein'],
      vector: [0.85, 0.90, 0.00, 0.90, 0.00, 0.96, 0.00, 0.15]
    },
    {
      itemId: 'IT03',
      stallId: 'ST02',
      name: 'Ghee Podi Masala Dosa',
      price: 85.00,
      stockQty: 40,
      description: 'Crispy fermented crepe smeared with aromatic spicy podi and pure cow ghee',
      dietaryTags: ['Vegetarian'],
      vector: [0.65, 0.80, 0.05, 0.92, 0.00, 0.40, 0.98, 0.95]
    },
    {
      itemId: 'IT04',
      stallId: 'ST02',
      name: 'Steamed Idli Vada Combo',
      price: 65.00,
      stockQty: 30,
      description: 'Two fluffy steamed rice cakes with crispy lentil doughnut and spicy sambar',
      dietaryTags: ['Vegan'],
      vector: [0.40, 0.70, 0.00, 0.88, 0.00, 0.50, 0.98, 0.99]
    },
    {
      itemId: 'IT05',
      stallId: 'ST03',
      name: 'Cold Coffee w/ Ice Cream',
      price: 70.00,
      stockQty: 50,
      description: 'Chilled espresso milk blend topped with creamy vanilla ice cream scoop',
      dietaryTags: ['Beverage'],
      vector: [0.00, 0.10, 0.95, 0.00, 0.98, 0.25, 0.95, 0.10]
    }
  ];

  orders: Order[] = [
    {
      orderId: 'ORD1001',
      studentId: 'U101',
      stallId: 'ST01',
      totalAmount: 240.00,
      status: 'Delivered',
      instructions: 'Extra green chutney, less onions',
      createdAt: '2026-10-31 12:05:00',
      items: [
        { orderId: 'ORD1001', itemId: 'IT01', quantity: 2, unitPrice: 120.00, subtotal: 240.00 }
      ]
    },
    {
      orderId: 'ORD1002',
      studentId: 'U102',
      stallId: 'ST02',
      totalAmount: 150.00,
      status: 'Ready',
      instructions: 'Make the dosa very crispy please',
      createdAt: '2026-10-31 12:20:00',
      items: [
        { orderId: 'ORD1002', itemId: 'IT03', quantity: 1, unitPrice: 85.00, subtotal: 85.00 },
        { orderId: 'ORD1002', itemId: 'IT04', quantity: 1, unitPrice: 65.00, subtotal: 65.00 }
      ]
    },
    {
      orderId: 'ORD1003',
      studentId: 'U103',
      stallId: 'ST03',
      totalAmount: 70.00,
      status: 'Cooking',
      instructions: 'Less sugar in cold coffee',
      createdAt: '2026-10-31 12:35:00',
      items: [
        { orderId: 'ORD1003', itemId: 'IT05', quantity: 1, unitPrice: 70.00, subtotal: 70.00 }
      ]
    },
    {
      orderId: 'ORD1004',
      studentId: 'U101',
      stallId: 'ST02',
      totalAmount: 85.00,
      status: 'Placed',
      instructions: 'Pack sambar in separate pouch',
      createdAt: '2026-10-31 12:45:00',
      items: [
        { orderId: 'ORD1004', itemId: 'IT03', quantity: 1, unitPrice: 85.00, subtotal: 85.00 }
      ]
    }
  ];

  orderLogs: OrderStatusLog[] = [
    { orderId: 'ORD1001', changedAt: '2026-10-31 12:05:00', oldStatus: 'Placed', newStatus: 'Cooking' },
    { orderId: 'ORD1001', changedAt: '2026-10-31 12:12:00', oldStatus: 'Cooking', newStatus: 'Ready' },
    { orderId: 'ORD1001', changedAt: '2026-10-31 12:15:00', oldStatus: 'Ready', newStatus: 'Delivered' },
    { orderId: 'ORD1002', changedAt: '2026-10-31 12:20:00', oldStatus: 'Placed', newStatus: 'Cooking' },
    { orderId: 'ORD1002', changedAt: '2026-10-31 12:28:00', oldStatus: 'Cooking', newStatus: 'Ready' }
  ];

  reviews: FoodReview[] = [
    {
      reviewId: 'REV-1001',
      dishId: 'IT01',
      dishName: 'Paneer Tikka Roll',
      userId: 'U101',
      userName: 'Navaneeth Tanuboddi',
      rating: 5,
      reviewTitle: 'Best wrap on campus!',
      comment: 'The paneer cubes were succulent, freshly grilled, and the mint chutney had the perfect tang. Excellent value.',
      tags: ['High-Protein', 'Fresh', 'ValueForMoney'],
      helpfulVotes: 15,
      metadata: { spiceLevel: 'Medium', portionSize: 'Generous', orderChannel: 'Web' },
      createdAt: '2026-11-01T12:30:00Z'
    },
    {
      reviewId: 'REV-1002',
      dishId: 'IT03',
      dishName: 'Ghee Podi Masala Dosa',
      userId: 'U102',
      userName: 'Rishab Naveen',
      rating: 5,
      reviewTitle: 'Authentic Bangalore style podi dosa',
      comment: 'Crispy on the outside with generous pure ghee dripping. The potato masala stuffing was flavorful and not too oily.',
      tags: ['Crispy', 'PureGhee', 'BreakfastFavorite'],
      helpfulVotes: 22,
      metadata: { spiceLevel: 'Spicy', portionSize: 'Generous', orderChannel: 'Web' },
      createdAt: '2026-11-02T09:15:00Z'
    },
    {
      reviewId: 'REV-1003',
      dishId: 'IT02',
      dishName: 'Chicken Kathi Roll',
      userId: 'U103',
      userName: 'Sneha Rao',
      rating: 4,
      reviewTitle: 'Great flavor, slightly spicy',
      comment: 'Tender chicken chunks marinated well in tandoori spices. A bit spicier than expected, order with extra curd chutney.',
      tags: ['Non-Veg', 'Juicy', 'QuickBite'],
      helpfulVotes: 8,
      metadata: { spiceLevel: 'Extra Spicy', portionSize: 'Adequate', orderChannel: 'Mobile' },
      createdAt: '2026-11-03T13:45:00Z'
    },
    {
      reviewId: 'REV-1004',
      dishId: 'IT05',
      dishName: 'Cold Coffee w/ Ice Cream',
      userId: 'U101',
      userName: 'Navaneeth Tanuboddi',
      rating: 5,
      reviewTitle: 'Refreshing post-class cooler',
      comment: 'Thick espresso blend topped with rich vanilla scoop. Perfect savior during afternoon heat between lectures.',
      tags: ['Chilled', 'SweetTooth', 'AfternoonPickMeUp'],
      helpfulVotes: 19,
      metadata: { spiceLevel: 'Mild', portionSize: 'Generous', orderChannel: 'Kiosk' },
      createdAt: '2026-11-04T15:20:00Z'
    }
  ];

  // ---------------------------------------------------------------------------
  // User & Auth Operations
  // ---------------------------------------------------------------------------
  getUser(userId: string): User | undefined {
    return this.users.find(u => u.userId === userId);
  }

  getAllUsers(): User[] {
    return this.users;
  }

  // ---------------------------------------------------------------------------
  // Menu & Stall Queries
  // ---------------------------------------------------------------------------
  getStalls(): Stall[] {
    return this.stalls;
  }

  getMenuItems(stallId?: string): MenuItem[] {
    if (stallId) {
      return this.menuItems.filter(m => m.stallId === stallId);
    }
    return this.menuItems;
  }

  // ---------------------------------------------------------------------------
  // Order Operations (ACID Transaction Logic + Triggers)
  // ---------------------------------------------------------------------------
  getOrders(studentId?: string, stallId?: string): Order[] {
    let list = this.orders.map(o => {
      const student = this.users.find(u => u.userId === o.studentId);
      const stall = this.stalls.find(s => s.stallId === o.stallId);
      const enrichedItems = o.items.map(it => {
        const dish = this.menuItems.find(m => m.itemId === it.itemId);
        return { ...it, dishName: dish ? dish.name : it.itemId };
      });
      return {
        ...o,
        studentName: student ? `${student.firstName} ${student.lastName}` : o.studentId,
        stallName: stall ? stall.name : o.stallId,
        items: enrichedItems
      };
    });

    if (studentId) {
      list = list.filter(o => o.studentId === studentId);
    }
    if (stallId) {
      list = list.filter(o => o.stallId === stallId);
    }
    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Atomic Order Placement (Simulating Stored Procedure sp_PlaceOrderAtomic)
   * Enforces:
   * 1. Balance validation
   * 2. Stock validation & auto-deduction (trigger trg_validate_stock_and_deduct)
   * 3. Wallet deduction & transaction logging
   */
  placeOrder(params: {
    studentId: string;
    stallId: string;
    items: { itemId: string; quantity: number }[];
    instructions?: string;
  }): { success: boolean; message: string; order?: Order } {
    const student = this.users.find(u => u.userId === params.studentId);
    if (!student) {
      return { success: false, message: 'Student user not found.' };
    }

    if (params.items.length === 0) {
      return { success: false, message: 'Cart cannot be empty.' };
    }

    // Step A: Calculate total & verify stock
    let totalAmount = 0;
    const validatedItems: OrderItem[] = [];
    const newOrderId = `ORD${1001 + this.orders.length}`;

    for (const reqItem of params.items) {
      const dish = this.menuItems.find(m => m.itemId === reqItem.itemId && m.stallId === params.stallId);
      if (!dish) {
        return { success: false, message: `Dish ${reqItem.itemId} not found at specified stall.` };
      }
      if (dish.stockQty < reqItem.quantity) {
        return {
          success: false,
          message: `Stock constraint violation: Insufficient stock for ${dish.name}. (Available: ${dish.stockQty}, Requested: ${reqItem.quantity})`
        };
      }

      const subtotal = dish.price * reqItem.quantity;
      totalAmount += subtotal;
      validatedItems.push({
        orderId: newOrderId,
        itemId: dish.itemId,
        dishName: dish.name,
        quantity: reqItem.quantity,
        unitPrice: dish.price,
        subtotal
      });
    }

    // Step B: Verify wallet balance
    if (student.walletBalance < totalAmount) {
      return {
        success: false,
        message: `Insufficient funds: Required ₹${totalAmount.toFixed(2)}, but current wallet balance is ₹${student.walletBalance.toFixed(2)}.`
      };
    }

    // Step C: Execute Atomic Transaction
    // 1. Deduct wallet
    student.walletBalance -= totalAmount;

    // 2. Decrement stock
    for (const item of validatedItems) {
      const dish = this.menuItems.find(m => m.itemId === item.itemId)!;
      dish.stockQty -= item.quantity;
    }

    // 3. Create Order
    const newOrder: Order = {
      orderId: newOrderId,
      studentId: student.userId,
      studentName: `${student.firstName} ${student.lastName}`,
      stallId: params.stallId,
      stallName: this.stalls.find(s => s.stallId === params.stallId)?.name,
      totalAmount,
      status: 'Placed',
      instructions: params.instructions || 'None',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: validatedItems
    };

    this.orders.push(newOrder);

    // 4. Initial audit log
    this.orderLogs.push({
      orderId: newOrderId,
      changedAt: newOrder.createdAt,
      oldStatus: 'Init',
      newStatus: 'Placed'
    });

    return {
      success: true,
      message: `Order ${newOrderId} successfully placed! Debited ₹${totalAmount.toFixed(2)}.`,
      order: newOrder
    };
  }

  /**
   * Safe Order Status Transition
   * Enforces RBAC & Triggers:
   * - trg_audit_order_status_change
   * - trg_cancel_order_refund_and_restock
   */
  updateOrderStatus(orderId: string, newStatus: Order['status'], actingRole: string, actingStallId?: string): { success: boolean; message: string } {
    const order = this.orders.find(o => o.orderId === orderId);
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    // RBAC verification
    if (actingRole === 'Stall_Owner' && actingStallId && order.stallId !== actingStallId) {
      return { success: false, message: 'RBAC Authorization Violation: You can only manage orders for your own stall.' };
    }

    const oldStatus = order.status;
    if (oldStatus === newStatus) {
      return { success: true, message: `Status is already ${newStatus}.` };
    }

    // Update status
    order.status = newStatus;

    // Trigger 1: Auto-audit log
    this.orderLogs.push({
      orderId: order.orderId,
      changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      oldStatus,
      newStatus
    });

    // Trigger 2: If cancelled, refund student & restore inventory
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      const student = this.users.find(u => u.userId === order.studentId);
      if (student) {
        student.walletBalance += order.totalAmount;
      }
      for (const item of order.items) {
        const dish = this.menuItems.find(m => m.itemId === item.itemId);
        if (dish) {
          dish.stockQty += item.quantity;
        }
      }
      return {
        success: true,
        message: `Order ${orderId} cancelled. Automatically refunded ₹${order.totalAmount.toFixed(2)} to student ${order.studentId} and restored dish stock.`
      };
    }

    return { success: true, message: `Order ${orderId} transitioned: ${oldStatus} ➔ ${newStatus}` };
  }

  // ---------------------------------------------------------------------------
  // NoSQL Reviews & Aggregation
  // ---------------------------------------------------------------------------
  getReviews(dishId?: string): FoodReview[] {
    if (dishId) {
      return this.reviews.filter(r => r.dishId === dishId);
    }
    return this.reviews;
  }

  addReview(reviewData: Omit<FoodReview, 'reviewId' | 'createdAt' | 'helpfulVotes'>): FoodReview {
    const newReview: FoodReview = {
      ...reviewData,
      reviewId: `REV-${1001 + this.reviews.length}`,
      helpfulVotes: 0,
      createdAt: new Date().toISOString()
    };
    this.reviews.push(newReview);
    return newReview;
  }

  // ---------------------------------------------------------------------------
  // AI Vector Semantic Recommendation
  // ---------------------------------------------------------------------------
  semanticSearch(query: string, topK: number = 3): { item: MenuItem; similarity: number }[] {
    const qLower = query.toLowerCase();

    // Dynamically project natural language craving into 8D vector
    // [Spicy, Savory, Sweet, Warm, Cold, High-Protein, Vegetarian, Breakfast]
    const qVec = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];

    if (qLower.includes('spic') || qLower.includes('chilli') || qLower.includes('tikka') || qLower.includes('podi') || qLower.includes('hot')) {
      qVec[0] += 0.8;
      qVec[1] += 0.7;
    }
    if (qLower.includes('sweet') || qLower.includes('dessert') || qLower.includes('sugar') || qLower.includes('cream')) {
      qVec[2] += 0.9;
    }
    if (qLower.includes('warm') || qLower.includes('fresh') || qLower.includes('hot') || qLower.includes('crispy') || qLower.includes('roast')) {
      qVec[3] += 0.8;
    }
    if (qLower.includes('cold') || qLower.includes('chill') || qLower.includes('ice') || qLower.includes('beverage') || qLower.includes('drink')) {
      qVec[4] += 0.9;
    }
    if (qLower.includes('protein') || qLower.includes('chicken') || qLower.includes('paneer') || qLower.includes('gym') || qLower.includes('muscle')) {
      qVec[5] += 0.9;
    }
    if (qLower.includes('veg') || qLower.includes('dosa') || qLower.includes('idli') || qLower.includes('paneer') || qLower.includes('plant')) {
      qVec[6] += 0.8;
    }
    if (qLower.includes('breakfast') || qLower.includes('morning') || qLower.includes('dosa') || qLower.includes('idli') || qLower.includes('vada')) {
      qVec[7] += 0.9;
    }

    // Cosine similarity computation
    const dot = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
    const mag = (a: number[]) => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));

    const scored = this.menuItems.map(item => {
      const qMag = mag(qVec);
      const itemMag = mag(item.vector);
      const similarity = (qMag === 0 || itemMag === 0) ? 0 : dot(qVec, item.vector) / (qMag * itemMag);
      return { item, similarity: Math.round(similarity * 1000) / 1000 };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }
}

// Global Singleton Instance
const globalForDb = global as unknown as { quickbiteDb?: QuickBiteDatabase };
export const db = globalForDb.quickbiteDb || new QuickBiteDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.quickbiteDb = db;
