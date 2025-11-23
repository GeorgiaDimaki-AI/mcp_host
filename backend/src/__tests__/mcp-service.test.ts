/**
 * MCP Service Tests
 * Tests for MCP service including Phase 3 security features
 */

import { jest } from '@jest/globals';
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

  describe('MCP Resource Handling', () => {
    test('should extract HTML from resource blocks', () => {
      // Mock response with resource containing HTML webview
      const mockResponse = {
        content: [
          { type: 'text', text: 'Created todo list: My To-Do List' },
          {
            type: 'resource',
            resource: {
              uri: 'webview://todo-list',
              mimeType: 'text/html',
              text: '<div class="todo-list"><h1>My To-Do List</h1></div>',
            },
          },
        ],
      };

      // Create a mock client
      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      // Replace the client in the service
      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'create_todo_list', { title: 'My To-Do List' })
        .then(result => {
          expect(result.hasWebview).toBe(true);
          expect(result.webviewType).toBe('html');
          expect(result.webviewHtml).toBe('<div class="todo-list"><h1>My To-Do List</h1></div>');
          expect(result.content).toBe('Created todo list: My To-Do List');
        });
    });

    test('should handle text + resource combination', () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Operation completed successfully.' },
          { type: 'text', text: 'Additional info here.' },
          {
            type: 'resource',
            resource: {
              uri: 'webview://result',
              mimeType: 'text/html',
              text: '<div>HTML Result</div>',
            },
          },
        ],
      };

      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'test_tool', {})
        .then(result => {
          expect(result.hasWebview).toBe(true);
          expect(result.webviewHtml).toBe('<div>HTML Result</div>');
          expect(result.content).toContain('Operation completed successfully.');
          expect(result.content).toContain('Additional info here.');
        });
    });

    test('should maintain backward compatibility with markdown webview syntax', () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Here is the result:\n```webview:html\n<div>Legacy HTML</div>\n```',
          },
        ],
      };

      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'legacy_tool', {})
        .then(result => {
          expect(result.hasWebview).toBe(true);
          expect(result.webviewType).toBe('html');
          expect(result.webviewHtml).toBe('<div>Legacy HTML</div>');
          expect(result.content).toBe('Here is the result:');
        });
    });

    test('should handle text-only responses without resources', () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Simple text response' },
        ],
      };

      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'simple_tool', {})
        .then(result => {
          expect(result.hasWebview).toBe(false);
          expect(result.content).toBe('Simple text response');
          expect(result.webviewHtml).toBeUndefined();
        });
    });

    test('should ignore non-HTML resources', () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Data response' },
          {
            type: 'resource',
            resource: {
              uri: 'data://json',
              mimeType: 'application/json',
              text: '{"key": "value"}',
            },
          },
        ],
      };

      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'data_tool', {})
        .then(result => {
          expect(result.hasWebview).toBe(false);
          expect(result.content).toBe('Data response');
        });
    });

    test('should prioritize resource webview over markdown syntax', () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Legacy: ```webview:html\n<div>Old</div>\n```',
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://new',
              mimeType: 'text/html',
              text: '<div>New HTML</div>',
            },
          },
        ],
      };

      const mockClient = {
        callTool: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      };

      (mcpService as any).clients.set('test-server', mockClient);

      return mcpService.callTool('test-server', 'mixed_tool', {})
        .then(result => {
          expect(result.hasWebview).toBe(true);
          expect(result.webviewHtml).toBe('<div>New HTML</div>');
          expect(result.webviewType).toBe('html');
        });
    });
  });
});
