import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, session, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!session) return <Navigate to="/login" replace />;

  if (session && !user) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Please Verify Your Email</h2>
        <p>Check your inbox to activate your account.</p>
      </div>
    );
  }

  return children;
}