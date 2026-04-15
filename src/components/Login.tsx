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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-5">
            <div className="bg-gray-900 p-3 rounded-2xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-montserrat tracking-tight">ChatIITD</h1>
          <p className="text-gray-500">Your AI-powered academic assistant for IIT Delhi</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
              {displayError}
            </div>
          )}

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl transition-colors duration-200 font-medium"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign in with IITD Kerberos
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">or</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isRedirecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 rounded-xl transition-colors duration-200 font-medium border border-gray-200"
              onClick={() => { loginAsGuest(); navigate('/'); }}
            >
              <UserRound className="w-5 h-5" />
              Continue as Guest
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-400 text-center">
              Sign in for personalized recommendations and saved chat history.
              Guests can chat but conversations are not saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
