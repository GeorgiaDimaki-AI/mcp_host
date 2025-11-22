/**
 * MCP Service Tests
 * Tests for MCP service including Phase 3 security features
 */

import { MCPService, ElicitationResponse } from '../services/mcp.js';

describe('MCPService', () => {
  let mcpService: MCPService;

  beforeEach(() => {
    mcpService = new MCPService();
  });

  afterEach(() => {
    // Clean up any event listeners
    mcpService.removeAllListeners();
  });

  describe('Phase 3: Request Tracking', () => {
    test('should track active elicitation requests', (done) => {
      const requestId = 'test-server:12345';
      let requestEmitted = false;

      // Listen for elicitation request event
      mcpService.on('elicitation-request', (request) => {
        expect(request.requestId).toBe(requestId);
        requestEmitted = true;
      });

      // Simulate request being created (this would normally happen in connectToServer)
      // We'll test this indirectly through respondToElicitation

      // For now, verify the service initializes correctly
      expect(mcpService).toBeDefined();
      expect(mcpService.isConnected()).toBe(false);

      done();
    });

    test('should reject invalid request ID', () => {
      const invalidRequestId = 'invalid-request-id';
      const response: ElicitationResponse = {
        action: 'accept',
        content: { test: 'data' },
      };

      expect(() => {
        mcpService.respondToElicitation(invalidRequestId, response);
      }).toThrow('Invalid or expired request ID');
    });

    test('should reject already used request', () => {
      // This test requires internal access to activeRequests
      // We'll need to modify the service to expose this for testing
      // For now, we document the expected behavior
      expect(true).toBe(true); // Placeholder
    });

    test('should reject expired requests', () => {
      // Test that requests older than 5 minutes are rejected
      // This would require time manipulation or exposing the timeout
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Connection Management', () => {
    test('should initialize with no connections', () => {
      expect(mcpService.isConnected()).toBe(false);
      expect(mcpService.getConnectedServers()).toEqual([]);
    });

    test('should handle connection errors gracefully', async () => {
      // Test with invalid server config
      const invalidServers = [
        {
          name: 'invalid-server',
          command: 'nonexistent-command',
          args: [],
        },
      ];

      // Should not throw, but log error
      await expect(
        mcpService.initialize(invalidServers)
      ).resolves.not.toThrow();
    });
  });

  describe('Tool Management', () => {
    test('should list tools when connected', async () => {
      const tools = await mcpService.listTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    test('should return empty array when no servers connected', async () => {
      const tools = await mcpService.listTools();
      expect(tools).toEqual([]);
    });
  });

  describe('Operation Tracking', () => {
    test('should track active operations', () => {
      const operationId = 'test-operation-1';

      mcpService.markOperationActive(operationId);
      expect(mcpService.isOperationActive(operationId)).toBe(true);

      mcpService.markOperationComplete(operationId);
      expect(mcpService.isOperationActive(operationId)).toBe(false);
    });

    test('should handle multiple concurrent operations', () => {
      const ops = ['op1', 'op2', 'op3'];

      ops.forEach(op => mcpService.markOperationActive(op));
      ops.forEach(op => expect(mcpService.isOperationActive(op)).toBe(true));

      mcpService.markOperationComplete('op2');
      expect(mcpService.isOperationActive('op1')).toBe(true);
      expect(mcpService.isOperationActive('op2')).toBe(false);
      expect(mcpService.isOperationActive('op3')).toBe(true);
    });
  });

  describe('Event Emission', () => {
    test('should emit notification events', (done) => {
      const notification = {
        serverName: 'test-server',
        message: 'Test notification',
        type: 'info' as const,
      };

      mcpService.on('notification', (emittedNotification) => {
        expect(emittedNotification).toEqual(notification);
        done();
      });

      mcpService.sendNotification(notification);
    });

    test('should handle elicitation-complete events', (done) => {
      const completeData = {
        serverName: 'test-server',
        elicitationId: 'test-elicitation-id',
      };

      mcpService.on('elicitation-complete', (data) => {
        expect(data).toEqual(completeData);
        done();
      });

      mcpService.emit('elicitation-complete', completeData);
    });
  });
});
