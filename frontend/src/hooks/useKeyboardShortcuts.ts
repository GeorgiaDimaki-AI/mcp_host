/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcuts for common actions
 */

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
  onClearConversation?: () => void;
  onFocusInput?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape key - Always handle
      if (e.key === 'Escape' && handlers.onEscape) {
        e.preventDefault();
        handlers.onEscape();
        return;
      }

      // Don't handle other shortcuts when input is focused
      if (isInputFocused && e.key !== 'Escape') {
        return;
      }

      // Cmd/Ctrl + K or Cmd/Ctrl + N: New conversation
      if (isMod && (e.key === 'k' || e.key === 'n')) {
        e.preventDefault();
        handlers.onNewConversation?.();
        return;
      }

      // Cmd/Ctrl + L: Clear conversation (focus input)
      if (isMod && e.key === 'l') {
        e.preventDefault();
        handlers.onClearConversation?.();
        return;
      }

      // Cmd/Ctrl + /: Toggle sidebar
      if (isMod && e.key === '/') {
        e.preventDefault();
        handlers.onToggleSidebar?.();
        return;
      }

      // Cmd/Ctrl + I or /: Focus input
      if ((isMod && e.key === 'i') || e.key === '/') {
        e.preventDefault();
        handlers.onFocusInput?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
