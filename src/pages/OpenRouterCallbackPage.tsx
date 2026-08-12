import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AuthError, apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function OpenRouterCallbackPage() {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, isLoading, handleAuthError } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError('OpenRouter did not return an authorization code.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiService.finishOpenRouterOAuth(accessToken, code);
        if (!cancelled) {
          navigate('/profile?openrouter_connected=1', { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthError) {
          handleAuthError();
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to connect OpenRouter.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, handleAuthError, isLoading, navigate]);

  if (isLoading) return <LoadingScreen label="Finishing OpenRouter connection..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (error) return <Navigate to={`/profile?openrouter_error=${encodeURIComponent(error)}`} replace />;

  return <LoadingScreen label="Finishing OpenRouter connection..." />;
}
