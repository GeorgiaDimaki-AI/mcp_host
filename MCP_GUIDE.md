# MCP Integration Guide

## Overview

The LLM Webview Client now supports **Model Context Protocol (MCP)** integration, allowing MCP servers to send interactive webviews for data elicitation and result presentation.

## What is MCP?

Model Context Protocol is a standardized way for AI applications to connect to external data sources and tools. With our integration, MCP servers can return responses that include webview syntax, which will be automatically rendered as interactive HTML views in the chat.

## Use Cases

### 1. Data Elicitation (Forms)
MCP servers can present forms to collect structured data from users:
- Configuration wizards
- Survey responses
- Database queries
- API parameters

### 2. Result Presentation
MCP servers can display results in rich, interactive formats:
- Data visualizations
- Tables and charts
- Status dashboards
- Report viewers

## Configuration

### Step 1: Create MCP Configuration

Create or edit `backend/mcp-config.json`:

```json
{
  "mcpServers": {
    "my-data-server": {
      "command": "node",
      "args": ["path/to/your/mcp-server.js"],
      "env": {
        "API_KEY": "your-api-key-here",
        "DATABASE_URL": "your-database-url"
      }
    },
    "another-server": {
      "command": "python",
      "args": ["-m", "your_mcp_module"],
      "env": {}
    }
  }
}
```

### Step 2: Restart Backend

```bash
cd backend
npm run dev
```

The backend will automatically connect to configured MCP servers on startup.

## Creating MCP Servers That Return Webviews

### Basic Structure

Your MCP server should return responses that include the webview syntax:

````markdown
```webview:type
<html content>
```
````

### Example: Form Elicitation

Here's an example MCP tool that returns a form to collect database connection info:

```javascript
// In your MCP server
{
  name: "configure_database",
  description: "Configure database connection",
  handler: async (args) => {
    return {
      content: [
        {
          type: "text",
          text: `Please provide your database connection details:

\`\`\`webview:form
<form id="dbForm">
  <label>Database Host:</label>
  <input type="text" name="host" placeholder="localhost" required />

  <label>Port:</label>
  <input type="number" name="port" value="5432" required />

  <label>Database Name:</label>
  <input type="text" name="database" required />

  <label>Username:</label>
  <input type="text" name="username" required />

  <label>Password:</label>
  <input type="password" name="password" required />

  <button type="submit">Connect</button>
</form>

<script>
document.getElementById('dbForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = {
    host: e.target.host.value,
    port: e.target.port.value,
    database: e.target.database.value,
    username: e.target.username.value,
    password: e.target.password.value
  };
  window.sendToHost({ type: 'form-submit', formData });
});
</script>
\`\`\`
`
        }
      ]
    };
  }
}
```

### Example: Result Display

Here's an MCP tool that returns query results in a table:

```javascript
{
  name: "query_users",
  description: "Query user data",
  handler: async (args) => {
    const users = await queryDatabase(args.query);

    const tableRows = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
      </tr>
    `).join('');

    return {
      content: [
        {
          type: "text",
          text: `Found ${users.length} users:

\`\`\`webview:result
<div style="padding: 16px;">
  <h3>User Query Results</h3>
  <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
    <thead>
      <tr style="background: #f3f4f6;">
        <th style="padding: 12px; text-align: left;">ID</th>
        <th style="padding: 12px; text-align: left;">Name</th>
        <th style="padding: 12px; text-align: left;">Email</th>
        <th style="padding: 12px; text-align: left;">Role</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</div>
\`\`\`
`
        }
      ]
    };
  }
}
```

## API Endpoints

The backend exposes the following MCP endpoints:

### List MCP Tools
```
GET /api/mcp/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "configure_database",
      "description": "Configure database connection",
      "inputSchema": { ... },
      "serverName": "my-data-server"
    }
  ]
}
```

### Call MCP Tool
```
POST /api/mcp/tools/call
```

Request body:
```json
{
  "serverName": "my-data-server",
  "toolName": "configure_database",
  "args": {
    "param1": "value1"
  }
}
```

Response:
```json
{
  "content": "Tool response text",
  "hasWebview": true,
  "webviewType": "form",
  "webviewHtml": "<form>...</form>"
}
```

### List Connected Servers
```
GET /api/mcp/servers
```

Response:
```json
{
  "servers": ["my-data-server", "another-server"],
  "connected": true
}
```

## Webview Types

Use appropriate webview types for different scenarios:

### `form` - Interactive Forms
For collecting user input, configuration, parameters, etc.

### `result` - Data Display
For showing query results, reports, tables, charts, etc.

### `html` - General Content
For custom interactive content, calculators, visualizations, etc.

## Complete Example: Survey MCP Server

Here's a complete example of an MCP server that uses webviews for a multi-step survey:

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'survey-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store survey responses
const surveyData = {};

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'start_survey',
        description: 'Start a new survey',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string' }
          },
          required: ['surveyId']
        }
      },
      {
        name: 'get_results',
        description: 'Get survey results',
        inputSchema: {
          type: 'object',
          properties: {
            surveyId: { type: 'string' }
          },
          required: ['surveyId']
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'start_survey') {
    const surveyId = request.params.arguments.surveyId;

    return {
      content: [
        {
          type: 'text',
          text: `Starting survey ${surveyId}. Please fill out the form below:

\`\`\`webview:form
<form id="surveyForm">
  <h3 style="margin-top: 0;">Customer Satisfaction Survey</h3>

  <label>How satisfied are you with our service?</label>
  <select name="satisfaction" required>
    <option value="">Select...</option>
    <option value="5">Very Satisfied</option>
    <option value="4">Satisfied</option>
    <option value="3">Neutral</option>
    <option value="2">Dissatisfied</option>
    <option value="1">Very Dissatisfied</option>
  </select>

  <label>Would you recommend us to a friend?</label>
  <div style="margin: 8px 0;">
    <label><input type="radio" name="recommend" value="yes" required /> Yes</label>
    <label><input type="radio" name="recommend" value="no" required /> No</label>
  </div>

  <label>Additional comments:</label>
  <textarea name="comments" rows="4" placeholder="Optional feedback..."></textarea>

  <button type="submit">Submit Survey</button>
</form>

<script>
document.getElementById('surveyForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = {
    satisfaction: e.target.satisfaction.value,
    recommend: e.target.recommend.value,
    comments: e.target.comments.value,
    surveyId: '${surveyId}'
  };
  window.sendToHost({ type: 'form-submit', formData });
});
</script>
\`\`\`
`
        }
      ]
    };
  }

  if (request.params.name === 'get_results') {
    // Return results visualization...
  }

  throw new Error('Unknown tool');
});

const transport = new StdioServerTransport();
server.connect(transport);
```

## Testing MCP Integration

1. **Configure your MCP server** in `backend/mcp-config.json`
2. **Start the backend**: `cd backend && npm run dev`
3. **Check health endpoint**: `curl http://localhost:3000/api/health`
   - Should show `"mcp": "connected"`
4. **List tools**: `curl http://localhost:3000/api/mcp/tools`
5. **Call a tool** via API or ask the LLM to use it

## Form Submission Handling

When a user submits a form in a webview, the data is automatically sent back to the chat. You can then:

1. Have the LLM process the form data
2. Call another MCP tool with the form data
3. Display a confirmation or next steps

The LLM will receive the form data as a user message:
```
Form submitted with data:
{
  "field1": "value1",
  "field2": "value2"
}
```

## Best Practices

1. **Keep forms simple** - Don't overwhelm users with too many fields
2. **Provide validation** - Use HTML5 validation attributes
3. **Style consistently** - Use inline styles for reliability
4. **Handle errors gracefully** - Include error messages in responses
5. **Test thoroughly** - Test webviews in the UI before deploying

## Troubleshooting

### MCP server not connecting
- Check `mcp-config.json` syntax
- Verify command and args are correct
- Check server logs for errors
- Ensure MCP server is executable

### Webviews not rendering
- Verify webview syntax is correct
- Check browser console for errors
- Ensure HTML is properly escaped
- Test with demo buttons first

### Forms not submitting
- Check `window.sendToHost` is called
- Verify form has proper event listener
- Ensure form data is structured correctly

## Security Considerations

- Webviews run in sandboxed iframes
- Limited JavaScript capabilities
- No access to parent window
- Content Security Policy restrictions
- Validate all form inputs server-side

## Next Steps

- Create your first MCP server with webviews
- Experiment with different form types
- Build data visualization tools
- Integrate with your existing systems
