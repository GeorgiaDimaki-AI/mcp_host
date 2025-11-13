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

    // Send to WebSocket
    const conversationMessages = [...messages, userMessage].map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role,
      content: msg.content,
    }));

    wsService.send({
      type: 'chat',
      messages: conversationMessages,
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
