/**
 * Chat Component
 * Main chat interface container
 */

import { useState, useEffect, useCallback } from 'react';
import { Message, WebSocketMessage } from '../../types';
import { WebSocketService } from '../../services/websocket';
import { api } from '../../services/api';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from './ChatInput';

const wsService = new WebSocketService('ws://localhost:3000');

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentModel, setCurrentModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

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
    api.getModels()
      .then((response) => {
        const modelNames = response.models.map(m => m.name);
        setAvailableModels(modelNames);
        if (modelNames.length > 0 && !modelNames.includes(currentModel)) {
          setCurrentModel(modelNames[0]);
        }
      })
      .catch((error) => {
        console.error('Failed to load models:', error);
      });

    return () => {
      wsService.disconnect();
    };
  }, []);

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
    }
  };

  const addSystemMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addAssistantMessage = (content: string) => {
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
      };
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: messageContent || 'Rendered webview below:',
      timestamp: Date.now(),
      webview,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = useCallback((content: string) => {
    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Prepare conversation messages
    const conversationMessages = [...messages, userMessage]
      .filter(msg => msg.id !== 'system-prompt-ui') // Exclude UI-only system messages
      .map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role,
        content: msg.content,
      }));

    // Add system prompt at the beginning to teach LLM about webviews
    const systemPrompt = {
      role: 'system' as const,
      content: `You are a helpful AI assistant with the ability to render interactive HTML content.

IMPORTANT: You can display interactive webviews using this syntax:

\`\`\`webview:type
<html content here>
\`\`\`

Available webview types:
- form: For interactive forms that collect user input
- result: For displaying data, tables, or results
- html: For general HTML content

Example of a form:
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

Use webviews when it makes sense - for collecting data, showing visualizations, or creating interactive experiences. Otherwise, just respond normally with text.`,
    };

    wsService.send({
      type: 'chat',
      messages: [systemPrompt, ...conversationMessages],
      model: currentModel,
    });
  }, [messages, currentModel]);

  const handleWebviewMessage = (messageId: string, data: any) => {
    console.log('Webview message from', messageId, ':', data);
    // Handle form submissions or other webview interactions
    if (data.type === 'form-submit') {
      const formData = JSON.stringify(data.formData, null, 2);
      handleSendMessage(`Form submitted with data:\n${formData}`);
    }
  };

  // Demo functions to show webview examples
  const showDemoForm = () => {
    const demoMessage: Message = {
      id: 'demo-form-' + Date.now(),
      role: 'assistant',
      content: 'Here\'s an example interactive form:',
      timestamp: Date.now(),
      webview: {
        type: 'form',
        html: `
          <form id="demoForm">
            <label>Full Name:</label>
            <input type="text" name="name" placeholder="John Doe" required />

            <label>Email:</label>
            <input type="email" name="email" placeholder="john@example.com" required />

            <label>Favorite Color:</label>
            <select name="color">
              <option value="blue">Blue</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
            </select>

            <label>Message:</label>
            <textarea name="message" rows="3" placeholder="Your message..."></textarea>

            <button type="submit">Submit Form</button>
          </form>

          <script>
            document.getElementById('demoForm').addEventListener('submit', function(e) {
              e.preventDefault();
              const formData = {
                name: e.target.name.value,
                email: e.target.email.value,
                color: e.target.color.value,
                message: e.target.message.value
              };
              window.sendToHost({ type: 'form-submit', formData });
            });
          </script>
        `,
      },
    };
    setMessages(prev => [...prev, demoMessage]);
  };

  const showDemoChart = () => {
    const demoMessage: Message = {
      id: 'demo-chart-' + Date.now(),
      role: 'assistant',
      content: 'Here\'s a data visualization example:',
      timestamp: Date.now(),
      webview: {
        type: 'result',
        html: `
          <div style="padding: 16px;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937;">Monthly Sales Report</h3>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Month</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Sales</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Growth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">January</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$12,500</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #16a34a;">+5%</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">February</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$15,200</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #16a34a;">+22%</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">March</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$18,700</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #16a34a;">+23%</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">April</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$17,900</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #dc2626;">-4%</td>
                </tr>
              </tbody>
            </table>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px; border-radius: 8px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">Total Revenue</div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 4px;">$64,300</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 8px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">Avg Growth</div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 4px;">+11.5%</div>
              </div>
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 16px; border-radius: 8px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">Best Month</div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 4px;">March</div>
              </div>
            </div>
          </div>
        `,
      },
    };
    setMessages(prev => [...prev, demoMessage]);
  };

  const showDemoCalculator = () => {
    const demoMessage: Message = {
      id: 'demo-calc-' + Date.now(),
      role: 'assistant',
      content: 'Here\'s an interactive calculator:',
      timestamp: Date.now(),
      webview: {
        type: 'html',
        html: `
          <div style="max-width: 320px; margin: 0 auto; padding: 16px;">
            <h3 style="margin: 0 0 16px 0; text-align: center; color: #1f2937;">Simple Calculator</h3>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div>
                <label>First Number:</label>
                <input type="number" id="num1" value="10" style="width: 100%;" />
              </div>
              <div>
                <label>Second Number:</label>
                <input type="number" id="num2" value="5" style="width: 100%;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;">
              <button onclick="calculate('+')" style="padding: 12px; font-size: 18px;">+</button>
              <button onclick="calculate('-')" style="padding: 12px; font-size: 18px;">−</button>
              <button onclick="calculate('*')" style="padding: 12px; font-size: 18px;">×</button>
              <button onclick="calculate('/')" style="padding: 12px; font-size: 18px;">÷</button>
            </div>

            <div id="result" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center; color: white; font-size: 24px; font-weight: bold;">
              Result: 0
            </div>
          </div>

          <script>
            function calculate(op) {
              const num1 = parseFloat(document.getElementById('num1').value) || 0;
              const num2 = parseFloat(document.getElementById('num2').value) || 0;
              let result;

              switch(op) {
                case '+': result = num1 + num2; break;
                case '-': result = num1 - num2; break;
                case '*': result = num1 * num2; break;
                case '/': result = num2 !== 0 ? (num1 / num2).toFixed(2) : 'Error'; break;
              }

              document.getElementById('result').textContent = 'Result: ' + result;
            }
          </script>
        `,
      },
    };
    setMessages(prev => [...prev, demoMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">LLM Webview Client</h1>
            <p className="text-sm text-gray-600">
              {isConnected ? (
                <span className="text-green-600">● Connected</span>
              ) : (
                <span className="text-red-600">● Disconnected</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Demo buttons */}
            <div className="flex gap-2">
              <button
                onClick={showDemoForm}
                className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                title="Show example form"
              >
                Demo Form
              </button>
              <button
                onClick={showDemoChart}
                className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                title="Show example chart"
              >
                Demo Chart
              </button>
              <button
                onClick={showDemoCalculator}
                className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                title="Show example calculator"
              >
                Demo Calc
              </button>
            </div>

            {/* Model selector */}
            {availableModels.length > 0 && (
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
