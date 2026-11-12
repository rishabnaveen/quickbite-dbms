'use client';

import React, { useState, useEffect } from 'react';
import { 
  Utensils, Sparkles, ShoppingBag, Clock, ShieldCheck, 
  Store, Wallet, Star, CheckCircle2, AlertCircle, RefreshCw,
  Search, ArrowRight, UserCheck, Flame, ChevronRight, X
} from 'lucide-react';

interface User {
  userId: string;
  name: string;
  email: string;
  role: 'Student' | 'Faculty' | 'Stall_Owner' | 'Admin';
  walletBalance: number;
  stallId?: string;
}

interface Stall {
  stallId: string;
  name: string;
  location: string;
}

interface MenuItem {
  itemId: string;
  stallId: string;
  name: string;
  price: number;
  stockQty: number;
  description: string;
  dietaryTags: string[];
}

interface OrderItem {
  itemId: string;
  dishName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
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

interface FoodReview {
  reviewId: string;
  dishId: string;
  dishName: string;
  userName: string;
  rating: number;
  reviewTitle: string;
  comment: string;
  tags: string[];
  helpfulVotes: number;
}

export default function QuickBiteApp() {
  // Authentication & RBAC state
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // App data state
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<FoodReview[]>([]);
  
  // Navigation & Filtering
  const [selectedStall, setSelectedStall] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'reviews' | 'kitchen'>('menu');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cart State (Student)
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [orderInstructions, setOrderInstructions] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // AI Vector Search State
  const [cravingQuery, setCravingQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<any[] | null>(null);
  const [isSearchingVector, setIsSearchingVector] = useState(false);

  // Auto-dismiss alert notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Initial Load
  const fetchAllData = async () => {
    try {
      const [authRes, menuRes, reviewsRes] = await Promise.all([
        fetch('/api/auth'),
        fetch('/api/menu'),
        fetch('/api/reviews')
      ]);

      const authData = await authRes.json();
      const menuData = await menuRes.json();
      const reviewsData = await reviewsRes.json();

      setUsers(authData.users || []);
      if (!activeUser && authData.users?.length > 0) {
        // Default to student Navaneeth (U101)
        setActiveUser(authData.users[0]);
      } else if (activeUser) {
        // Sync wallet balance
        const updated = authData.users.find((u: User) => u.userId === activeUser.userId);
        if (updated) setActiveUser(updated);
      }

      setStalls(menuData.stalls || []);
      setMenuItems(menuData.items || []);
      setReviews(reviewsData.reviews || []);
    } catch (err) {
      console.error('Failed to load initial data', err);
    }
  };

  const fetchOrders = async () => {
    if (!activeUser) return;
    try {
      const param = activeUser.role === 'Student' 
        ? `studentId=${activeUser.userId}` 
        : `stallId=${activeUser.stallId || ''}`;
      const res = await fetch(`/api/orders?${param}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [activeUser]);

  // Handle Switch Role
  const handleUserSwitch = (userId: string) => {
    const target = users.find(u => u.userId === userId);
    if (target) {
      setActiveUser(target);
      setCart({});
      setVectorResults(null);
      if (target.role === 'Stall_Owner') {
        setActiveTab('kitchen');
      } else {
        setActiveTab('menu');
      }
      setNotification({
        type: 'success',
        message: `Switched session to ${target.name} [Role: ${target.role}]`
      });
    }
  };

  // Add to Cart
  const addToCart = (dish: MenuItem) => {
    if (dish.stockQty <= (cart[dish.itemId] || 0)) {
      setNotification({
        type: 'error',
        message: `Cannot add more ${dish.name}: Maximum available stock reached (${dish.stockQty} portions).`
      });
      return;
    }
    setCart(prev => ({ ...prev, [dish.itemId]: (prev[dish.itemId] || 0) + 1 }));
  };

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[dishId] > 1) {
        next[dishId]--;
      } else {
        delete next[dishId];
      }
      return next;
    });
  };

  const getCartSummary = () => {
    let count = 0;
    let total = 0;
    let stallId: string | null = null;
    let itemsList: { dish: MenuItem; qty: number; subtotal: number }[] = [];

    for (const [id, qty] of Object.entries(cart)) {
      const dish = menuItems.find(m => m.itemId === id);
      if (dish) {
        count += qty;
        total += dish.price * qty;
        stallId = dish.stallId;
        itemsList.push({ dish, qty, subtotal: dish.price * qty });
      }
    }
    return { count, total, stallId, itemsList };
  };

  // Submit Order via API
  const handlePlaceOrder = async () => {
    const summary = getCartSummary();
    if (summary.itemsList.length === 0 || !summary.stallId || !activeUser) return;

    if (activeUser.walletBalance < summary.total) {
      setNotification({
        type: 'error',
        message: `Insufficient Wallet Balance: Required ₹${summary.total.toFixed(2)}, Available: ₹${activeUser.walletBalance.toFixed(2)}. Please recharge your wallet.`
      });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        studentId: activeUser.userId,
        stallId: summary.stallId,
        instructions: orderInstructions,
        items: summary.itemsList.map(it => ({ itemId: it.dish.itemId, quantity: it.qty }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.message || 'Failed to place order.' });
      } else {
        setNotification({
          type: 'success',
          message: `Order ${data.order?.orderId} Placed Successfully! ₹${summary.total.toFixed(2)} debited from wallet.`
        });
        setCart({});
        setOrderInstructions('');
        await fetchAllData();
        await fetchOrders();
        setActiveTab('orders');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Network error placing order.' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Stall Owner: Change Order Status
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: Order['status']) => {
    if (!activeUser) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          actingRole: activeUser.role,
          actingStallId: activeUser.stallId
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.message });
      } else {
        setNotification({ type: 'success', message: data.message });
        await fetchAllData();
        await fetchOrders();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Run AI Vector Semantic Search
  const handleVectorSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setVectorResults(null);
      return;
    }
    setIsSearchingVector(true);
    try {
      const res = await fetch('/api/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, topK: 3 })
      });
      const data = await res.json();
      if (data.success) {
        setVectorResults(data.results || []);
      }
    } catch (err) {
      console.error('Vector search failed', err);
    } finally {
      setIsSearchingVector(false);
    }
  };

  const filteredMenu = menuItems.filter(m => selectedStall === 'ALL' || m.stallId === selectedStall);
  const cartSummary = getCartSummary();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* =========================================================================
          TOP BANNER: PES UNIVERSITY DBMS MINI PROJECT HEADER & RBAC BAR
      ========================================================================= */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Branding */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-orange-900/30">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-lg text-white tracking-tight">QuickBite</h1>
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-orange-500/30">
                    DBMS Mini Project
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  PES University · CSE Dept · Team: Navaneeth (PES1UG24CS709) & Rishab (PES1UG24CS710)
                </p>
              </div>
            </div>

            {/* RBAC Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/60 self-start md:self-auto">
              <div className="text-xs text-slate-400 px-2 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                <span>Active Role:</span>
              </div>
              <select
                aria-label="Active User and Role Switcher"
                value={activeUser?.userId || ''}
                onChange={e => handleUserSwitch(e.target.value)}
                className="bg-slate-900 text-xs text-white px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.role === 'Student' ? `🎓 Student: ${u.name}` : `🍳 Stall Owner: ${u.name} (${u.stallId})`}
                  </option>
                ))}
              </select>

              {/* Wallet Badge for Students */}
              {activeUser?.role === 'Student' && (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-2.5 py-1 rounded-lg text-xs font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>₹{activeUser.walletBalance.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex space-x-6 text-sm font-medium">
            {activeUser?.role === 'Student' ? (
              <>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === 'menu'
                      ? 'border-orange-500 text-orange-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Menu & AI Craving Search</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === 'orders'
                      ? 'border-orange-500 text-orange-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Track My Orders</span>
                  {orders.length > 0 && (
                    <span className="bg-slate-700 text-slate-200 text-xs px-1.5 py-0.2 rounded-full">
                      {orders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-orange-500 text-orange-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>NoSQL Reviews ({reviews.length})</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('kitchen')}
                className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'kitchen'
                    ? 'border-orange-500 text-orange-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-4 h-4 text-orange-400" />
                <span>Kitchen Queue & Inventory ({activeUser?.stallId})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          GLOBAL ALERT / NOTIFICATION
      ========================================================================= */}
      {notification && (
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 transition-all`}>
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-sm shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN BODY
      ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* =======================================================================
            TAB 1: STUDENT MENU & AI CRAVING VECTOR SEARCH
        ======================================================================= */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Vector Search + Menu */}
            <div className="lg:col-span-2 space-x-0 space-y-6">
              {/* AI Vector Semantic Craving Search Box */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent p-5 rounded-2xl border border-orange-200/80 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    AI Semantic Dish Recommendation (Vector Database)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Powered by 8D dense semantic embeddings and cosine similarity search. Type what you crave in natural language!
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g., spicy high-protein wrap, cold sweet drink, or traditional breakfast..."
                      value={cravingQuery}
                      onChange={e => setCravingQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVectorSearch(cravingQuery)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => handleVectorSearch(cravingQuery)}
                    disabled={isSearchingVector}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSearchingVector ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Recommend</span>
                  </button>
                </div>

                {/* Quick Craving Prompt Chips */}
                <div className="flex flex-wrap gap-2 mt-3 items-center">
                  <span className="text-xs text-slate-500 font-medium">Try cravings:</span>
                  {[
                    'Spicy high-protein wrap',
                    'Chilled sweet refreshing beverage',
                    'Traditional warm South Indian breakfast'
                  ].map(chip => (
                    <button
                      key={chip}
                      onClick={() => {
                        setCravingQuery(chip);
                        handleVectorSearch(chip);
                      }}
                      className="text-xs bg-white/90 hover:bg-orange-100 text-slate-700 border border-slate-200 hover:border-orange-300 px-2.5 py-1 rounded-full transition-all"
                    >
                      ✨ {chip}
                    </button>
                  ))}
                </div>

                {/* Vector Recommendations Results Banner */}
                {vectorResults && vectorResults.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-orange-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                        🎯 Top AI Semantic Matches for &quot;{cravingQuery}&quot;:
                      </span>
                      <button
                        onClick={() => {
                          setVectorResults(null);
                          setCravingQuery('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Clear Results
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {vectorResults.map((rec, i) => (
                        <div
                          key={rec.itemId}
                          className="bg-white p-3 rounded-xl border border-orange-300/80 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900">{rec.name}</span>
                              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                {rec.matchPercentage}% Match
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">{rec.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-900">₹{rec.price}</span>
                            <button
                              onClick={() => {
                                const dish = menuItems.find(m => m.itemId === rec.itemId);
                                if (dish) addToCart(dish);
                              }}
                              className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-medium px-2 py-1 rounded-lg"
                            >
                              + Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stall Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedStall('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedStall === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Food Stalls ({menuItems.length})
                </button>
                {stalls.map(s => (
                  <button
                    key={s.stallId}
                    onClick={() => setSelectedStall(s.stallId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedStall === s.stallId
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏪 {s.name} ({s.location})
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredMenu.map(dish => {
                  const stall = stalls.find(s => s.stallId === dish.stallId);
                  const isOutOfStock = dish.stockQty <= 0;
                  const qtyInCart = cart[dish.itemId] || 0;

                  return (
                    <div
                      key={dish.itemId}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Stall & Stock Pill */}
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-slate-500 font-medium">{stall?.name || dish.stallId}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : dish.stockQty < 5
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : `${dish.stockQty} in stock`}
                          </span>
                        </div>

                        {/* Title & Price */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{dish.name}</h4>
                          <span className="font-black text-slate-900 text-base whitespace-nowrap">
                            ₹{dish.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dish.description}</p>

                        {/* Dietary Tags */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {dish.dietaryTags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Add Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono">PK: {dish.itemId}</span>
                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-2 py-1 rounded-xl">
                            <button
                              onClick={() => removeFromCart(dish.itemId)}
                              className="w-6 h-6 rounded-lg bg-white text-orange-600 font-bold hover:bg-orange-100 flex items-center justify-center text-sm shadow-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-orange-950 px-1">{qtyInCart}</span>
                            <button
                              onClick={() => addToCart(dish)}
                              disabled={isOutOfStock}
                              className="w-6 h-6 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 flex items-center justify-center text-sm shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(dish)}
                            disabled={isOutOfStock}
                            className="bg-slate-900 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40 disabled:hover:bg-slate-900 flex items-center gap-1"
                          >
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Checkout Cart & Wallet Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm sticky top-20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-slate-900">Your Checkout Tray</h3>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {cartSummary.count} Items
                  </span>
                </div>

                {cartSummary.itemsList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Utensils className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs">Your tray is empty.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Select dishes from the menu to order.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {cartSummary.itemsList.map(({ dish, qty, subtotal }) => (
                      <div key={dish.itemId} className="flex items-center justify-between text-xs py-1.5">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{dish.name}</p>
                          <p className="text-slate-400 text-[11px]">
                            ₹{dish.price} × {qty}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                          <button
                            onClick={() => removeFromCart(dish.itemId)}
                            className="text-slate-400 hover:text-rose-600 text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Special Instructions */}
                    <div className="pt-2">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Kitchen Instructions (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Extra chutney, less spicy..."
                        value={orderInstructions}
                        onChange={e => setOrderInstructions(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {/* Financial Summary */}
                    <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Line Items Total</span>
                        <span>₹{cartSummary.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Student Wallet Balance</span>
                        <span className="font-semibold text-emerald-700">
                          ₹{activeUser?.walletBalance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                        <span>Balance After Debit</span>
                        <span
                          className={
                            (activeUser?.walletBalance || 0) < cartSummary.total
                              ? 'text-rose-600'
                              : 'text-slate-900'
                          }
                        >
                          ₹{((activeUser?.walletBalance || 0) - cartSummary.total).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmittingOrder || (activeUser?.walletBalance || 0) < cartSummary.total}
                      className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmittingOrder ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Pay with QuickBite Wallet</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            TAB 2: TRACK ORDERS (STUDENT VIEW)
        ======================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">My Campus Cafeteria Orders</h3>
                <p className="text-xs text-slate-500">Live order state progress backed by SQL status triggers.</p>
              </div>
              <button
                onClick={fetchOrders}
                className="text-xs flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No active orders placed yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(ord => {
                  const statusColors = {
                    Placed: 'bg-amber-100 text-amber-900 border-amber-300',
                    Cooking: 'bg-blue-100 text-blue-900 border-blue-300',
                    Ready: 'bg-purple-100 text-purple-900 border-purple-300',
                    Delivered: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    Cancelled: 'bg-rose-100 text-rose-900 border-rose-300'
                  };

                  return (
                    <div
                      key={ord.orderId}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 font-mono">
                              #{ord.orderId}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-semibold text-slate-700">
                              {ord.stallName || ord.stallId}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-400">{ord.createdAt}</span>
                          </div>
                          {ord.instructions && ord.instructions !== 'None' && (
                            <p className="text-xs text-slate-500 mt-0.5 italic">
                              &ldquo;{ord.instructions}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold border self-start sm:self-auto ${
                            statusColors[ord.status]
                          }`}
                        >
                          ● {ord.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Progression Visual Timeline */}
                      {ord.status !== 'Cancelled' ? (
                        <div className="py-4">
                          <div className="flex items-center justify-between max-w-lg mx-auto relative">
                            {['Placed', 'Cooking', 'Ready', 'Delivered'].map((step, idx) => {
                              const steps = ['Placed', 'Cooking', 'Ready', 'Delivered'];
                              const currentIndex = steps.indexOf(ord.status);
                              const isCompleted = idx <= currentIndex;
                              return (
                                <div key={step} className="flex flex-col items-center z-10">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      isCompleted
                                        ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    }`}
                                  >
                                    {idx + 1}
                                  </div>
                                  <span
                                    className={`text-[10px] mt-1 font-semibold ${
                                      isCompleted ? 'text-slate-900' : 'text-slate-400'
                                    }`}
                                  >
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                            <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-xs text-rose-700 font-medium">
                          Order was cancelled. Wallet funds automatically refunded.
                        </div>
                      )}

                      {/* Items Details */}
                      <div className="bg-slate-50 rounded-xl p-3 text-xs divide-y divide-slate-100">
                        {ord.items.map(it => (
                          <div key={it.itemId} className="flex justify-between py-1">
                            <span className="text-slate-700">
                              {it.quantity}× {it.dishName || it.itemId}
                            </span>
                            <span className="font-semibold text-slate-900">₹{it.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 font-bold text-slate-900 text-xs">
                          <span>Total Billed Amount</span>
                          <span>₹{ord.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =======================================================================
            TAB 3: KITCHEN QUEUE & RBAC MANAGEMENT (STALL OWNER VIEW)
        ======================================================================= */}
        {activeTab === 'kitchen' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-700" />
                  <h3 className="font-bold text-amber-950 text-base">
                    Stall Management Console: {activeUser?.stallId}
                  </h3>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  RBAC Enforcement active: As <b>{activeUser?.name}</b>, you are authorized to update kitchen tickets for your assigned stall only.
                </p>
              </div>
              <button
                onClick={fetchOrders}
                className="text-xs bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl font-semibold hover:bg-amber-100"
              >
                Refresh Queue
              </button>
            </div>

            {/* Kitchen Orders Cards */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800">
                Incoming Orders for {activeUser?.stallId} ({orders.length})
              </h4>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
                  No orders currently placed for this counter.
                </div>
              ) : (
                orders.map(ord => (
                  <div
                    key={ord.orderId}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-slate-900">
                          {ord.orderId}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          Customer: {ord.studentName || ord.studentId}
                        </span>
                        <span className="text-xs text-slate-400">{ord.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <b>Instructions:</b> {ord.instructions || 'Standard preparation'}
                      </p>

                      <div className="mt-2 text-xs text-slate-800 space-x-3">
                        {ord.items.map(it => (
                          <span key={it.itemId} className="inline-block bg-slate-100 px-2 py-0.5 rounded font-medium">
                            {it.quantity}× {it.dishName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* State Transition Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border">
                        Current: {ord.status}
                      </span>

                      {ord.status === 'Placed' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'Cooking')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          🍳 Start Cooking
                        </button>
                      )}

                      {ord.status === 'Cooking' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'Ready')}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          🔔 Mark Ready for Pickup
                        </button>
                      )}

                      {ord.status === 'Ready' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'Delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          ✅ Hand Over (Delivered)
                        </button>
                      )}

                      {ord.status !== 'Delivered' && ord.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'Cancelled')}
                          className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        >
                          Cancel & Auto-Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =======================================================================
            TAB 4: NOSQL REVIEWS & RATINGS
        ======================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">NoSQL Community Reviews (MongoDB)</h3>
                <p className="text-xs text-slate-500">
                  Polymorphic JSON document collection storing ratings, portion feedback, and spice metrics.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map(rev => (
                <div
                  key={rev.reviewId}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{rev.dishName}</span>
                      <div className="flex items-center text-amber-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                        <span>{rev.rating}.0 / 5.0</span>
                      </div>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-700 mt-1">{rev.reviewTitle}</h5>
                    <p className="text-xs text-slate-600 mt-1.5 italic">&ldquo;{rev.comment}&rdquo;</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>By {rev.userName}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      👍 {rev.helpfulVotes} helpful votes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          FOOTER: CURRICULUM & RUBRICS COMPLIANCE BAR
      ========================================================================= */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            QuickBite DBMS Full-Stack Deliverable · Dr. Nagasundari S & Prof. Vinay Joshi · PES University
          </span>
          <span className="text-slate-500">
            Next.js App Router · MySQL 8.0 ACID Transactions · MongoDB Document Store · AI Vector Search
          </span>
        </div>
      </footer>
    </div>
  );
}
