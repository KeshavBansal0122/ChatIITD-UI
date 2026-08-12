import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { ConfigError } from '../components/ui/LoadingScreen';

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: () => boolean;
  loginAsGuest: () => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  handleAuthError: () => void;  // Called when API returns 401
}

interface AuthProviderInnerProps {
  children: ReactNode;
  clientId: string;
  oauthBaseUrl: string;
  redirectUri: string;
  apiBaseUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children, clientId, oauthBaseUrl: _oauthBaseUrl, redirectUri, apiBaseUrl }: AuthProviderInnerProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('guest_mode') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastBootstrappedBaseRef = useRef<string | null>(null);
  
  // Demo mode check
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  // Guest → signed-out: do not run OAuth bootstrap; stay on the login screen.
  // Authenticated → signed-out: same. Only bootstrap when we have a token to
  // restore or an OAuth code in the URL.
  useEffect(() => {
    // Demo mode: immediately set fake auth and skip all OAuth logic
    if (isDemoMode) {
      setAccessToken('demo_fake_token_for_presentation');
      setError(null);
      setIsLoading(false);
      return;
    }

    // Guest mode: skip OAuth, just mark as not loading
    if (isGuest) {
      setIsLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const isOpenRouterCallback = window.location.pathname === '/openrouter/callback';
    const codeFromUrl = isOpenRouterCallback ? null : params.get('code');
    const storedToken = localStorage.getItem('access_token');

    // Logged out with nothing to restore — don't keep spinning bootstrap.
    if (!codeFromUrl && !storedToken) {
      setIsLoading(false);
      lastBootstrappedBaseRef.current = null;
      return;
    }

    if (lastBootstrappedBaseRef.current === apiBaseUrl && !codeFromUrl) {
      return;
    }

  let isActive = true;
  const rafId = requestAnimationFrame(async () => {
      const stateFromUrl = params.get('state');
      let shouldReplaceUrl = false;

      const removeParams = (...keys: string[]) => {
        keys.forEach((key) => {
          if (params.has(key)) {
            params.delete(key);
            shouldReplaceUrl = true;
          }
        });
      };

      try {
        if (codeFromUrl) {
          const response = await fetch(`${apiBaseUrl}/auth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeFromUrl, state: stateFromUrl ?? undefined }),
            credentials: 'include',
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message = (payload as { message?: string }).message ?? 'Sign-in failed while validating with the server.';
            throw new Error(message);
          }

          const accessTokenFromServer = (payload as { access_token?: string }).access_token;

          if (!accessTokenFromServer) {
            throw new Error('No access token returned from the server.');
          }

          if (isActive) {
            setAccessToken(accessTokenFromServer);
            setError(null);
          }
          localStorage.setItem('access_token', accessTokenFromServer);
          removeParams('code', 'state');
        } else if (storedToken && isActive) {
          setAccessToken(storedToken);
          setError(null);
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign-in failed.';
        if (isActive) {
          setError(message);
          setAccessToken(null);
        }
        localStorage.removeItem('access_token');
        removeParams('code', 'state', 'access_token', 'token', 'error');
      } finally {
        if (shouldReplaceUrl) {
          const newSearch = params.toString();
          const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
          window.history.replaceState(null, '', newUrl);
        }

        if (isActive) {
          lastBootstrappedBaseRef.current = apiBaseUrl;
          setIsLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      cancelAnimationFrame(rafId);
    };
  }, [apiBaseUrl, isDemoMode, isGuest]);

  const login = () => {
    if (!clientId) {
      setError('DevClub client configuration is missing. Please contact support.');
      return false;
    }

    // Clear guest mode so the OAuth callback can be processed on return
    setIsGuest(false);
    localStorage.removeItem('guest_mode');
    setError(null);
    
    // Use the backend endpoint to get the OAuth signin URL
    // This ensures consistency with the backend OAuth configuration
    const getSigninUrl = async () => {
      try {
        const query = new URLSearchParams({
          redirect_uri: redirectUri,
        });
        
        const response = await fetch(`${apiBaseUrl}/auth/signin-url?${query.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to get OAuth signin URL from backend');
        }
        
        const { signin_url } = await response.json();
        window.location.href = signin_url;
      } catch (err) {
        console.error('Error getting signin URL:', err);
        setError('Failed to get sign-in URL from server. Please try again.');
      }
    };
    
    getSigninUrl();
    return true;
  };

  const loginAsGuest = useCallback(() => {
    setAccessToken(null);
    setIsGuest(true);
    setError(null);
    setIsLoading(false);
    localStorage.setItem('guest_mode', 'true');
    localStorage.removeItem('access_token');
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setIsGuest(false);
    setError(null);
    setIsLoading(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('guest_mode');
    // Allow a fresh OAuth bootstrap after the next sign-in.
    lastBootstrappedBaseRef.current = null;
  }, []);

  const handleAuthError = useCallback(() => {
    // Called when API returns 401 - clear token and redirect to login
    setAccessToken(null);
    setError('Your session has expired. Please sign in again.');
    localStorage.removeItem('access_token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isGuest,
        login,
        loginAsGuest,
        logout,
        isLoading,
        error,
        handleAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  
  // In demo mode, use fake values and bypass all validation
  if (isDemoMode) {
    const demoFrontendUrl = import.meta.env.VITE_FRONTEND_URL ?? 'http://localhost:5173';
    const demoBackendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
    return (
      <AuthProviderInner 
        clientId="demo_client_id" 
        oauthBaseUrl="https://demo.oauth.url" 
        redirectUri={`${demoFrontendUrl}/callback`}
        apiBaseUrl={demoBackendUrl}
      >
        {children}
      </AuthProviderInner>
    );
  }

  const clientId = import.meta.env.VITE_DEVCLUB_CLIENT_ID;
  const oauthBaseUrl = import.meta.env.VITE_DEVCLUB_OAUTH_BASE_URL ?? 'https://auth.devclub.in';
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const redirectUri = frontendUrl ? `${frontendUrl.replace(/\/+$/, '')}/callback` : undefined;

  if (!clientId) {
    return (
      <ConfigError
        title="Configuration Error"
        message="DevClub Client ID is not configured. Please set VITE_DEVCLUB_CLIENT_ID in your environment variables."
      />
    );
  }

  if (!redirectUri) {
    return (
      <ConfigError
        title="Configuration Error"
        message="Unable to determine the OAuth redirect URI. Please set VITE_FRONTEND_URL in your environment variables."
      />
    );
  }

  if (!backendUrl) {
    return (
      <ConfigError
        title="Configuration Error"
        message="Backend URL is not configured. Please set VITE_BACKEND_URL to continue."
      />
    );
  }

  return (
    <AuthProviderInner clientId={clientId} oauthBaseUrl={oauthBaseUrl} redirectUri={redirectUri} apiBaseUrl={backendUrl.replace(/\/+$/, '')}>
      {children}
    </AuthProviderInner>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
