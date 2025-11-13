/**
 * Main server file
 * Sets up Express server and WebSocket for real-time chat
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { OllamaService, OllamaMessage } from './services/ollama.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama2';

// Initialize Ollama service
const ollama = new OllamaService(OLLAMA_BASE_URL);

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

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      if (message.type === 'chat') {
        await handleChatMessage(ws, message);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
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
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to LLM Webview Server',
  }));
});

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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
