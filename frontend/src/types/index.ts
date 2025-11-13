/**
 * Type definitions for the application
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  webview?: WebviewContent;
}

export interface WebviewContent {
  type: 'html' | 'form' | 'result';
  html: string;
  metadata?: Record<string, any>;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentModel: string;
  availableModels: string[];
}

export interface WebSocketMessage {
  type: 'connected' | 'chat_start' | 'chat_chunk' | 'chat_complete' | 'error' | 'pong';
  content?: string;
  fullContent?: string;
  message?: string;
  error?: string;
  timestamp?: number;
}

export interface SendMessageRequest {
  type: 'chat' | 'ping';
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}
