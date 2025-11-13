/**
 * MCP API Service
 * Client-side API for calling MCP tools
 */

import { MCPTool, MCPToolResult } from '../types';

const API_BASE_URL = '/api/mcp';

export const mcpApi = {
  /**
   * List all available MCP tools
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await fetch(`${API_BASE_URL}/tools`);
    if (!response.ok) {
      throw new Error('Failed to list MCP tools');
    }
    const data = await response.json();
    return data.tools;
  },

  /**
   * Call an MCP tool
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<MCPToolResult> {
    const response = await fetch(`${API_BASE_URL}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverName,
        toolName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to call MCP tool');
    }

    return response.json();
  },

  /**
   * Get connected MCP servers
   */
  async getServers(): Promise<{ servers: string[]; connected: boolean }> {
    const response = await fetch(`${API_BASE_URL}/servers`);
    if (!response.ok) {
      throw new Error('Failed to get MCP servers');
    }
    return response.json();
  },
};
