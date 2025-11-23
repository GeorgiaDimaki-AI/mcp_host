/**
 * Chat Component
 * Main chat interface container with MCP webview support and conversation management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, WebSocketMessage, MCPWebviewDisplay, MCPTool } from '../../types';
import { WebSocketService } from '../../services/websocket';
import { api } from '../../services/api';
import { mcpApi } from '../../services/mcp-api';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from './ChatInput';
import { WebviewRenderer } from '../Webview/WebviewRenderer';
import { ElicitationDialog, ElicitationRequest } from '../Elicitation/ElicitationDialog';
import { MCPServerSettings } from '../Settings/MCPServerSettings';
import { ChatSummary } from './ChatSummary';
import { Sidebar } from '../Sidebar/Sidebar';
import { ModelSettings } from '../Settings/ModelSettings';
import { ModelManager } from '../Settings/ModelManager';
import { HelpModal } from '../HelpModal/HelpModal';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { useMCPConfig } from '../../contexts/MCPConfigContext';
import {
  getAllConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  Conversation,
  ModelSettings as ModelSettingsType,
} from '../../services/conversationService';

const wsService = new WebSocketService('ws://localhost:3000');

export function Chat() {
  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track previous conversation to prevent cross-contamination when switching
  const previousConversationIdRef = useRef<string | null>(null);

  // Current conversation derived state
  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;
  const messages = currentConversation?.messages || [];
  const currentModel = currentConversation?.model || 'llama3.2';
  const modelSettings = currentConversation?.settings || {};
  const currentMcpServer = currentConversation?.mcpServer || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableMcpServers, setAvailableMcpServers] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

  // MCP-specific state
  const [mcpWebviews, setMcpWebviews] = useState<MCPWebviewDisplay[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [showMcpInfo, setShowMcpInfo] = useState(false);

  // Elicitation state
  const [activeElicitation, setActiveElicitation] = useState<ElicitationRequest | null>(null);

  // Settings state
  const [showMcpSettings, setShowMcpSettings] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // MCP configuration context
  const { getTrustLevel, reload: reloadMcpConfig } = useMCPConfig();

  // Load conversations on mount
  useEffect(() => {
    const loadedConversations = getAllConversations();
    setConversations(loadedConversations);

    // If there are conversations, select the most recent one
    if (loadedConversations.length > 0) {
      setCurrentConversationId(loadedConversations[0].id);
    }
    // Don't create a conversation here - wait for models to load first
  }, []);

  // Auto-save current conversation when messages change
  useEffect(() => {
    // Skip if no conversation selected or empty messages
    if (!currentConversationId || messages.length === 0) {
      previousConversationIdRef.current = currentConversationId;
      return;
    }

    // Skip auto-save immediately after switching conversations to prevent cross-contamination
    if (previousConversationIdRef.current !== currentConversationId) {
      previousConversationIdRef.current = currentConversationId;
      return;
    }

    // Only auto-save when actually in the same conversation
    const updated = updateConversation(currentConversationId, {
      messages,
      model: currentModel,
      settings: modelSettings,
      mcpServer: currentMcpServer,
    });

    if (updated) {
      setConversations(prev =>
        prev.map(c => (c.id === currentConversationId ? updated : c))
      );
    }

    previousConversationIdRef.current = currentConversationId;
  }, [messages, currentConversationId, currentModel, modelSettings]);

  // Handle settings close - reload MCP config in case it was updated
  const handleMcpSettingsClose = () => {
    setShowMcpSettings(false);
    reloadMcpConfig(); // Reload trust levels after settings change
  };

  // Initialize WebSocket connection
  useEffect(() => {
    wsService.connect()
      .then(() => {
        setIsConnected(true);
        addSystemMessage('Connected to LLM server');
      })
      .catch((error) => {
        console.error('Failed to connect:', error);
        addSystemMessage('Failed to connect to server');
      });

    // Load available models
    loadModels();

    // Load MCP tools and servers
    mcpApi.listTools()
      .then((tools) => {
        setMcpTools(tools);
        if (tools.length > 0) {
          console.log(`Loaded ${tools.length} MCP tool(s)`);
        }

        // Extract unique server names from tools
        const serverNames = Array.from(new Set(tools.map(t => t.serverName)));
        setAvailableMcpServers(serverNames);
      })
      .catch((error) => {
        console.error('Failed to load MCP tools:', error);
      });

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Function to load models (can be called after pulling new models)
  const loadModels = () => {
    api.getModels()
      .then((response) => {
        const modelNames = response.models.map(m => m.name);
        setAvailableModels(modelNames);

        // If no conversations exist, create one with the first available model
        if (conversations.length === 0 && modelNames.length > 0) {
          const newConv = createConversation(modelNames[0]);
          setConversations([newConv]);
          setCurrentConversationId(newConv.id);
        }
      })
      .catch((error) => {
        console.error('Failed to load models:', error);
      });
  };

  // Reload models after pulling a new one
  const handleModelPulled = () => {
    loadModels();
  };

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = wsService.onMessage((message: WebSocketMessage) => {
      handleWebSocketMessage(message);
    });

    return unsubscribe;
  }, [streamingContent]);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connected:', message.message);
        break;

      case 'chat_start':
        setIsLoading(true);
        setStreamingContent('');
        break;

      case 'chat_chunk':
        if (message.content) {
          setStreamingContent(prev => prev + message.content);
        }
        break;

      case 'chat_complete':
        setIsLoading(false);
        if (message.fullContent) {
          addAssistantMessage(message.fullContent);
        }
        setStreamingContent('');
        break;

      case 'error':
        setIsLoading(false);
        addSystemMessage(`Error: ${message.error}`);
        setStreamingContent('');
        break;

      case 'elicitation-request':
        // Handle elicitation request from MCP server
        if ((message as any).request) {
          console.log('Received elicitation request:', (message as any).request);
          setActiveElicitation((message as any).request);
        }
        break;

      case 'elicitation-complete':
        // Handle elicitation completion notification
        if ((message as any).data) {
          const { serverName, elicitationId } = (message as any).data;
          addSystemMessage(`✓ ${serverName} elicitation completed (${elicitationId})`);
        }
        break;

      case 'mcp-notification':
        // Handle unprompted MCP notifications
        if ((message as any).notification) {
          const notif = (message as any).notification;
          const icon = notif.type === 'success' ? '✅' : notif.type === 'error' ? '❌' : notif.type === 'warning' ? '⚠️' : 'ℹ️';
          addSystemMessage(`${icon} ${notif.serverName}: ${notif.message}`);
        }
        break;

      case 'tool_execution':
        // Handle MCP tool execution results with webviews
        const toolMsg = message as any;
        if (toolMsg.status === 'completed' && toolMsg.result?.hasWebview) {
          // Display webview from MCP tool result
          const webviewMessage: Message = {
            id: `tool-webview-${Date.now()}`,
            role: 'assistant',
            content: toolMsg.result.content || `Displaying result from ${toolMsg.tool}`,
            timestamp: Date.now(),
            webview: {
              type: toolMsg.result.webviewType || 'html',
              html: toolMsg.result.webviewHtml,
              source: 'mcp' as const,
              trustLevel: getTrustLevel(toolMsg.server) as any,
              mcpServer: toolMsg.server,
            },
          };

          // Get current messages from conversation to avoid stale closure
          if (!currentConversationId) return;
          const currentConv = conversations.find(c => c.id === currentConversationId);
          if (currentConv) {
            updateMessages([...currentConv.messages, webviewMessage]);
          }
        }
        break;
    }
  };

  const addSystemMessage = (content: string) => {
    if (!currentConversationId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: Date.now(),
    };

    updateMessages([...messages, newMessage]);
  };

  const addAssistantMessage = (content: string) => {
    if (!currentConversationId) return;

    // Check if message contains webview content
    const webviewMatch = content.match(/```webview:(\w+)\n([\s\S]*?)```/);

    let messageContent = content;
    let webview = undefined;

    if (webviewMatch) {
      const [fullMatch, type, html] = webviewMatch;
      messageContent = content.replace(fullMatch, '').trim();
      webview = {
        type: type as 'html' | 'form' | 'result',
        html: html.trim(),
        source: 'chat' as const, // Mark as chat-generated
        trustLevel: 'verified' as const, // Chat-generated content is verified (from LLM)
        mcpServer: 'LLM', // Mark it as coming from LLM for badge display
      };
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: messageContent || 'Rendered webview below:',
      timestamp: Date.now(),
      webview,
    };

    updateMessages([...messages, newMessage]);
  };

  const updateMessages = (newMessages: Message[]) => {
    if (!currentConversationId) return;

    const updated = updateConversation(currentConversationId, {
      messages: newMessages,
    });

    if (updated) {
      setConversations(prev =>
        prev.map(c => (c.id === currentConversationId ? updated : c))
      );
    }
  };

  const handleSendMessage = useCallback((content: string) => {
    if (!currentConversationId) return;

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMessage];
    updateMessages(newMessages);

    // Prepare conversation messages
    const conversationMessages = newMessages
      .filter(msg => msg.id !== 'system-prompt-ui') // Exclude UI-only system messages
      .map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

    // Add system prompt at the beginning
    // Use custom system prompt from settings, or default assistant prompt
    const webviewInstructions = `

---
🔴 CRITICAL WEBVIEW RENDERING RULE - READ CAREFULLY 🔴

When the user asks for HTML content, forms, charts, calculators, or interactive UIs, you MUST ONLY respond using MARKDOWN CODE BLOCKS with the webview:type syntax.

⛔ NEVER EVER output raw HTML tags directly ⛔
⛔ NEVER use <webview> tags ⛔
⛔ NEVER write <div>, <form>, <html> outside of code blocks ⛔

✅ ONLY CORRECT FORMAT (with triple backticks):
\`\`\`webview:html
<div>Your HTML here</div>
\`\`\`

📋 STEP-BY-STEP FOR CREATING HTML:

Step 1: Write three backticks followed by "webview:html" (or webview:form or webview:result)
Step 2: Press Enter and write your HTML code
Step 3: Close with three backticks

Example - Simple button:
\`\`\`webview:html
<button onclick="alert('Hello!')">Click me</button>
\`\`\`

Example - Form:
\`\`\`webview:form
<form id="f">
  <input type="text" name="email" placeholder="Email" required />
  <button type="submit">Submit</button>
</form>
<script>
  document.getElementById('f').addEventListener('submit', function(e) {
    e.preventDefault();
    window.sendToHost({ type: 'form-submit', formData: { email: e.target.email.value } });
  });
</script>
\`\`\`

Example - Chart/Visualization:
\`\`\`webview:result
<div style="width: 100%; height: 300px;">
  <canvas id="chart"></canvas>
</div>
<script>
  // Your chart code here
</script>
\`\`\`

🚫 FORBIDDEN PATTERNS - DO NOT USE:
❌ <webview type="webview:html">content</webview>
❌ <div>content</div> (without code blocks)
❌ \`\`\`html ... \`\`\` (plain html, not webview:type)
❌ Any HTML tags outside of code blocks

🎯 GOLDEN RULE:
If user asks for HTML → Use \`\`\`webview:html
If user asks for form → Use \`\`\`webview:form
If user asks for chart/table/viz → Use \`\`\`webview:result
ALWAYS with triple backticks and webview:type!`;

    const systemPrompt = {
      role: 'system' as const,
      content: modelSettings.systemPrompt
        ? `${modelSettings.systemPrompt}${webviewInstructions}`
        : `You are a helpful AI assistant with the ability to render interactive HTML content.${webviewInstructions}`,
    };

    wsService.send({
      type: 'chat',
      messages: [systemPrompt, ...conversationMessages],
      model: currentModel,
      mcpServer: currentMcpServer, // Send selected MCP server to enable tool calling
      options: modelSettings,
    });
  }, [messages, currentModel, modelSettings, currentMcpServer, currentConversationId]);

  const handleWebviewMessage = (messageId: string, data: any) => {
    console.log('Webview message from', messageId, ':', data);

    // Check if this is an MCP webview
    const mcpWebview = mcpWebviews.find(w => w.id === messageId);

    if (mcpWebview) {
      // MCP webview - handle directly WITHOUT going through chat
      console.log('MCP webview response:', data);

      // Check if this is an elicitation response (tool continuation)
      if (data.type === 'elicitation-response' && data.formData?._continueExecution) {
        const { _tool, _elicitationData, ...otherArgs } = data.formData;

        // Remove current webview
        setMcpWebviews(prev => prev.filter(w => w.id !== messageId));

        // Show collected data in chat for transparency
        const dataEntries = Object.entries(_elicitationData || {})
          .map(([key, value]) => `  • ${key}: ${value}`)
          .join('\n');

        addSystemMessage(`✅ Form submitted from ${mcpWebview.toolName}:\n${dataEntries}\n\n↻ Continuing tool execution...`);

        // Continue tool execution with collected data
        const continuationArgs = {
          ...otherArgs,
          _elicitationData,
        };

        callMCPTool(mcpWebview.serverName, _tool, continuationArgs);
        return;
      }

      // Check if this is a cancellation
      if (data.type === 'elicitation-cancelled') {
        addSystemMessage(`✖ Tool execution cancelled`);
        setMcpWebviews(prev => prev.filter(w => w.id !== messageId));
        return;
      }

      // Check if this is a form submit with data
      if (data.type === 'form-submit' && data.formData) {
        // Show the submitted data in chat
        const dataEntries = Object.entries(data.formData)
          .filter(([key]) => !key.startsWith('_')) // Filter out internal fields
          .map(([key, value]) => `  • ${key}: ${value}`)
          .join('\n');

        if (dataEntries) {
          addSystemMessage(`✅ Form submitted from ${mcpWebview.toolName}:\n${dataEntries}`);
        }
      }

      if (mcpWebview.onResponse) {
        mcpWebview.onResponse(data);
      }

      // Remove webview after response
      setMcpWebviews(prev => prev.filter(w => w.id !== messageId));
      return;
    }

    // Regular chat webview - send back to chat as a new user message
    if (data.type === 'form-submit' && data.formData) {
      const dataEntries = Object.entries(data.formData)
        .map(([key, value]) => `  • ${key}: ${value}`)
        .join('\n');

      addSystemMessage(`✅ Form submitted:\n${dataEntries}`);
    }
  };

  const callMCPTool = async (serverName: string, toolName: string, args: Record<string, any> = {}) => {
    try {
      // Show loading message
      addSystemMessage(`⏳ Calling ${serverName} → ${toolName}...`);

      const result = await mcpApi.callTool(serverName, toolName, args);

      // Check if result contains webview
      if (result.hasWebview && result.webviewHtml && result.webviewType) {
        const trustLevel = getTrustLevel(serverName);

        // Create MCP webview display
        const mcpWebview: MCPWebviewDisplay = {
          id: `mcp-${Date.now()}`,
          serverName,
          toolName,
          webview: {
            type: result.webviewType,
            html: result.webviewHtml,
            source: 'mcp',
            mcpServer: serverName,
            mcpTool: toolName,
            trustLevel,
          },
          timestamp: Date.now(),
        };

        setMcpWebviews(prev => [...prev, mcpWebview]);
      } else {
        // Just show text result
        addSystemMessage(`✅ ${serverName} → ${toolName}: ${result.content}`);
      }
    } catch (error: any) {
      console.error('MCP tool call failed:', error);
      addSystemMessage(`❌ Tool call failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleElicitationResponse = (response: { action: 'accept' | 'decline' | 'cancel'; content?: Record<string, any> }) => {
    if (!activeElicitation) return;

    if (response.action === 'accept' && response.content) {
      // Send response via WebSocket
      wsService.send({
        type: 'elicitation-response',
        requestId: activeElicitation.requestId,
        response: {
          accepted: true,
          data: response.content,
        },
      });
    } else {
      // User declined or cancelled
      wsService.send({
        type: 'elicitation-response',
        requestId: activeElicitation.requestId,
        response: {
          accepted: false,
        },
      });
    }

    setActiveElicitation(null);
  };

  // Demo functions
  const sendDemoForm = () => {
    handleSendMessage('Create a demo form in a webview with name, email, and a submit button. Use the webview:form syntax.');
  };

  const sendDemoChart = () => {
    handleSendMessage('Create a simple HTML chart showing monthly sales data in a webview. Use the webview:result syntax with a colorful bar chart.');
  };

  const sendDemoCalculator = () => {
    handleSendMessage('Build a simple calculator using HTML, CSS, and JavaScript in a webview. Use the webview:html syntax.');
  };

  // Conversation management functions
  const handleCreateConversation = () => {
    const defaultModel = availableModels.length > 0 ? availableModels[0] : 'llama3.2';
    const newConv = createConversation(defaultModel);
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const success = deleteConversation(id);
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== id));

      // If we deleted the current conversation, select another one or create a new one
      if (id === currentConversationId) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          handleCreateConversation();
        }
      }
    }
  };

  const handleUpdateConversation = (id: string, updates: Partial<Conversation>) => {
    const updated = updateConversation(id, updates);
    if (updated) {
      setConversations(prev =>
        prev.map(c => (c.id === id ? updated : c))
      );
    }
  };

  const handleSaveModelSettings = (model: string, settings: ModelSettingsType) => {
    if (!currentConversationId) return;

    const updated = updateConversation(currentConversationId, {
      model,
      settings,
    });

    if (updated) {
      setConversations(prev =>
        prev.map(c => (c.id === currentConversationId ? updated : c))
      );
    }
  };

  const handleConversationsImported = () => {
    // Reload conversations from localStorage after import
    const loadedConversations = getAllConversations();
    setConversations(loadedConversations);

    // If no conversation is selected or current one is gone, select the first one
    if (!currentConversationId || !loadedConversations.find(c => c.id === currentConversationId)) {
      if (loadedConversations.length > 0) {
        setCurrentConversationId(loadedConversations[0].id);
      }
    }
  };

  return (
    <div className="flex h-screen bg-background-primary">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateConversation={handleUpdateConversation}
        onConversationsImported={handleConversationsImported}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-background-secondary border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg font-semibold text-text-primary truncate">
                {currentConversation?.title || 'LLM Webview Client'}
              </h1>
              <div className="flex items-center gap-1.5 flex-shrink-0" title={isConnected ? 'Connected' : 'Disconnected'}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-text-secondary">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Demo buttons */}
              <button
                onClick={sendDemoForm}
                className="px-3 py-1.5 text-xs bg-surface text-text-secondary rounded hover:bg-surface-hover transition-colors"
              >
                Demo Form
              </button>
              <button
                onClick={sendDemoChart}
                className="px-3 py-1.5 text-xs bg-surface text-text-secondary rounded hover:bg-surface-hover transition-colors"
              >
                Demo Chart
              </button>
              <button
                onClick={sendDemoCalculator}
                className="px-3 py-1.5 text-xs bg-surface text-text-secondary rounded hover:bg-surface-hover transition-colors"
              >
                Demo Calc
              </button>

              {/* Model selector with settings button */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <select
                    value={currentModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__download__') {
                        setShowModelManager(true);
                      } else {
                        handleSaveModelSettings(value, modelSettings);
                      }
                    }}
                    className="appearance-none px-2 py-1 pr-6 text-xs text-text-secondary bg-background-tertiary rounded border border-border hover:border-border-dark focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer max-w-[140px]"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                    <option value="__download__" className="text-primary-600 font-medium">
                      ⬇ Download more...
                    </option>
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => setShowModelSettings(true)}
                  className="px-1.5 py-1.5 text-text-secondary hover:text-text-primary transition-colors"
                  title="Model Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>

              {/* MCP Server selector */}
              {availableMcpServers.length > 0 && (
                <div className="relative">
                  <select
                    value={currentMcpServer}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentConversationId) {
                        const updated = updateConversation(currentConversationId, {
                          mcpServer: value,
                        });
                        if (updated) {
                          setConversations(prev =>
                            prev.map(c => (c.id === currentConversationId ? updated : c))
                          );
                        }
                      }
                    }}
                    className="appearance-none px-2 py-1 pr-6 text-xs text-text-secondary bg-background-tertiary rounded border border-border hover:border-border-dark focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer max-w-[140px]"
                    title="Select MCP Server for this conversation"
                  >
                    <option value="">No MCP Server</option>
                    {availableMcpServers.map((server) => (
                      <option key={server} value={server}>
                        MCP: {server}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Export Summary button */}
              <button
                onClick={() => setShowSummary(true)}
                disabled={messages.length === 0}
                className="px-3 py-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Chat Summary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* MCP Info button - only show when MCP server is selected */}
              {currentMcpServer && mcpTools.length > 0 && (
                <button
                  onClick={() => setShowMcpInfo(!showMcpInfo)}
                  className={`px-3 py-2 transition-colors flex items-center gap-1.5 ${
                    showMcpInfo
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="MCP Server Information"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium hidden xl:inline">MCP Info</span>
                </button>
              )}

              {/* MCP Server Configuration button */}
              <button
                onClick={() => setShowMcpSettings(true)}
                className="px-3 py-2 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                title="MCP Server Configuration"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="text-xs font-medium hidden xl:inline">MCP</span>
              </button>

              {/* Help button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="px-3 py-2 text-text-secondary hover:text-text-primary transition-colors"
                title="MCP Developer Guide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* MCP Info Panel - Read-only information about available tools */}
        {showMcpInfo && currentMcpServer && mcpTools.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 px-4 py-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-primary-900">MCP Server: {currentMcpServer}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    Ask the AI to use these tools in your conversation
                  </div>
                </div>
                <button
                  onClick={() => setShowMcpInfo(false)}
                  className="text-text-tertiary hover:text-text-secondary"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mcpTools.filter(t => t.serverName === currentMcpServer).map(tool => (
                  <div
                    key={`${tool.serverName}-${tool.name}`}
                    className="bg-background-secondary rounded-lg border border-primary-200 px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-text-primary">{tool.name}</div>
                        <div className="text-xs text-text-secondary mt-1">{tool.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="text-xs text-blue-900">
                  <strong>💡 Tip:</strong> Simply ask the AI to perform tasks, and it will use these tools automatically.
                  For example: "Create a greeting card for me" or "Show me a data table"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MCP Webviews Overlay - Polished Design */}
        {mcpWebviews.map(webview => (
          <div
            key={webview.id}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setMcpWebviews(prev => prev.filter(w => w.id !== webview.id))}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Polished with icons and better styling */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between border-b-4 border-blue-700">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg">{webview.toolName}</div>
                    <div className="text-sm text-blue-100 flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span>{webview.serverName}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setMcpWebviews(prev => prev.filter(w => w.id !== webview.id))}
                  className="text-white hover:bg-white hover:bg-opacity-25 rounded-lg p-2 transition-all duration-200"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content - Scrollable with subtle shadow */}
              <div className="flex-1 overflow-auto bg-background-tertiary">
                <div className="p-6">
                  <WebviewRenderer
                    content={webview.webview}
                    onMessage={(data) => handleWebviewMessage(webview.id, data)}
                  />
                </div>
              </div>

              {/* Footer with helpful info */}
              <div className="bg-surface border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    webview.trustLevel === 'trusted' ? 'bg-green-500' :
                    webview.trustLevel === 'verified' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <span className="font-medium capitalize">{webview.trustLevel || 'unverified'}</span>
                </div>
                <div className="text-text-tertiary">
                  Press ESC or click outside to close
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onWebviewMessage={handleWebviewMessage}
        />

        {/* Streaming preview */}
        {streamingContent && (
          <div className="px-4 py-2 bg-primary-50 border-t border-primary-100">
            <div className="max-w-4xl mx-auto">
              <div className="text-xs text-primary-600 font-medium mb-1">Assistant is typing...</div>
              <div className="text-sm text-text-secondary">{streamingContent}</div>
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={!isConnected || isLoading}
          placeholder={
            !isConnected
              ? 'Connecting to server...'
              : isLoading
              ? 'Waiting for response...'
              : 'Type a message...'
          }
        />

        {/* Elicitation Dialog */}
        {activeElicitation && (
          <ElicitationDialog
            request={activeElicitation}
            onResponse={handleElicitationResponse}
          />
        )}

        {/* MCP Server Settings */}
        <MCPServerSettings
          isOpen={showMcpSettings}
          onClose={handleMcpSettingsClose}
        />

        {/* Model Settings */}
        <ModelSettings
          isOpen={showModelSettings}
          currentModel={currentModel}
          availableModels={availableModels}
          settings={modelSettings}
          onClose={() => setShowModelSettings(false)}
          onSave={handleSaveModelSettings}
        />

        {/* Chat Summary */}
        <ChatSummary
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          messages={messages}
        />

        {/* Model Manager */}
        <ModelManager
          isOpen={showModelManager}
          onClose={() => setShowModelManager(false)}
          onModelPulled={handleModelPulled}
          installedModels={availableModels}
        />

        {/* Help Modal */}
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      </div>
    </div>
  );
}
