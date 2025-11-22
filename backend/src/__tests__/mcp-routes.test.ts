/**
 * MCP Routes Tests
 * Tests for MCP API endpoints including Phase 3 direct backend submission
 */

import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createMCPRouter } from '../routes/mcp.js';
import { MCPService } from '../services/mcp.js';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';

describe('MCP Routes', () => {
  let app: express.Application;
  let mcpService: MCPService;
  const testConfigPath = './mcp-config.json'; // Use actual path that routes expect
  const backupConfigPath = './mcp-config.json.backup';
  let configExistedBefore = false;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mcpService = new MCPService();
    app.use('/api/mcp', createMCPRouter(mcpService));

    // Backup existing config if it exists
    if (existsSync(testConfigPath)) {
      configExistedBefore = true;
      writeFileSync(
        backupConfigPath,
        readFileSync(testConfigPath, 'utf-8'),
        'utf-8'
      );
    }

    // Create test config file
    writeFileSync(
      testConfigPath,
      JSON.stringify({ mcpServers: {} }),
      'utf-8'
    );
  });

  afterEach(() => {
    mcpService.removeAllListeners();

    // Restore original config or remove test config
    if (configExistedBefore && existsSync(backupConfigPath)) {
      writeFileSync(
        testConfigPath,
        readFileSync(backupConfigPath, 'utf-8'),
        'utf-8'
      );
      unlinkSync(backupConfigPath);
      configExistedBefore = false;
    } else if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    if (existsSync(backupConfigPath)) {
      unlinkSync(backupConfigPath);
    }
  });

  describe('GET /api/mcp/tools', () => {
    test('should return list of available tools', async () => {
      const response = await request(app)
        .get('/api/mcp/tools')
        .expect(200);

      expect(response.body).toHaveProperty('tools');
      expect(Array.isArray(response.body.tools)).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      // Mock listTools to throw error
      jest.spyOn(mcpService, 'listTools').mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/mcp/tools')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/mcp/servers', () => {
    test('should return connected servers', async () => {
      const response = await request(app)
        .get('/api/mcp/servers')
        .expect(200);

      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('connected');
      expect(Array.isArray(response.body.servers)).toBe(true);
      expect(typeof response.body.connected).toBe('boolean');
    });
  });

  describe('GET /api/mcp/config', () => {
    test('should return empty config when file does not exist', async () => {
      unlinkSync(testConfigPath);

      const response = await request(app)
        .get('/api/mcp/config')
        .expect(200);

      expect(response.body).toEqual({ mcpServers: {} });
    });

    test('should return existing config', async () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test.js'],
          },
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(config), 'utf-8');

      const response = await request(app)
        .get('/api/mcp/config')
        .expect(200);

      expect(response.body).toEqual(config);
    });
  });

  describe('PUT /api/mcp/config', () => {
    test('should save valid configuration', async () => {
      const config = {
        mcpServers: {
          'my-server': {
            command: 'node',
            args: ['server.js'],
            env: { API_KEY: 'test' },
          },
        },
      };

      const response = await request(app)
        .put('/api/mcp/config')
        .send(config)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject invalid configuration format', async () => {
      const response = await request(app)
        .put('/api/mcp/config')
        .send({ invalid: 'config' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate server command', async () => {
      const config = {
        mcpServers: {
          'bad-server': {
            // Missing command
            args: ['test.js'],
          },
        },
      };

      const response = await request(app)
        .put('/api/mcp/config')
        .send(config)
        .expect(400);

      expect(response.body.error).toContain('valid command');
    });

    test('should validate args are array', async () => {
      const config = {
        mcpServers: {
          'bad-server': {
            command: 'node',
            args: 'not-an-array', // Should be array
          },
        },
      };

      const response = await request(app)
        .put('/api/mcp/config')
        .send(config)
        .expect(400);

      expect(response.body.error).toContain('array');
    });

    test('should validate env is object', async () => {
      const config = {
        mcpServers: {
          'bad-server': {
            command: 'node',
            env: 'not-an-object', // Should be object
          },
        },
      };

      const response = await request(app)
        .put('/api/mcp/config')
        .send(config)
        .expect(400);

      expect(response.body.error).toContain('object');
    });
  });

  describe('POST /api/mcp/tools/call', () => {
    test('should require serverName and toolName', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/call')
        .send({ args: {} })
        .expect(400);

      expect(response.body.error).toContain('serverName and toolName are required');
    });

    test('should handle tool call errors', async () => {
      jest.spyOn(mcpService, 'callTool').mockRejectedValue(new Error('Tool not found'));

      const response = await request(app)
        .post('/api/mcp/tools/call')
        .send({
          serverName: 'test-server',
          toolName: 'nonexistent-tool',
          args: {},
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Tool not found');
    });
  });

  describe('POST /api/mcp/elicitation-data (Phase 3)', () => {
    test('should require requestId and action', async () => {
      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({ content: {} })
        .expect(400);

      expect(response.body.error).toBe('requestId and action are required');
    });

    test('should validate action values', async () => {
      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:123',
          action: 'invalid-action',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid action');
      expect(response.body.error).toContain('accept, decline, or cancel');
    });

    test('should require content for accept action', async () => {
      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:123',
          action: 'accept',
          // Missing content
        })
        .expect(400);

      expect(response.body.error).toContain('content is required');
    });

    test('should accept decline without content', async () => {
      // Mock respondToElicitation to not throw
      jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:123',
          action: 'decline',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle invalid request ID', async () => {
      jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {
        throw new Error('Invalid or expired request ID');
      });

      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'invalid:123',
          action: 'accept',
          content: { test: 'data' },
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired');
    });

    test('should handle replay attack (already used)', async () => {
      jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {
        throw new Error('Request already used - possible replay attack');
      });

      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:123',
          action: 'accept',
          content: { test: 'data' },
        })
        .expect(400);

      expect(response.body.error).toContain('already used');
    });

    test('should handle expired requests', async () => {
      jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {
        throw new Error('Request expired');
      });

      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'old:123',
          action: 'accept',
          content: { test: 'data' },
        })
        .expect(400);

      expect(response.body.error).toContain('expired');
    });

    test('should successfully submit valid elicitation data', async () => {
      jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'valid:123',
          action: 'accept',
          content: {
            username: 'testuser',
            password: 'securepass',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('submitted successfully');
    });

    test('should call respondToElicitation with correct parameters', async () => {
      const mockRespond = jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {});

      await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:456',
          action: 'accept',
          content: { key: 'value' },
        });

      expect(mockRespond).toHaveBeenCalledWith('test:456', {
        action: 'accept',
        content: { key: 'value' },
      });
    });

    test('should not include content for decline action', async () => {
      const mockRespond = jest.spyOn(mcpService, 'respondToElicitation').mockImplementation(() => {});

      await request(app)
        .post('/api/mcp/elicitation-data')
        .send({
          requestId: 'test:789',
          action: 'decline',
        });

      expect(mockRespond).toHaveBeenCalledWith('test:789', {
        action: 'decline',
        content: undefined,
      });
    });
  });
});
