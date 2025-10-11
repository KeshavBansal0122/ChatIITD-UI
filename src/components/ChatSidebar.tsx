import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Chat } from '../services/api';
import { Plus, MessageSquare, LogOut, Loader2 } from 'lucide-react';

interface ChatSidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ selectedChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken, logout } = useAuth();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      const fetchedChats = await apiService.getChats(accessToken);
      setChats(fetchedChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!accessToken) return;

    try {
      const newChat = await apiService.createChat(accessToken);
      setChats([newChat, ...chats]);
      onNewChat();
      onSelectChat(newChat.id);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">chatIITD</h1>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No chats yet. Create one to get started!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  selectedChatId === chat.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {chat.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
