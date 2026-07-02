import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Package, ChevronRight, RefreshCw, ShoppingCart } from 'lucide-react';

const STATE_STYLES = {
  CREATED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Created' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Paid' },
  PACKED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Packed' },
  SHIPPED: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400', label: 'Shipped' },
  DELIVERED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Delivered' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
};

function StateBadge({ state }) {
  const style = STATE_STYLES[state] || STATE_STYLES.CREATED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">
            Orders
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Track and manage order lifecycle
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-heading text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
          <p className="text-slate-500 text-sm mb-6">Place your first order to see it here.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.order_id}
              to={`/orders/${order.order_id}`}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                  <Package size={20} className="text-slate-500 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-heading font-bold text-slate-900 text-sm">{order.order_id}</span>
                    <StateBadge state={order.state} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} · ${order.total?.toFixed(2)} · {order.created_at}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
