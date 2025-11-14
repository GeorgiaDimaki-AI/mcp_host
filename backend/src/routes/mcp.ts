/**
 * MCP Routes
 * API endpoints for MCP functionality
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
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

  /**
   * Get MCP configuration
   */
  router.get('/config', (req, res) => {
    try {
      const configPath = './mcp-config.json';

      if (!existsSync(configPath)) {
        return res.json({ mcpServers: {} });
      }

      const configData = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);

      res.json(config);
    } catch (error) {
      console.error('Error reading MCP configuration:', error);
      res.status(500).json({ error: 'Failed to read MCP configuration' });
    }
  });

  /**
   * Update MCP configuration
   */
  router.put('/config', (req, res) => {
    try {
      const configPath = './mcp-config.json';
      const { mcpServers } = req.body;

      if (!mcpServers || typeof mcpServers !== 'object') {
        return res.status(400).json({ error: 'Invalid configuration format' });
      }

      // Validate server configurations
      for (const [name, server] of Object.entries(mcpServers)) {
        const serverConfig = server as any;

        if (!serverConfig.command || typeof serverConfig.command !== 'string') {
          return res.status(400).json({
            error: `Server "${name}" must have a valid command`,
          });
        }

        if (serverConfig.args && !Array.isArray(serverConfig.args)) {
          return res.status(400).json({
            error: `Server "${name}" args must be an array`,
          });
        }

        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          return res.status(400).json({
            error: `Server "${name}" env must be an object`,
          });
        }
      }

      // Write configuration to file
      const config = { mcpServers };
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      res.json({
        success: true,
        message: 'Configuration saved successfully. Restart the backend to apply changes.',
      });
    } catch (error) {
      console.error('Error writing MCP configuration:', error);
      res.status(500).json({ error: 'Failed to write MCP configuration' });
    }
  });

  return router;
}
