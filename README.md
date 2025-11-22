# MCP Webview Host

**Secure webview host for Model Context Protocol (MCP) servers with elicitation support**

A local MCP host with integrated webview support for displaying HTML content, forms, and handling user interactions from MCP servers.

## Quick Start

**Run with NPX (easiest):**

```bash
npx mcp-webview-host
```

That's it! The server will start and open in your browser automatically.

**Want to test it?** See [TESTING.md](./TESTING.md) or run `./test.sh` for interactive testing options.

## Features

- 🔌 **Full MCP Protocol Support** - Tools, resources, prompts, and elicitation
- 🖼️ **Secure Webview Rendering** - Sandboxed iframe execution with trust levels
- 🔒 **Phase 1-3 Security** - XSS prevention, CSP, sandbox attributes, direct backend communication
- 📋 **Elicitation Support** - Both form mode and URL mode
- ⚡ **Real-time Updates** - WebSocket-based communication
- 🎨 **Modern UI** - React + TypeScript + Tailwind CSS
- ✅ **Well Tested** - 126 tests covering all security features

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MCP SDK
- **Security**: Multi-layer sandboxing, CSP, DOMPurify
- **Protocol**: Full Model Context Protocol implementation

## Test Coverage

- **Frontend**: 82% coverage (78 tests)
- **Backend**: 90% routes coverage (48 tests)
- **Security**: All Phase 1-3 features tested

## Getting Started

### Option 1: NPX (Recommended)

Just run:
```bash
npx mcp-webview-host
```

### Option 2: Local Development

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Running the Application

1. Start Ollama (in a separate terminal):
```bash
ollama serve
```

2. Start the backend server:
```bash
cd backend
npm run dev
```

3. Start the frontend:
```bash
cd frontend
npm run dev
```

4. Open http://localhost:5173 in your browser

## Usage

- Type messages in the chat input to converse with the LLM
- The LLM can respond with text or render webviews for:
  - Data visualizations
  - Interactive forms
  - Results display (similar to Jupyter notebooks)
  - Custom UI components
- Click demo buttons to see example webviews
- Configure MCP servers to extend functionality

## MCP Integration

The application supports **Model Context Protocol (MCP)** for extensibility with a unique feature: **Direct Webview Elicitation** that bypasses the LLM for privacy and security.

### Key Features

- **Direct Rendering:** MCP webviews are displayed in modal overlays, NOT in chat history
- **Privacy:** Data collected from MCP webviews never touches the LLM
- **Secure Data Collection:** Perfect for collecting credentials, API keys, personal info
- **Interactive Wizards:** Multi-step forms and workflows
- **Configure servers** in `backend/mcp-config.json`

### How It Works

```
User clicks MCP tool → Webview displayed in modal
       ↓
User fills form → Data sent directly to MCP server
       ↓
LLM never sees the data → Perfect for sensitive information
```

### Example Use Cases

- **Credential Collection:** API keys, database passwords
- **Configuration Wizards:** Multi-step setup processes
- **Data Query Builders:** Interactive database query construction
- **Feedback Forms:** User surveys and feedback
- **File Uploads:** Process files without LLM involvement

### Quick Start

1. See complete working example: [`examples/mcp-webview-example.js`](./examples/mcp-webview-example.js)
2. Read developer guide: [MCP_WEBVIEW_DEVELOPER_GUIDE.md](./docs/MCP_WEBVIEW_DEVELOPER_GUIDE.md)
3. Configure your server in `backend/mcp-config.json`
4. Click "MCP Tools" button in the UI

## Documentation

### Getting Started
- [QUICKSTART.md](./docs/QUICKSTART.md) - Quick start guide
- [WEBVIEW_GUIDE.md](./docs/WEBVIEW_GUIDE.md) - Webview usage and examples
- [MCP_GUIDE.md](./docs/MCP_GUIDE.md) - MCP integration overview

### MCP Development
- [MCP_WEBVIEW_DEVELOPER_GUIDE.md](./docs/MCP_WEBVIEW_DEVELOPER_GUIDE.md) - **Complete guide to creating MCP servers with webviews**
- [MCP_ELICITATION_GUIDE.md](./docs/MCP_ELICITATION_GUIDE.md) - Guide to MCP elicitation (form & URL modes)
- [ELICITATION_AND_NOTIFICATIONS.md](./docs/ELICITATION_AND_NOTIFICATIONS.md) - Elicitation and notification patterns
- [examples/mcp-webview-example.js](./examples/mcp-webview-example.js) - **Working MCP server example**

### Security
- [Phase_3_Direct_Backend_Communication_Guide.md](./docs/Phase_3_Direct_Backend_Communication_Guide.md) - **Guide for secure sensitive data submission**
- [WEBVIEW_SECURITY_ASSESSMENT.md](./docs/WEBVIEW_SECURITY_ASSESSMENT.md) - Security architecture and analysis
- [2025-11-21_23-53_MCP_Security_Implementation.md](./docs/2025-11-21_23-53_MCP_Security_Implementation.md) - Complete security implementation documentation

### Technical Reference
- [MCP_SPEC_COMPLIANCE_ANALYSIS.md](./docs/MCP_SPEC_COMPLIANCE_ANALYSIS.md) - MCP specification compliance
- [EMBEDDING_ATTACK_EXPLAINED.md](./docs/EMBEDDING_ATTACK_EXPLAINED.md) - Security attack vectors explained

## Development

- Frontend runs on port 5173 (Vite default)
- Backend runs on port 3000
- WebSocket connection for real-time chat

## License

MIT
