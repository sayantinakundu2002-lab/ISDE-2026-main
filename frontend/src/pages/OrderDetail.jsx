import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { ArrowLeft, Package, CheckCircle2, Truck, CreditCard, Box, XCircle, ChevronRight } from 'lucide-react';

const STATE_CONFIG = {
  CREATED: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Created' },
  PAID: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid' },
  PACKED: { icon: Box, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Packed' },
  SHIPPED: { icon: Truck, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Shipped' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
  CANCELLED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled' },
};

const LIFECYCLE_STEPS = ['CREATED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];

const TRANSITION_LABELS = {
  PAID: { label: 'Mark as Paid', icon: CreditCard, color: 'bg-emerald-600 hover:bg-emerald-700' },
  PACKED: { label: 'Mark as Packed', icon: Box, color: 'bg-purple-600 hover:bg-purple-700' },
  SHIPPED: { label: 'Mark as Shipped', icon: Truck, color: 'bg-sky-600 hover:bg-sky-700' },
  DELIVERED: { label: 'Mark as Delivered', icon: CheckCircle2, color: 'bg-green-600 hover:bg-green-700' },
  CANCELLED: { label: 'Cancel Order', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
};

function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState(null);
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  const handleTransition = async (targetState) => {
    setTransitioning(true);
    setError(null);
    try {
      const res = await api.transitionOrder(id, targetState);
      setOrder(res.order);
    } catch (err) {
      setError(err.message || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getOrder(id);
        setOrder(res);
      } catch (err) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mx-auto mb-4" />
          <div className="h-4 bg-slate-200 rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 text-center">
        <Package size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-heading font-bold text-slate-700 mb-2">Order not found</h2>
        <p className="text-slate-500 text-sm mb-4">{error || `No order with ID ${id}`}</p>
        <Link to={isAdmin ? '/admin' : '/my-orders'} className="text-indigo-500 hover:underline text-sm font-semibold">← Back to {isAdmin ? 'Dashboard' : 'My Orders'}</Link>
      </div>
    );
  }

  const stateConfig = STATE_CONFIG[order.state] || STATE_CONFIG.CREATED;
  const StateIcon = stateConfig.icon;
  const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.state);
  const isCancelled = order.state === 'CANCELLED';

  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-16">
      {/* Back */}
      <Link to={isAdmin ? '/admin' : '/my-orders'} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to {isAdmin ? 'Dashboard' : 'My Orders'}
      </Link>

      {/* Order Header */}
      <div className={`${stateConfig.bg} border ${stateConfig.border} rounded-2xl p-6 mb-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
            <StateIcon size={28} className={stateConfig.color} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">{order.order_id}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white ${stateConfig.color}`}>
                {stateConfig.label}
              </span>
              <span className="text-sm text-slate-500">{order.created_at}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <XCircle size={18} className="text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Lifecycle Progress */}
      {!isCancelled && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Order Lifecycle</h2>
          <div className="flex items-center justify-between">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const stepConfig = STATE_CONFIG[step];
              const StepIcon = stepConfig.icon;
              const isComplete = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isComplete
                        ? isCurrent
                          ? `${stepConfig.bg} ring-4 ring-${stepConfig.color.replace('text-', '')}/20`
                          : 'bg-green-100'
                        : 'bg-slate-100'
                    }`}>
                      <StepIcon size={18} className={isComplete ? (isCurrent ? stepConfig.color : 'text-green-500') : 'text-slate-400'} />
                    </div>
                    <span className={`text-xs font-semibold mt-2 ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>
                      {stepConfig.label}
                    </span>
                  </div>
                  {idx < LIFECYCLE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${
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
      {isAdmin && order.allowed_transitions && order.allowed_transitions.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {order.allowed_transitions
              .filter(t => t !== 'CANCELLED')
              .map((targetState) => {
                const config = TRANSITION_LABELS[targetState] || { label: targetState, icon: ChevronRight, color: 'bg-slate-600' };
                const BtnIcon = config.icon;
                return (
                  <button
                    key={targetState}
                    onClick={() => handleTransition(targetState)}
                    disabled={transitioning}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-full ${config.color} active:scale-95 transition-all shadow-md disabled:opacity-50`}
                  >
                    <BtnIcon size={16} />
                    {config.label}
                  </button>
                );
              })}
            {order.allowed_transitions.includes('CANCELLED') && (
              <button
                onClick={() => handleTransition('CANCELLED')}
                disabled={transitioning}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-red-600 text-sm font-semibold rounded-full border-2 border-red-200 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
              >
                <XCircle size={16} />
                Cancel Order
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Price Breakdown</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">${order.breakdown?.subtotal?.toFixed(2) || order.subtotal?.toFixed(2)}</span>
            </div>
            {(order.breakdown?.discount > 0 || order.discount > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount</span>
                <span className="font-semibold text-green-600">-${(order.breakdown?.discount || order.discount)?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Shipping</span>
              <span className="font-semibold text-slate-900">${(order.breakdown?.shipping || order.shipping)?.toFixed(2)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span className="font-semibold text-slate-900">${order.tax?.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="font-heading font-bold text-slate-900">Total</span>
              <span className="font-heading font-bold text-lg text-slate-900">${(order.breakdown?.total || order.total)?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Items ({order.items?.length || 0})
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.quantity} × ${item.unit_price?.toFixed(2)}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">${item.subtotal?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* State History */}
      {order.history && order.history.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mt-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">State History</h2>
          <div className="space-y-2">
            {order.history.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm py-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full shrink-0" />
                <span className="text-slate-500 font-mono text-xs">{entry.timestamp}</span>
                <span className="text-slate-700">
                  {entry.from ? `${entry.from} → ${entry.to}` : `Order ${entry.to}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetail;
