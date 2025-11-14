#!/usr/bin/env node

/**
 * Spec-Compliant MCP Elicitation Example
 *
 * Demonstrates PROPER use of MCP elicitation according to the official spec:
 * - Form mode for NON-SENSITIVE data (e.g., preferences, selections)
 * - URL mode for SENSITIVE data (e.g., credentials, payment info)
 *
 * ⚠️ SECURITY: Servers MUST NOT use form mode for sensitive information!
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'spec-compliant-elicitation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// In-memory storage (in production, use secure database)
const userCredentials = new Map(); // userId -> { service -> credentials }

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'collect_preferences',
        description: '✅ CORRECT: Uses form mode for non-sensitive data',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID (should come from auth)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'configure_api_credentials',
        description: '✅ CORRECT: Uses URL mode for sensitive credentials',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID (should come from auth)',
            },
            service: {
              type: 'string',
              description: 'Service name',
            },
          },
          required: ['userId', 'service'],
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

  if (name === 'collect_preferences') {
    return await handleCollectPreferences(args);
  }

  if (name === 'configure_api_credentials') {
    return await handleConfigureAPICredentials(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * ✅ CORRECT: Form mode for NON-SENSITIVE preferences
 *
 * Form mode is appropriate when:
 * - Data is not sensitive (no credentials, no personal financial info)
 * - Schema validation is sufficient
 * - Client can safely see and process the data
 */
async function handleCollectPreferences(args) {
  const { userId, theme, language, notifications } = args;

  // If preferences not provided, elicit them using FORM mode
  if (!theme || !language || notifications === undefined) {
    try {
      const result = await server.elicitInput({
        message: 'Please set your preferences',
        requestedSchema: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              title: 'Theme',
              description: 'Choose your preferred theme',
              enum: ['light', 'dark', 'auto'],
              default: 'auto',
            },
            language: {
              type: 'string',
              title: 'Language',
              description: 'Preferred language',
              enum: ['en', 'es', 'fr', 'de', 'ja'],
              default: 'en',
            },
            notifications: {
              type: 'boolean',
              title: 'Enable Notifications',
              description: 'Receive email notifications',
              default: true,
            },
          },
          required: ['theme', 'language', 'notifications'],
        },
      });

      if (result.action === 'accept') {
        return {
          content: [
            {
              type: 'text',
              text: `✅ Preferences saved for user ${userId}:\n${JSON.stringify(result.content, null, 2)}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `❌ Preferences ${result.action === 'decline' ? 'declined' : 'cancelled'}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Client doesn't support elicitation - ${error.message}`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Preferences already provided: theme=${theme}, language=${language}, notifications=${notifications}`,
      },
    ],
  };
}

/**
 * ✅ CORRECT: URL mode for SENSITIVE credentials
 *
 * URL mode is REQUIRED when:
 * - Collecting credentials (API keys, passwords, tokens)
 * - Payment information
 * - Personal financial data
 * - OAuth flows
 * - Any data that MUST NOT transit through the MCP client
 */
async function handleConfigureAPICredentials(args) {
  const { userId, service } = args;

  // Check if credentials already exist
  const credentials = userCredentials.get(userId)?.[service];

  if (credentials) {
    return {
      content: [
        {
          type: 'text',
          text: `✅ Credentials already configured for ${service}`,
        },
      ],
    };
  }

  // Use URL mode to collect credentials
  // This directs user to a secure HTTPS page where they enter credentials
  // The credentials NEVER go through the MCP client
  const elicitationId = `creds-${userId}-${service}-${Date.now()}`;

  try {
    // In a real implementation, this would be a proper HTTPS URL
    // that verifies user identity and securely collects credentials
    const result = await server.elicitInput({
      mode: 'url',
      elicitationId,
      url: `https://mcp.example.com/configure/${service}?elicitationId=${elicitationId}&userId=${userId}`,
      message: `To configure ${service}, you'll need to provide your API credentials on a secure page. The credentials will be stored securely and never exposed to the MCP client.`,
    });

    if (result.action === 'accept') {
      // User consented to open the URL
      // Actual credential collection happens out-of-band
      // Server will receive credentials via the secure web interface
      // and bind them to the user identity

      return {
        content: [
          {
            type: 'text',
            text: `✅ Please complete the secure credential configuration in your browser.\n\nOnce complete, you can use ${service} tools.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `❌ Credential configuration ${result.action === 'decline' ? 'declined' : 'cancelled'}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Client doesn't support URL mode elicitation - ${error.message}`,
        },
      ],
    };
  }
}

/**
 * ❌ WRONG: DO NOT DO THIS!
 *
 * This is a SECURITY VIOLATION according to MCP spec.
 * Never use form mode for credentials!
 */
async function EXAMPLE_OF_SECURITY_VIOLATION(args) {
  const { service } = args;

  // ❌ WRONG: Form mode for sensitive credentials
  const result = await server.elicitInput({
    message: 'Please provide your API key',
    requestedSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          title: 'API Key', // ❌ Credentials in form mode!
        },
      },
      required: ['apiKey'],
    },
  });

  // ❌ This exposes credentials to:
  // - MCP client logs
  // - LLM context (if client logs conversation)
  // - Any intermediate proxies
  // - Client-side storage/memory

  return {
    content: [
      {
        type: 'text',
        text: '❌ SECURITY VIOLATION: Never collect credentials via form mode!',
      },
    ],
  };
}

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Spec-Compliant Elicitation Server running');
console.error('  - Form mode: Non-sensitive data (preferences, selections)');
console.error('  - URL mode: Sensitive data (credentials, payments)');
