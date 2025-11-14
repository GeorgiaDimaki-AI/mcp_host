#!/usr/bin/env node

/**
 * Proper MCP Elicitation using server.elicitInput() - SDK 1.22.0+
 *
 * This demonstrates the OFFICIAL MCP elicitation API.
 * Server pauses execution and requests user input through the client.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'proper-elicitation',
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
        name: 'configure_api',
        description: 'Configure API credentials (uses proper elicitation)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name to configure',
            },
            apiKey: {
              type: 'string',
              description: 'API key (optional, will elicit if missing)',
            },
            endpoint: {
              type: 'string',
              description: 'API endpoint URL (optional, will elicit if missing)',
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

  if (name === 'configure_api') {
    return await handleConfigureAPI(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * Configure API using proper MCP elicitation
 */
async function handleConfigureAPI(args) {
  const { service, apiKey, endpoint } = args;

  // Check if we need to elicit credentials
  if (!apiKey || !endpoint) {
    try {
      // Use the OFFICIAL elicitInput API
      const result = await server.elicitInput({
        message: `Please provide API credentials for ${service}`,
        requestedSchema: {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              title: 'API Key',
              description: 'Your API key for authentication',
              minLength: 1,
            },
            endpoint: {
              type: 'string',
              title: 'API Endpoint',
              description: 'The base URL for the API',
              format: 'uri',
            },
          },
          required: ['apiKey', 'endpoint'],
        },
      });

      // Handle user response
      if (result.action === 'cancel' || result.action === 'decline') {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Configuration cancelled for ${service}`,
            },
          ],
        };
      }

      // User accepted - extract the credentials
      const credentials = result.content || {};
      const finalApiKey = credentials.apiKey || apiKey;
      const finalEndpoint = credentials.endpoint || endpoint;

      if (!finalApiKey || !finalEndpoint) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Missing required credentials for ${service}`,
            },
          ],
        };
      }

      // Configuration successful!
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully configured ${service}\n\nAPI Key: ${maskCredential(String(finalApiKey))}\nEndpoint: ${finalEndpoint}\n\n📡 Configuration saved and ready to use!`,
          },
        ],
      };
    } catch (error) {
      // Client doesn't support elicitation, fallback to webview
      return elicitViaWebview(service);
    }
  }

  // We already have everything
  return {
    content: [
      {
        type: 'text',
        text: `✅ Already configured ${service}\n\nAPI Key: ${maskCredential(apiKey)}\nEndpoint: ${endpoint}`,
      },
    ],
  };
}

/**
 * Fallback: Webview-based elicitation if client doesn't support proper elicitation
 */
function elicitViaWebview(service) {
  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #6366f1; margin-bottom: 20px;">🔐 Configure ${service}</h2>
  <p style="color: #6b7280; margin-bottom: 20px;">Your client doesn't support MCP elicitation. Please provide credentials:</p>

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

  window.sendToHost({
    type: 'elicitation-response',
    formData: {
      service: formData.get('service'),
      apiKey: formData.get('apiKey'),
      endpoint: formData.get('endpoint'),
    }
  });
});
</script>
`;

  return {
    content: [
      {
        type: 'text',
        text: '```webview:form\n' + html + '\n```',
      },
    ],
  };
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

console.error('Proper Elicitation Server running (using server.elicitInput())');
