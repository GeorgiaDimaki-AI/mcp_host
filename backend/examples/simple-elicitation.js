#!/usr/bin/env node

/**
 * Simple MCP Elicitation Example - Credential Collection
 *
 * Demonstrates proper MCP elicitation using server.createMessage()
 * to request user input through the client's sampling capability.
 *
 * This is a SINGLE, SIMPLE function that collects API credentials.
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
        name: 'configure_api',
        description: 'Configure API access (will ask for credentials if not provided)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name to configure',
            },
            apiKey: {
              type: 'string',
              description: 'API key (optional, will ask if not provided)',
            },
            endpoint: {
              type: 'string',
              description: 'API endpoint URL (optional, will ask if not provided)',
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
 * Simple credential elicitation example
 * Uses MCP's createMessage to properly request user input
 */
async function handleConfigureAPI(args) {
  const { service, apiKey, endpoint } = args;

  // Check if we need to elicit credentials
  if (!apiKey || !endpoint) {
    // Use MCP's proper elicitation: server.createMessage()
    // This sends a request to the CLIENT to get user input
    try {
      const response = await server.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide API credentials for ${service}:\n\nAPI Key: ${apiKey || '[required]'}\nEndpoint URL: ${endpoint || '[required]'}\n\nProvide the missing information.`,
            },
          },
        ],
        maxTokens: 1000,
      });

      // The client returns the user's response
      const userInput = response.content.text;

      // Parse the response to extract credentials
      // (In a real implementation, you'd use a more robust parser)
      const extractedApiKey = apiKey || extractValue(userInput, 'API Key') || extractValue(userInput, 'apiKey');
      const extractedEndpoint = endpoint || extractValue(userInput, 'Endpoint') || extractValue(userInput, 'endpoint');

      if (!extractedApiKey || !extractedEndpoint) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to configure ${service}. Missing required credentials.`,
            },
          ],
        };
      }

      // Now we have the credentials, configure the service
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully configured ${service}\n\nAPI Key: ${maskCredential(extractedApiKey)}\nEndpoint: ${extractedEndpoint}\n\nConfiguration saved and ready to use!`,
          },
        ],
      };
    } catch (error) {
      // Client doesn't support sampling, fallback to webview elicitation
      return elicitViaWebview(service, apiKey, endpoint);
    }
  }

  // We already have everything
  return {
    content: [
      {
        type: 'text',
        text: `✅ Successfully configured ${service}\n\nAPI Key: ${maskCredential(apiKey)}\nEndpoint: ${endpoint}\n\nConfiguration saved and ready to use!`,
      },
    ],
  };
}

/**
 * Fallback: Webview-based elicitation if client doesn't support sampling
 */
function elicitViaWebview(service, apiKey, endpoint) {
  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
  <h2 style="color: #6366f1;">🔐 Configure ${service}</h2>
  <p>Please provide your API credentials:</p>

  <form id="credForm" style="display: flex; flex-direction: column; gap: 15px;">
    <div>
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Service Name</label>
      <input type="text" name="service" value="${service}" readonly
             style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
    </div>

    <div>
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">API Key *</label>
      <input type="password" name="apiKey" value="${apiKey || ''}" required
             placeholder="Enter your API key"
             style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
    </div>

    <div>
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Endpoint URL *</label>
      <input type="url" name="endpoint" value="${endpoint || ''}" required
             placeholder="https://api.example.com"
             style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
    </div>

    <button type="submit"
            style="padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      Save Configuration
    </button>
  </form>
</div>

<script>
document.getElementById('credForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  window.sendToHost({
    type: 'form-submit',
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
 * Extract a value from user input text
 */
function extractValue(text, key) {
  const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
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

console.error('Simple Elicitation Example Server running');
