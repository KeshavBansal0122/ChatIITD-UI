import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-base">Authenticating...</div>
      </div>
    );
  }

  if (error) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/login" replace />;
}
