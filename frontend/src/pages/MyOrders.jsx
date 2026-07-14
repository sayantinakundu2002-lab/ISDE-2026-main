import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ChevronRight, RefreshCw, ShoppingCart,
  CreditCard, Box, Truck, CheckCircle2, XCircle, Download
} from 'lucide-react';

const STATE_CONFIG = {
  CREATED: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Created', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', description: 'Order received, awaiting payment confirmation' },
  PAID: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', description: 'Payment confirmed, preparing your order' },
  PACKED: { icon: Box, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Packed', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', description: 'Order packed and ready for shipment' },
  SHIPPED: { icon: Truck, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', label: 'Shipped', badgeBg: 'bg-sky-100', badgeText: 'text-sky-700', description: 'Your order is on the way!' },
  DELIVERED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered', badgeBg: 'bg-green-100', badgeText: 'text-green-700', description: 'Order delivered successfully' },
  CANCELLED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled', badgeBg: 'bg-red-100', badgeText: 'text-red-700', description: 'This order has been cancelled' },
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

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getMyOrders();
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
            My Orders
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Track the status of your orders
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
      {loading && orders.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-40 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-60" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-heading text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
          <p className="text-slate-500 text-sm mb-6">Start shopping to see your orders here.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const stateConfig = STATE_CONFIG[order.state] || STATE_CONFIG.CREATED;
            const StateIcon = stateConfig.icon;
            const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.state);
            const isCancelled = order.state === 'CANCELLED';

            return (
              <div
                key={order.order_id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${stateConfig.border}`}
              >
                {/* Order Header */}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
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
                        <div className="text-xs text-slate-500 mt-1">
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} · <span className="font-semibold text-slate-700">${order.total?.toFixed(2)}</span> · {order.created_at}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => downloadInvoice(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors text-xs font-semibold rounded-full active:scale-95 transition-all"
                        title="Download Invoice PDF/Bill"
                      >
                        <Download size={12} />
                        <span>Download Bill</span>
                      </button>
                      <Link
                        to={`/orders/${order.order_id}`}
                        className="text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 text-xs font-semibold"
                      >
                        Details <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className={`${stateConfig.bg} rounded-xl px-4 py-3 mb-4`}>
                    <p className={`text-sm font-medium ${stateConfig.color}`}>
                      {stateConfig.description}
                    </p>
                  </div>

                  {/* Lifecycle Progress */}
                  {!isCancelled && (
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
                  )}

                  {/* Order Items Preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-5 h-5 rounded object-contain bg-white"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <span className="text-xs text-slate-400 px-2 py-1.5">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
