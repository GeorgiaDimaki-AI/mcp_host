/**
 * MessageItem Component
 * Displays a single message in the chat
 */

import ReactMarkdown from 'react-markdown';
import { Message } from '../../types';
import { WebviewRenderer } from '../Webview/WebviewRenderer';

interface MessageItemProps {
  message: Message;
  onWebviewMessage?: (messageId: string, data: any) => void;
}

export function MessageItem({ message, onWebviewMessage }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleWebviewMessage = (data: any) => {
    if (onWebviewMessage) {
      onWebviewMessage(message.id, data);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Role indicator */}
        {!isSystem && (
          <div className={`text-xs font-medium mb-2 ${isUser ? 'text-right' : 'text-left'}`}>
            <span className={isUser ? 'text-blue-600' : 'text-purple-600'}>
              {isUser ? 'You' : 'Assistant'}
            </span>
          </div>
        )}

        {/* Message content - only show if there's actual content */}
        {message.content && (
          <div
            className={`
              rounded-lg px-4 py-3
              ${isUser
                ? 'bg-blue-500 text-white'
                : isSystem
                ? 'bg-background-tertiary text-text-secondary italic'
                : 'bg-background-tertiary text-text-primary'
              }
            `}
          >
            <div className="prose prose-sm max-w-none">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
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
