#!/usr/bin/env node

/**
 * Simple MCP Elicitation Example - Two Approaches
 *
 * Approach 1: Webview in message (empty schema, HTML in message text)
 * Approach 2: Schema-based webview (schema indicates it's a webview)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'simple-elicitation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'collect_credentials_approach1',
        description: 'Collect API credentials using Approach 1 (webview in message)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name',
            },
          },
          required: ['service'],
        },
      },
      {
        name: 'collect_credentials_approach2',
        description: 'Collect API credentials using Approach 2 (schema-based webview)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name',
            },
          },
          required: ['service'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'collect_credentials_approach1') {
    return await approach1_WebviewInMessage(args);
  }

  if (name === 'collect_credentials_approach2') {
    return await approach2_SchemaBasedWebview(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * APPROACH 1: Webview HTML in message with empty/minimal schema
 *
 * The message contains the webview HTML markup.
 * Client detects webview syntax and renders it.
 * Schema is empty or minimal - data collection happens through webview.
 */
async function approach1_WebviewInMessage(args) {
  const { service, apiKey, endpoint } = args;

  // If we don't have credentials, use createMessage with webview in the message
  if (!apiKey || !endpoint) {
    try {
      const response = await server.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: createWebviewHTML(service), // Webview HTML in the message
            },
          },
        ],
        // Empty/minimal schema - the webview handles data collection
        maxTokens: 100,
      });

      // Extract from response
      const userResponse = response.content.text || '';

      // Try to parse JSON response from webview
      let credentials;
      try {
        credentials = JSON.parse(userResponse);
      } catch {
        // Fallback: extract from text
        credentials = {
          apiKey: extractValue(userResponse, 'apiKey') || apiKey,
          endpoint: extractValue(userResponse, 'endpoint') || endpoint,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Configured ${service} via Approach 1\nAPI Key: ${maskCredential(credentials.apiKey)}\nEndpoint: ${credentials.endpoint}`,
          },
        ],
      };
    } catch (error) {
      // If createMessage not supported, return webview directly
      return {
        content: [
          {
            type: 'text',
            text: '```webview:form\n' + createWebviewHTML(service) + '\n```',
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Already configured ${service}\nAPI Key: ${maskCredential(apiKey)}\nEndpoint: ${endpoint}`,
      },
    ],
  };
}

/**
 * APPROACH 2: Schema-based webview indication
 *
 * Use a special schema property to indicate this is a webview.
 * Client checks schema for webview indicator and renders accordingly.
 * Could use: format: 'webview', x-webview: true, or custom property
 */
async function approach2_SchemaBasedWebview(args) {
  const { service, apiKey, endpoint } = args;

  if (!apiKey || !endpoint) {
    try {
      const response = await server.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide credentials for ${service}`,
            },
          },
        ],
        // Schema with webview indicator
        // This tells the client: "render this as a webview, here's the schema"
        modelPreferences: {
          hints: [
            {
              name: 'webview-elicitation', // Custom hint indicating webview
            },
          ],
        },
        maxTokens: 100,
      });

      let credentials;
      try {
        credentials = JSON.parse(response.content.text);
      } catch {
        credentials = {
          apiKey: extractValue(response.content.text, 'apiKey') || apiKey,
          endpoint: extractValue(response.content.text, 'endpoint') || endpoint,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Configured ${service} via Approach 2\nAPI Key: ${maskCredential(credentials.apiKey)}\nEndpoint: ${credentials.endpoint}`,
          },
        ],
      };
    } catch (error) {
      // Fallback: return webview with special metadata
      return {
        content: [
          {
            type: 'text',
            text: '```webview:form\n' + createWebviewHTML(service) + '\n```',
          },
        ],
        // Could also add metadata here indicating this is elicitation
        isBlocking: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Already configured ${service}\nAPI Key: ${maskCredential(apiKey)}\nEndpoint: ${endpoint}`,
      },
    ],
  };
}

/**
 * Create webview HTML for credential collection
 */
function createWebviewHTML(service) {
  return `
<div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #6366f1; margin-bottom: 20px;">🔐 Configure ${service}</h2>
  <p style="color: #6b7280; margin-bottom: 20px;">Please provide your API credentials:</p>

  <form id="credForm" style="display: flex; flex-direction: column; gap: 15px;">
    <input type="hidden" name="service" value="${service}">

    <div>
      <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">
        API Key *
      </label>
      <input type="password" name="apiKey" required
             placeholder="Enter your API key"
             style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
    </div>

    <div>
      <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">
        Endpoint URL *
      </label>
      <input type="url" name="endpoint" required
             placeholder="https://api.example.com"
             style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
    </div>

    <button type="submit"
            style="padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
      💾 Save Configuration
    </button>
  </form>
</div>

<script>
document.getElementById('credForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  const data = {
    service: formData.get('service'),
    apiKey: formData.get('apiKey'),
    endpoint: formData.get('endpoint'),
  };

  // Send as JSON for easy parsing
  window.sendToHost({
    type: 'elicitation-response',
    formData: data
  });
});
</script>
`;
}

/**
 * Extract a value from text
 */
function extractValue(text, key) {
  const regex = new RegExp(`${key}[:\s]+([^\n,]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Mask credential for display
 */
function maskCredential(cred) {
  if (!cred || cred.length < 8) return '***';
  return cred.substring(0, 4) + '***' + cred.substring(cred.length - 4);
}

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Simple Elicitation Example Server (Two Approaches) running');
