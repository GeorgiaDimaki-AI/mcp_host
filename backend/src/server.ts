/**
 * Main server file
 * Sets up Express server and WebSocket for real-time chat
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { OllamaService, OllamaMessage } from './services/ollama.js';
import { MCPService, MCPServer } from './services/mcp.js';
import { createMCPRouter } from './routes/mcp.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama2';

// Initialize Ollama service
const ollama = new OllamaService(OLLAMA_BASE_URL);

// Initialize MCP service
const mcpService = new MCPService();
let mcpInitialized = false;

// Load MCP configuration
async function initializeMCP() {
  try {
    const configPath = './mcp-config.json';

    if (existsSync(configPath)) {
      const configData = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);

      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        const servers: MCPServer[] = Object.entries(config.mcpServers).map(
          ([name, serverConfig]: [string, any]) => ({
            name,
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
          })
        );

        await mcpService.initialize(servers);
        mcpInitialized = true;
        console.log(`MCP initialized with ${servers.length} server(s)`);
      } else {
        console.log('No MCP servers configured');
      }
    } else {
      console.log('No MCP configuration file found');
    }
  } catch (error) {
    console.error('Error initializing MCP:', error);
  }
}

// Initialize MCP on startup
initializeMCP();

// Track active WebSocket connections
const activeConnections = new Set<WebSocket>();

// Listen for elicitation requests from MCP service
mcpService.on('elicitation-request', (request) => {
  console.log('Broadcasting elicitation request to all clients:', request);
  const message = JSON.stringify({
    type: 'elicitation-request',
    request,
  });

  activeConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
});

// Listen for elicitation completion notifications
mcpService.on('elicitation-complete', (data) => {
  console.log('Broadcasting elicitation completion to all clients:', data);
  const message = JSON.stringify({
    type: 'elicitation-complete',
    data,
  });

  activeConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
});

// Listen for MCP notifications
mcpService.on('notification', (notification) => {
  console.log('Broadcasting MCP notification to all clients:', notification);
  const message = JSON.stringify({
    type: 'mcp-notification',
    notification,
  });

  activeConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const ollamaHealthy = await ollama.healthCheck();
  res.json({
    status: 'ok',
    ollama: ollamaHealthy ? 'connected' : 'disconnected',
    mcp: mcpInitialized ? 'connected' : 'not configured',
  });
});

// List available models
app.get('/api/models', async (req, res) => {
  try {
    const models = await ollama.listModels();
    res.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Mount MCP routes
app.use('/api/mcp', createMCPRouter(mcpService));

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  // Track this connection
  activeConnections.add(ws);

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      if (message.type === 'chat') {
        await handleChatMessage(ws, message);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else if (message.type === 'elicitation-response') {
        // Handle elicitation response from client
        handleElicitationResponse(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message',
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    activeConnections.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to LLM Webview Server',
  }));
});

/**
 * Handle elicitation response from client
 */
function handleElicitationResponse(message: any) {
  const { requestId, response } = message;

  if (!requestId || !response) {
    console.error('Invalid elicitation response:', message);
    return;
  }

  console.log(`Responding to elicitation ${requestId}:`, response);
  mcpService.respondToElicitation(requestId, response);
}

/**
 * Handle chat messages with streaming response
 */
async function handleChatMessage(ws: WebSocket, message: any) {
  const { messages, model = DEFAULT_MODEL, options = {} } = message;

  try {
    // Send start signal
    ws.send(JSON.stringify({
      type: 'chat_start',
      timestamp: Date.now(),
    }));

    // Convert to Ollama message format
    const ollamaMessages: OllamaMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Stream the response
    let fullResponse = '';
    for await (const chunk of ollama.chatStream({
      model,
      messages: ollamaMessages,
      stream: true,
      options,
    })) {
      fullResponse += chunk;
      ws.send(JSON.stringify({
        type: 'chat_chunk',
        content: chunk,
        timestamp: Date.now(),
      }));
    }

    // Send completion signal
    ws.send(JSON.stringify({
      type: 'chat_complete',
      fullContent: fullResponse,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error in chat:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Ollama URL: ${OLLAMA_BASE_URL}`);
  console.log(`Default model: ${DEFAULT_MODEL}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');

  // Disconnect MCP
  if (mcpInitialized) {
    await mcpService.disconnect();
  }

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');

  // Disconnect MCP
  if (mcpInitialized) {
    await mcpService.disconnect();
  }

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
