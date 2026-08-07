import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage, CallbackPage, ChatPage, ProfilePage } from './pages';
import { LoadingScreen } from './components/ui/LoadingScreen';

/** Allows authenticated users and guests (but not unauthenticated non-guests). */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Only allows fully authenticated users (not guests). */
function AuthRequiredRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthRequiredRoute>
                <ProfilePage />
              </AuthRequiredRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
