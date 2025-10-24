const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  }

  async createChat(accessToken: string, title: string | null = null): Promise<Chat> {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    return response.json();
  }

  async getChat(accessToken: string, chatId: string): Promise<Chat> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      headers: this.getHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }

    return response.json();
  }

  async getMessages(accessToken: string, chatId: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      headers: this.getHeaders(accessToken),
    });

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

    if (!res.ok) throw new Error('Failed to delete chat');
    return true;
  }


  async sendMessage(accessToken: string, chatId: string, content: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }
}

export const apiService = new ApiService();