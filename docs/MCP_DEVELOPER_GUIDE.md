# MCP Developer Guide

A comprehensive guide for building and testing Model Context Protocol (MCP) servers with webview capabilities.

## Table of Contents

- [Introduction](#introduction)
- [What is MCP?](#what-is-mcp)
- [Getting Started](#getting-started)
- [Building Your First MCP Server](#building-your-first-mcp-server)
- [Webview Capabilities](#webview-capabilities)
- [Testing Your MCP Server](#testing-your-mcp-server)
- [Tool Schema Reference](#tool-schema-reference)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Introduction

This guide will help you build and test MCP servers that integrate with this webview host application. You'll learn how to create tools that can display interactive HTML forms, visualizations, and handle user input through the elicitation system.

## What is MCP?

The Model Context Protocol (MCP) is a protocol that enables Large Language Models (LLMs) to interact with external tools and services. MCP servers expose tools that LLMs can discover and call during conversations.

### Key Concepts

- **MCP Server**: A service that exposes one or more tools
- **Tool**: A function that the LLM can call with specific parameters
- **Elicitation**: A mechanism for requesting user input during tool execution
- **Webview**: Interactive HTML content displayed to users (forms, visualizations, results)
- **Tool Schema**: JSON Schema defining the inputs a tool accepts

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- Understanding of JavaScript/TypeScript
- Basic knowledge of JSON Schema
- Familiarity with HTML/CSS for webviews

### Installation

Install the MCP SDK:

```bash
npm install @modelcontextprotocol/sdk
```

## Building Your First MCP Server

### Basic Server Structure

Here's a minimal MCP server that exposes a simple tool:

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'my-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'greet',
        description: 'Greets a user by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the person to greet',
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'greet') {
    const userName = args.name;
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${userName}! Welcome to MCP.`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

### Adding Your Server to Configuration

Add your server to `backend/mcp-config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/your-server.js"],
      "env": {},
      "description": "My custom MCP server",
      "trustLevel": "unverified"
    }
  }
}
```

## Webview Capabilities

Webviews allow your MCP tools to display rich, interactive HTML content to users.

### Types of Webviews

1. **HTML Webview** (`webview:html`) - General-purpose HTML content
2. **Form Webview** (`webview:form`) - Interactive forms for user input
3. **Result Webview** (`webview:result`) - Display results, charts, tables

### Creating a Form Webview

Form webviews use the elicitation system to request user input:

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'user-form') {
    // Create an HTML form
    const formHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h2>User Registration</h2>
        <form id="userForm">
          <div class="form-group">
            <label for="name">Full Name:</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="role">Role:</label>
            <select id="role" name="role">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit">Submit</button>
        </form>
        <script>
          document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Send data back to MCP server
            window.parent.postMessage({
              type: 'form-submit',
              formData: data
            }, '*');
          });
        </script>
      </body>
      </html>
    `;

    // Request user input via elicitation
    const elicitationResponse = await server.elicitUserInput({
      prompt: 'Please fill out the registration form',
      metadata: {
        type: 'webview',
        webviewType: 'form',
        html: formHtml,
      },
    });

    // Process the submitted form data
    const userData = elicitationResponse.data;

    return {
      content: [
        {
          type: 'text',
          text: `User registered: ${userData.name} (${userData.email}) as ${userData.role}`,
        },
      ],
    };
  }
});
```

### Creating a Result Webview

Result webviews display data, charts, and visualizations:

```javascript
if (name === 'show-chart') {
  const chartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .chart-container { max-width: 600px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <h2>Sales Data</h2>
      <div class="chart-container">
        <canvas id="myChart"></canvas>
      </div>
      <script>
        const ctx = document.getElementById('myChart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Sales ($)',
              data: [12000, 19000, 15000, 25000, 22000, 30000],
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  return {
    content: [
      {
        type: 'text',
        text: '```webview:result\n' + chartHtml + '\n```',
      },
    ],
  };
}
```

### Webview Communication

Webviews can communicate back to the application using `postMessage`:

```javascript
// From within your webview HTML
window.parent.postMessage({
  type: 'form-submit',
  formData: { key: 'value' }
}, '*');

// Or for custom events
window.parent.postMessage({
  type: 'custom-event',
  data: { /* your data */ }
}, '*');
```

## Testing Your MCP Server

### Step 1: Run Your Server Standalone

Test your server directly to ensure it starts correctly:

```bash
node your-server.js
```

The server should start without errors and wait for stdio input.

### Step 2: Add to MCP Configuration

Edit `backend/mcp-config.json`:

```json
{
  "mcpServers": {
    "test-server": {
      "command": "node",
      "args": ["/absolute/path/to/your-server.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "description": "My test MCP server",
      "trustLevel": "trusted"
    }
  }
}
```

**Important**: Use absolute paths for the `args` field.

### Step 3: Restart the Application

Restart the webview host application to load your new server:

```bash
npm start
```

### Step 4: Test in Chat

1. Start a new conversation
2. Select your MCP server from the dropdown
3. Ask the LLM to use your tool:
   - "Please greet me by name"
   - "Show me the user registration form"
   - "Display the sales chart"

### Step 5: Monitor Logs

Check the backend logs for debugging:

```bash
# The application logs will show:
# - MCP server connections
# - Tool calls
# - Errors and warnings
```

### Debugging Tips

1. **Server won't start**: Check the command and args in mcp-config.json
2. **Tool not found**: Verify the tool name matches exactly
3. **Webview not displaying**: Check that HTML is valid and properly formatted
4. **Form not submitting**: Ensure `postMessage` is called with correct data structure
5. **Elicitation timeout**: Forms must be submitted within a reasonable time

## Tool Schema Reference

### Input Schema

Tools use JSON Schema to define their inputs:

```json
{
  "type": "object",
  "properties": {
    "param1": {
      "type": "string",
      "description": "Description of param1",
      "enum": ["option1", "option2"]
    },
    "param2": {
      "type": "number",
      "description": "A numeric parameter",
      "minimum": 0,
      "maximum": 100
    },
    "param3": {
      "type": "boolean",
      "description": "A boolean flag"
    },
    "param4": {
      "type": "array",
      "items": { "type": "string" },
      "description": "An array of strings"
    },
    "param5": {
      "type": "object",
      "properties": {
        "nested": { "type": "string" }
      },
      "description": "A nested object"
    }
  },
  "required": ["param1", "param2"]
}
```

### Output Format

Tools return content in this format:

```javascript
return {
  content: [
    {
      type: 'text',
      text: 'Your response here',
    },
    // Can include multiple content items
    {
      type: 'text',
      text: '```webview:html\n<div>HTML here</div>\n```',
    },
  ],
};
```

### Webview Content Format

To display webviews, include markdown code blocks in your text response:

```javascript
// For forms
text: '```webview:form\n<html>...</html>\n```'

// For results/visualizations
text: '```webview:result\n<html>...</html>\n```'

// For general HTML
text: '```webview:html\n<html>...</html>\n```'
```

## Best Practices

### Security

1. **Validate all inputs**: Always validate and sanitize user inputs
2. **Escape HTML**: Use proper escaping to prevent XSS attacks
3. **Trust levels**: Mark servers appropriately (trusted/verified/unverified)
4. **Sensitive data**: Never expose secrets or credentials in webviews

### Performance

1. **Keep HTML lightweight**: Minimize external dependencies
2. **Async operations**: Use async/await for I/O operations
3. **Timeout handling**: Set reasonable timeouts for long operations
4. **Resource cleanup**: Properly dispose of resources

### User Experience

1. **Clear descriptions**: Write clear tool and parameter descriptions
2. **Helpful error messages**: Provide actionable error messages
3. **Loading states**: Show loading indicators for long operations
4. **Form validation**: Validate forms client-side before submission
5. **Responsive design**: Make webviews work on different screen sizes

### Code Organization

```
my-mcp-server/
├── server.js           # Main server file
├── tools/              # Tool implementations
│   ├── greeting.js
│   ├── calculator.js
│   └── forms.js
├── templates/          # HTML templates
│   ├── form.html
│   └── chart.html
├── package.json
└── README.md
```

## Examples

### Example 1: Calculator Tool

```javascript
{
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The operation to perform',
      },
      a: {
        type: 'number',
        description: 'First number',
      },
      b: {
        type: 'number',
        description: 'Second number',
      },
    },
    required: ['operation', 'a', 'b'],
  },
}

// Handler
if (name === 'calculator') {
  const { operation, a, b } = args;
  let result;

  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide':
      if (b === 0) throw new Error('Division by zero');
      result = a / b;
      break;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Result: ${a} ${operation} ${b} = ${result}`,
      },
    ],
  };
}
```

### Example 2: Data Table Display

```javascript
if (name === 'show-data-table') {
  const data = [
    { id: 1, name: 'Alice', role: 'Developer', score: 95 },
    { id: 2, name: 'Bob', role: 'Designer', score: 87 },
    { id: 3, name: 'Charlie', role: 'Manager', score: 92 },
  ];

  const tableHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
        tr:hover { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <h2>Team Performance</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.id}</td>
              <td>${row.name}</td>
              <td>${row.role}</td>
              <td>${row.score}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return {
    content: [
      {
        type: 'text',
        text: '```webview:result\n' + tableHtml + '\n```',
      },
    ],
  };
}
```

### Example 3: Interactive Configuration Form

See `examples/webview-example-server.js` for a complete, working example with:
- Multiple form types
- Chart visualizations
- Todo list management
- Proper error handling
- Modern UI styling

## Troubleshooting

### Common Issues

**Issue**: Server fails to connect
- **Solution**: Check that command and args are correct in mcp-config.json
- **Solution**: Verify Node.js version is 18+
- **Solution**: Check server logs for startup errors

**Issue**: Tools not showing in UI
- **Solution**: Ensure ListToolsRequestSchema handler is implemented
- **Solution**: Verify server is properly connected (check backend logs)
- **Solution**: Restart the application after config changes

**Issue**: Webview not rendering
- **Solution**: Validate HTML syntax
- **Solution**: Check browser console for errors
- **Solution**: Ensure webview type (html/form/result) is correct
- **Solution**: Verify markdown code block format: \`\`\`webview:type

**Issue**: Form submission not working
- **Solution**: Check that postMessage is called correctly
- **Solution**: Verify data structure matches expected format
- **Solution**: Look for JavaScript errors in browser console
- **Solution**: Ensure event.preventDefault() is called on form submit

**Issue**: LLM not calling tools
- **Solution**: Select the MCP server from the dropdown before chatting
- **Solution**: Write clear tool descriptions that explain when to use them
- **Solution**: Check that tool is listed in MCP Info panel
- **Solution**: Try asking more explicitly (e.g., "Use the calculator tool to add 5 and 3")

### Debug Mode

Enable verbose logging in your server:

```javascript
console.error('[DEBUG] Tool called:', name, 'with args:', args);
console.error('[DEBUG] Returning response:', response);
```

(Use console.error for logging as console.log interferes with stdio communication)

## Additional Resources

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [JSON Schema Guide](https://json-schema.org/learn/getting-started-step-by-step)
- [Example MCP Servers](../examples/)

## Support

If you encounter issues or have questions:

1. Check this guide's troubleshooting section
2. Review the example server code in `examples/`
3. Check the MCP SDK documentation
4. Open an issue on GitHub

---

**Happy MCP Development!** 🚀
