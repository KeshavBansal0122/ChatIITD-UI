import { useState } from 'react';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatInterface } from '../components/ChatInterface';

export function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
  };

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
