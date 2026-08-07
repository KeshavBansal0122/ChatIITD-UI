import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Chat, AuthError } from '../services/api';
import { Plus, MessageSquare, User, Loader2, ChevronLeft, ChevronRight, Menu as MenuIcon, LogIn } from 'lucide-react';

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
  const { accessToken, isGuest, handleAuthError } = useAuth();

  const loadChats = useCallback(async () => {
    if (!accessToken || isGuest) {
      setIsLoading(false);
      return;
    }

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
  }, [accessToken, isGuest, handleAuthError]);

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
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          bg-[#f1ece5] border-r border-pplx-border flex flex-col h-full text-pplx-ink
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-72'}
          ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 md:relative' : 'hidden md:flex'}
        `}
      >
        <div className="p-3 border-b border-pplx-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              {!isCollapsed && (
                <h1 className="text-lg font-semibold tracking-tight text-pplx-ink whitespace-nowrap">
                  Chat<span className="text-iitd-red">IITD</span>
                </h1>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isCollapsed && !isGuest && (
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-pplx-muted hover:text-pplx-ink hover:bg-black/5 rounded-lg transition-colors duration-200"
                  title="Profile"
                >
                  <User className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onToggleCollapse}
                className="hidden md:block p-2 text-pplx-muted hover:text-pplx-ink hover:bg-black/5 rounded-lg transition-colors duration-200"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              {isMobileOpen && (
                <button
                  onClick={onMobileClose}
                  className="md:hidden p-2 text-pplx-muted hover:text-pplx-ink hover:bg-black/5 rounded-lg transition-colors duration-200"
                  title="Close menu"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className={`
              w-full flex items-center gap-2 px-3 py-2.5
              bg-iitd-red hover:bg-iitd-red-dark
              text-white rounded-xl transition-colors duration-200 font-medium text-sm
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'New Chat' : undefined}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && 'New Chat'}
          </button>

          {isCollapsed && !isGuest && (
            <button
              onClick={() => navigate('/profile')}
              className="w-full mt-2 flex items-center justify-center px-3 py-2.5 text-pplx-muted hover:text-pplx-ink hover:bg-black/5 rounded-xl transition-colors duration-200"
              title="Profile"
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isGuest ? (
            !isCollapsed && (
              <div className="p-3 space-y-3">
                <div className="bg-pplx-surface border border-pplx-border rounded-xl p-4">
                  <p className="text-sm text-pplx-muted mb-3">
                    You're in guest mode. Sign in to save chats and get personalized recommendations.
                  </p>
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-iitd-red hover:bg-iitd-red-dark text-white text-sm rounded-lg transition-colors duration-200 font-medium"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </Link>
                </div>
              </div>
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-iitd-red animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            !isCollapsed && (
              <div className="p-4 text-center text-pplx-muted text-sm">
                No chats yet. Create one to get started!
              </div>
            )
          ) : (
            <div className="p-2 space-y-0.5">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                    transition-colors duration-200
                    ${selectedChatId === chat.id
                      ? 'bg-iitd-red-soft/55 text-iitd-red-dark'
                      : 'text-pplx-ink/80 hover:bg-[#ebe4da] hover:text-pplx-ink'
                    }
                  `}
                >
                  {/* Left: chat content */}
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-pplx-muted" />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{chat.title || 'Untitled Chat'}</div>
                        <div className="text-xs text-pplx-muted mt-0.5">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: ellipsis menu */}
                  {!isCollapsed && (
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="p-1 hover:bg-black/5 rounded-lg transition-colors duration-200">
                        <MoreVertical className="w-4 h-4 text-pplx-muted" />
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
                        <Menu.Items className="absolute right-0 mt-1 w-40 bg-pplx-surface border border-pplx-border rounded-xl shadow-sm focus:outline-none z-10">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleDeleteChat(chat.id)}
                                className={`${
                                  active ? 'bg-iitd-red-soft/50 text-iitd-red' : 'text-pplx-ink/80'
                                } group flex w-full items-center px-4 py-2.5 text-sm transition-colors duration-150 rounded-xl`}
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
