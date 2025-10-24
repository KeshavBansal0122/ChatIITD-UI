import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, MessageSquare, Loader2 } from 'lucide-react';

export function Login() {
  const { login, error } = useAuth();
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ChatIITD</h1>
          <p className="text-gray-400">Sign in with DevClub to continue</p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-800">
          {displayError && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {displayError}
            </div>
          )}

          <div className="w-full">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Continue with DevClub
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-500 text-center">
              You will be redirected to DevClub to use your kerberos for authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
