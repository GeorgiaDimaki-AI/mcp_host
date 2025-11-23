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
import { OllamaService, OllamaMessage, ChatStreamChunk, OllamaToolCall } from './services/ollama.js';
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
    // Try multiple paths for mcp-config.json to handle both dev and production
    const possiblePaths = [
      './mcp-config.json',                    // When run from backend/ directory
      join(__dirname, '../mcp-config.json'),  // Relative to compiled dist folder
      join(__dirname, '../../mcp-config.json'),// Two levels up from dist
    ];

    let configPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        configPath = path;
        console.log(`Found MCP config at: ${path}`);
        break;
      }
    }

    if (!configPath) {
      console.log('⚠️  No MCP configuration file found');
      console.log('   Searched paths:', possiblePaths);
      console.log('   Current directory:', process.cwd());
      console.log('   __dirname:', __dirname);
      console.log('   MCP servers will not be available');
      return;
    }

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
 * Convert MCP tools to Ollama function format
 */
function convertMCPToolsToOllamaFormat(mcpTools: any[]): any[] {
  return mcpTools.map(tool => ({
    type: 'function',
    function: {
      name: `${tool.serverName}_${tool.name}`,
      description: tool.description || `${tool.name} from ${tool.serverName}`,
      parameters: tool.inputSchema || {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  }));
}

/**
 * Handle chat messages with streaming response and MCP tool integration
 * Implements tool execution loop with automatic continuation until final response
 */
async function handleChatMessage(ws: WebSocket, message: any) {
  const { messages, model = DEFAULT_MODEL, options = {}, mcpServer } = message;

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

    // Get MCP tools if a server is selected
    let tools: any[] | undefined = undefined;
    if (mcpServer && mcpInitialized) {
      try {
        const mcpTools = await mcpService.listTools();
        const serverTools = mcpTools.filter(t => t.serverName === mcpServer);

        if (serverTools.length > 0) {
          tools = convertMCPToolsToOllamaFormat(serverTools);
          console.log(`📦 Providing ${tools.length} tools to LLM from ${mcpServer}`);
        }
      } catch (error) {
        console.error('Error loading MCP tools:', error);
      }
    }

    // Tool execution loop - continue until LLM provides final content response
    const MAX_ITERATIONS = 5;
    let iteration = 0;
    let conversationMessages = [...ollamaMessages];
    let fullResponse = '';

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`🔄 Tool loop iteration ${iteration}/${MAX_ITERATIONS}`);

      let hasToolCalls = false;
      let toolCalls: OllamaToolCall[] = [];
      let iterationContent = '';

      // Stream the response from Ollama
      for await (const chunk of ollama.chatStream({
        model,
        messages: conversationMessages,
        stream: true,
        tools,
        options,
      })) {
        if (chunk.type === 'content') {
          // Stream content to the client
          const content = chunk.data as string;
          iterationContent += content;
          fullResponse += content;

          ws.send(JSON.stringify({
            type: 'chat_chunk',
            content: content,
            timestamp: Date.now(),
          }));
        } else if (chunk.type === 'tool_calls') {
          // Tool calls detected - stop streaming and process
          hasToolCalls = true;
          toolCalls = chunk.data as OllamaToolCall[];
          console.log(`🔧 Tool calls detected: ${toolCalls.length} tool(s)`);
          break; // Stop streaming when tool calls are detected
        }
      }

      // If no tool calls, we're done
      if (!hasToolCalls) {
        console.log('✅ Final response received (no tool calls)');
        break;
      }

      // Process tool calls
      console.log(`🛠️  Executing ${toolCalls.length} tool call(s)...`);

      // Add assistant's tool call message to conversation
      conversationMessages.push({
        role: 'assistant',
        content: iterationContent || '',
        tool_calls: toolCalls,
      });

      // Execute each tool and collect results
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        try {
          // Parse server name and tool name (format: "servername_toolname")
          const parts = toolName.split('_');
          if (parts.length < 2) {
            throw new Error(`Invalid tool name format: ${toolName}`);
          }

          const serverName = parts[0];
          const actualToolName = parts.slice(1).join('_');

          console.log(`📞 Calling tool: ${serverName}/${actualToolName}`);
          console.log(`   Arguments:`, JSON.stringify(toolArgs, null, 2));

          // Notify user about tool execution
          ws.send(JSON.stringify({
            type: 'tool_execution',
            tool: actualToolName,
            server: serverName,
            status: 'executing',
            timestamp: Date.now(),
          }));

          // Execute the tool via MCP service
          const result = await mcpService.callTool(serverName, actualToolName, toolArgs);

          console.log(`✅ Tool result:`, JSON.stringify(result, null, 2));

          // Notify user about completion
          ws.send(JSON.stringify({
            type: 'tool_execution',
            tool: actualToolName,
            server: serverName,
            status: 'completed',
            result: result,
            timestamp: Date.now(),
          }));

          // Add tool result to conversation
          // For tools with webviews, only send the text content to the LLM
          // The webview HTML is already sent to frontend via tool_execution message
          conversationMessages.push({
            role: 'tool',
            content: result.hasWebview
              ? `${result.content}\n\n[IMPORTANT: An interactive webview has already been displayed to the user. DO NOT generate another webview. Just acknowledge the result in plain text.]`
              : JSON.stringify(result),
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Tool execution error for ${toolName}:`, errorMessage);

          // Notify user about error
          ws.send(JSON.stringify({
            type: 'tool_execution',
            tool: toolName,
            status: 'error',
            error: errorMessage,
            timestamp: Date.now(),
          }));

          // Add error result to conversation
          conversationMessages.push({
            role: 'tool',
            content: JSON.stringify({
              error: errorMessage,
              tool: toolName,
            }),
          });
        }
      }

      // Continue loop to get LLM's response with tool results
      console.log(`🔁 Continuing conversation with tool results...`);
    }

    // Check if we hit max iterations
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`⚠️  Reached maximum tool execution iterations (${MAX_ITERATIONS})`);
      ws.send(JSON.stringify({
        type: 'warning',
        message: 'Maximum tool execution iterations reached. Stopping to prevent infinite loop.',
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
