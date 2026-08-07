import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return <LoadingScreen label="Authenticating..." />;
  }

  if (error) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/login" replace />;
}
