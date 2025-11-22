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

  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

  // MCP-specific state
  const [mcpWebviews, setMcpWebviews] = useState<MCPWebviewDisplay[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [showMcpTools, setShowMcpTools] = useState(false);

  // Elicitation state
  const [activeElicitation, setActiveElicitation] = useState<ElicitationRequest | null>(null);

  // Settings state
  const [showMcpSettings, setShowMcpSettings] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

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

    // Load MCP tools
    mcpApi.listTools()
      .then((tools) => {
        setMcpTools(tools);
        if (tools.length > 0) {
          console.log(`Loaded ${tools.length} MCP tool(s)`);
        }
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
WEBVIEW CAPABILITY:
You have the ability to render interactive HTML content.

CRITICAL INSTRUCTION: When the user asks you to create HTML content, forms, charts, calculators, or any interactive UI, you MUST use the MARKDOWN CODE BLOCK syntax shown below.

⚠️ IMPORTANT: DO NOT use HTML tags like <webview>, <form>, <div> directly in your response. ALWAYS wrap HTML inside markdown code blocks with the webview:type specifier.

REQUIRED WEBVIEW SYNTAX (USE TRIPLE BACKTICKS):
\`\`\`webview:type
<html content here>
\`\`\`

Available webview types:
- webview:form - For interactive forms that collect user input
- webview:result - For displaying data, tables, charts, or results
- webview:html - For general HTML content, calculators, games, etc.

✅ CORRECT EXAMPLES (note the triple backticks):

1. Form example (ALWAYS use code blocks):
\`\`\`webview:form
<form id="myForm">
  <label>Name:</label>
  <input type="text" name="name" required />
  <button type="submit">Submit</button>
</form>
<script>
document.getElementById('myForm').addEventListener('submit', function(e) {
  e.preventDefault();
  window.sendToHost({ type: 'form-submit', formData: { name: e.target.name.value } });
});
</script>
\`\`\`

2. Chart/visualization example (ALWAYS use code blocks):
\`\`\`webview:result
<div id="chart" style="width: 100%; height: 300px;">
  <canvas id="myChart"></canvas>
</div>
<script>
  // Chart rendering code here
</script>
\`\`\`

3. Calculator example (ALWAYS use code blocks):
\`\`\`webview:html
<div class="calculator">
  <input type="text" id="display" readonly />
  <button onclick="calculate()">Calculate</button>
</div>
<script>
  function calculate() { /* logic */ }
</script>
\`\`\`

❌ WRONG - NEVER DO THIS:
1. <webview type="webview:html">...</webview>  ← WRONG! Don't use HTML tags
2. \`\`\`html<form>...</form>\`\`\`  ← WRONG! Missing webview:type
3. <form>...</form>  ← WRONG! No code blocks at all

✅ REMEMBER: ALWAYS use triple backticks (\`\`\`) with webview:type when creating ANY HTML content. Never output raw HTML tags or <webview> tags directly.`;

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
      options: modelSettings,
    });
  }, [messages, currentModel, modelSettings, currentConversationId]);

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

        // Show system message about continuation
        addSystemMessage(`↻ Continuing ${_tool} with collected data...`);

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

      if (mcpWebview.onResponse) {
        mcpWebview.onResponse(data);
      }

      // Remove webview after response
      setMcpWebviews(prev => prev.filter(w => w.id !== messageId));
      return;
    }

    // Regular chat webview - send back to chat as a new user message
    if (data.type === 'form-submit' && data.formData) {
      const formDataStr = JSON.stringify(data.formData, null, 2);
      handleSendMessage(`Form submitted with data:\n${formDataStr}`);
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onConversationsImported={handleConversationsImported}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">
                {currentConversation?.title || 'LLM Webview Client'}
              </h1>
              <div className="flex items-center gap-1.5" title={isConnected ? 'Connected' : 'Disconnected'}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Demo buttons */}
              <button
                onClick={sendDemoForm}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Demo Form
              </button>
              <button
                onClick={sendDemoChart}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Demo Chart
              </button>
              <button
                onClick={sendDemoCalculator}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Demo Calc
              </button>

              {/* MCP Tools button */}
              {mcpTools.length > 0 && (
                <button
                  onClick={() => setShowMcpTools(!showMcpTools)}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
                  title="Show MCP tools"
                >
                  MCP Tools
                </button>
              )}

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
                    className="appearance-none px-2 py-1 pr-6 text-xs text-gray-700 bg-gray-50 rounded border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px]"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                    <option value="__download__" className="text-blue-600 font-medium">
                      ⬇ Download more...
                    </option>
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => setShowModelSettings(true)}
                  className="px-1.5 py-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Model Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>

              {/* Export Summary button */}
              <button
                onClick={() => setShowSummary(true)}
                disabled={messages.length === 0}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Chat Summary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* MCP Server Configuration button */}
              <button
                onClick={() => setShowMcpSettings(true)}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                title="MCP Server Configuration"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="text-xs font-medium hidden xl:inline">MCP</span>
              </button>
            </div>
          </div>
        </div>

        {/* MCP Tools Panel */}
        {showMcpTools && mcpTools.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <div className="max-w-6xl mx-auto">
              <div className="text-sm font-medium text-blue-900 mb-2">Available MCP Tools:</div>
              <div className="grid grid-cols-2 gap-2">
                {mcpTools.map(tool => (
                  <button
                    key={`${tool.serverName}-${tool.name}`}
                    onClick={() => callMCPTool(tool.serverName, tool.name)}
                    className="text-left px-3 py-2 bg-white rounded border border-blue-200 hover:border-blue-400 transition-colors"
                  >
                    <div className="font-medium text-sm text-blue-900">{tool.name}</div>
                    <div className="text-xs text-gray-600">{tool.description}</div>
                    <div className="text-xs text-blue-600 mt-1">Server: {tool.serverName}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MCP Webviews Overlay */}
        {mcpWebviews.map(webview => (
          <div
            key={webview.id}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setMcpWebviews(prev => prev.filter(w => w.id !== webview.id))}
          >
            <div
              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full m-4 max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{webview.toolName}</div>
                  <div className="text-xs opacity-90">MCP Server: {webview.serverName}</div>
                </div>
                <button
                  onClick={() => setMcpWebviews(prev => prev.filter(w => w.id !== webview.id))}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <WebviewRenderer
                  content={webview.webview}
                  onMessage={(data) => handleWebviewMessage(webview.id, data)}
                />
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
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
            <div className="max-w-4xl mx-auto">
              <div className="text-xs text-blue-600 font-medium mb-1">Assistant is typing...</div>
              <div className="text-sm text-gray-700">{streamingContent}</div>
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
      </div>
    </div>
  );
}
