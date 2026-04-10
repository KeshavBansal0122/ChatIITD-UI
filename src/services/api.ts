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

// Profile & Courses types
export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  kerberos: string | null;
  entry_number: string | null;
  department: string | null;
  hostel: string | null;
  category: string | null;
  programme_code: string | null;
  programme_name: string | null;
  year_of_joining: number | null;
  max_semesters: number;
}

export interface UserCourses {
  courses: Record<string, string[]>;
}

export interface CourseValidationResult {
  valid: string[];
  invalid: string[];
}

export interface UserCoursesUpdateResponse {
  courses: Record<string, string[]>;
  validation: CourseValidationResult;
}

export interface DefaultCoursesResponse {
  programme_code: string | null;
  programme_name: string | null;
  year_of_joining: number | null;
  current_semester: number;
  courses: Record<string, string[]>;
}

export interface CourseSearchResult {
  code: string;
  name: string;
}

export interface CourseSearchResponse {
  courses: CourseSearchResult[];
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

  // ---------- User Profile & Courses API ----------

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  }

  async getUserCourses(accessToken: string): Promise<UserCourses> {
    const response = await fetch(`${API_BASE_URL}/user/courses`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch user courses');
    }

    return response.json();
  }

  async updateUserCourses(accessToken: string, courses: Record<string, string[]>): Promise<UserCoursesUpdateResponse> {
    const response = await fetch(`${API_BASE_URL}/user/courses`, {
      method: 'PUT',
      headers: this.getHeaders(accessToken),
      body: JSON.stringify({ courses }),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to update user courses');
    }

    return response.json();
  }

  async getDefaultCourses(accessToken: string): Promise<DefaultCoursesResponse> {
    const response = await fetch(`${API_BASE_URL}/user/courses/defaults`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to fetch default courses');
    }

    return response.json();
  }

  async searchCourses(accessToken: string, query: string): Promise<CourseSearchResponse> {
    const response = await fetch(`${API_BASE_URL}/courses/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error('Failed to search courses');
    }

    return response.json();
  }
}

export const apiService = new ApiService();