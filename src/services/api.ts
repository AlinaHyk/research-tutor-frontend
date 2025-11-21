/**
 * API service for communicating with the backend.
 * Handles authentication, chats, documents, and RAG queries.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  UserCreate,
  UserLogin,
  AuthTokens,
  Chat,
  ChatListResponse,
  ChatWithMessages,
  Message,
  Document,
  DocumentListResponse,
  RAGQuery,
  RAGResponse,
  HealthCheck,
} from '@/types';

// API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private clearToken(): void {
    localStorage.removeItem('access_token');
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  async signup(userData: UserCreate): Promise<User> {
    const { data } = await this.client.post('/api/auth/signup', userData);
    return data;
  }

  async login(credentials: UserLogin): Promise<AuthTokens> {
    const { data } = await this.client.post('/api/auth/login', credentials);
    this.setToken(data.access_token);
    return data;
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get('/api/auth/me');
    return data;
  }

  async updateCurrentUser(updates: Partial<User>): Promise<User> {
    const { data} = await this.client.put('/api/auth/me', updates);
    return data;
  }

  // ============================================================================
  // Chats
  // ============================================================================

  async listChats(skip = 0, limit = 50): Promise<ChatListResponse> {
    const { data } = await this.client.get('/api/chats', {
      params: { skip, limit },
    });
    return data;
  }

  async createChat(title?: string): Promise<Chat> {
    const { data } = await this.client.post('/api/chats', {
      title: title || 'New Chat',
    });
    return data;
  }

  async getChat(chatId: string): Promise<ChatWithMessages> {
    const { data } = await this.client.get(`/api/chats/${chatId}`);
    return data;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.client.delete(`/api/chats/${chatId}`);
  }

  async sendMessage(chatId: string, query: RAGQuery): Promise<RAGResponse> {
    const { data } = await this.client.post(
      `/api/chats/${chatId}/messages`,
      query
    );
    return data;
  }

  async getChatMessages(
    chatId: string,
    skip = 0,
    limit = 100
  ): Promise<Message[]> {
    const { data } = await this.client.get(`/api/chats/${chatId}/messages`, {
      params: { skip, limit },
    });
    return data;
  }

  // ============================================================================
  // Documents
  // ============================================================================

  async listDocuments(
    skip = 0,
    limit = 50,
    category?: string
  ): Promise<DocumentListResponse> {
    const { data } = await this.client.get('/api/documents', {
      params: { skip, limit, category },
    });
    return data;
  }

  async uploadDocument(
    file: File,
    title?: string,
    description?: string,
    category?: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Build query parameters
    const params = new URLSearchParams();
    if (title) params.append('title', title);
    if (description) params.append('description', description);
    if (category) params.append('category', category);

    const { data } = await this.client.post(
      `/api/documents/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  async getDocument(documentId: string): Promise<Document> {
    const { data } = await this.client.get(`/api/documents/${documentId}`);
    return data;
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<Document> {
    const { data } = await this.client.put(
      `/api/documents/${documentId}`,
      updates
    );
    return data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/api/documents/${documentId}`);
  }

  async reindexDocument(documentId: string): Promise<Document> {
    const { data } = await this.client.post(
      `/api/documents/${documentId}/reindex`
    );
    return data;
  }

  // ============================================================================
  // Health & Info
  // ============================================================================

  async healthCheck(): Promise<HealthCheck> {
    const { data } = await this.client.get('/health');
    return data;
  }

  async getApiInfo(): Promise<any> {
    const { data } = await this.client.get('/api/info');
    return data;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  handleError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail: string }>;
      return axiosError.response?.data?.detail || 'An error occurred';
    }
    return 'An unexpected error occurred';
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
