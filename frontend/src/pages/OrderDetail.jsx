import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { ArrowLeft, Package, CheckCircle2, Truck, CreditCard, Box, XCircle, ChevronRight, Download, X, MapPin, Store, User } from 'lucide-react';

const STATE_CONFIG = {
  CREATED: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Created' },
  PAID: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid' },
  PACKED: { icon: Box, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Packed' },
  SHIPPED: { icon: Truck, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Shipped' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
  CANCELLED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled' },
};

const LIFECYCLE_STEPS = ['CREATED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];

function downloadInvoice(order) {
  const line = "==================================================";
  const shortLine = "--------------------------------------------------";
  
  let billText = "";
  billText += `${line}\n`;
  billText += `               ISDE MINISHOP INVOICE              \n`;
  billText += `${line}\n\n`;
  billText += `Order ID:      ${order.order_id}\n`;
  billText += `Date:          ${order.created_at}\n`;
  billText += `Customer:      ${order.username}\n`;
  billText += `Status:        ${order.state}\n`;
  if (order.seller_name) {
    billText += `Seller:        ${order.seller_name}\n`;
  }
  if (order.seller_address && order.seller_address !== "Not Provided") {
    billText += `Shipped From:  ${order.seller_address}\n`;
  }
  if (order.shipping_address) {
    billText += `Deliver To:    ${order.shipping_address}\n`;
  }
  billText += `\n${shortLine}\n`;
  billText += ` ITEMS\n`;
  billText += `${shortLine}\n`;
  
  order.items.forEach(item => {
    const itemTotalStr = `$${(item.subtotal || 0).toFixed(2)}`;
    const quantityStr = `${item.quantity} x $${(item.unit_price || 0).toFixed(2)}`;
    billText += `${item.name.padEnd(30)} ${quantityStr.padStart(10)} ${itemTotalStr.padStart(8)}\n`;
  });
  
  billText += `${shortLine}\n`;
  billText += ` PRICE BREAKDOWN\n`;
  billText += `${shortLine}\n`;
  
  const subtotal = order.breakdown?.subtotal || order.subtotal || 0;
  const discount = order.breakdown?.discount || order.discount || 0;
  const shipping = order.breakdown?.shipping || order.shipping || 0;
  const tax = order.tax || 0;
  const total = order.breakdown?.total || order.total || 0;
  
  billText += `Subtotal:`.padEnd(40) + ` $${subtotal.toFixed(2)}`.padStart(10) + `\n`;
  if (discount > 0) {
    billText += `Discount:`.padEnd(40) + `-$${discount.toFixed(2)}`.padStart(10) + `\n`;
  }
  billText += `Shipping:`.padEnd(40) + ` $${shipping.toFixed(2)}`.padStart(10) + `\n`;
  billText += `Tax:`.padEnd(40) + ` $${tax.toFixed(2)}`.padStart(10) + `\n`;
  billText += `${shortLine}\n`;
  billText += `TOTAL DUE:`.padEnd(40) + ` $${total.toFixed(2)}`.padStart(10) + `\n`;
  billText += `${line}\n\n`;
  billText += `         Thank you for shopping with us!          \n`;
  billText += `${line}\n`;

  const blob = new Blob([billText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bill_${order.order_id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const TRANSITION_LABELS = {
  PAID: { label: 'Mark as Paid', icon: CreditCard, color: 'bg-emerald-600 hover:bg-emerald-700' },
  PACKED: { label: 'Mark as Packed', icon: Box, color: 'bg-purple-600 hover:bg-purple-700' },
  SHIPPED: { label: 'Mark as Shipped', icon: Truck, color: 'bg-sky-600 hover:bg-sky-700' },
  DELIVERED: { label: 'Mark as Delivered', icon: CheckCircle2, color: 'bg-green-600 hover:bg-green-700' },
  CANCELLED: { label: 'Cancel Order', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
};

function OrderDetail({ showToast }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState(null);
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  const [otpRequested, setOtpRequested] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      await api.requestDeliveryOtp(id);
      setOtpRequested(true);
      if (showToast) showToast('OTP Sent', 'Delivery OTP has been emailed to the customer.', 'info');
    } catch (err) {
      setOtpError(err.message || 'Failed to request OTP');
      if (showToast) showToast('Error', err.message || 'Failed to request OTP', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyDelivery = async (e) => {
    e.preventDefault();
    if (!deliveryOtp || deliveryOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await api.verifyDeliveryOtp(id, deliveryOtp);
      setOrder(res.order);
      setOtpRequested(false);
      setDeliveryOtp('');
      if (showToast) showToast('Order Delivered', 'Order marked as DELIVERED successfully!', 'success');
    } catch (err) {
      setOtpError(err.message || 'OTP verification failed');
      if (showToast) showToast('Error', err.message || 'Verification failed', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <button
            onClick={() => downloadInvoice(order)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full active:scale-95 transition-all shadow-md shrink-0 sm:self-center"
          >
            <Download size={16} />
            <span>Download Bill</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <XCircle size={18} className="text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Shipping & Seller Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Shipping Address */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-indigo-500" />
            </div>
            <h3 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider">Delivery Address</h3>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed">{order.shipping_address || 'Not provided'}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <User size={12} />
            <span>{order.username}</span>
          </div>
        </div>

        {/* Seller Info */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-purple-500" />
            </div>
            <h3 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider">Seller Info</h3>
          </div>
          <p className="text-sm font-semibold text-slate-800">{order.seller_name || 'ISDE Seller'}</p>
          {order.seller_address && order.seller_address !== 'Not Provided' && (
            <p className="text-xs text-slate-500 mt-1">Ships from: {order.seller_address}</p>
          )}
        </div>
      </div>

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
      {order.allowed_transitions && order.allowed_transitions.length > 0 && (
        <>          {/* Admin Actions (No Cancel) */}
          {isAdmin && order.allowed_transitions.filter(t => t !== 'CANCELLED').length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-sm">
              <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                {/* Standard transitions */}
                {order.allowed_transitions
                  .filter(t => t !== 'CANCELLED' && t !== 'DELIVERED')
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

                {/* Delivery OTP trigger transition button */}
                {order.allowed_transitions.includes('DELIVERED') && (
                  <button
                    onClick={handleRequestOtp}
                    disabled={otpLoading || transitioning}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full active:scale-95 transition-all shadow-md disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          )}

          {/* User Cancel Action (Only User) */}
          {!isAdmin && order.allowed_transitions.includes('CANCELLED') && (
            <div className="bg-white border border-red-100 rounded-2xl p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-sm font-bold text-red-600 uppercase tracking-wider mb-1">Cancel Order</h2>
                <p className="text-xs text-slate-500">You can still cancel this order before it ships.</p>
              </div>
              <button
                onClick={() => handleTransition('CANCELLED')}
                disabled={transitioning}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-red-600 text-sm font-semibold rounded-full border-2 border-red-200 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                <XCircle size={16} />
                Cancel Order
              </button>
            </div>
          )}
        </>
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

        {/* Order Items with Images */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Items ({order.items?.length || 0})
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                {/* Product Image */}
                <img
                  src={item.image_url || `https://placehold.co/56x56/f8fafc/94a3b8?text=${encodeURIComponent(item.name?.charAt(0) || '?')}`}
                  alt={item.name}
                  className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-200 shrink-0"
                  onError={(e) => { e.target.src = `https://placehold.co/56x56/f8fafc/94a3b8?text=${encodeURIComponent(item.name?.charAt(0) || '?')}`; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.quantity} × ${item.unit_price?.toFixed(2)}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 shrink-0">${item.subtotal?.toFixed(2)}</span>
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
      {/* POPUP MODAL FOR DELIVERY OTP */}
      {otpRequested && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 max-w-md w-full relative animate-scaleUp">
            
            {/* Close modal button */}
            <button 
              onClick={() => {
                setOtpRequested(false);
                setDeliveryOtp('');
                setOtpError(null);
              }}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors z-20"
            >
              <X size={18} />
            </button>

            <div className="pt-4 pb-6 text-center relative z-10">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-md">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-heading text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Verify Delivery Code
              </h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                A 6-digit verification code has been emailed to the customer. Please enter the OTP code below to confirm receipt of the delivery.
              </p>
            </div>

            <form onSubmit={handleVerifyDelivery} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={deliveryOtp}
                  onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-4 border-2 border-slate-200 focus:border-green-500 rounded-2xl text-center text-2xl font-bold font-mono tracking-[0.5em] focus:outline-none transition-all"
                />
              </div>

              {otpError && (
                <p className="text-xs text-red-600 font-semibold text-center">{otpError}</p>
              )}

              <button
                type="submit"
                disabled={otpLoading || deliveryOtp.length !== 6}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full active:scale-95 transition-all shadow-lg shadow-green-950/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Verify & Deliver'
                )}
              </button>

              <div className="flex justify-between items-center text-xs px-2 pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpRequested(false);
                    setDeliveryOtp('');
                    setOtpError(null);
                  }}
                  className="text-slate-500 hover:underline font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetail;
