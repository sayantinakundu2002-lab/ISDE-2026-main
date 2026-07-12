import ProductCard from '../components/ProductCard';
import CategorySidebar from '../components/CategorySidebar';
import { Sparkles, ArrowRight, Search } from 'lucide-react';
import workspaceIllustration from '../assets/workspace_illustration.png';


function Home({ products, categories, activeCategory, onCategoryChange, onAddToCart, loading, searchQuery, showAddToCart = true }) {
  let displayed = products;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayed = displayed.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  return (
    <div className="pt-24 pb-20">
      {/* Hero Section */}
      {!searchQuery && !activeCategory && (
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-900/20">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-30 pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            
            <div className="relative z-10 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
                <Sparkles size={12} /> New Season Arrivals
              </div>
              <h1 className="font-heading text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                Elevate your <br className="hidden md:block"/> workspace.
              </h1>
              <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-8 max-w-md mx-auto md:mx-0 font-light">
                Discover curated premium gear designed for modern professionals and creatives.
              </p>
              <button 
                onClick={() => {
                  window.scrollTo({ top: document.getElementById('catalog').offsetTop - 100, behavior: 'smooth' });
                }}
                className="btn-premium bg-white text-slate-900 font-bold px-8 py-4 rounded-full inline-flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Shop Collection <ArrowRight size={18} />
              </button>
            </div>
            
            <div className="relative z-10 hidden md:block flex-1 max-w-md">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 rotate-3 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={workspaceIllustration} 
                  alt="Premium Workspace" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog */}
      <div id="catalog" className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-10">
          
          <CategorySidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
          />

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {activeCategory && categories[activeCategory]
                    ? categories[activeCategory].name
                    : searchQuery ? `Search: "${searchQuery}"` : 'All Collection'}
                </h2>
                <div className="w-12 h-1 bg-indigo-500 rounded-full mt-3"></div>
              </div>
              <span className="text-sm font-medium text-slate-500">
                {displayed.length} result{displayed.length !== 1 ? 's' : ''}
              </span>
            </div>

            {displayed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-20 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} className="text-slate-300" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-slate-900 mb-2">Nothing found</h3>
                <p className="text-slate-500 text-sm">We couldn't find any products matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayed.map((p, idx) => (
                  <div key={p.id} className="animate-slideUp" style={{ animationDelay: `${idx * 75}ms` }}>
                    <ProductCard
                      product={p}
                      onAddToCart={onAddToCart}
                      loading={loading}
                      showAddToCart={showAddToCart}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
