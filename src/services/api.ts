const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export class AuthError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (messageId: string) => void;
  onError: (error: string) => void;
  onChatCreated?: (chat: { id: string; title: string }) => void;
}

class ApiService {
  private getHeaders(accessToken: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  async getChats(accessToken: string): Promise<Chat[]> {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  }

  async createNewChat(accessToken: string, content: string): Promise<{ chat: Chat; message: Message; title: string }> {
    const response = await fetch(`${API_BASE_URL}/chats/new`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to create new chat');
    }

    return response.json();
  }

  async createNewChatStream(
    accessToken: string,
    content: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chats/new/stream`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to create new chat');
    }

    await this.processSSEStream(response, callbacks);
  }

  async getChat(accessToken: string, chatId: string): Promise<Chat> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }

    return response.json();
  }

  async getMessages(accessToken: string, chatId: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async deleteChat(token: string, chatId: string) {
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401) {
      throw new AuthError();
    }

    if (!res.ok) throw new Error('Failed to delete chat');
    return true;
  }


  async sendMessage(accessToken: string, chatId: string, content: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  async sendMessageStream(
    accessToken: string,
    chatId: string,
    content: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/stream`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    await this.processSSEStream(response, callbacks);
  }

  private async processSSEStream(response: Response, callbacks: StreamCallbacks): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              try {
                const data = JSON.parse(jsonStr);
                
                if (data.chat && callbacks.onChatCreated) {
                  callbacks.onChatCreated(data.chat);
                } else if (data.token) {
                  callbacks.onToken(data.token);
                } else if (data.done) {
                  callbacks.onDone(data.message_id);
                } else if (data.error) {
                  callbacks.onError(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const apiService = new ApiService();