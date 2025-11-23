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

export type TrustLevel = 'verified' | 'trusted' | 'unverified';

export interface WebviewContent {
  type: 'html' | 'form' | 'result';
  html: string;
  metadata?: Record<string, any>;
  source?: 'chat' | 'mcp'; // Source of the webview
  mcpServer?: string; // MCP server name if source is 'mcp'
  mcpTool?: string; // MCP tool name if source is 'mcp'
  trustLevel?: TrustLevel; // Trust level of the MCP server (default: 'unverified')
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentModel: string;
  availableModels: string[];
}

export interface WebSocketMessage {
  type: 'connected' | 'chat_start' | 'chat_chunk' | 'chat_complete' | 'error' | 'pong' | 'elicitation-request' | 'elicitation-complete' | 'mcp-notification' | 'tool_execution' | 'tool_approval_request' | 'clear_streaming' | 'chat_cancelled';
  content?: string;
  fullContent?: string;
  message?: string;
  error?: string;
  timestamp?: number;
  request?: any; // For elicitation-request
  data?: any; // For elicitation-complete
  notification?: any; // For mcp-notification
  tool?: string; // For tool_execution
  server?: string; // For tool_execution
  status?: 'executing' | 'completed' | 'error'; // For tool_execution
  result?: MCPToolResult; // For tool_execution
}

export interface SendMessageRequest {
  type: 'chat' | 'ping' | 'elicitation-response' | 'tool_approval_response';
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  mcpServer?: string; // Selected MCP server for tool calling
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
  requestId?: string; // For elicitation-response or tool_approval_response
  response?: any; // For elicitation-response
  decision?: 'allow-once' | 'decline' | 'allow-session'; // For tool_approval_response
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
  // Additional fields for rendering
  mcpServer?: string;
  mcpTool?: string;
  trustLevel?: TrustLevel;
}
