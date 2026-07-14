import { useState, useEffect } from 'react';
import { api, setUser } from '../api';
import { User, Mail, Phone, MapPin, Image, Save, Sparkles } from 'lucide-react';

function Settings({ user: currentUser, onUserUpdate, showToast }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    profile_photo: '',
    address: ''
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getMe();
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        profile_photo: data.profile_photo || '',
        address: data.address || ''
      });
    } catch (err) {
      showToast('Error', err.message || 'Failed to load user settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings(formData);
      if (res.success) {
        setUser(res.user);
        if (onUserUpdate) onUserUpdate(res.user);
        showToast('Settings Updated', 'Your profile details have been saved successfully!', 'success');
      }
    } catch (err) {
      showToast('Update Failed', err.message || 'Could not save profile details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="pt-32 pb-20 max-w-lg mx-auto px-6 text-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your public profile, delivery shipping info, and shop details.</p>
        </div>
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Avatar Preview Column */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm w-full text-center flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-slate-100 shadow-inner flex items-center justify-center overflow-hidden mb-4 shrink-0 relative">
              {formData.profile_photo ? (
                <img 
                  src={formData.profile_photo} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                  }}
                />
              ) : (
                <User size={40} className="text-slate-300" />
              )}
            </div>
            <h3 className="font-heading text-base font-bold text-slate-900 truncate max-w-full">
              {formData.full_name || currentUser?.username}
            </h3>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-500 border-slate-200">
              {currentUser?.role}
            </span>
          </div>
        </div>

        {/* Right Settings Form Column */}
        <div className="md:col-span-8">
          <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm px-4 py-3.5 pl-12 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm px-4 py-3.5 pl-12 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="123-456-7890"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm px-4 py-3.5 pl-12 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Profile Photo URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Profile Photo URL</label>
              <div className="relative">
                <Image size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={formData.profile_photo}
                  onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm px-4 py-3.5 pl-12 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {isAdmin ? 'Origin Address (Shipped From)' : 'Delivery Address (Where items will be delivered)'}
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={isAdmin ? "Enter your seller business address..." : "Enter your delivery address..."}
                  rows={3}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm px-4 py-3.5 pl-12 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} /> Save Changes
                </>
              )}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}

export default Settings;
