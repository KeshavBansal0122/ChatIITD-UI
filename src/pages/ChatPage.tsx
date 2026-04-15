import { useState, useEffect } from 'react';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatInterface } from '../components/ChatInterface';

export function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) {
      setIsSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
  };

  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <ChatSidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={handleNewChat}
        refreshTrigger={refreshTrigger}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <ChatInterface 
        chatId={selectedChatId} 
        onChatCreated={handleChatCreated}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
