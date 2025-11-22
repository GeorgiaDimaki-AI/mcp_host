/**
 * MCP (Model Context Protocol) Service
 * Handles connection to MCP servers and tool execution
 * Supports elicitation and notifications
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { EventEmitter } from 'events';

export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
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

export interface ElicitationRequest {
  serverName: string;
  message: string;
  requestId: string;
  mode: 'form' | 'url';
  // Form mode fields
  requestedSchema?: any;
  // URL mode fields
  url?: string;
  elicitationId?: string;
}

export interface ElicitationResponse {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, any>;
}

export interface MCPNotification {
  serverName: string;
  toolName?: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  data?: any;
}

/**
 * MCP Service with elicitation and notification support
 */
export class MCPService extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private servers: MCPServer[] = [];
  private pendingElicitations: Map<string, (response: ElicitationResponse) => void> = new Map();
  private activeOperations: Set<string> = new Set(); // Track active webviews/operations

  // Phase 3: Direct backend communication - Request tracking for replay attack prevention
  private activeRequests: Map<string, {
    timestamp: number;
    used: boolean;
    serverName: string;
  }> = new Map();

  private REQUEST_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize MCP service with server configurations
   */
  async initialize(servers: MCPServer[]) {
    this.servers = servers;

    for (const server of servers) {
      try {
        await this.connectToServer(server);
      } catch (error) {
        console.error(`Failed to connect to MCP server ${server.name}:`, error);
      }
    }
  }

  /**
   * Connect to an MCP server with elicitation support
   */
  private async connectToServer(server: MCPServer): Promise<void> {
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: server.env,
    });

    const client = new Client({
      name: 'llm-webview-client',
      version: '1.0.0',
    }, {
      capabilities: {
        elicitation: {
          form: {},  // Explicitly declare form mode support
          url: {},   // Explicitly declare URL mode support
        },
      },
    });

    // Handle elicitation completion notifications (for URL mode)
    client.setNotificationHandler(
      { method: 'notifications/elicitation/complete' } as any,
      async (notification: any) => {
        console.log('Elicitation completed:', notification);
        const elicitationId = notification.params?.elicitationId;

        if (elicitationId) {
          // Emit event that frontend can listen to
          this.emit('elicitation-complete', {
            serverName: server.name,
            elicitationId,
          });
        }
      }
    );

    // Handle elicitation requests from server
    client.setRequestHandler(
      ElicitRequestSchema,
      async (request) => {
        console.log('Server requested elicitation:', request);

        const requestId = `${server.name}:${Date.now()}`;
        const params = request.params as any;

        const elicitRequest: ElicitationRequest = {
          serverName: server.name,
          message: params.message,
          requestId,
          mode: params.mode || 'form', // Default to form for backwards compatibility
          requestedSchema: params.requestedSchema,
          url: params.url,
          elicitationId: params.elicitationId,
        };

        // Phase 3: Track this request for direct backend submission
        this.activeRequests.set(requestId, {
          timestamp: Date.now(),
          used: false,
          serverName: server.name,
        });

        // Emit event to frontend
        // Frontend will handle differently based on mode:
        // - form mode: show webview or auto-generated form
        // - url mode: show consent dialog and open URL in browser
        this.emit('elicitation-request', elicitRequest);

        // Wait for response from frontend
        const response = await new Promise<ElicitationResponse>((resolve) => {
          this.pendingElicitations.set(requestId, resolve);
        });

        // Clean up
        this.pendingElicitations.delete(requestId);

        // Return in proper MCP format
        // For URL mode, content is omitted (user interaction happens out-of-band)
        return {
          action: response.action,
          content: elicitRequest.mode === 'url' ? undefined : response.content,
        };
      }
    );

    await client.connect(transport);
    this.clients.set(server.name, client);

    console.log(`Connected to MCP server: ${server.name}`);
  }

  /**
   * Respond to an elicitation request
   * Phase 3: Includes request validation to prevent replay attacks
   */
  respondToElicitation(requestId: string, response: ElicitationResponse) {
    // Phase 3: Validate request for direct backend submission
    const request = this.activeRequests.get(requestId);

    if (!request) {
      throw new Error('Invalid or expired request ID');
    }

    if (request.used) {
      throw new Error('Request already used - possible replay attack');
    }

    // Check expiration (5 minutes)
    if (Date.now() - request.timestamp > this.REQUEST_EXPIRATION_MS) {
      this.activeRequests.delete(requestId);
      throw new Error('Request expired');
    }

    // Mark as used to prevent replay
    request.used = true;

    // Resolve the pending elicitation
    const resolver = this.pendingElicitations.get(requestId);
    if (resolver) {
      resolver(response);
    } else {
      throw new Error('No pending elicitation found for this request');
    }

    // Clean up after a short delay to allow MCP response to complete
    setTimeout(() => {
      this.activeRequests.delete(requestId);
    }, 10000); // 10 seconds
  }

  /**
   * Mark an operation as active (prevents duplicate requests)
   */
  markOperationActive(operationId: string) {
    this.activeOperations.add(operationId);
  }

  /**
   * Mark an operation as complete
   */
  markOperationComplete(operationId: string) {
    this.activeOperations.delete(operationId);
  }

  /**
   * Check if an operation is active
   */
  isOperationActive(operationId: string): boolean {
    return this.activeOperations.has(operationId);
  }

  /**
   * Send a notification (unprompted message) to frontend
   */
  sendNotification(notification: MCPNotification) {
    this.emit('notification', notification);
  }

  /**
   * List all available tools from all connected servers
   */
  async listTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverName, client] of this.clients.entries()) {
      try {
        const response = await client.listTools();

        for (const tool of response.tools) {
          allTools.push({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema,
            serverName,
          });
        }
      } catch (error) {
        console.error(`Error listing tools from ${serverName}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Call an MCP tool
   */
  async callTool(serverName: string, toolName: string, args: any): Promise<MCPToolResult> {
    const client = this.clients.get(serverName);

    if (!client) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    try {
      const response = await client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract content from response
      let content = '';
      if (Array.isArray(response.content)) {
        content = response.content
          .map(item => {
            if (item.type === 'text') {
              return item.text;
            }
            return '';
          })
          .join('\n');
      }

      // Parse for webview content
      const webviewMatch = content.match(/```webview:(\w+)\n([\s\S]*?)```/);

      if (webviewMatch) {
        const [fullMatch, type, html] = webviewMatch;
        const contentWithoutWebview = content.replace(fullMatch, '').trim();

        return {
          content: contentWithoutWebview,
          hasWebview: true,
          webviewType: type as 'form' | 'result' | 'html',
          webviewHtml: html.trim(),
        };
      }

      return {
        content,
        hasWebview: false,
      };
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Disconnect from all servers
   */
  async disconnect() {
    for (const [serverName, client] of this.clients.entries()) {
      try {
        await client.close();
        console.log(`Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        console.error(`Error disconnecting from ${serverName}:`, error);
      }
    }
    this.clients.clear();
  }

  /**
   * Check if any servers are connected
   */
  isConnected(): boolean {
    return this.clients.size > 0;
  }
}
