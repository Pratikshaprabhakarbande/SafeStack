import { Link } from 'react-router-dom';
import { Home, Shield } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-24 h-24 text-primary-600 mx-auto mb-6" />
        <h1 className="text-6xl font-bold text-secondary-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-secondary-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-secondary-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
