import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Copy, ArrowRight, Check, Tag, ShieldCheck, CreditCard, ShoppingBag, X, MapPin } from 'lucide-react';
import { api } from '../api';

function Checkout({ cart, loadCart, showToast }) {
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [summary, setSummary] = useState({
    subtotal: 0.0,
    discount: 0.0,
    shipping: 0.0,
    tax: 0.0,
    total: 0.0
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  // Load checkout summary when promo code or cart items change
  const fetchSummary = async (code = '') => {
    setLoadingSummary(true);
    try {
      const data = await api.getCheckoutSummary(cart.cart_id || 'default', code);
      setSummary(data);
      if (code) {
        setAppliedPromo(code);
        showToast('Promo Applied', `Successfully applied promo code: ${code}`, 'success');
      } else {
        setAppliedPromo('');
      }
    } catch (err) {
      showToast('Error', err.message || 'Failed to fetch bill summary.', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (cart.items.length > 0) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items]);

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const code = promoCode.trim().toUpperCase();
    if (code !== 'SAVE10' && code !== 'BULK20') {
      showToast('Invalid Code', 'Try SAVE10 (10% off) or BULK20 ($20 off bulk orders).', 'error');
      return;
    }
    fetchSummary(code);
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    fetchSummary('');
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      showToast('Error', 'Shipping address is required to place your order.', 'error');
      return;
    }
    setPlacingOrder(true);
    try {
      const orderReceipt = await api.placeOrder(cart.cart_id || 'default', appliedPromo, shippingAddress.trim());
      setReceipt(orderReceipt);
      showToast('Success', 'Your order was placed successfully!', 'success');
      await loadCart(); // Refresh cart to empty it on the app level
    } catch (err) {
      showToast('Order Failed', err.message || 'There was an issue processing your order.', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    setReceipt(null);
    navigate('/');
  };

  if (cart.items.length === 0 && !receipt) {
    return (
      <div className="pt-32 pb-20 max-w-lg mx-auto px-6 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={32} className="text-slate-300" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">Your bag is empty</h2>
        <p className="text-slate-500 mb-8">Add premium gear to your bag before proceeding to checkout.</p>
        <Link to="/" className="btn-premium inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:bg-slate-800 transition-all">
          Explore Catalog <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-6xl mx-auto px-6 relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left column: Checkout Bill details */}
        <div className="lg:col-span-7">
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight mb-8">Checkout</h1>
          
          <div className="animate-slideUp bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-8" style={{ animationDelay: '0ms' }}>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingBag size={20} className="text-slate-600" /> Review Items
            </h2>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex gap-4 items-center py-2 border-b border-slate-50 last:border-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={item.image_url} alt={item.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-semibold text-sm text-slate-900 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.quantity} x ${item.unit_price.toFixed(2)}</p>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">${item.subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address section */}
          <div className="animate-slideUp bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-8" style={{ animationDelay: '50ms' }}>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-slate-600" /> Shipping Address
            </h2>
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Delivery Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your full shipping address..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-950 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>
          </div>

          <div className="animate-slideUp bg-white rounded-3xl border border-slate-100 p-8 shadow-sm" style={{ animationDelay: '75ms' }}>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-slate-600" /> Payment & Promo
            </h2>

            {/* Promo code entry */}
            <form onSubmit={handleApplyPromo} className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Promo Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter SAVE10 or BULK20"
                    disabled={!!appliedPromo || loadingSummary}
                    className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-12 pr-4 text-sm font-semibold text-slate-950 focus:outline-none focus:border-slate-900 disabled:opacity-60"
                  />
                </div>
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 px-6 rounded-full text-sm font-bold transition-all"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loadingSummary}
                    className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-6 rounded-full text-sm transition-all"
                  >
                    Apply
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tip: Use <span className="font-bold text-slate-600">SAVE10</span> for 10% off. High subtotal (&gt;$150) gets automatically discounted if no coupon is set.
              </p>
            </form>

          </div>
        </div>

        {/* Right column: Sticky Checkout Bill Summary card */}
        <div className="lg:col-span-5 animate-slideUp" style={{ animationDelay: '150ms' }}>
          <div className="bg-slate-900 text-white rounded-3xl p-8 sticky top-28 shadow-2xl shadow-indigo-900/10">
            <h3 className="font-heading text-xl font-bold mb-8">Checkout Summary</h3>
            
            <div className="space-y-4 text-sm font-medium text-slate-300 mb-8 border-b border-slate-800 pb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white">${summary.subtotal.toFixed(2)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1"><Tag size={12} /> Discount {appliedPromo ? `(${appliedPromo})` : '(Bulk Special)'}</span>
                  <span>-${summary.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                {summary.shipping === 0 ? (
                  <span className="text-emerald-400 font-semibold">Complimentary</span>
                ) : (
                  <span className="text-white">${summary.shipping.toFixed(2)}</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Orders under $50 include a $10 shipping charge.
              </div>
              <div className="flex justify-between">
                <span>Taxes (8%)</span>
                <span className="text-white">${summary.tax.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end pt-2 mb-8">
              <span className="text-slate-300 font-medium">Total due</span>
              <span className="text-3xl font-bold tracking-tight text-white">${summary.total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder || loadingSummary || cart.items.length === 0}
              className="btn-premium w-full bg-white hover:bg-indigo-50 text-slate-900 font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-white/5"
            >
              {placingOrder ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Place Order <ArrowRight size={18} /></>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck size={14} className="text-emerald-400" /> Secure Checkout - 256-bit Encryption
            </div>
          </div>
        </div>

      </div>

      {/* POPUP MODAL SCREEN FOR COMPLETED ORDER */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative max-w-xl w-full animate-scaleUp">
            
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-50 to-transparent pointer-events-none" />

            {/* Close modal button */}
            <button 
              onClick={handleFinish}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors z-20"
            >
              <X size={18} />
            </button>

            <div className="pt-12 pb-6 px-8 text-center relative z-10">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 text-white animate-bounce">
                <Sparkles size={24} />
              </div>
              <h1 className="font-heading text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Order Placed!
              </h1>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Thank you for your purchase. The state machine successfully processed your request, inventory stocks were updated, and your shopping bag has been cleared.
              </p>
            </div>

            {/* Ticket Card Details */}
            <div className="px-8 pb-10">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 mb-6 relative">
                
                {/* Side tickets circles */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r border-slate-200/60"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l border-slate-200/60"></div>

                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/80 border-dashed">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">Order Number</div>
                    <div className="font-mono text-slate-900 font-semibold text-sm">{receipt.transactionId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">Date</div>
                    <div className="text-xs font-medium text-slate-700">{receipt.date.split(',')[0]}</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4 max-h-[150px] overflow-y-auto pr-2">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="font-medium text-slate-700 text-xs">{item.quantity}x {item.name}</div>
                      <div className="font-semibold text-slate-900 text-xs">${item.subtotal.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-slate-200/80 border-dashed text-sm">
                  <span className="text-slate-500 font-medium">Grand Total Paid</span>
                  <span className="text-xl font-bold text-emerald-600">${receipt.total.toFixed(2)}</span>
                </div>

              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCopyReceipt}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 text-sm transition-all"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? 'Saved' : 'Save Receipt'}
                </button>
                <button
                  onClick={handleFinish}
                  className="btn-premium flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 text-sm transition-all shadow-lg"
                >
                  Continue shopping <ArrowRight size={16} />
                </button>
              </div>
              {receipt.order_id && (
                <Link
                  to={`/orders/${receipt.order_id}`}
                  className="mt-3 w-full text-center py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-full text-sm hover:bg-indigo-100 transition-all block"
                >
                  View Order →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Checkout;
