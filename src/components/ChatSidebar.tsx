import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Chat } from '../services/api';
import { Plus, MessageSquare, LogOut, Loader2 } from 'lucide-react';

import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MoreVertical } from 'lucide-react';


interface ChatSidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function ChatSidebar({ selectedChatId, onSelectChat, onNewChat, refreshTrigger }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken, logout } = useAuth();

  const loadChats = useCallback(async () => {
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
  }, [accessToken]);

  useEffect(() => {
    loadChats();
  }, [refreshTrigger, loadChats]);

  const handleNewChat = () => {
    onNewChat();
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!accessToken) return;
    const confirmed = window.confirm('Are you sure you want to delete this chat?');
    if (!confirmed) return;

    try {
      await apiService.deleteChat(accessToken, chatId);
      setChats(chats.filter((chat) => chat.id !== chatId));
      
      // If the deleted chat was the selected one, go to home page
      if (selectedChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
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
            <h1 className="text-xl font-bold text-white">ChatIITD</h1>
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
              <div
                key={chat.id}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                  selectedChatId === chat.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {/* Left: chat content */}
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{chat.title || 'Untitled Chat'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Right: ellipsis menu */}
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="p-1 hover:bg-gray-700 rounded-full transition">
                    <MoreVertical className="w-4 h-4 text-gray-400 hover:text-white" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg focus:outline-none z-10">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            className={`${
                              active ? 'bg-red-600 text-white' : 'text-gray-300'
                            } group flex w-full items-center px-4 py-2 text-sm`}
                          >
                            Delete Chat
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>

            ))}
          </div>
        )}
      </div>
    </div>
  );
}