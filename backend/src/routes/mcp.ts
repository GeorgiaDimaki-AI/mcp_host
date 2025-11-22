/**
 * MCP Routes
 * API endpoints for MCP functionality
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { MCPService } from '../services/mcp.js';
import { CertificateService } from '../services/certificate.js';

export function createMCPRouter(mcpService: MCPService, certificateService?: CertificateService) {
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
   * Phase 3: Direct elicitation data submission
   * Allows iframe to submit form data directly to backend, bypassing parent window
   * This prevents parent window JavaScript, DevTools, and extensions from seeing sensitive data
   */
  router.post('/elicitation-data', async (req, res) => {
    try {
      const { requestId, action, content } = req.body;

      // Validate required fields
      if (!requestId || !action) {
        return res.status(400).json({
          error: 'requestId and action are required',
        });
      }

      // Validate action
      if (!['accept', 'decline', 'cancel'].includes(action)) {
        return res.status(400).json({
          error: 'Invalid action. Must be: accept, decline, or cancel',
        });
      }

      // Validate content for accept action
      if (action === 'accept' && !content) {
        return res.status(400).json({
          error: 'content is required when action is accept',
        });
      }

      // Submit to MCP service (includes request validation)
      mcpService.respondToElicitation(requestId, {
        action,
        content: action === 'accept' ? content : undefined,
      });

      res.json({
        success: true,
        message: 'Elicitation response submitted successfully',
      });
    } catch (error) {
      console.error('Error submitting elicitation data:', error);

      // Return appropriate error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit elicitation data';
      const statusCode = errorMessage.includes('expired') ||
                         errorMessage.includes('Invalid') ||
                         errorMessage.includes('already used') ? 400 : 500;

      res.status(statusCode).json({
        error: errorMessage,
      });
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

  // Certificate management routes
  if (certificateService) {
    /**
     * Get all certificates
     */
    router.get('/certificates', (req, res) => {
      try {
        const certificates = certificateService.getAllCertificates();
        res.json({ certificates });
      } catch (error) {
        console.error('Error getting certificates:', error);
        res.status(500).json({ error: 'Failed to get certificates' });
      }
    });

    /**
     * Get certificate for a specific server
     */
    router.get('/certificates/:serverName', (req, res) => {
      try {
        const { serverName } = req.params;
        const certificate = certificateService.getCertificate(serverName);

        if (!certificate) {
          return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({ certificate });
      } catch (error) {
        console.error('Error getting certificate:', error);
        res.status(500).json({ error: 'Failed to get certificate' });
      }
    });

    /**
     * Trust a certificate
     */
    router.post('/certificates/:serverName/trust', (req, res) => {
      try {
        const { serverName } = req.params;
        const certificate = certificateService.trustCertificate(serverName);

        if (!certificate) {
          return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
          success: true,
          message: `Certificate for ${serverName} is now trusted`,
          certificate,
        });
      } catch (error) {
        console.error('Error trusting certificate:', error);
        res.status(500).json({ error: 'Failed to trust certificate' });
      }
    });

    /**
     * Untrust a certificate
     */
    router.post('/certificates/:serverName/untrust', (req, res) => {
      try {
        const { serverName } = req.params;
        const certificate = certificateService.untrustCertificate(serverName);

        if (!certificate) {
          return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
          success: true,
          message: `Certificate for ${serverName} is now untrusted`,
          certificate,
        });
      } catch (error) {
        console.error('Error untrusting certificate:', error);
        res.status(500).json({ error: 'Failed to untrust certificate' });
      }
    });

    /**
     * Delete a certificate
     */
    router.delete('/certificates/:serverName', (req, res) => {
      try {
        const { serverName } = req.params;
        const deleted = certificateService.removeCertificate(serverName);

        if (!deleted) {
          return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
          success: true,
          message: `Certificate for ${serverName} has been removed`,
        });
      } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({ error: 'Failed to delete certificate' });
      }
    });

    /**
     * Get all certificate authorities
     */
    router.get('/certificate-authorities', (req, res) => {
      try {
        const authorities = certificateService.getAllCertificateAuthorities();
        res.json({ authorities });
      } catch (error) {
        console.error('Error getting certificate authorities:', error);
        res.status(500).json({ error: 'Failed to get certificate authorities' });
      }
    });
  }

  return router;
}
