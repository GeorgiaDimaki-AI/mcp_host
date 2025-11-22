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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OllamaService, OllamaMessage } from './services/ollama.js';
import { MCPService, MCPServer } from './services/mcp.js';
import { CertificateService } from './services/certificate.js';
import { createMCPRouter } from './routes/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama3.2';

// Initialize Ollama service
const ollama = new OllamaService(OLLAMA_BASE_URL);

// Initialize Certificate service
const certificateService = new CertificateService();

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
        console.log(`✅ MCP initialized with ${servers.length} server(s)`);
      } else {
        console.log('No MCP servers configured in mcp-config.json');
      }
    } else {
      console.log('⚠️  No MCP configuration file found at ./mcp-config.json');
      console.log('   MCP servers will not be available');
    }
  } catch (error) {
    console.error('❌ Error initializing MCP:', error);
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
// Phase 3: Configure CORS for iframe direct submissions
app.use(cors({
  origin: [
    'http://localhost:5173',  // Frontend dev server
    'http://localhost:3000',  // WebSocket server
    'http://localhost:3001',  // API server (if different)
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Pull/download a model (Server-Sent Events for progress)
app.post('/api/models/pull', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    console.log(`Starting model pull: ${name}`);

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send progress updates
    for await (const progress of ollama.pullModel(name)) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    }

    // End the stream
    res.write(`data: ${JSON.stringify({ status: 'success', done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error pulling model:', error);
    res.write(`data: ${JSON.stringify({ status: 'error', error: error.message || 'Unknown error' })}\n\n`);
    res.end();
  }
});

// Mount MCP routes with certificate service
app.use('/api/mcp', createMCPRouter(mcpService, certificateService));

// Serve static files from frontend/dist
// When running from installed package, frontend/dist is at ../../frontend/dist from server.js
const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(frontendPath)) {
  console.log(`Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));

  // Fallback to index.html for client-side routing (SPA)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(join(frontendPath, 'index.html'));
  });
} else {
  console.warn(`Frontend not found at: ${frontendPath}`);
  console.warn('API-only mode: Frontend must be served separately');
}

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

    // Provide helpful error message for connection issues
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      errorMessage = 'Cannot connect to Ollama. Please make sure Ollama is running:\n\n' +
                     'Install: https://ollama.com/download\n' +
                     'Start: ollama serve\n\n' +
                     'The webview features will still work without Ollama.';
    } else if (errorMessage.includes('Not Found')) {
      errorMessage = `Model "${model}" not found. Please install a model first:\n\n` +
                     `Popular models:\n` +
                     `  ollama pull llama3.2\n` +
                     `  ollama pull qwen2.5\n` +
                     `  ollama pull mistral\n\n` +
                     `More models: https://ollama.com/library\n\n` +
                     `After installing, refresh the page.`;
    }

    ws.send(JSON.stringify({
      type: 'error',
      error: errorMessage,
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
