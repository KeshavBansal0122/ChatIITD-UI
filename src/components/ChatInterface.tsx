import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Message, AuthError } from '../services/api';
import { useChatWebSocket, ChatStatus } from '../hooks';
import { Send, Bot, User, Copy, Check, Square, Menu, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  chatId: string | null;
  onChatCreated: (chatId: string) => void;
  onOpenMobileMenu?: () => void;
}

// Format tool status message for display
function formatToolStatus(toolRaw: string): string {
  const match = toolRaw.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) return toolRaw;

  const toolName = match[1];
  const argsStr = match[2] || '';

  switch (toolName) {
    case 'query_sqlite_db':
      return 'Digging up courses data...';

    case 'get_course_data': {
      const codesMatch = argsStr.match(/course_codes=\[([^\]]+)\]/);
      if (codesMatch) {
        const codes = codesMatch[1].replace(/['"]/g, '').split(',').map(s => s.trim()).join(', ');
        return `Checking out ${codes}...`;
      }
      return 'Checking out courses...';
    }

    case 'get_programme_structure': {
      const progMatch = argsStr.match(/programme_code=(\w+)/);
      if (progMatch) {
        return `Checking the programme structure for ${progMatch[1]}...`;
      }
      return 'Checking the programme structure...';
    }

    case 'get_rules_section':
    case 'search_rules':
      return 'Checking the institute rules...';

    case 'search_courses':
      return 'Searching in Courses of Study...';

    default:
      return `using ${toolRaw}`;
  }
}

// Thinking/Status indicator component
function StatusIndicator({ status, toolName }: { status: ChatStatus; toolName: string | null }) {
  if (status === 'idle' || status === 'error') return null;

  const showTool = toolName && (status === 'tool_call' || status === 'thinking');
  const displayText = showTool ? formatToolStatus(toolName) : null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-mono text-xs">
        {status === 'connecting' && 'connecting...'}
        {displayText}
        {status === 'thinking' && !toolName && 'thinking...'}
      </span>
    </div>
  );
}

// Copy button component
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-lg"
      title="Copy as markdown"
    >
      {copied ? (
        <Check className="w-4 h-4 text-gray-500" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-700" />
      )}
    </button>
  );
}

// Markdown renderer component
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-black/10">{children}</code>
            ) : (
              <code className="block p-3 rounded-xl text-sm font-mono overflow-x-auto mb-2 bg-black/10">{children}</code>
            );
          },
          pre: ({ children }) => <div className="mb-2">{children}</div>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-2 font-montserrat">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-2 font-montserrat">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 font-montserrat">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} className="underline underline-offset-2 text-gray-600 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-black/20 pl-4 italic mb-2 opacity-80">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const ALL_EXAMPLE_PROMPTS = [
  'What courses should I take in the next semester?',
  'How does the CGPA and SGPA grading system work?',
  'What are the prerequisites for COL334 (Computer Networks)?',
  'How many credits do I need to graduate?',
  'What elective options are available for 5th semester CSE students?',
  'What are the rules for auditing a course?',
  'Can you explain the Minor programme options at IIT Delhi?',
  'How can I get a minor degree in economics?',
];

function pickRandom4(arr: string[]): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export function ChatInterface({ chatId, onChatCreated, onOpenMobileMenu }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const { accessToken, isGuest, handleAuthError } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [examplePrompts] = useState(() => pickRandom4(ALL_EXAMPLE_PROMPTS));

  const currentChatIdRef = useRef(currentChatId);
  const onChatCreatedRef = useRef(onChatCreated);
  const handleAuthErrorRef = useRef(handleAuthError);

  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(() => { onChatCreatedRef.current = onChatCreated; }, [onChatCreated]);
  useEffect(() => { handleAuthErrorRef.current = handleAuthError; }, [handleAuthError]);

  const wsCallbacks = useMemo(() => ({
    onToken: (token: string) => {
      setStreamingContent((prev) => prev + token);
    },
    onDone: (messageId?: string) => {
      setStreamingContent((prev) => {
        if (prev) {
          const finalContent = prev;
          setMessages((msgs) => [
            ...msgs,
            {
              id: messageId || `msg-${Date.now()}`,
              chat_id: currentChatIdRef.current || '',
              sender: 'assistant' as const,
              content: finalContent,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        return '';
      });
    },
    onError: (error: string, errorCode?: string) => {
      console.error('WebSocket error:', error, errorCode);
      if (errorCode === 'unauthorized') {
        handleAuthErrorRef.current();
      }
      setStreamingContent((prev) => {
        if (prev) {
          setMessages((msgs) => [
            ...msgs,
            {
              id: `msg-${Date.now()}`,
              chat_id: currentChatIdRef.current || '',
              sender: 'assistant' as const,
              content: prev + '\n\n*[Generation stopped]*',
              created_at: new Date().toISOString(),
            },
            {
              id: `err-${Date.now()}`,
              chat_id: currentChatIdRef.current || '',
              sender: 'assistant' as const,
              content: error,
              created_at: new Date().toISOString(),
              isError: true,
            },
          ]);
        } else {
          setMessages((msgs) => [
            ...msgs,
            {
              id: `err-${Date.now()}`,
              chat_id: currentChatIdRef.current || '',
              sender: 'assistant' as const,
              content: error,
              created_at: new Date().toISOString(),
              isError: true,
            },
          ]);
        }
        return '';
      });
    },
    onChatCreated: (chat: { id: string; title: string }) => {
      setCurrentChatId(chat.id);
      onChatCreatedRef.current(chat.id);
    },
  }), []);

  const { sendMessage: wsSendMessage, stopGeneration, status, currentTool } = useChatWebSocket(
    accessToken,
    wsCallbacks
  );

  useEffect(() => {
    setCurrentChatId(chatId);
  }, [chatId]);

  const loadMessages = useCallback(async () => {
    if (!accessToken || !chatId || isGuest) return;

    try {
      setIsLoading(true);
      const fetchedMessages = await apiService.getMessages(accessToken, chatId);
      setMessages(fetchedMessages);
    } catch (error) {
      if (error instanceof AuthError) {
        handleAuthError();
        return;
      }
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, chatId, isGuest, handleAuthError]);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [chatId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isGenerating = status !== 'idle' && status !== 'error';

  const sendContent = (messageContent: string) => {
    if ((!accessToken && !isGuest) || !messageContent.trim() || isGenerating) return;
    setInputMessage('');
    setStreamingContent('');
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: currentChatId || '',
      sender: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    // Guests always use /ws/chat/new — the backend's existing-chat endpoint
    // only accepts integer IDs and has no persistent guest session support.
    wsSendMessage(messageContent, isGuest ? undefined : (currentChatId || undefined));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendContent(inputMessage.trim());
  };

  const handleStopGeneration = () => {
    stopGeneration();
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Mobile header */}
      {onOpenMobileMenu && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 font-montserrat tracking-tight">ChatIITD</h1>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {!chatId && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
            <div className="text-center">
              <div className="bg-gray-100 p-5 rounded-full mb-5 inline-block">
                <MessageSquare className="w-9 h-9 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-montserrat tracking-tight">Welcome to ChatIITD</h2>
              <p className="text-gray-500 text-sm max-w-xs">
                {isGuest
                  ? 'Ask anything about IIT Delhi academics. Sign in for personalized answers.'
                  : 'Your AI assistant for IITD academics. Try one of these to get started.'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendContent(prompt)}
                  className="text-left px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 group"
                >
                  <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200 leading-snug">{prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : messages.length === 0 && !streamingContent && !isGenerating ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'assistant' && (
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${
                    message.isError
                      ? 'bg-red-100'
                      : 'bg-gray-900'
                  }`}>
                    {message.isError
                      ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      : <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    }
                  </div>
                )}
                <div
                  className={`group relative max-w-[85%] sm:max-w-2xl px-4 py-3 rounded-2xl transition-all duration-200 ${
                    message.isError
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : message.sender === 'user'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.isError ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <MarkdownContent content={message.content} />
                  )}
                  {message.sender === 'assistant' && !message.isError && (
                    <div className="absolute -bottom-6 left-0">
                      <CopyButton content={message.content} />
                    </div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Status indicator when processing */}
            {isGenerating && !streamingContent && (
              <div className="flex gap-3 sm:gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-900 flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-100">
                  <StatusIndicator status={status} toolName={currentTool} />
                </div>
              </div>
            )}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex gap-3 sm:gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-900 flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="group relative max-w-[85%] sm:max-w-2xl px-4 py-3 rounded-2xl bg-gray-100 text-gray-900">
                  <MarkdownContent content={streamingContent} />
                  {(status === 'thinking' || status === 'tool_call') && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <StatusIndicator status={status} toolName={currentTool} />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isGenerating}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 disabled:opacity-50 text-base"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-4 py-2 sm:px-5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors duration-200 flex items-center gap-2"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-4 py-2 sm:px-5 sm:py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-xl transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageSquare({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
