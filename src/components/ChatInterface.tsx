import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Message, AuthError } from '../services/api';
import { useChatWebSocket, ChatStatus } from '../hooks';
import { Send, Bot, User, Copy, Check, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  chatId: string | null;
  onChatCreated: (chatId: string) => void;
}

// Format tool status message for display
function formatToolStatus(toolRaw: string): string {
  // toolRaw format: "tool_name" or "tool_name(arg1=val1, arg2=val2)"
  const match = toolRaw.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) return toolRaw;
  
  const toolName = match[1];
  const argsStr = match[2] || '';
  
  switch (toolName) {
    case 'query_sqlite_db':
      return 'Digging up courses data...';
    
    case 'get_course_data': {
      // Extract course codes from args like "course_codes=['COL106', 'MTL108']"
      const codesMatch = argsStr.match(/course_codes=\[([^\]]+)\]/);
      if (codesMatch) {
        const codes = codesMatch[1].replace(/['"]/g, '').split(',').map(s => s.trim()).join(', ');
        return `Checking out ${codes}...`;
      }
      return 'Checking out courses...';
    }
    
    case 'get_programme_structure': {
      // Extract programme code from args like "programme_code=ME2"
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

  // Determine what to show - if we have a tool name, show it even during thinking
  const showTool = toolName && (status === 'tool_call' || status === 'thinking');
  const displayText = showTool ? formatToolStatus(toolName) : null;
  
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-mono">
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
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
      title="Copy as markdown"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
      )}
    </button>
  );
}

// Markdown renderer component
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none">
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
              <code className="bg-gray-900 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <code className="block bg-gray-900 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-2">{children}</code>
            );
          },
          pre: ({ children }) => <div className="mb-2">{children}</div>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 italic mb-2">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatInterface({ chatId, onChatCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const { accessToken, handleAuthError } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use refs for values needed in callbacks to avoid recreating callbacks
  const currentChatIdRef = useRef(currentChatId);
  const onChatCreatedRef = useRef(onChatCreated);
  const handleAuthErrorRef = useRef(handleAuthError);
  
  // Keep refs updated
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);
  
  useEffect(() => {
    onChatCreatedRef.current = onChatCreated;
  }, [onChatCreated]);
  
  useEffect(() => {
    handleAuthErrorRef.current = handleAuthError;
  }, [handleAuthError]);

  // Memoize callbacks to prevent hook from re-initializing
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
    onError: (error: string) => {
      console.error('WebSocket error:', error);
      if (error === 'Authentication failed') {
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
          ]);
        }
        return '';
      });
    },
    onChatCreated: (chat: { id: string; title: string }) => {
      setCurrentChatId(chat.id);
      onChatCreatedRef.current(chat.id);
    },
  }), []); // Empty deps - callbacks use refs for changing values

  // WebSocket hook
  const { sendMessage: wsSendMessage, stopGeneration, status, currentTool } = useChatWebSocket(
    accessToken,
    wsCallbacks
  );

  // Sync chatId prop with local state
  useEffect(() => {
    setCurrentChatId(chatId);
  }, [chatId]);

  const loadMessages = useCallback(async () => {
    if (!accessToken || !chatId) return;

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
  }, [accessToken, chatId, handleAuthError]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !inputMessage.trim() || isGenerating) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setStreamingContent('');

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: currentChatId || '',
      sender: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via WebSocket
    wsSendMessage(messageContent, currentChatId || undefined);
  };

  const handleStopGeneration = () => {
    stopGeneration();
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-950 h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {!chatId && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="bg-gray-900 p-6 rounded-full mb-4 inline-block">
                <MessageSquare className="w-12 h-12 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to ChatIITD</h2>
              <p className="text-gray-400">Start a new conversation by typing a message below</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : messages.length === 0 && !streamingContent && !isGenerating ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`group relative max-w-2xl px-4 py-3 rounded-2xl ${
                    message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <MarkdownContent content={message.content} />
                  {message.sender === 'assistant' && (
                    <div className="absolute -bottom-6 left-0">
                      <CopyButton content={message.content} />
                    </div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Status indicator when processing */}
            {isGenerating && !streamingContent && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-800">
                  <StatusIndicator status={status} toolName={currentTool} />
                </div>
              </div>
            )}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="group relative max-w-2xl px-4 py-3 rounded-2xl bg-gray-800 text-gray-100">
                  <MarkdownContent content={streamingContent} />
                  {/* Show thinking status below streaming content if still processing tools */}
                  {(status === 'thinking' || status === 'tool_call') && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
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

      <div className="border-t border-gray-800 p-4 bg-gray-900">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isGenerating}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition disabled:opacity-50"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2"
                title="Stop generation"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
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
