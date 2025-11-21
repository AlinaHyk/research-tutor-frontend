/**
 * Global state management using Zustand.
 * Manages authentication, current chat, documents, and UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Chat, Document, Message } from '@/types';
import apiService from '@/services/api';

// ============================================================================
// Auth Store
// ============================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          await apiService.login({ email, password });
          const user = await apiService.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await apiService.logout();
        set({ user: null, isAuthenticated: false });
      },

      fetchCurrentUser: async () => {
        if (!apiService.isAuthenticated()) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await apiService.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// ============================================================================
// Chat Store
// ============================================================================

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  
  fetchChats: () => Promise<void>;
  fetchChat: (chatId: string) => Promise<void>;
  createNewChat: (title?: string) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (query: string, documentIds?: string[]) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  error: null,

  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.listChats();
      set({ chats: response.chats, isLoading: false });
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
    }
  },

  fetchChat: async (chatId) => {
    set({ isLoading: true, error: null });
    try {
      const chat = await apiService.getChat(chatId);
      set({
        currentChat: chat,
        messages: chat.messages,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
    }
  },

  createNewChat: async (title) => {
    set({ isLoading: true, error: null });
    try {
      const chat = await apiService.createChat(title);
      set((state) => ({
        chats: [chat, ...state.chats],
        currentChat: chat,
        messages: [],
        isLoading: false,
      }));
      return chat;
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteChat: async (chatId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteChat(chatId);
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== chatId),
        currentChat:
          state.currentChat?.id === chatId ? null : state.currentChat,
        messages: state.currentChat?.id === chatId ? [] : state.messages,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
    }
  },

  sendMessage: async (query, documentIds) => {
    const { currentChat } = get();
    if (!currentChat) {
      throw new Error('No active chat');
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: currentChat.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    get().addMessage(userMessage);

    set({ isLoading: true, error: null });
    try {
      const response = await apiService.sendMessage(currentChat.id, {
        query,
        document_ids: documentIds,
        top_k: 5,
      });

      // Add assistant message
      const assistantMessage: Message = {
        id: response.message_id,
        chat_id: currentChat.id,
        role: 'assistant',
        content: response.answer,
        metadata: { sources: response.sources },
        created_at: new Date().toISOString(),
      };
      get().addMessage(assistantMessage);

      set({ isLoading: false });
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
      throw error;
    }
  },
}));

// ============================================================================
// Document Store
// ============================================================================

interface DocumentState {
  documents: Document[];
  selectedDocuments: string[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  
  setDocuments: (documents: Document[]) => void;
  setSelectedDocuments: (documentIds: string[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  toggleDocumentSelection: (documentId: string) => void;
  
  fetchDocuments: (category?: string) => Promise<void>;
  uploadDocument: (file: File, metadata?: Partial<Document>) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  selectedDocuments: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  setDocuments: (documents) => set({ documents }),
  setSelectedDocuments: (documentIds) =>
    set({ selectedDocuments: documentIds }),
  setCurrentDocument: (document) => set({ currentDocument: document }),
  
  toggleDocumentSelection: (documentId) => {
    set((state) => ({
      selectedDocuments: state.selectedDocuments.includes(documentId)
        ? state.selectedDocuments.filter((id) => id !== documentId)
        : [...state.selectedDocuments, documentId],
    }));
  },

  fetchDocuments: async (category) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.listDocuments(0, 100, category);
      set({ documents: response.documents, isLoading: false });
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
    }
  },

  uploadDocument: async (file, metadata) => {
    set({ isLoading: true, error: null });
    try {
      const document = await apiService.uploadDocument(
        file,
        metadata?.title,
        metadata?.description,
        metadata?.category
      );
      set((state) => ({
        documents: [document, ...state.documents],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDocument: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteDocument(documentId);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== documentId),
        selectedDocuments: state.selectedDocuments.filter(
          (id) => id !== documentId
        ),
        currentDocument:
          state.currentDocument?.id === documentId
            ? null
            : state.currentDocument,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: apiService.handleError(error),
        isLoading: false,
      });
    }
  },
}));

// ============================================================================
// UI Store
// ============================================================================

interface UIState {
  sidebarOpen: boolean;
  documentPanelOpen: boolean;
  theme: 'light' | 'dark';
  
  toggleSidebar: () => void;
  toggleDocumentPanel: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      documentPanelOpen: true,
      theme: 'light',

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleDocumentPanel: () =>
        set((state) => ({ documentPanelOpen: !state.documentPanelOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
