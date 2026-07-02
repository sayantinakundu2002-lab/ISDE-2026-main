import { Link } from 'react-router-dom';
import { ShoppingBag, Star, ArrowRight } from 'lucide-react';

function ProductCard({ product, onAddToCart, loading, showAddToCart = true }) {
  const isOutOfStock = product.stock === 0;
  const discountPct = product.discount_percent || 0;
  const originalPrice = product.price;
  const discountedPrice = discountPct > 0 ? originalPrice * (1 - discountPct / 100) : originalPrice;

  return (
    <div className="product-card bg-white rounded-2xl overflow-hidden group relative flex flex-col h-full border border-slate-100">
      
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {isOutOfStock ? (
          <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-slate-200 uppercase tracking-widest">
            Sold Out
          </span>
        ) : (
          <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-slate-200 flex items-center gap-1">
            <Star size={10} className="text-amber-500 fill-amber-500" />
            {product.rating}
          </span>
        )}
      </div>

      {/* Discount Badge */}
      {discountPct > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            -{discountPct}% OFF
          </span>
        </div>
      )}

      {/* Image Area */}
      <Link to={`/product/${product.id}`} className="product-image-wrap bg-slate-50/50 aspect-[4/3] flex items-center justify-center p-6">
        <img
          src={product.image_url}
          alt={product.name}
          className="max-h-full max-w-full object-contain mix-blend-multiply"
          onError={(e) => { e.target.src = `https://placehold.co/400x300/f8fafc/94a3b8?text=${encodeURIComponent(product.name)}`; }}
        />
        
        {/* Quick Add Overlay */}
        {!isOutOfStock && showAddToCart && (
          <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(product.id, product.name, product.stock);
              }}
              disabled={loading}
              className="btn-premium bg-slate-900 text-white rounded-full p-3 shadow-xl hover:bg-indigo-600 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
              title="Add to Bag"
            >
              <ShoppingBag size={18} />
            </button>
          </div>
        )}
      </Link>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 block">
            {product.category.replace('_', ' ')}
          </span>
          <Link to={`/product/${product.id}`} className="block group/title">
            <h3 className="font-heading font-semibold text-slate-800 text-base leading-snug line-clamp-2 group-hover/title:text-indigo-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            {discountPct > 0 ? (
              <>
                <span className="text-sm text-slate-400 line-through mr-2">
                  ${originalPrice.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-emerald-600 tracking-tight">
                  ${discountedPrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <Link 
            to={`/product/${product.id}`}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all duration-300"
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
