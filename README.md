# MCP Webview Host

**A local chat interface for Model Context Protocol (MCP) servers with interactive webview support**

A modern web-based chat application that connects to Ollama LLMs and allows MCP servers to display interactive HTML forms, visualizations, and custom UI components.

## What is MCP?

**Model Context Protocol (MCP)** is a standard protocol that allows AI assistants to interact with external tools and services. Think of it like plugins for AI - MCP servers provide specialized capabilities (like database access, API integrations, or custom workflows) that the AI can use to help users.

## What are Webviews?

**Webviews** are interactive HTML interfaces that MCP servers can display to collect user input or show results. Instead of just returning text, an MCP server can:

- Show interactive forms for data collection
- Display visualizations and charts
- Render custom UI components
- Create multi-step wizards

**Key Feature:** Webviews can submit data directly to the backend, completely bypassing the chat interface. This means sensitive data (like passwords or credit card numbers) never appears in chat history.

## How It Works

```
1. User asks AI a question
   ↓
2. AI decides to use an MCP tool
   ↓
3. MCP server responds with a webview (HTML)
   ↓
4. User interacts with the form
   ↓
5. Form submits directly to backend via POST
   ↓
6. MCP server processes the data
   ↓
7. AI receives the result and continues
```

**Example Flow:**
```
User: "Make a restaurant reservation"
  → AI calls restaurant MCP tool
  → Restaurant form appears
  → User fills in name, date, time
  → Form POSTs to backend
  → Confirmation number returned
```

## Quick Start

**Run with NPX (easiest):**

```bash
npx @gdimaki-ai/mcp-webview-host
```

That's it! The server will start and open in your browser automatically.

## Features

- 🔌 **Full MCP Protocol Support** - Tools, resources, prompts
- 🖼️ **Interactive Webviews** - Forms, visualizations, custom UI
- 🔒 **Secure Data Submission** - Direct backend POST, bypasses chat
- ⚡ **Real-time Chat** - WebSocket-based communication
- 🎨 **Modern UI** - React + TypeScript + Tailwind CSS
- 🌓 **Light/Dark Mode** - Theme support
- 🤖 **Ollama Integration** - Local LLM support

## Example MCP Server

Check out the **Restaurant MCP Server** in `examples/restaurant-mcp-server.js`:

- View menu with photos
- Make reservations with interactive form
- Get wine pairing recommendations
- View chef's special
- Secure payment demo (shows data bypassing chat)

## Creating Your Own MCP Server

MCP servers are just Node.js scripts that:

1. Define tools (functions the AI can call)
2. Return responses (text or HTML webviews)
3. Handle form submissions

**Basic structure:**
```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: 'my-server', version: '1.0.0' });

// Define a tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'my_tool',
      description: 'Does something cool',
      inputSchema: { type: 'object', properties: {} }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'my_tool') {
    return {
      content: [
        { type: 'text', text: 'Hello!' },
        {
          type: 'resource',
          resource: {
            uri: 'webview://my-form',
            mimeType: 'text/html',
            text: '<html><!-- your HTML form --></html>'
          }
        }
      ]
    };
  }
});
```

## Webview Forms

Forms in webviews can submit directly to the backend:

```javascript
// In your webview HTML
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  // POST directly to backend - never touches chat!
  const response = await fetch('/api/mcp/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverName: 'my-server',
      toolName: 'process_form',
      args: data
    })
  });

  // Handle response
  const result = await response.json();
});
```

## Configuration

Add your MCP servers to `backend/mcp-config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./examples/my-server.js"],
      "description": "My custom MCP server",
      "trustLevel": "verified"
    }
  }
}
```

**Trust Levels:**
- `verified` - Full access to backend submission
- `trusted` - Can display webviews
- `unverified` - Text only, no webviews

## Local Development

1. **Install dependencies:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. **Start Ollama:**
```bash
ollama serve
```

3. **Start backend:**
```bash
cd backend && npm run dev
```

4. **Start frontend:**
```bash
cd frontend && npm run dev
```

5. Open http://localhost:5173

## Architecture

- **Frontend**: React + TypeScript (port 5173)
- **Backend**: Node.js + Express (port 3000)
- **MCP Servers**: Node.js scripts (stdio transport)
- **LLM**: Ollama (local inference)
- **Communication**: WebSocket for chat, HTTP POST for forms

## Security

Webviews are sandboxed with multiple security layers:

1. **Iframe Sandbox** - Restricted permissions
2. **Content Security Policy** - Prevents XSS
3. **DOMPurify** - HTML sanitization
4. **Direct Backend POST** - Sensitive data bypasses chat
5. **Trust Levels** - Control what servers can do

## Example Use Cases

- **Database Tools** - Query builders with form inputs
- **API Integrations** - OAuth flows, credential collection
- **Data Entry** - Forms for structured data
- **Visualizations** - Charts, graphs, tables
- **Multi-step Wizards** - Complex workflows
- **Payment Processing** - Secure payment forms

## License

MIT
