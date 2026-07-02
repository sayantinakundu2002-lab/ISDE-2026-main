import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Package, RefreshCw, Plus, ChevronRight, ShoppingCart,
  CreditCard, Box, Truck, CheckCircle2, XCircle, LayoutDashboard,
  Users, TrendingUp, ClipboardList, Edit3, Trash2, Eye, Tag
} from 'lucide-react';

const STATE_CONFIG = {
  CREATED: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Created', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
  PAID: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  PACKED: { icon: Box, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Packed', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  SHIPPED: { icon: Truck, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Shipped', badgeBg: 'bg-sky-100', badgeText: 'text-sky-700' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered', badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  CANCELLED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
};

const LIFECYCLE_STEPS = ['CREATED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];

const TRANSITION_LABELS = {
  PAID: { label: 'Confirm Payment', icon: CreditCard, color: 'bg-emerald-600 hover:bg-emerald-700' },
  PACKED: { label: 'Mark Packed', icon: Box, color: 'bg-purple-600 hover:bg-purple-700' },
  SHIPPED: { label: 'Ship Order', icon: Truck, color: 'bg-sky-600 hover:bg-sky-700' },
  DELIVERED: { label: 'Mark Delivered', icon: CheckCircle2, color: 'bg-green-600 hover:bg-green-700' },
  CANCELLED: { label: 'Cancel', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
};

function AdminDashboard({ showToast, refreshProducts }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await api.listProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product.id);
    try {
      const res = await api.deleteProduct(product.id);
      showToast('Deleted', res.message || 'Product removed.', 'success');
      await loadProducts();
      if (refreshProducts) await refreshProducts();
    } catch (err) {
      showToast('Error', err.message || 'Failed to delete product.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTransition = async (orderId, targetState) => {
    setTransitioning(orderId);
    try {
      const res = await api.transitionOrder(orderId, targetState);
      showToast('Order Updated', `${orderId} → ${targetState}`, 'success');
      // Update order in state
      setOrders(prev => prev.map(o =>
        o.order_id === orderId ? res.order : o
      ));
    } catch (err) {
      showToast('Error', err.message || 'Transition failed', 'error');
    } finally {
      setTransitioning(null);
    }
  };

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.state === 'CREATED' || o.state === 'PAID').length;
  const shippedOrders = orders.filter(o => o.state === 'SHIPPED' || o.state === 'DELIVERED').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-13">
            Manage products, orders, and inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/add-product"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
          >
            <Plus size={16} /> Create Product
          </Link>
          <button
            onClick={() => { loadOrders(); loadProducts(); }}
            disabled={loading || productsLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading || productsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-indigo-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalOrders}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClipboardList size={18} className="text-amber-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingOrders}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <Truck size={18} className="text-green-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipped / Delivered</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{shippedOrders}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenue</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to="/add-product"
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all group"
        >
          <Plus size={24} className="mb-2 opacity-80 group-hover:scale-110 transition-transform" />
          <div className="font-heading font-bold text-lg">Create Product</div>
          <div className="text-indigo-200 text-sm mt-1">Add new products to the catalog</div>
        </Link>
        <Link
          to="/inventory-logs"
          className="bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all group"
        >
          <ClipboardList size={24} className="mb-2 opacity-80 group-hover:scale-110 transition-transform" />
          <div className="font-heading font-bold text-lg">Inventory Logs</div>
          <div className="text-slate-300 text-sm mt-1">Stock changes & reorder alerts</div>
        </Link>
        <Link
          to="/"
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all group"
        >
          <Eye size={24} className="mb-2 opacity-80 group-hover:scale-110 transition-transform" />
          <div className="font-heading font-bold text-lg">Browse Catalog</div>
          <div className="text-purple-200 text-sm mt-1">Explore products in the store</div>
        </Link>
      </div>

      {/* Product Catalog */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <Tag size={20} className="text-indigo-500" />
              Product Catalog
            </h2>
            <p className="text-slate-500 text-sm mt-1">View, edit, and remove products</p>
          </div>
          <span className="text-sm font-medium text-slate-500">{products.length} product{products.length !== 1 ? 's' : ''}</span>
        </div>

        {productsLoading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
            <RefreshCw size={32} className="mx-auto text-indigo-400 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-heading text-lg font-semibold text-slate-700 mb-2">No products yet</h3>
            <p className="text-slate-500 text-sm mb-4">Create your first product to get started.</p>
            <Link
              to="/add-product"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all"
            >
              <Plus size={16} /> Create Product
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Product</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Price</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Stock</th>
                    <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const discountPct = product.discount_percent || 0;
                    const finalPrice = discountPct > 0
                      ? product.price * (1 - discountPct / 100)
                      : product.price;

                    return (
                      <tr key={product.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-contain bg-slate-100 border border-slate-200 shrink-0"
                              onError={(e) => { e.target.src = `https://placehold.co/40x40/f8fafc/94a3b8?text=${encodeURIComponent(product.name.charAt(0))}`; }}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                              {discountPct > 0 && (
                                <span className="text-xs text-red-500 font-semibold">-{discountPct}% off</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 capitalize">{product.category?.replace('_', ' ')}</td>
                        <td className="px-5 py-4">
                          {discountPct > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-600">${finalPrice.toFixed(2)}</span>
                              <span className="text-slate-400 line-through ml-2 text-xs">${product.price.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900">${product.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            product.stock > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {product.stock} in stock
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/product/${product.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-full border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                              <Eye size={13} /> View
                            </Link>
                            <Link
                              to={`/edit-product/${product.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-all"
                            >
                              <Edit3 size={13} /> Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              disabled={deletingId === product.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 rounded-full border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              {deletingId === product.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Orders Timeline */}
      <div className="mb-4">
        <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package size={20} className="text-indigo-500" />
          Order Timeline
        </h2>
        <p className="text-slate-500 text-sm mt-1">Manage order lifecycle from creation to delivery</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-heading text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
          <p className="text-slate-500 text-sm">Orders will appear here when customers place them.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const stateConfig = STATE_CONFIG[order.state] || STATE_CONFIG.CREATED;
            const StateIcon = stateConfig.icon;
            const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.state);
            const isCancelled = order.state === 'CANCELLED';
            const isTerminal = order.state === 'DELIVERED' || order.state === 'CANCELLED';

            return (
              <div
                key={order.order_id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${stateConfig.border}`}
              >
                {/* Order Header */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-11 h-11 ${stateConfig.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <StateIcon size={20} className={stateConfig.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-heading font-bold text-slate-900 text-sm">{order.order_id}</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${stateConfig.badgeBg} ${stateConfig.badgeText}`}>
                          <span className={`w-2 h-2 rounded-full ${stateConfig.color.replace('text-', 'bg-')}`} />
                          {stateConfig.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {order.username || 'guest'}
                        </span>
                        <span>·</span>
                        <span>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700">${order.total?.toFixed(2)}</span>
                        <span>·</span>
                        <span>{order.created_at}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/orders/${order.order_id}`}
                    className="text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>

                {/* Lifecycle Progress Bar */}
                {!isCancelled && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center">
                      {LIFECYCLE_STEPS.map((step, idx) => {
                        const stepConfig = STATE_CONFIG[step];
                        const StepIcon = stepConfig.icon;
                        const isComplete = currentStepIdx >= idx;
                        const isCurrent = currentStepIdx === idx;
                        return (
                          <div key={step} className="flex items-center flex-1 last:flex-initial">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isComplete
                                  ? isCurrent
                                    ? `${stepConfig.bg} ring-2 ring-offset-1 ${stepConfig.border}`
                                    : 'bg-green-100'
                                  : 'bg-slate-100'
                              }`}>
                                <StepIcon size={14} className={isComplete ? (isCurrent ? stepConfig.color : 'text-green-500') : 'text-slate-400'} />
                              </div>
                              <span className={`text-[10px] font-semibold mt-1 ${isComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                                {stepConfig.label}
                              </span>
                            </div>
                            {idx < LIFECYCLE_STEPS.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${
                                currentStepIdx > idx ? 'bg-green-300' : 'bg-slate-200'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transition Actions */}
                {!isTerminal && order.allowed_transitions && order.allowed_transitions.length > 0 && (
                  <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2 border-t border-slate-100">
                    {order.allowed_transitions
                      .filter(t => t !== 'CANCELLED')
                      .map((targetState) => {
                        const config = TRANSITION_LABELS[targetState] || { label: targetState, icon: ChevronRight, color: 'bg-slate-600' };
                        const BtnIcon = config.icon;
                        return (
                          <button
                            key={targetState}
                            onClick={() => handleTransition(order.order_id, targetState)}
                            disabled={transitioning === order.order_id}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-full ${config.color} active:scale-95 transition-all shadow-sm disabled:opacity-50`}
                          >
                            <BtnIcon size={14} />
                            {config.label}
                          </button>
                        );
                      })}
                    {order.allowed_transitions.includes('CANCELLED') && (
                      <button
                        onClick={() => handleTransition(order.order_id, 'CANCELLED')}
                        disabled={transitioning === order.order_id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-red-600 text-xs font-semibold rounded-full border border-red-200 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
