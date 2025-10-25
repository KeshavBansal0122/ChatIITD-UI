import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: () => boolean;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

interface AuthProviderInnerProps {
  children: ReactNode;
  clientId: string;
  oauthBaseUrl: string;
  redirectUri: string;
  apiBaseUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children, clientId, oauthBaseUrl, redirectUri, apiBaseUrl }: AuthProviderInnerProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastBootstrappedBaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastBootstrappedBaseRef.current === apiBaseUrl) {
      return;
    }

  let isActive = true;
  const rafId = requestAnimationFrame(async () => {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('code');
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
        } else {
          const storedToken = localStorage.getItem('access_token');
          if (storedToken && isActive) {
            setAccessToken(storedToken);
            setError(null);
          }
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
  }, [apiBaseUrl]);

  const login = () => {
    if (!clientId) {
      setError('DevClub client configuration is missing. Please contact support.');
      return false;
    }

    setError(null);
    const base = oauthBaseUrl.replace(/\/+$/, '');

    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    const signInUrl = `${base}/signin?${query.toString()}`;
    window.location.href = signInUrl;
    return true;
  };

  const logout = () => {
    setAccessToken(null);
    setError(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        login,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clientId = import.meta.env.VITE_DEVCLUB_CLIENT_ID;
  const oauthBaseUrl = import.meta.env.VITE_DEVCLUB_OAUTH_BASE_URL ?? 'https://oauthdevclub.vercel.app';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const normalizedApiBase = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : undefined;
  const redirectUri =
    import.meta.env.VITE_DEVCLUB_REDIRECT_URI ?? (normalizedApiBase ? `${normalizedApiBase}/auth/callback` : undefined);

  if (!clientId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-bold mb-2">Configuration Error</h2>
          <p className="text-sm">DevClub Client ID is not configured. Please set VITE_DEVCLUB_CLIENT_ID in your environment variables.</p>
        </div>
      </div>
    );
  }

  if (!redirectUri) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-bold mb-2">Configuration Error</h2>
          <p className="text-sm">
            Unable to determine the OAuth redirect URI. Set VITE_DEVCLUB_REDIRECT_URI or ensure VITE_API_BASE_URL is configured.
          </p>
        </div>
      </div>
    );
  }

  if (!normalizedApiBase) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-bold mb-2">Configuration Error</h2>
          <p className="text-sm">API base URL is not configured. Please set VITE_API_BASE_URL to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProviderInner clientId={clientId} oauthBaseUrl={oauthBaseUrl} redirectUri={redirectUri} apiBaseUrl={normalizedApiBase}>
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
