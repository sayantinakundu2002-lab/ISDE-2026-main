import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="bg-card rounded-lg shadow-sm border border-border p-12">
        <AlertTriangle size={48} className="text-warning mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold text-text mb-2">404</h2>
        <p className="text-text-secondary text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-md text-sm transition-all"
        >
          <Home size={14} /> Back to Shop
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
