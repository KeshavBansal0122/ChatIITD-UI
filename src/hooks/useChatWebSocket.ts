import { useState, useCallback, useRef, useEffect } from 'react';

const WS_BASE_URL = import.meta.env.VITE_BACKEND_URL?.replace(/^http/, 'ws') || 'ws://localhost:8000';

export type ChatStatus = 'idle' | 'connecting' | 'thinking' | 'tool_call' | 'responding' | 'error';

export interface WebSocketCallbacks {
  onToken: (token: string) => void;
  onDone: (messageId?: string) => void;
  onError: (error: string) => void;
  onChatCreated?: (chat: { id: string; title: string }) => void;
  onStatusChange?: (status: ChatStatus, toolName?: string) => void;
}

interface UseChatWebSocketReturn {
  sendMessage: (content: string, chatId?: string) => void;
  stopGeneration: () => void;
  status: ChatStatus;
  currentTool: string | null;
  isConnected: boolean;
}

export function useChatWebSocket(
  accessToken: string | null,
  callbacks: WebSocketCallbacks
): UseChatWebSocketReturn {
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);
  
  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Use ref to track last tool for display continuity
  const lastToolRef = useRef<string | null>(null);

  const updateStatus = useCallback((newStatus: ChatStatus, tool?: string) => {
    setStatus(newStatus);
    // Only clear tool when explicitly set to null, or when going to idle/error
    if (tool !== undefined) {
      lastToolRef.current = tool;
      setCurrentTool(tool);
    } else if (newStatus === 'idle' || newStatus === 'error') {
      lastToolRef.current = null;
      setCurrentTool(null);
    }
    // For 'thinking' status, keep showing last tool if we have one
    callbacksRef.current.onStatusChange?.(newStatus, tool);
  }, []);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const stopGeneration = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  }, []);

  const sendMessage = useCallback((content: string, chatId?: string) => {
    if (!accessToken) {
      callbacksRef.current.onError('Not authenticated');
      return;
    }

    // Clean up existing connection
    cleanup();

    updateStatus('connecting');

    // Determine endpoint
    const endpoint = chatId 
      ? `${WS_BASE_URL}/ws/chat/${chatId}` 
      : `${WS_BASE_URL}/ws/chat/new`;
    
    // Add token as query param
    const wsUrl = `${endpoint}?token=${encodeURIComponent(accessToken)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      updateStatus('thinking');
      // Send the message
      ws.send(JSON.stringify({ type: 'message', content }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);
        
        switch (data.type) {
          case 'chat':
            // New chat created
            callbacksRef.current.onChatCreated?.({ id: data.id, title: data.title });
            break;
          
          case 'status':
            if (data.status === 'thinking') {
              updateStatus('thinking');
            } else if (data.status === 'tool_call') {
              updateStatus('tool_call', data.tool);
            } else if (data.status === 'responding') {
              updateStatus('responding');
            }
            break;
          
          case 'token':
            callbacksRef.current.onToken(data.content);
            break;
          
          case 'done':
            updateStatus('idle');
            callbacksRef.current.onDone(data.message_id);
            // Don't close for existing chat (can send more messages)
            if (!chatId) {
              cleanup();
            }
            break;
          
          case 'error':
            updateStatus('error');
            callbacksRef.current.onError(data.message);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateStatus('error');
      callbacksRef.current.onError('Connection error');
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (event.code === 4001) {
        callbacksRef.current.onError('Authentication failed');
      }
      // Don't update status to idle here, let the done/error handler do it
    };
  }, [accessToken, cleanup, updateStatus, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    sendMessage,
    stopGeneration,
    status,
    currentTool,
    isConnected,
  };
}
