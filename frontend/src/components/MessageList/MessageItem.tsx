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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Role indicator */}
        {!isSystem && (
          <div className={`text-xs font-medium mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
            <span className={isUser ? 'text-blue-600' : 'text-gray-700'}>
              {isUser ? 'You' : 'Assistant'}
            </span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`
            rounded-lg px-4 py-3
            ${isUser
              ? 'bg-blue-500 text-white'
              : isSystem
              ? 'bg-gray-100 text-gray-700 italic'
              : 'bg-gray-100 text-gray-900'
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

        {/* Webview content */}
        {message.webview && (
          <div className="mt-3">
            <WebviewRenderer
              content={message.webview}
              onMessage={handleWebviewMessage}
            />
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
