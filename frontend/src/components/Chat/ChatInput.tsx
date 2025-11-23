/**
 * ChatInput Component
 * Input area for sending messages
 */

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="border-t border-border bg-background-secondary p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message... (Shift+Enter for new line)'}
          disabled={disabled}
          rows={1}
          className="
            flex-1 resize-none rounded-lg border border-border-dark px-4 py-3
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-background-tertiary disabled:cursor-not-allowed
            text-sm
          "
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="
            px-6 py-3 bg-blue-500 text-white rounded-lg font-medium
            hover:bg-blue-600 active:bg-blue-700
            disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors
            text-sm
          "
        >
          Send
        </button>
      </div>
      <div className="text-xs text-text-tertiary mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
