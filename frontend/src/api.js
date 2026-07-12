// src/api.js
function resolveApiBaseUrl() {
  // Allow explicit override via env var (e.g. for production deployments)
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  // In development, the Vite dev server proxies all API routes to the backend.
  // Using an empty base URL (relative paths) ensures requests go through
  // the same origin, which works in both localhost and GitHub Codespaces.
  return '';
}

const BASE_URL = resolveApiBaseUrl();

const logListeners = [];

// --- Auth Token Management ---
export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function getToken() {
  return localStorage.getItem('auth_token');
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function setUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user'));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function subscribeToLogs(callback) {
  logListeners.push(callback);
  return () => {
    const idx = logListeners.indexOf(callback);
    if (idx !== -1) logListeners.splice(idx, 1);
  };
}

function notifyLog(logEntry) {
  logListeners.forEach(listener => {
    try {
      listener(logEntry);
    } catch (err) {
      console.error('Error in log listener:', err);
    }
  });
}

async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';
  const timestamp = new Date().toLocaleTimeString();
  const id = Math.random().toString(36).substring(2, 9);

  // Inject auth header if token exists
  const token = getToken();
  if (token) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Parse headers for logging
  const headers = {};
  if (options.headers) {
    Object.entries(options.headers).forEach(([k, v]) => {
      headers[k] = v;
    });
  }

  // Notify outgoing request log
  notifyLog({
    id,
    direction: 'OUTGOING',
    timestamp,
    method,
    url,
    headers,
    body: options.body instanceof URLSearchParams ? options.body.toString() : options.body || null
  });

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    
    if (!response.ok) {
      const errorMsg = data.detail || data.error || `HTTP ${response.status}`;
      notifyLog({
        id,
        direction: 'INCOMING',
        timestamp: new Date().toLocaleTimeString(),
        url,
        status: response.status,
        error: errorMsg,
        data: null
      });

      // Auto-signout and redirect on unauthorized 401 response
      if (response.status === 401) {
        clearToken();
        if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
          window.location.href = '/login';
        }
      }

      throw new Error(errorMsg);
    }

    notifyLog({
      id,
      direction: 'INCOMING',
      timestamp: new Date().toLocaleTimeString(),
      url,
      status: response.status,
      error: null,
      data
    });
    return data;
  } catch (err) {
    notifyLog({
      id,
      direction: 'INCOMING',
      timestamp: new Date().toLocaleTimeString(),
      url,
      status: 'NET_ERR',
      error: err.message || 'Network connection failed',
      data: null
    });
    throw err;
  }
}

export const api = {
  getWelcome: () => apiRequest('/'),

  // --- Auth ---
  login: (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  register: (username, password, fullName = '', email = '', role = 'user') => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    if (fullName) params.append('full_name', fullName);
    if (email) params.append('email', email);
    params.append('role', role);
    return apiRequest('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  verifyOtp: (username, otpCode) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('otp_code', otpCode);
    return apiRequest('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  getMe: () => apiRequest('/auth/me'),

  // --- Products ---
  getCategories: () => apiRequest('/categories'),

  listProducts: (category = null) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const qs = params.toString();
    return apiRequest(`/products${qs ? '?' + qs : ''}`);
  },

  getProduct: (productId) => apiRequest(`/products/${productId}`),

  addProduct: (data) => apiRequest('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/upload', {
      method: 'POST',
      body: formData
    });
  },


  updateProduct: (productId, data) => apiRequest(`/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  deleteProduct: (productId) => apiRequest(`/products/${productId}`, {
    method: 'DELETE'
  }),

  // --- Cart ---
  addToCart: (productId, quantity, cartId = 'default') => {
    const params = new URLSearchParams();
    params.append('product_id', productId.toString());
    params.append('quantity', quantity.toString());
    params.append('cart_id', cartId);
    return apiRequest('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  viewCart: (cartId = 'default') => {
    return apiRequest(`/cart?cart_id=${encodeURIComponent(cartId)}`);
  },

  removeFromCart: (productId, cartId = 'default') => {
    return apiRequest(`/cart/${productId}?cart_id=${encodeURIComponent(cartId)}`, {
      method: 'DELETE'
    });
  },

  updateCartItem: (productId, quantity, cartId = 'default') => {
    const params = new URLSearchParams();
    params.append('product_id', productId.toString());
    params.append('quantity', quantity.toString());
    params.append('cart_id', cartId);
    return apiRequest('/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  clearCart: (cartId = 'default') => {
    const params = new URLSearchParams();
    params.append('cart_id', cartId);
    return apiRequest('/cart/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  // --- Checkout ---
  getCheckoutSummary: (cartId = 'default', promoCode = '') => {
    const params = new URLSearchParams();
    params.append('cart_id', cartId);
    if (promoCode) params.append('promo_code', promoCode);
    const qs = params.toString();
    return apiRequest(`/cart/checkout-summary${qs ? '?' + qs : ''}`);
  },

  placeOrder: (cartId = 'default', promoCode = '') => {
    const params = new URLSearchParams();
    params.append('cart_id', cartId);
    if (promoCode) params.append('promo_code', promoCode);
    return apiRequest('/checkout/place-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  // --- Inventory Logs (Issue #4) ---
  getInventoryLogs: () => apiRequest('/admin/inventory/logs'),

  // --- Order Management (Issue #3) ---
  getOrders: () => apiRequest('/orders'),

  getMyOrders: () => apiRequest('/orders/my'),

  getOrder: (orderId) => apiRequest(`/orders/${encodeURIComponent(orderId)}`),

  transitionOrder: (orderId, targetState) => {
    const params = new URLSearchParams();
    params.append('target_state', targetState);
    return apiRequest(`/orders/${encodeURIComponent(orderId)}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  },

  verifyDeliveryOtp: (orderId, otpCode) => {
    const params = new URLSearchParams();
    params.append('otp_code', otpCode);
    return apiRequest(`/orders/${encodeURIComponent(orderId)}/verify-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  }
};
