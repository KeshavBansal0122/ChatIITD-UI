import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatInterface } from './components/ChatInterface';

function ChatApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setRefreshTrigger((prev) => prev + 1); // Trigger sidebar refresh
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ChatSidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={handleNewChat}
        refreshTrigger={refreshTrigger}
      />
      <ChatInterface chatId={selectedChatId} onChatCreated={handleChatCreated} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ChatApp />
    </AuthProvider>
  );
}

export default App;
