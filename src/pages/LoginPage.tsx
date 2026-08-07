import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login } from '../components/Login';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function LoginPage() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated || isGuest) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}
