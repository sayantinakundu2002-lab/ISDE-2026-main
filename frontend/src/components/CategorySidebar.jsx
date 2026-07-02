import { Building2, Gamepad2, Headphones, Laptop, Sparkles } from 'lucide-react';

const CATEGORY_ICONS = {
  gaming_gear: Gamepad2,
  office_supplies: Building2,
  electronics: Laptop,
  accessories: Headphones,
};

function CategorySidebar({ categories, activeCategory, onCategoryChange }) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-28">
        <h3 className="font-heading font-bold text-slate-900 text-lg mb-4 pl-2">Collections</h3>
        <ul className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide">
          <li>
            <button
              onClick={() => onCategoryChange(null)}
              className={`w-full whitespace-nowrap text-left px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                !activeCategory
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 translate-x-0 lg:translate-x-2'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100 hover:border-slate-200'
              }`}
            >
              <Sparkles size={18} />
              All Arrivals
            </button>
          </li>
          {Object.entries(categories).map(([key, cat]) => {
            const CategoryIcon = CATEGORY_ICONS[key] || Sparkles;

            return (
              <li key={key}>
                <button
                  onClick={() => onCategoryChange(key)}
                  className={`w-full whitespace-nowrap text-left px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                    activeCategory === key
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 translate-x-0 lg:translate-x-2'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <CategoryIcon size={18} />
                  {cat.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

export default CategorySidebar;
