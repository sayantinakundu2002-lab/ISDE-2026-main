import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, Sparkles, Package, LogIn, LogOut, Shield, User, LayoutDashboard, Sun, Moon, Monitor, ClipboardList, Plus, Settings } from 'lucide-react';

function Header({ cartItemCount = 0, searchQuery, setSearchQuery, user, onLogout, theme, setTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const isLoggedIn = !!user;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setMobileOpen(false);
    }, 0);
    return () => clearTimeout(handle);
  }, [location]);

  const navClass = ({ isActive }) =>
    `relative text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2 ${
      isActive 
        ? 'bg-slate-900 text-white shadow-md' 
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <>
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled ? 'glass py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-8">
          
          {/* Brand */}
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Sparkles size={20} className="text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <div className="font-heading font-bold text-xl text-slate-900 tracking-tight leading-none">
                Lumina
              </div>
              <div className="text-slate-500 text-xs font-medium mt-0.5 tracking-wide">
                STUDIO EDITION
              </div>
            </div>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery || ''}
              onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/80 text-slate-900 text-sm font-medium px-5 py-2.5 pl-11 rounded-full outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-200/80 shadow-sm">
            <NavLink to="/" className={navClass}>
              Explore
            </NavLink>
            {isLoggedIn && !isAdmin && (
              <>
                <NavLink to="/my-orders" className={navClass}>
                  <Package size={16} /> My Orders
                </NavLink>
                <NavLink to="/cart" className={navClass}>
                  <div className="relative flex items-center gap-2">
                    <ShoppingBag size={16} />
                    Bag
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-3 bg-indigo-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md animate-pulse">
                        {cartItemCount}
                      </span>
                    )}
                  </div>
                </NavLink>
                <NavLink to="/settings" className={navClass}>
                  <Settings size={16} /> Settings
                </NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin" className={navClass}>
                  <LayoutDashboard size={16} /> Dashboard
                </NavLink>
                <NavLink to="/orders" className={navClass}>
                  <Package size={16} /> Status Track
                </NavLink>
                <NavLink to="/inventory-logs" className={navClass}>
                  <ClipboardList size={16} /> Inventory
                </NavLink>
                <NavLink to="/add-product" className={navClass}>
                  <Plus size={16} /> Add Product
                </NavLink>
                <NavLink to="/settings" className={navClass}>
                  <Settings size={16} /> Settings
                </NavLink>
              </>
            )}
          </nav>

          {/* Auth & Mobile */}
          <div className="flex items-center gap-3">
            {/* Theme Selector (Desktop) */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="w-10 h-10 flex items-center justify-center bg-white/50 hover:bg-white backdrop-blur-sm rounded-full shadow-sm border border-slate-200 text-slate-700 hover:text-slate-900 active:scale-95 transition-all"
                title="Change theme"
              >
                {theme === 'light' && <Sun size={18} className="text-amber-500" />}
                {theme === 'dark' && <Moon size={18} className="text-indigo-400" />}
                {theme === 'system' && <Monitor size={18} className="text-slate-500" />}
              </button>
              
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-36 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl p-1.5 z-50 animate-scaleUp">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Monitor }
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTheme(item.id);
                            setThemeOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            theme === item.id 
                              ? 'bg-slate-900 text-white shadow-sm' 
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={14} className={theme === item.id ? 'text-indigo-300' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* User Auth Badge (Desktop) */}
            {isLoggedIn ? (
              <div className="hidden md:flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-slate-300" />
                  ) : (
                    isAdmin ? <Shield size={14} /> : <User size={14} />
                  )}
                  <span>{user.full_name || user.username}</span>
                  {isAdmin && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">ADMIN</span>}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-md"
              >
                <LogIn size={16} /> Sign In
              </Link>
            )}

            {/* Mobile Toggle */}
            <button 
              className="md:hidden w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-200 text-slate-700 active:scale-95 transition-transform"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-[280px] bg-white z-[70] shadow-2xl transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:hidden flex flex-col ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="font-heading font-bold text-lg text-slate-900">Menu</div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* User info in mobile */}
        {isLoggedIn && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isAdmin ? 'text-indigo-700' : 'text-slate-700'}`}>
              {isAdmin ? <Shield size={16} /> : <User size={16} />}
              {user.full_name || user.username}
              {isAdmin && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">ADMIN</span>}
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="relative mb-8">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery || ''}
              onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm px-4 py-3 pl-10 rounded-xl outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <nav className="flex flex-col gap-4">
            <NavLink to="/" className="text-lg font-medium text-slate-600 hover:text-slate-900">Explore Collections</NavLink>
            {isLoggedIn && !isAdmin && (
              <>
                <NavLink to="/my-orders" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <Package size={20} /> My Orders
                </NavLink>
                <NavLink to="/cart" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2"><ShoppingBag size={20} /> Shopping Bag</span>
                  {cartItemCount > 0 && (
                    <span className="bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/settings" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <Settings size={20} /> Settings
                </NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <LayoutDashboard size={20} /> Dashboard
                </NavLink>
                <NavLink to="/orders" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <Package size={20} /> Status Track
                </NavLink>
                <NavLink to="/settings" className="text-lg font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <Settings size={20} /> Settings
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Theme select for mobile */}
        <div className="px-6 py-4 border-t border-slate-100 mt-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Theme</div>
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor }
            ].map(item => {
              const Icon = item.icon;
              const isSel = theme === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
                    isSel 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={14} className={isSel ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auth action at bottom of mobile drawer */}
        <div className="p-6 border-t border-slate-100">
          {isLoggedIn ? (
            <button
              onClick={() => { onLogout(); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all"
            >
              <LogOut size={18} /> Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
            >
              <LogIn size={18} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;
