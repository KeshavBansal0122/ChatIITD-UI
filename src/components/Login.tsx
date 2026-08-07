import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, MessageSquare, Loader2, UserRound } from 'lucide-react';

export function Login() {
  const { login, loginAsGuest, error } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setLocalError(null);
    setIsRedirecting(true);

    try {
      const started = login();
      if (!started) {
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('DevClub login error:', err);
      setLocalError('DevClub sign-in failed to start. Please try again.');
      setIsRedirecting(false);
    }
  };

  const displayError = localError ?? error ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-pplx-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="rounded-2xl bg-iitd-red p-3 shadow-sm">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-iitd-red">
            IIT Delhi
          </p>
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-pplx-ink">
            Chat<span className="text-iitd-red">IITD</span>
          </h1>
          <p className="text-pplx-muted">Your AI-powered academic assistant for IIT Delhi</p>
        </div>

        <div className="rounded-3xl border border-pplx-border bg-pplx-surface p-8 shadow-[0_2px_4px_-2px_rgba(32,24,18,0.06),0_8px_24px_-12px_rgba(32,24,18,0.12)]">
          {displayError && (
            <div className="mb-6 rounded-xl border border-iitd-red/25 bg-iitd-red-soft/50 px-4 py-3 text-sm text-iitd-red-dark">
              {displayError}
            </div>
          )}

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isRedirecting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-iitd-red px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-iitd-red-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign in with IITD Kerberos
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-pplx-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-pplx-surface px-3 text-pplx-muted">or</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isRedirecting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-pplx-border bg-pplx-surface px-4 py-3 font-medium text-pplx-ink transition-colors duration-200 hover:border-iitd-red/35 hover:bg-iitd-red-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                loginAsGuest();
                navigate('/');
              }}
            >
              <UserRound className="h-5 w-5" />
              Continue as Guest
            </button>
          </div>

          <div className="mt-6 border-t border-pplx-border pt-6">
            <p className="text-center text-sm text-pplx-muted">
              Sign in for personalized recommendations and saved chat history.
              Guests can chat but conversations are not saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
