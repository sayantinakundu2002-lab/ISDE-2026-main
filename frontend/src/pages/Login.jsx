import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUser } from '../api';
import { LogIn, UserPlus, Eye, EyeOff, Sparkles, ArrowRight, Shield, Mail, User, ShieldCheck } from 'lucide-react';

function Login({ onLogin, showToast }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.register(username, password, fullName, email, role);
      } else {
        res = await api.login(username, password);
      }

      setToken(res.token);
      setUser(res.user);
      onLogin(res.user);

      showToast(
        isRegister ? 'Welcome!' : 'Welcome back!',
        `Logged in as ${res.user.full_name || res.user.username}`,
        'success'
      );

      // Redirect based on role
      if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-sky-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mx-auto mb-5 hover:scale-105 transition-transform">
            <Sparkles size={28} className="text-indigo-400" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isRegister ? 'Join Lumina Studio Edition' : 'Sign in to your account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-8">
          {/* Toggle tabs */}
            <div className="flex bg-slate-100 rounded-full p-1 mb-8">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LogIn size={16} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus size={16} /> Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6 animate-shake">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className={`${inputClass} pl-11`}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isRegister ? 'Username' : 'Username / Email'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isRegister ? "Choose a username" : "TestUser or testuser@gmail.com"}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role Selector — only on Register */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                        role === 'user'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <User size={16} />
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                        role === 'admin'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <ShieldCheck size={16} />
                      Admin
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-premium w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Test account hint */}
            {!isRegister && (
              <div className="mt-6 flex flex-col gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 justify-center">
                  <Shield size={14} className="text-indigo-400" />
                  <span>User: <span className="font-mono font-semibold text-slate-500">TestUser</span> / <span className="font-mono font-semibold text-slate-500">TesUser</span></span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Shield size={14} className="text-purple-400" />
                  <span>Admin: <span className="font-mono font-semibold text-slate-500">TestAdmin</span> / <span className="font-mono font-semibold text-slate-500">TestAdmin</span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default Login;
