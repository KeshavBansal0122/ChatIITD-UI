import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Chat, AuthError } from '../services/api';
import { Plus, MessageSquare, User, Loader2, ChevronLeft, ChevronRight, Menu as MenuIcon } from 'lucide-react';

import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MoreVertical } from 'lucide-react';


interface ChatSidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ChatSidebar({ 
  selectedChatId, 
  onSelectChat, 
  onNewChat, 
  refreshTrigger,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken, handleAuthError } = useAuth();

  const loadChats = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      const fetchedChats = await apiService.getChats(accessToken);
      setChats(fetchedChats);
    } catch (error) {
      if (error instanceof AuthError) {
        handleAuthError();
        return;
      }
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, handleAuthError]);

  useEffect(() => {
    loadChats();
  }, [refreshTrigger, loadChats]);

  const handleNewChat = () => {
    onNewChat();
    if (onMobileClose) onMobileClose();
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    if (onMobileClose) onMobileClose();
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
      if (error instanceof AuthError) {
        handleAuthError();
        return;
      }
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          bg-gradient-to-b from-gray-900 to-gray-900/95 border-r border-gray-800 flex flex-col h-full
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-80'}
          ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 md:relative' : 'hidden md:flex'}
        `}
      >
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              {/* <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div> */}
              {!isCollapsed && (
                <h1 className="text-xl font-bold text-white whitespace-nowrap">ChatIITD</h1>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {!isCollapsed && (
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={onToggleCollapse}
                className="hidden md:block p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
              
              {isMobileOpen && (
                <button
                  onClick={onMobileClose}
                  className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title="Close menu"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className={`
              w-full flex items-center gap-2 px-4 py-3 
              bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-700 hover:to-blue-800 
              text-white rounded-lg transition-all duration-200 font-medium
              shadow-lg hover:shadow-blue-500/50
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'New Chat' : undefined}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && 'New Chat'}
          </button>
          
          {isCollapsed && (
            <button
              onClick={() => navigate('/profile')}
              className="w-full mt-2 flex items-center justify-center px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            !isCollapsed && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No chats yet. Create one to get started!
              </div>
            )
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg 
                    transition-all duration-200
                    ${selectedChatId === chat.id
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  {/* Left: chat content */}
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{chat.title || 'Untitled Chat'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: ellipsis menu */}
                  {!isCollapsed && (
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="p-1 hover:bg-gray-700 rounded-full transition-all duration-200">
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
                                } group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150`}
                              >
                                Delete Chat
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}