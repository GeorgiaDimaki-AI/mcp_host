/**
 * MCP (Model Context Protocol) Service
 * Handles connection to MCP servers and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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

export class MCPService {
  private clients: Map<string, Client> = new Map();
  private servers: MCPServer[] = [];

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
   * Connect to an MCP server
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
        tools: {},
      },
    });

    await client.connect(transport);
    this.clients.set(server.name, client);

    console.log(`Connected to MCP server: ${server.name}`);
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
