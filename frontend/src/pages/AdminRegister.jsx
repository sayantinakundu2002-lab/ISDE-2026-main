import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken, setUser } from '../api';
import { ArrowRight, ArrowLeft, ShieldCheck, User, Mail, KeyRound, Package, CheckCircle2 } from 'lucide-react';

function AdminRegister({ onLogin, showToast }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    productName: '',
    productDescription: '',
    productPrice: '',
    productStock: '',
    productCategory: 'electronics',
    imageUrl: '',
  });
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    
    // Simple validation for Step 1
    if (step === 1) {
      if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
        setError('All account details are required.');
        return;
      }
      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (formData.password.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
      setStep(2);
    }
  };

  const handleBackStep = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple validation for Step 2
    if (!formData.productName.trim() || !formData.productDescription.trim() || !formData.productPrice || !formData.productStock) {
      setError('All product proposal details are required.');
      return;
    }

    const price = parseFloat(formData.productPrice);
    const stock = parseInt(formData.productStock, 10);

    if (isNaN(price) || price <= 0) {
      setError('Price must be a valid number greater than 0.');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setError('Stock cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      await api.requestAdminRegister({
        ...formData,
        productPrice: price,
        productStock: stock,
      });
      showToast('Request Submitted', 'Registration request sent to Sayantina Kundu.', 'success');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to submit registration request.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!confirmationCode.trim()) {
      setError('Confirmation code is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.confirmAdminRegister(formData.username, confirmationCode.trim());
      
      setToken(res.token);
      setUser(res.user);
      onLogin(res.user);

      showToast('Registration Confirmed', 'Admin account registered successfully! Proposed product has been auto-added.', 'success');
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Failed to confirm admin registration.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-28 pb-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-sky-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mx-auto mb-5 hover:scale-105 transition-transform">
            <ShieldCheck size={28} className="text-purple-400" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">
            Register as Admin / Seller
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Apply to list your products and manage the ISDE catalog.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between items-center max-w-xs mx-auto mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                step >= s
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-white border-2 border-slate-200 text-slate-400'
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-8">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5 animate-fadeIn">
              <h2 className="font-heading text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User size={18} className="text-purple-500" /> Step 1: Account Details
              </h2>
              
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Choose an admin username"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className={`${inputClass} pl-11`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Choose a strong password"
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                className="btn-premium w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
              >
                Continue to Product Proposal <ArrowRight size={18} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRequestSubmit} className="space-y-5 animate-fadeIn">
              <h2 className="font-heading text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={18} className="text-purple-500" /> Step 2: Proposed Product
              </h2>

              <p className="text-xs text-slate-500 mb-2">
                Specify details for the first product you wish to list upon owner approval.
              </p>

              <div>
                <label className={labelClass}>Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="e.g. Mechanical Keyboard"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  name="productDescription"
                  value={formData.productDescription}
                  onChange={handleInputChange}
                  placeholder="Enter product description and features..."
                  required
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Price ($)</label>
                  <input
                    type="number"
                    name="productPrice"
                    value={formData.productPrice}
                    onChange={handleInputChange}
                    placeholder="99.99"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Initial Stock</label>
                  <input
                    type="number"
                    name="productStock"
                    value={formData.productStock}
                    onChange={handleInputChange}
                    placeholder="10"
                    min="0"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    name="productCategory"
                    value={formData.productCategory}
                    onChange={handleInputChange}
                    className={inputClass}
                  >
                    <option value="electronics">Electronics</option>
                    <option value="apparel">Apparel</option>
                    <option value="accessories">Accessories</option>
                    <option value="fitness">Fitness</option>
                    <option value="office">Office</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Image URL (Optional)</label>
                  <input
                    type="text"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Submit Proposal <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleConfirmSubmit} className="space-y-5 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircle2 size={24} />
                </div>
                <h2 className="font-heading text-lg font-bold text-slate-800">Request Submitted Successfully!</h2>
                <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                  Your proposed inventory listing and registration details have been sent to the store owner at <span className="font-bold text-slate-700">sayantinakundu2002@gmail.com</span>.
                </p>
              </div>

              <div>
                <label className={labelClass}>Enter confirmation Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="REG-XXXXXX"
                    required
                    className={`${inputClass} pl-11 text-center font-mono font-bold uppercase tracking-wider`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-premium w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Complete registration <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;
