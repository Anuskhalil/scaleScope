import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from './AuthContext';

const PUBLIC_AUTH_PATHS = ['/login', '/register', '/forgot-password', '/auth/callback'];

export default function ProtectedRoute() {
  const {
    loading,
    session,
    user,
    emailVerified,
    needsMfa,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (needsMfa && location.pathname !== '/mfa') {
    return (
      <Navigate
        to="/mfa"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (PUBLIC_AUTH_PATHS.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}