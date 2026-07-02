import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { ShoppingBag, ArrowLeft, Star, Minus, Plus, ShieldCheck, Truck, Percent, Edit3, Trash2 } from 'lucide-react';

function ProductDetail({ onAddToCart, loading, showToast, refreshProducts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setFetching(true);
      try {
        const data = await api.getProduct(id);
        setProduct(data);
      } catch {
        showToast('Error', 'Could not load product details.', 'error');
      } finally {
        setFetching(false);
      }
    };
    fetchProduct();
  }, [id, showToast]);

  if (fetching) {
    return (
      <div className="pt-32 pb-20 max-w-7xl mx-auto px-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-20 max-w-lg mx-auto px-6 text-center">
        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">Product Not Found</h2>
        <Link to="/" className="btn-premium inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    onAddToCart(product.id, product.name, product.stock, qty);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      const res = await api.deleteProduct(product.id);
      showToast('Deleted', res.message || 'Product removed.', 'success');
      if (refreshProducts) await refreshProducts();
      navigate('/');
    } catch (err) {
      showToast('Error', err.message || 'Failed to delete product.', 'error');
    }
  };

  const discountPct = product.discount_percent || 0;
  const originalPrice = product.price;
  const discountedPrice = discountPct > 0 ? originalPrice * (1 - discountPct / 100) : originalPrice;

  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-900 transition-colors">
            <ArrowLeft size={14} />
          </div>
          Back to Explore
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to={`/edit-product/${product.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
            >
              <Edit3 size={16} /> Edit Product
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 text-sm font-semibold rounded-full border border-red-200 hover:bg-red-50 active:scale-95 transition-all"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-12 shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-12 lg:gap-20">
        
        {/* Left: Image */}
        <div className="lg:w-1/2 rounded-2xl bg-slate-50 border border-slate-100 p-12 flex items-center justify-center relative overflow-hidden group aspect-square lg:aspect-auto min-h-[400px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-transparent opacity-50" />
          {discountPct > 0 && (
            <div className="absolute top-6 right-6 z-10">
              <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1">
                <Percent size={14} /> {discountPct}% OFF
              </span>
            </div>
          )}
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-full max-w-full object-contain mix-blend-multiply relative z-10 transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { e.target.src = `https://placehold.co/800x800/f8fafc/94a3b8?text=${encodeURIComponent(product.name)}`; }}
          />
        </div>

        {/* Right: Details */}
        <div className="lg:w-1/2 flex flex-col justify-center">
          <div className="mb-2">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest uppercase mb-4 border border-indigo-100">
              {product.category.replace('_', ' ')}
            </span>
          </div>

          <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="text-amber-700 font-bold text-sm">{product.rating}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm font-medium">Premium Edition</span>
            {discountPct > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-red-500 text-sm font-bold">{discountPct}% discount</span>
              </>
            )}
          </div>

          <div className="mb-8">
            {discountPct > 0 ? (
              <>
                <span className="text-4xl font-bold text-emerald-600 tracking-tight">${discountedPrice.toFixed(2)}</span>
                <span className="text-slate-400 text-lg line-through ml-3">${originalPrice.toFixed(2)}</span>
                <span className="ml-3 inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
                  Save ${(originalPrice - discountedPrice).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-4xl font-bold text-slate-900 tracking-tight">${originalPrice.toFixed(2)}</span>
            )}
          </div>

          <p className="text-slate-600 text-base leading-relaxed mb-10 font-light">
            {product.description}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-10 pt-8 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">2 Year Warranty</div>
                <div className="text-slate-500 text-xs">Included on all items</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Truck size={18} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Free Express</div>
                <div className="text-slate-500 text-xs">Delivery in 2 days</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto">
            {!isAdmin && product.stock > 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full h-14 p-1 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-all"
                    disabled={qty <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-all"
                    disabled={qty >= product.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="btn-premium flex-1 w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold h-14 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={18} />
                  ADD TO BAG
                </button>
              </div>
            )}

            {!isAdmin && product.stock <= 0 && (
              <div className="bg-slate-100 text-slate-500 font-bold h-14 rounded-full flex items-center justify-center w-full">
                OUT OF STOCK
              </div>
            )}

            <div className={`text-center text-xs font-medium text-slate-400 ${!isAdmin ? 'mt-4' : ''}`}>
              {product.stock > 0 ? `${product.stock} units in stock` : 'Out of stock — restocking soon.'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
