/**
 * MCP Routes
 * API endpoints for MCP functionality
 */

import { Router } from 'express';
import { MCPService } from '../services/mcp.js';

export function createMCPRouter(mcpService: MCPService) {
  const router = Router();

  /**
   * List all available MCP tools
   */
  router.get('/tools', async (req, res) => {
    try {
      const tools = await mcpService.listTools();
      res.json({ tools });
    } catch (error) {
      console.error('Error listing MCP tools:', error);
      res.status(500).json({ error: 'Failed to list MCP tools' });
    }
  });

  /**
   * Call an MCP tool
   */
  router.post('/tools/call', async (req, res) => {
    try {
      const { serverName, toolName, args } = req.body;

      if (!serverName || !toolName) {
        return res.status(400).json({ error: 'serverName and toolName are required' });
      }

      const result = await mcpService.callTool(serverName, toolName, args || {});
      res.json(result);
    } catch (error) {
      console.error('Error calling MCP tool:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to call MCP tool',
      });
    }
  });

  /**
   * Get connected servers
   */
  router.get('/servers', (req, res) => {
    try {
      const servers = mcpService.getConnectedServers();
      res.json({ servers, connected: mcpService.isConnected() });
    } catch (error) {
      console.error('Error getting MCP servers:', error);
      res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  });

  return router;
}
