import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare } from 'lucide-react';

export function Login() {
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();

  // We'll use the Google One Tap / button flow which returns a credential (id_token)
  const handleSuccess = async (response: { credential?: string }) => {
    setError('');

    try {
      const idToken = response.credential;
      if (!idToken) {
        throw new Error('No id_token returned from Google');
      }

      await loginWithGoogle(idToken);
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google sign-in failed. Please try again.');
    }
  };

  const handleError = (err?: unknown) => {
    console.error('Google login error (client):', err);
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">chatIITD</h1>
          <p className="text-gray-400">Sign in with Google to continue</p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-800">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <div className="w-full">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              text="signin_with"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-500 text-center">
              Your Google account will be used to authenticate with the backend API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
