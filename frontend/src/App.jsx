import { useState, useEffect } from 'react';
import { api, getUser, clearToken } from './api';
import Header from './components/Header';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CartPage from './pages/Cart';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import InventoryLogs from './pages/InventoryLogs';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import MyOrders from './pages/MyOrders';
import Settings from './pages/Settings';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import TerminalLog from './components/TerminalLog';

function AppContent() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState({ cart_id: 'default', items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(getUser());

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Toast helper
  const showToast = (title, text, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Auth handlers
  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCart({ cart_id: 'default', items: [], total: 0 });
    showToast('Signed Out', 'You have been logged out.', 'info');
    navigate('/login');
  };

  // Load data
  const loadProducts = async (category = null) => {
    try {
      const res = await api.listProducts(category);
      setProducts(res.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.categories || {});
    } catch (err) {
      console.error(err);
    }
  };

  const loadCart = async () => {
    try {
      const res = await api.viewCart('default');
      setCart(res);
    } catch (err) {
      console.error(err);
    }
  };

  const initializeApp = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadCategories(), loadCart()]);
    } catch {
      showToast('Connection Error', 'Could not connect to backend. Make sure FastAPI is running on port 8000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      initializeApp();
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload cart when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  // Category filter
  const handleCategoryChange = async (cat) => {
    setActiveCategory(cat);
    await loadProducts(cat);
  };

  // Add to cart
  const handleAddToCart = async (productId, productName, stock, qty = 1) => {
    if (user?.role === 'admin') return;
    if (!user) {
      showToast('Login Required', 'Please sign in to add items to your bag.', 'error');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await api.addToCart(productId, qty, 'default');
      if (res.error) {
        showToast('Failed', res.error, 'error');
      } else {
        showToast('Added to Cart', res.message, 'success');
        await loadCart();
      }
    } catch (err) {
      showToast('Error', err.message || 'Failed to add to cart.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove from cart
  const handleRemoveFromCart = async (productId) => {
    try {
      await api.removeFromCart(productId, 'default');
      showToast('Removed', 'Item removed from cart.', 'info');
      await loadCart();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  };

  // Update cart item quantity
  const handleUpdateCartQty = async (productId, newQty) => {
    setLoading(true);
    try {
      const res = await api.updateCartItem(productId, newQty, 'default');
      if (res.error) {
        showToast('Failed', res.error, 'error');
      } else {
        await loadCart();
      }
    } catch (err) {
      showToast('Error', err.message || 'Failed to update quantity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Checkout
  const handleCheckout = () => {
    if (!user) {
      showToast('Login Required', 'Please sign in to checkout.', 'error');
      navigate('/login');
      return;
    }
    if (cart.items.length === 0) {
      showToast('Empty Cart', 'Add items before placing order.', 'error');
      return;
    }
    navigate('/checkout');
  };

  // Refresh products (after adding)
  const refreshProducts = async () => {
    await loadProducts(activeCategory);
  };

  const cartItemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-message ${t.type === 'success' ? 'toast-success' : t.type === 'error' ? 'toast-error' : 'toast-info'}`}>
            <div className="toast-icon">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-success" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-danger" />}
              {t.type === 'info' && <Info size={18} className="text-primary" />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-text">{t.text}</div>
            </div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <Header
        cartItemCount={cartItemCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        setTheme={(newTheme) => {
          setTheme(newTheme);
          localStorage.setItem('theme', newTheme);
        }}
      />

      {/* Pages */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={
            <Home
              products={products}
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              onAddToCart={handleAddToCart}
              loading={loading}
              searchQuery={searchQuery}
              showAddToCart={!isAdmin}
            />
          } />
          <Route path="/login" element={
            user ? <Navigate to={isAdmin ? '/admin' : '/'} replace /> :
            <Login onLogin={handleLogin} showToast={showToast} />
          } />
          <Route path="/admin-register" element={
            user ? <Navigate to={isAdmin ? '/admin' : '/'} replace /> :
            <AdminRegister onLogin={handleLogin} showToast={showToast} />
          } />
          <Route path="/product/:id" element={
            <ProductDetail
              onAddToCart={handleAddToCart}
              loading={loading}
              showToast={showToast}
              refreshProducts={refreshProducts}
            />
          } />
          <Route path="/add-product" element={
            isAdmin
              ? <AddProduct showToast={showToast} refreshProducts={refreshProducts} />
              : <Navigate to="/login" replace />
          } />
          <Route path="/edit-product/:id" element={
            isAdmin
              ? <EditProduct showToast={showToast} refreshProducts={refreshProducts} />
              : <Navigate to="/login" replace />
          } />
          <Route path="/cart" element={
            isAdmin
              ? <Navigate to="/admin" replace />
              : <CartPage
                  cart={cart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onUpdateCartQty={handleUpdateCartQty}
                  onCheckout={handleCheckout}
                  loading={loading}
                />
          } />
          <Route path="/checkout" element={
            isAdmin
              ? <Navigate to="/admin" replace />
              : user
              ? <Checkout cart={cart} loadCart={loadCart} showToast={showToast} />
                : <Navigate to="/login" replace />
          } />
          <Route path="/admin" element={
            isAdmin
              ? <AdminDashboard showToast={showToast} refreshProducts={refreshProducts} />
              : <Navigate to="/login" replace />
          } />
          <Route path="/my-orders" element={
            user
              ? <MyOrders />
              : <Navigate to="/login" replace />
          } />
          <Route path="/orders" element={
            user
              ? <Orders />
              : <Navigate to="/login" replace />
          } />
          <Route path="/orders/:id" element={<OrderDetail showToast={showToast} />} />
          <Route path="/settings" element={
            user
              ? <Settings user={user} onUserUpdate={setUser} showToast={showToast} />
              : <Navigate to="/login" replace />
          } />
          <Route path="/inventory-logs" element={
            isAdmin
              ? <InventoryLogs />
              : <Navigate to="/login" replace />
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-8 py-6 text-center text-xs text-text-secondary pb-32">
        <p>© 2026 ISDE MiniShop — Built with FastAPI & React</p>
        <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-1 inline-block">
          FastAPI Docs ↗
        </a>
      </footer>

      {/* HTTP Terminal Console */}
      <TerminalLog />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
