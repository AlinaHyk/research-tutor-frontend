/**
 * TypeScript type definitions for the Research Tutor application.
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  institution?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  institution?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    sources?: Source[];
    [key: string]: any;
  };
  created_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

// ============================================================================
// Document Types
// ============================================================================

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  title?: string;
  description?: string;
  category?: string;
  processed: boolean;
  processing_error?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUpload {
  file: File;
  title?: string;
  description?: string;
  category?: string;
}

// ============================================================================
// RAG Types
// ============================================================================

export interface RAGQuery {
  query: string;
  chat_id?: string;
  document_ids?: string[];
  top_k?: number;
}

export interface Source {
  document_id: string;
  document_name: string;
  chunk_text: string;
  similarity_score: number;
  page_number?: number;
}

export interface RAGResponse {
  answer: string;
  sources: Source[];
  message_id: string;
  processing_time: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ChatListResponse {
  chats: Chat[];
  total: number;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}

export interface HealthCheck {
  status: string;
  version: string;
  database: string;
  rag_system: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export type ViewMode = 'chat' | 'documents' | 'split';
