import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, Minus, Plus } from 'lucide-react';

function Cart({ cart, onRemoveFromCart, onUpdateCartQty, onCheckout, loading }) {
  return (
    <div className="pt-28 pb-20 max-w-6xl mx-auto px-6">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Bag</h1>
          <p className="text-slate-500 mt-2">
            {cart.items.length > 0 
              ? `You have ${cart.items.reduce((s, i) => s + i.quantity, 0)} items in your bag.` 
              : 'Your bag is empty.'}
          </p>
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={40} className="text-slate-300" />
          </div>
          <h2 className="font-heading text-xl font-bold text-slate-900 mb-2">Your bag feels light</h2>
          <p className="text-slate-500 mb-8 max-w-md">Looks like you haven't added anything to your bag yet. Explore our latest collections.</p>
          <Link
            to="/"
            className="btn-premium inline-flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-slate-900/20"
          >
            Start Shopping <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Items List */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {cart.items.map((item, idx) => (
                <div
                  key={item.product_id}
                  className={`flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 sm:p-8 group transition-colors hover:bg-slate-50/50 ${idx < cart.items.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <Link to={`/product/${item.product_id}`} className="w-full sm:w-32 aspect-square rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.src = `https://placehold.co/150x150/f8fafc/94a3b8?text=IMG`; }}
                    />
                  </Link>
                  
                  <div className="flex-1 min-w-0 flex flex-col w-full text-center sm:text-left">
                    <Link to={`/product/${item.product_id}`} className="font-heading font-semibold text-lg text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2 mb-1">
                      {item.name}
                    </Link>
                    <div className="text-sm font-medium text-slate-500 mb-4">
                      ${item.unit_price.toFixed(2)}
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-full p-1 shadow-sm text-sm font-bold text-slate-900">
                        <button
                          onClick={() => onUpdateCartQty(item.product_id, item.quantity - 1)}
                          disabled={loading || item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-all disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateCartQty(item.product_id, item.quantity + 1)}
                          disabled={loading}
                          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-all disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(item.product_id)}
                        className="text-slate-400 hover:text-danger p-2 rounded-full hover:bg-red-50 transition-all flex items-center gap-2 text-sm font-medium"
                      >
                        <Trash2 size={16} /> <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xl font-bold text-slate-900 sm:w-24 text-right hidden sm:block">
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="bg-slate-900 text-white rounded-3xl p-8 sticky top-28 shadow-2xl shadow-indigo-900/10">
              <h3 className="font-heading text-xl font-bold mb-8">Summary</h3>
              
              <div className="space-y-4 text-sm font-medium text-slate-300 mb-8">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white">${cart.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-emerald-400">Complimentary</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span className="text-white">$0.00</span>
                </div>
              </div>
              
              <div className="flex justify-between items-end pt-6 border-t border-slate-700 mb-8">
                <span className="text-slate-300 font-medium">Total</span>
                <span className="text-3xl font-bold tracking-tight">${cart.total.toFixed(2)}</span>
              </div>
              
              <button
                onClick={onCheckout}
                disabled={loading}
                className="btn-premium w-full bg-white hover:bg-indigo-50 text-slate-900 font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                Checkout Securely <ArrowRight size={18} />
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <ShieldCheck size={14} /> 256-bit Secure Encryption
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Cart;
