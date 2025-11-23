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
      // Show a webview form to collect user information
      return {
        content: [
          {
            type: 'text',
            text: 'User information form displayed. Please fill it out.',
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://user-info-form',
              mimeType: 'text/html',
              text: `
                <div style="padding: 16px; max-width: 500px; margin: 0 auto;">
                  <h2 style="margin: 0 0 16px 0; color: #1f2937;">📋 User Information</h2>
                  <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                    Fill out the form below and click submit. The data will be processed by the MCP server.
                  </p>
                  <form id="userForm">
                    <label>Full Name:</label>
                    <input type="text" name="fullName" placeholder="John Doe" required />

                    <label>Email:</label>
                    <input type="email" name="email" placeholder="john@example.com" required />

                    <label>Company:</label>
                    <input type="text" name="company" placeholder="Acme Inc." />

                    <label>Role:</label>
                    <select name="role" required>
                      <option value="">Select a role...</option>
                      <option value="developer">Developer</option>
                      <option value="designer">Designer</option>
                      <option value="manager">Manager</option>
                      <option value="other">Other</option>
                    </select>

                    <button type="submit">Submit Information</button>
                  </form>

                  <div id="result" style="margin-top: 16px; padding: 12px; border-radius: 6px; display: none;"></div>

                  <script>
                    document.getElementById('userForm').addEventListener('submit', function(e) {
                      e.preventDefault();
                      const formData = {
                        fullName: e.target.fullName.value,
                        email: e.target.email.value,
                        company: e.target.company.value,
                        role: e.target.role.value
                      };

                      // Display success message
                      const result = document.getElementById('result');
                      result.style.display = 'block';
                      result.style.background = '#d1fae5';
                      result.style.color = '#065f46';
                      result.innerHTML = '<strong>✓ Success!</strong> Your information has been submitted:<br><pre style="margin-top: 8px; font-size: 12px;">' + JSON.stringify(formData, null, 2) + '</pre>';

                      // Hide the form
                      document.getElementById('userForm').style.display = 'none';

                      // Send data back to host (optional - for logging)
                      window.sendToHost({ type: 'form-submit', formData: formData });
                    });
                  </script>
                </div>
              `,
            },
          },
        ],
      };
    }

    case 'create_todo_list': {
      const title = args.title || 'My Todo List';
      return {
        content: [
          {
            type: 'text',
            text: `Created interactive todo list: ${title}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://todo-list',
              mimeType: 'text/html',
              text: `
                <div style="max-width: 600px; margin: 0 auto; padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
                  <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px;">✓ ${title}</h2>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">Add tasks, check them off, and delete completed items</p>

                  <div style="margin-bottom: 20px; display: flex; gap: 8px;">
                    <input
                      type="text"
                      id="newTodo"
                      placeholder="Add a new task..."
                      style="flex: 1; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;"
                      onfocus="this.style.borderColor='#3b82f6'"
                      onblur="this.style.borderColor='#e5e7eb'"
                    />
                    <button
                      onclick="addTodo()"
                      style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
                      onmouseover="this.style.background='#2563eb'"
                      onmouseout="this.style.background='#3b82f6'"
                    >
                      Add
                    </button>
                  </div>

                  <ul id="todoList" style="list-style: none; padding: 0; margin: 0;">
                    <li data-id="1" style="padding: 14px; background: #f9fafb; margin-bottom: 8px; border-radius: 8px; display: flex; align-items: center; gap: 12px; border: 1px solid #e5e7eb; transition: all 0.2s;">
                      <input type="checkbox" onchange="toggleTodo(this)" style="width: 18px; height: 18px; cursor: pointer;" />
                      <span style="flex: 1; color: #1f2937;">Example task - try adding your own!</span>
                      <button
                        onclick="deleteTodo(this)"
                        style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;"
                        onmouseover="this.style.opacity='1'"
                        onmouseout="this.style.opacity='0.8'"
                      >
                        Delete
                      </button>
                    </li>
                  </ul>

                  <div id="emptyState" style="display: none; text-align: center; padding: 40px 20px; color: #9ca3af;">
                    <svg style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p style="margin: 0; font-size: 14px;">No tasks yet. Add one above!</p>
                  </div>

                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <span id="counter" style="color: #6b7280; font-size: 14px;">1 task</span>
                    <button
                      onclick="clearCompleted()"
                      style="background: transparent; color: #6b7280; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s;"
                      onmouseover="this.style.background='#f3f4f6'"
                      onmouseout="this.style.background='transparent'"
                    >
                      Clear Completed
                    </button>
                  </div>
                </div>

                <script>
                  let todoId = 2;

                  function updateCounter() {
                    const list = document.getElementById('todoList');
                    const emptyState = document.getElementById('emptyState');
                    const counter = document.getElementById('counter');
                    const count = list.children.length;

                    if (count === 0) {
                      list.style.display = 'none';
                      emptyState.style.display = 'block';
                    } else {
                      list.style.display = 'block';
                      emptyState.style.display = 'none';
                      counter.textContent = count + (count === 1 ? ' task' : ' tasks');
                    }
                  }

                  function addTodo() {
                    const input = document.getElementById('newTodo');
                    const text = input.value.trim();
                    if (!text) return;

                    const li = document.createElement('li');
                    li.setAttribute('data-id', todoId++);
                    li.style.cssText = 'padding: 14px; background: #f9fafb; margin-bottom: 8px; border-radius: 8px; display: flex; align-items: center; gap: 12px; border: 1px solid #e5e7eb; transition: all 0.2s;';
                    li.innerHTML = \`
                      <input type="checkbox" onchange="toggleTodo(this)" style="width: 18px; height: 18px; cursor: pointer;" />
                      <span style="flex: 1; color: #1f2937;">\${text}</span>
                      <button
                        onclick="deleteTodo(this)"
                        style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;"
                        onmouseover="this.style.opacity='1'"
                        onmouseout="this.style.opacity='0.8'"
                      >
                        Delete
                      </button>
                    \`;

                    document.getElementById('todoList').appendChild(li);
                    input.value = '';
                    updateCounter();
                  }

                  function toggleTodo(checkbox) {
                    const span = checkbox.nextElementSibling;
                    const li = checkbox.closest('li');
                    if (checkbox.checked) {
                      span.style.textDecoration = 'line-through';
                      span.style.opacity = '0.5';
                      li.style.background = '#f3f4f6';
                    } else {
                      span.style.textDecoration = 'none';
                      span.style.opacity = '1';
                      li.style.background = '#f9fafb';
                    }
                  }

                  function deleteTodo(button) {
                    const li = button.closest('li');
                    li.style.transform = 'translateX(100%)';
                    li.style.opacity = '0';
                    setTimeout(() => {
                      li.remove();
                      updateCounter();
                    }, 200);
                  }

                  function clearCompleted() {
                    const completed = document.querySelectorAll('input[type="checkbox"]:checked');
                    completed.forEach(checkbox => {
                      const li = checkbox.closest('li');
                      li.style.transform = 'translateX(100%)';
                      li.style.opacity = '0';
                      setTimeout(() => li.remove(), 200);
                    });
                    setTimeout(updateCounter, 250);
                  }

                  // Allow adding with Enter key
                  document.getElementById('newTodo').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') addTodo();
                  });

                  // Initialize counter
                  updateCounter();
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

      return {
        content: [
          {
            type: 'text',
            text: `API key collection form displayed for ${service}`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'webview://api-key-form',
              mimeType: 'text/html',
              text: `
                <div style="padding: 16px; max-width: 500px; margin: 0 auto;">
                  <h2 style="margin: 0 0 16px 0; color: #1f2937;">🔐 ${service} API Key</h2>

                  <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">
                      <strong>ℹ️ Note:</strong> This is a demonstration form. In production, API keys should be handled with proper encryption and security measures.
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
                        <span style="font-size: 14px;">I understand this is a demonstration</span>
                      </label>
                    </div>

                    <button type="submit">Submit API Key</button>
                  </form>

                  <div id="result" style="margin-top: 16px; padding: 12px; border-radius: 6px; display: none;"></div>

                  <script>
                    document.getElementById('apiKeyForm').addEventListener('submit', function(e) {
                      e.preventDefault();

                      const apiKey = e.target.apiKey.value;
                      const confirmApiKey = e.target.confirmApiKey.value;

                      if (apiKey !== confirmApiKey) {
                        const result = document.getElementById('result');
                        result.style.display = 'block';
                        result.style.background = '#fee2e2';
                        result.style.color = '#991b1b';
                        result.innerHTML = '<strong>✗ Error:</strong> API keys do not match!';
                        return;
                      }

                      // Display success message (mask the key for security)
                      const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
                      const result = document.getElementById('result');
                      result.style.display = 'block';
                      result.style.background = '#d1fae5';
                      result.style.color = '#065f46';
                      result.innerHTML = '<strong>✓ Success!</strong> API key submitted securely.<br>Service: ${service}<br>Key: ' + maskedKey;

                      // Hide the form
                      document.getElementById('apiKeyForm').style.display = 'none';

                      // Send masked data back to host
                      window.sendToHost({
                        type: 'form-submit',
                        formData: {
                          service: '${service}',
                          apiKey: maskedKey,
                          timestamp: new Date().toISOString()
                        }
                      });
                    });
                  </script>
                </div>
              `,
            },
          },
        ],
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
