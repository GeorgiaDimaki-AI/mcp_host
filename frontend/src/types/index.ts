/**
 * Type definitions for the application
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  webview?: WebviewContent;
  mcpTool?: {
    serverName: string;
    toolName: string;
    args?: any;
  };
}

export interface WebviewContent {
  type: 'html' | 'form' | 'result';
  html: string;
  metadata?: Record<string, any>;
  source?: 'chat' | 'mcp'; // Source of the webview
  mcpServer?: string; // MCP server name if source is 'mcp'
  mcpTool?: string; // MCP tool name if source is 'mcp'
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentModel: string;
  availableModels: string[];
}

export interface WebSocketMessage {
  type: 'connected' | 'chat_start' | 'chat_chunk' | 'chat_complete' | 'error' | 'pong' | 'elicitation-request' | 'elicitation-complete' | 'mcp-notification';
  content?: string;
  fullContent?: string;
  message?: string;
  error?: string;
  timestamp?: number;
  request?: any; // For elicitation-request
  data?: any; // For elicitation-complete
  notification?: any; // For mcp-notification
}

export interface SendMessageRequest {
  type: 'chat' | 'ping' | 'elicitation-response';
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
  requestId?: string; // For elicitation-response
  response?: any; // For elicitation-response
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

export interface MCPToolResult {
  content: string;
  hasWebview: boolean;
  webviewType?: 'form' | 'result' | 'html';
  webviewHtml?: string;
}

export interface MCPWebviewDisplay {
  id: string;
  serverName: string;
  toolName: string;
  webview: WebviewContent;
  timestamp: number;
  onResponse?: (data: any) => void;
}
