import { useState, useEffect } from 'react';
import { api } from '../api';
import { ClipboardList, AlertTriangle, RefreshCw, ArrowDown, Package } from 'lucide-react';

function InventoryLogs() {
  const [logs, setLogs] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getInventoryLogs();
      setLogs(res.logs || []);
      setReorders(res.reorders || []);
    } catch (err) {
      console.error('Failed to load inventory logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">
            Inventory Logs
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Real-time stock updates and reorder alerts
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <ArrowDown size={22} className="text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-heading">{logs.length}</div>
            <div className="text-sm text-slate-500">Stock Changes</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-heading">{reorders.length}</div>
            <div className="text-sm text-slate-500">Reorder Alerts</div>
          </div>
        </div>
      </div>

      {/* Reorder Alerts Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-amber-500" />
          <h2 className="font-heading text-xl font-bold text-slate-900">Reorder Alerts</h2>
        </div>
        {reorders.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No reorder alerts yet. All stock levels are healthy.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {reorders.map((msg, idx) => (
              <div
                key={idx}
                className="animate-slideUp px-5 py-3.5 border-b border-slate-100 last:border-b-0 flex items-start gap-3 hover:bg-amber-50/30 transition-colors"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 shrink-0 animate-pulse" />
                <span className="text-sm text-slate-700 font-mono leading-relaxed">{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Change Logs Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-indigo-500" />
          <h2 className="font-heading text-xl font-bold text-slate-900">Stock Change Logs</h2>
        </div>
        {logs.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No stock changes recorded yet. Place an order to see logs.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {logs.map((msg, idx) => (
              <div
                key={idx}
                className="animate-slideUp px-5 py-3.5 border-b border-slate-100 last:border-b-0 flex items-start gap-3 hover:bg-indigo-50/30 transition-colors"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 shrink-0" />
                <span className="text-sm text-slate-700 font-mono leading-relaxed">{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryLogs;
