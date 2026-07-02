import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Save, Percent, Loader, Image as ImageIcon, Trash2 } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'gaming_gear', label: 'Gaming Gear' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'accessories', label: 'Accessories' },
];

function EditProduct({ showToast, refreshProducts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'electronics',
    image_url: '',
    rating: '',
    discount_percent: '0'
  });

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await api.getProduct(id);
        setForm({
          name: data.name || '',
          description: data.description || '',
          price: String(data.price || ''),
          stock: String(data.stock || ''),
          category: data.category || 'electronics',
          image_url: data.image_url || '',
          rating: String(data.rating || '4.0'),
          discount_percent: String(data.discount_percent || '0')
        });
      } catch {
        showToast('Error', 'Could not load product.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setSubmitting(true);
    try {
      const res = await api.deleteProduct(id);
      showToast('Deleted', res.message || 'Product removed.', 'success');
      if (refreshProducts) await refreshProducts();
      navigate('/');
    } catch (err) {
      showToast('Error', err.message || 'Failed to delete product.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updates = {};
      if (form.name.trim()) updates.name = form.name.trim();
      if (form.description.trim()) updates.description = form.description.trim();
      if (form.price) updates.price = parseFloat(form.price);
      if (form.stock !== '') updates.stock = parseInt(form.stock);
      if (form.category) updates.category = form.category;
      if (form.image_url.trim()) updates.image_url = form.image_url.trim();
      if (form.rating) updates.rating = parseFloat(form.rating);
      updates.discount_percent = parseFloat(form.discount_percent) || 0;

      await api.updateProduct(id, updates);
      showToast('Updated', 'Product details saved successfully.', 'success');
      if (refreshProducts) await refreshProducts();
      navigate(`/product/${id}`);
    } catch (err) {
      showToast('Error', err.message || 'Failed to update.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const originalPrice = parseFloat(form.price) || 0;
  const discountPct = parseFloat(form.discount_percent) || 0;
  const discountedPrice = originalPrice * (1 - discountPct / 100);

  const inputClass = "w-full border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-900 bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2";

  if (loading) {
    return (
      <div className="pt-32 pb-20 flex items-center justify-center min-h-[60vh]">
        <Loader size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm mb-8 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-900 transition-colors">
          <ArrowLeft size={14} />
        </div>
        Back
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">
        <div className="mb-10">
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 mb-2">Edit Product</h1>
          <p className="text-slate-500">Update product details, pricing, and discount.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Product Title</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input type="number" name="price" value={form.price} onChange={handleChange} step="0.01" min="0" className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Discount (%)</label>
              <div className="relative">
                <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" name="discount_percent" value={form.discount_percent} onChange={handleChange} step="1" min="0" max="100" className={`${inputClass} pl-11`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Final Price</label>
              <div className={`${inputClass} bg-emerald-50 border-emerald-200 text-emerald-700 font-bold flex items-center`}>
                ${discountedPrice.toFixed(2)}
                {discountPct > 0 && (
                  <span className="ml-2 text-xs text-red-500 font-semibold">(-{discountPct}%)</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Stock</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rating</label>
              <input type="number" name="rating" value={form.rating} onChange={handleChange} step="0.1" min="1" max="5" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
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

          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass} />
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

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-premium flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 bg-white hover:bg-red-50 text-red-600 font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all border border-red-200 disabled:opacity-50"
            >
              <Trash2 size={18} />
              Delete Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProduct;
