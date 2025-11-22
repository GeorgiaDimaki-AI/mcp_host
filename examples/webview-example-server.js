#!/usr/bin/env node

/**
 * Complete MCP Webview Example
 *
 * This example demonstrates how to create an MCP server that uses webviews
 * for interactive user interfaces. It includes:
 * - Simple HTML displays
 * - Interactive forms
 * - Data collection with elicitation
 * - Direct backend submission for sensitive data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'webview-example-server',
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
        name: 'show_greeting_card',
        description: 'Display a nice greeting card with custom HTML',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the person to greet',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'collect_user_info',
        description: 'Show a form to collect user information (demonstrates elicitation)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_todo_list',
        description: 'Display an interactive todo list',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title for the todo list',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'show_data_table',
        description: 'Display data in a nicely formatted table',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Table title',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'collect_api_key',
        description: 'Securely collect an API key using Phase 3 direct backend submission',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Name of the service (e.g., "OpenAI", "GitHub")',
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

  switch (name) {
    case 'show_greeting_card': {
      const userName = args.name || 'Friend';
      return {
        content: [
          {
            type: 'text',
            text: `Showing greeting card for ${userName}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://greeting-card',
              mimeType: 'text/html',
              text: `
                <div style="max-width: 400px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; text-align: center; color: white;">
                  <h1 style="font-size: 32px; margin: 0 0 16px 0;">👋 Hello!</h1>
                  <p style="font-size: 24px; margin: 0 0 8px 0; font-weight: bold;">${userName}</p>
                  <p style="font-size: 16px; opacity: 0.9; margin: 0;">Welcome to MCP Webviews!</p>
                  <p style="font-size: 14px; opacity: 0.8; margin: 24px 0 0 0;">This is a custom HTML greeting card rendered securely in a sandboxed iframe.</p>
                </div>
              `,
            },
          },
        ],
      };
    }

    case 'collect_user_info': {
      // Use MCP elicitation to collect user data
      const requestId = 'user-info-' + Date.now();

      return {
        content: [
          {
            type: 'text',
            text: 'Please fill out the form to continue',
          },
        ],
        // Elicitation tells the UI to show a form and wait for user response
        elicitation: {
          requestId,
          form: {
            type: 'form',
            uri: 'webview://user-info-form',
            mimeType: 'text/html',
            text: `
              <div style="padding: 16px;">
                <h2 style="margin: 0 0 16px 0; color: #1f2937;">User Information</h2>
                <form id="userForm">
                  <label>Full Name:</label>
                  <input type="text" name="fullName" placeholder="John Doe" required />

                  <label>Email:</label>
                  <input type="email" name="email" placeholder="john@example.com" required />

                  <label>Company:</label>
                  <input type="text" name="company" placeholder="Acme Inc." />

                  <label>Role:</label>
                  <select name="role">
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="manager">Manager</option>
                    <option value="other">Other</option>
                  </select>

                  <button type="submit">Submit Information</button>
                </form>

                <script>
                  document.getElementById('userForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const formData = {
                      fullName: e.target.fullName.value,
                      email: e.target.email.value,
                      company: e.target.company.value,
                      role: e.target.role.value
                    };
                    // Send data back to host
                    window.sendToHost({ type: 'form-submit', data: formData });
                  });
                </script>
              </div>
            `,
          },
        },
      };
    }

    case 'create_todo_list': {
      const title = args.title || 'My Todo List';
      return {
        content: [
          {
            type: 'text',
            text: `Created todo list: ${title}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://todo-list',
              mimeType: 'text/html',
              text: `
                <div style="max-width: 500px; margin: 0 auto; padding: 16px;">
                  <h2 style="margin: 0 0 16px 0; color: #1f2937;">${title}</h2>

                  <div style="margin-bottom: 16px; display: flex; gap: 8px;">
                    <input type="text" id="newTodo" placeholder="Add a new task..." style="flex: 1;" />
                    <button onclick="addTodo()" style="width: auto; padding: 8px 16px;">Add</button>
                  </div>

                  <ul id="todoList" style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 12px; background: #f3f4f6; margin-bottom: 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" onchange="toggleTodo(this)" />
                      <span>Example task - try adding your own!</span>
                    </li>
                  </ul>
                </div>

                <script>
                  function addTodo() {
                    const input = document.getElementById('newTodo');
                    const text = input.value.trim();
                    if (!text) return;

                    const li = document.createElement('li');
                    li.style.cssText = 'padding: 12px; background: #f3f4f6; margin-bottom: 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px;';
                    li.innerHTML = '<input type="checkbox" onchange="toggleTodo(this)" /><span>' + text + '</span>';

                    document.getElementById('todoList').appendChild(li);
                    input.value = '';
                  }

                  function toggleTodo(checkbox) {
                    const span = checkbox.nextElementSibling;
                    if (checkbox.checked) {
                      span.style.textDecoration = 'line-through';
                      span.style.opacity = '0.5';
                    } else {
                      span.style.textDecoration = 'none';
                      span.style.opacity = '1';
                    }
                  }

                  // Allow adding with Enter key
                  document.getElementById('newTodo').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') addTodo();
                  });
                </script>
              `,
            },
          },
        ],
      };
    }

    case 'show_data_table': {
      const title = args.title || 'Data Table';
      return {
        content: [
          {
            type: 'text',
            text: `Displaying data table: ${title}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://data-table',
              mimeType: 'text/html',
              text: `
                <div style="padding: 16px;">
                  <h2 style="margin: 0 0 16px 0; color: #1f2937;">${title}</h2>

                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Name</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Status</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">#001</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Project Alpha</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Active</span></td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$12,500</td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">#002</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Project Beta</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Pending</span></td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$8,200</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">#003</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Project Gamma</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Active</span></td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$15,750</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style="background: #1f2937; color: white; font-weight: bold;">
                        <td colspan="3" style="padding: 12px; border-top: 2px solid #9ca3af;">Total</td>
                        <td style="padding: 12px; text-align: right; border-top: 2px solid #9ca3af;">$36,450</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              `,
            },
          },
        ],
      };
    }

    case 'collect_api_key': {
      const service = args.service || 'API';
      const requestId = 'api-key-' + Date.now();

      return {
        content: [
          {
            type: 'text',
            text: `Please enter your ${service} API key`,
          },
        ],
        elicitation: {
          requestId,
          form: {
            type: 'form',
            uri: 'webview://api-key-form',
            mimeType: 'text/html',
            text: `
              <div style="padding: 16px;">
                <h2 style="margin: 0 0 16px 0; color: #1f2937;">🔐 ${service} API Key</h2>

                <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>🔒 Secure Submission:</strong> Your API key will be sent directly to the backend server,
                    bypassing the chat UI and browser extensions for maximum security.
                  </p>
                </div>

                <form id="apiKeyForm">
                  <label>${service} API Key:</label>
                  <input type="password" name="apiKey" placeholder="sk-..." required style="font-family: monospace;" />

                  <label>Confirm API Key:</label>
                  <input type="password" name="confirmApiKey" placeholder="sk-..." required style="font-family: monospace;" />

                  <div style="margin: 16px 0;">
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: normal;">
                      <input type="checkbox" name="agree" required style="width: auto;" />
                      <span style="font-size: 14px;">I understand this key will be stored securely</span>
                    </label>
                  </div>

                  <button type="submit">Submit Securely</button>
                </form>

                <script>
                  document.getElementById('apiKeyForm').addEventListener('submit', async function(e) {
                    e.preventDefault();

                    const apiKey = e.target.apiKey.value;
                    const confirmApiKey = e.target.confirmApiKey.value;

                    if (apiKey !== confirmApiKey) {
                      alert('API keys do not match!');
                      return;
                    }

                    // Phase 3: Send directly to backend, bypassing chat UI
                    const result = await window.sendToBackend({
                      service: '${service}',
                      apiKey: apiKey,
                      timestamp: new Date().toISOString()
                    });

                    if (result.success) {
                      console.log('API key submitted securely!');
                    }
                  });
                </script>
              </div>
            `,
          },
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Webview Example Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
