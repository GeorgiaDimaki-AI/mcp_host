# LLM Webview Client

A local LLM client with integrated webview support, inspired by VS Code and Claude Desktop.

## Features

- 💬 Simple chat interface for conversing with local LLMs
- 🖼️ Microview system for displaying HTML content, forms, and results
- 🤖 Ollama integration for local LLM support
- 🔌 **MCP (Model Context Protocol) integration** for tool calling and webview elicitation
- 🔒 Sandboxed webview execution
- ⚡ Real-time streaming responses

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **LLM**: Ollama API integration
- **MCP**: Model Context Protocol SDK for extensibility

## Project Structure

```
llm-webview-client/
├── frontend/    # React application
├── backend/     # Node.js API server
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Ollama installed and running locally
- npm or yarn

### Installation

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

The application supports **Model Context Protocol (MCP)** for extensibility:

- Connect to MCP servers for external tools and data sources
- MCP tools can return webviews for data collection (forms) or result presentation
- Configure servers in `backend/mcp-config.json`
- See [MCP_GUIDE.md](./MCP_GUIDE.md) for detailed documentation

**Example use cases:**
- Database query tools that return interactive result tables
- Configuration wizards that present forms
- API explorers with dynamic parameter collection
- Data visualization tools

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [WEBVIEW_GUIDE.md](./WEBVIEW_GUIDE.md) - Webview usage and examples
- [MCP_GUIDE.md](./MCP_GUIDE.md) - MCP integration guide

## Development

- Frontend runs on port 5173 (Vite default)
- Backend runs on port 3000
- WebSocket connection for real-time chat

## License

MIT
