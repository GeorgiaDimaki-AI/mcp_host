# MCP Webview Example Server

This is a complete, working example of an MCP server that demonstrates webview capabilities.

## Features Demonstrated

### 1. **Simple HTML Display** (`show_greeting_card`)
Shows how to render custom HTML content with styling.

### 2. **Interactive Todo List** (`create_todo_list`)
Demonstrates interactive JavaScript functionality within webviews.

### 3. **Data Tables** (`show_data_table`)
Shows formatted data presentation with tables and styling.

### 4. **Form Elicitation** (`collect_user_info`)
Demonstrates MCP elicitation to collect user input through forms.

### 5. **Secure Data Collection** (`collect_api_key`)
Shows Phase 3 direct backend submission for sensitive data like API keys.

## Installation

1. **Install dependencies:**
   ```bash
   cd examples
   npm install
   ```

2. **Make the script executable** (optional):
   ```bash
   chmod +x webview-example-server.js
   ```

## Configuration

To use this MCP server with the webview host, add it to your MCP configuration:

### Option 1: Edit `backend/mcp-config.json`

```json
{
  "mcpServers": {
    "webview-example": {
      "command": "node",
      "args": ["./examples/webview-example-server.js"],
      "env": {}
    }
  }
}
```

### Option 2: Use Absolute Path

```json
{
  "mcpServers": {
    "webview-example": {
      "command": "node",
      "args": ["/absolute/path/to/mcp_host/examples/webview-example-server.js"],
      "env": {}
    }
  }
}
```

## Testing the Server

### Test Standalone

You can test the server's communication protocol:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node webview-example-server.js
```

### Test with MCP Host

1. Start the MCP webview host:
   ```bash
   npx @gdimaki-ai/mcp-webview-host
   ```

2. Click "MCP Tools" button in the UI

3. You should see 5 available tools:
   - show_greeting_card
   - collect_user_info
   - create_todo_list
   - show_data_table
   - collect_api_key

4. Try each tool to see different webview capabilities!

## How It Works

### Architecture

```
┌─────────────┐
│  User Chat  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Backend Server  │
│  (MCP Client)    │
└──────┬───────────┘
       │ stdio
       ▼
┌──────────────────────┐
│  MCP Server          │
│  (This Example)      │
│  - Receives tool     │
│    calls            │
│  - Returns HTML     │
│  - Handles forms    │
└──────────────────────┘
```

### Webview Rendering

1. **MCP Server** returns HTML in a `resource` block
2. **Backend** receives the HTML and metadata
3. **Frontend** renders HTML in a sandboxed iframe
4. **User** interacts with the webview
5. **Data** flows back via:
   - `window.sendToHost()` - For UI updates
   - `window.sendToBackend()` - For sensitive data (Phase 3)

### Security Levels

The webview renderer supports 3 trust levels:

- **unverified**: No scripts, no forms (static HTML only)
- **verified**: Scripts and forms allowed, parent messaging only
- **trusted**: Full features including direct backend submission

## Example Usage

### 1. Show Greeting Card

In the chat, ask:
```
Use the show_greeting_card tool for "Alice"
```

This displays a styled greeting card.

### 2. Collect User Info

Ask:
```
Use collect_user_info to get my details
```

This shows a form. Fill it out and submit to see elicitation in action.

### 3. Todo List

Ask:
```
Create a todo list called "Project Tasks"
```

You'll get an interactive todo list where you can add and check off items.

### 4. Data Table

Ask:
```
Show me a data table titled "Q4 Projects"
```

Displays a formatted data table with styling.

### 5. Secure API Key Collection

Ask:
```
Collect an API key for OpenAI
```

Shows a secure form that submits directly to the backend (Phase 3).

## Extending This Example

### Add a New Tool

1. Add the tool to `ListToolsRequestSchema` handler:
   ```javascript
   {
     name: 'my_new_tool',
     description: 'What this tool does',
     inputSchema: {
       type: 'object',
       properties: {
         param1: { type: 'string', description: 'First parameter' }
       },
       required: ['param1']
     }
   }
   ```

2. Handle the tool in `CallToolRequestSchema`:
   ```javascript
   case 'my_new_tool': {
     return {
       content: [{
         type: 'resource',
         resource: {
           uri: 'webview://my-tool',
           mimeType: 'text/html',
           text: '<div>Your HTML here</div>'
         }
       }]
     };
   }
   ```

### Use Elicitation

For forms that need user input:

```javascript
return {
  content: [{ type: 'text', text: 'Please fill the form' }],
  elicitation: {
    requestId: 'unique-id-' + Date.now(),
    form: {
      type: 'form',
      uri: 'webview://my-form',
      mimeType: 'text/html',
      text: `
        <form id="myForm">
          <input type="text" name="field1" required />
          <button type="submit">Submit</button>
        </form>
        <script>
          document.getElementById('myForm').addEventListener('submit', function(e) {
            e.preventDefault();
            window.sendToHost({
              type: 'form-submit',
              data: { field1: e.target.field1.value }
            });
          });
        </script>
      `
    }
  }
};
```

## Best Practices

1. **Always sanitize user input** if you're processing form data
2. **Use Phase 3** (`sendToBackend`) for sensitive data (passwords, API keys)
3. **Keep HTML simple** - avoid heavy JavaScript libraries
4. **Test with different trust levels** to ensure security
5. **Use meaningful tool names** that the LLM can understand
6. **Provide clear descriptions** in the tool schema

## Troubleshooting

### Server not appearing in MCP Tools

- Check that `backend/mcp-config.json` exists and is valid JSON
- Verify the path to the server script is correct
- Look for errors in the backend console

### Forms not working

- Check that the webview has `trustLevel: 'trusted'` or `'verified'`
- Verify you're using `window.sendToHost()` correctly
- Check browser console for JavaScript errors

### Direct backend submission failing

- Ensure you're in an elicitation context (requestId is set)
- Verify the backend is running on port 3000
- Check that CORS is configured correctly

## Learn More

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Main Project README](../README.md)
- [MCP Webview Developer Guide](../docs/MCP_WEBVIEW_DEVELOPER_GUIDE.md)
