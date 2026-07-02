import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Plus, Image as ImageIcon, ArrowLeft, Percent } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'gaming_gear', label: 'Gaming Gear' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'accessories', label: 'Accessories' },
];

function AddProduct({ showToast, refreshProducts }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'electronics',
    image_url: '',
    rating: '4.0',
    discount_percent: '0'
  });
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'image_url') setPreviewUrl(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Validation', 'Product name is required.', 'error'); return; }
    if (!form.description.trim()) { showToast('Validation', 'Description is required.', 'error'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { showToast('Validation', 'Price must be greater than 0.', 'error'); return; }
    if (!form.stock || parseInt(form.stock) < 0) { showToast('Validation', 'Stock must be 0 or more.', 'error'); return; }
    if (!form.image_url.trim()) { showToast('Validation', 'Image URL is required.', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await api.addProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        category: form.category,
        image_url: form.image_url.trim(),
        rating: parseFloat(form.rating) || 4.0,
        discount_percent: parseFloat(form.discount_percent) || 0
      });
      showToast('Success', res.message || 'Listing published.', 'success');
      if (refreshProducts) await refreshProducts();
      navigate('/');
    } catch (err) {
      showToast('Error', err.message || 'Failed to publish.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const originalPrice = parseFloat(form.price) || 0;
  const discountPct = parseFloat(form.discount_percent) || 0;
  const discountedPrice = originalPrice * (1 - discountPct / 100);

  const inputClass = "w-full border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-900 bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2";

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-6">
      
      <button 
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm mb-8 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-900 transition-colors">
          <ArrowLeft size={14} />
        </div>
        Cancel
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Form */}
        <div className="p-8 md:p-12 md:w-2/3 border-b md:border-b-0 md:border-r border-slate-100">
          <div className="mb-10">
            <h1 className="font-heading text-3xl font-extrabold text-slate-900 mb-2">Create Listing</h1>
            <p className="text-slate-500">Add a new premium product to the catalog.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Product Title</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="e.g. Study Table Lamp" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input type="number" name="price" value={form.price} onChange={handleChange} step="0.01" min="0" className={`${inputClass} pl-8`} placeholder="299.99" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Discount (%)</label>
                <div className="relative">
                  <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" name="discount_percent" value={form.discount_percent} onChange={handleChange} step="1" min="0" max="100" className={`${inputClass} pl-11`} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Inventory Stock</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" className={inputClass} placeholder="50" />
              </div>
              <div>
                <label className={labelClass}>Initial Rating</label>
                <input type="number" name="rating" value={form.rating} onChange={handleChange} step="0.1" min="1" max="5" className={inputClass} placeholder="4.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Collection</label>
                <div className="relative">
                  <select name="category" value={form.category} onChange={handleChange} className={`${inputClass} appearance-none pr-10 cursor-pointer`}>
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Product Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass} placeholder="Describe the premium features..." />
            </div>

            <div>
              <label className={labelClass}>Image</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  name="image_url"
                  value={form.image_url}
                  onChange={handleChange}
                  className={`${inputClass} flex-1`}
                  placeholder="Paste image URL or choose a file..."
                />
                <label className="shrink-0 bg-slate-900 hover:bg-indigo-600 text-white font-bold px-6 py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md">
                  <ImageIcon size={16} />
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      showToast('Uploading', 'Uploading product image...', 'info');
                      try {
                        const res = await api.uploadImage(file);
                        setForm(prev => ({ ...prev, image_url: res.url }));
                        setPreviewUrl(res.url);
                        showToast('Uploaded', 'Product image uploaded successfully!', 'success');
                      } catch (err) {
                        showToast('Error', err.message || 'Upload failed.', 'error');
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-premium w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
              >
                <Plus size={18} />
                {submitting ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Preview */}
        <div className="p-8 md:p-12 md:w-1/3 bg-slate-50 flex flex-col items-center justify-center">
          <div className="w-full max-w-[280px]">
            <label className={labelClass}>Live Preview</label>
            <div className="mt-4 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden aspect-[3/4] flex flex-col relative group">
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border border-slate-200 uppercase tracking-widest z-10">
                Preview
              </div>
              {discountPct > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10">
                  -{discountPct}%
                </div>
              )}
              <div className="flex-1 bg-slate-50 p-4 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x400/f8fafc/94a3b8?text=Invalid+URL'; }}
                  />
                ) : (
                  <ImageIcon size={48} className="text-slate-300" />
                )}
              </div>
              <div className="p-4 border-t border-slate-100">
                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1 truncate">
                  {form.category.replace('_', ' ')}
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-sm leading-snug truncate">
                  {form.name || 'Product Title'}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  {discountPct > 0 ? (
                    <>
                      <span className="text-sm text-slate-400 line-through">${originalPrice.toFixed(2)}</span>
                      <span className="font-bold text-slate-900">${discountedPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-900">${originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AddProduct;
