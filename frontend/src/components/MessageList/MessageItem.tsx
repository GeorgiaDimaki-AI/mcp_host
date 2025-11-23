/**
 * MessageItem Component
 * Displays a single message in the chat
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../../types';
import { WebviewRenderer } from '../Webview/WebviewRenderer';
import { useTheme } from '../../contexts/ThemeContext';

interface MessageItemProps {
  message: Message;
  onWebviewMessage?: (messageId: string, data: any) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageItem({ message, onWebviewMessage, onRegenerate }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const handleWebviewMessage = (data: any) => {
    if (onWebviewMessage) {
      onWebviewMessage(message.id, data);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Role indicator */}
        {!isSystem && (
          <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-xs font-medium ${isUser ? 'text-blue-600' : 'text-purple-600'}`}>
              {isUser ? 'You' : 'Assistant'}
            </span>
            <div className="flex items-center gap-1">
              {/* Copy button */}
              {message.content && (
                <button
                  onClick={handleCopy}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-hover ${
                    isUser ? 'text-blue-600 hover:text-blue-700' : 'text-purple-600 hover:text-purple-700'
                  }`}
                  title="Copy message"
                >
                  {copied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
              {/* Regenerate button - only for assistant messages */}
              {isAssistant && onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-hover text-purple-600 hover:text-purple-700"
                  title="Regenerate response"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message content - only show if there's actual content */}
        {message.content && (
          <div
            className={`
              rounded-lg px-4 py-3 relative
              ${isUser
                ? 'bg-blue-500 text-white'
                : isSystem
                ? 'bg-background-tertiary text-text-secondary italic'
                : 'bg-background-tertiary text-text-primary'
              }
            `}
          >
            <div className="prose prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';

                      return !inline && language ? (
                        <SyntaxHighlighter
                          style={theme === 'dark' ? oneDark : oneLight}
                          language={language}
                          PreTag="div"
                          customStyle={{
                            margin: '0.5rem 0',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        )}

        {/* Webview content - with clear visual separation */}
        {message.webview && (
          <div className={message.content ? "mt-4" : ""}>
            {/* Webview label */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>
                  {message.webview.type === 'form' ? 'Interactive Form' :
                   message.webview.type === 'result' ? 'Result View' : 'HTML View'}
                </span>
              </div>
            </div>

            {/* Webview container with shadow and border */}
            <div className="rounded-lg overflow-hidden shadow-lg border-2 border-purple-200 bg-background-secondary">
              <WebviewRenderer
                content={message.webview}
                onMessage={handleWebviewMessage}
              />
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-text-tertiary mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
