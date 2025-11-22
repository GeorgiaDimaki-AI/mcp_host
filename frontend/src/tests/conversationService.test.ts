/**
 * Conversation Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  deleteAllConversations,
  exportConversations,
  importConversations,
  Conversation,
} from '../services/conversationService';
import { Message } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ConversationService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation with default values', () => {
      const conv = createConversation();

      expect(conv.id).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(conv.title).toBe('New Conversation');
      expect(conv.messages).toEqual([]);
      expect(conv.model).toBe('llama3.2');
      expect(conv.settings).toEqual({});
      expect(conv.created).toBeGreaterThan(0);
      expect(conv.modified).toBeGreaterThan(0);
      expect(conv.created).toBe(conv.modified);
    });

    it('should create a conversation with custom model', () => {
      const conv = createConversation('gpt-4');

      expect(conv.model).toBe('gpt-4');
    });

    it('should create a conversation with custom settings', () => {
      const settings = { temperature: 0.7, top_p: 0.9 };
      const conv = createConversation('llama3.2', settings);

      expect(conv.settings).toEqual(settings);
    });

    it('should store the conversation in localStorage', () => {
      const conv = createConversation();
      const stored = getAllConversations();

      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(conv.id);
    });

    it('should create multiple conversations', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();

      const stored = getAllConversations();
      expect(stored).toHaveLength(2);
      expect(stored.map((c) => c.id)).toContain(conv1.id);
      expect(stored.map((c) => c.id)).toContain(conv2.id);
    });
  });

  describe('getAllConversations', () => {
    it('should return empty array when no conversations exist', () => {
      const conversations = getAllConversations();
      expect(conversations).toEqual([]);
    });

    it('should return all conversations sorted by modified date', () => {
      const conv1 = createConversation();

      // Wait a bit to ensure different timestamps
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      const conv2 = createConversation();

      vi.useRealTimers();

      const conversations = getAllConversations();
      expect(conversations).toHaveLength(2);
      // Most recent first
      expect(conversations[0].id).toBe(conv2.id);
      expect(conversations[1].id).toBe(conv1.id);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('mcp_conversations', 'invalid json');

      const conversations = getAllConversations();
      expect(conversations).toEqual([]);
    });
  });

  describe('getConversation', () => {
    it('should return null for non-existent conversation', () => {
      const conv = getConversation('non-existent-id');
      expect(conv).toBeNull();
    });

    it('should return the correct conversation by ID', () => {
      const created = createConversation();
      const retrieved = getConversation(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('updateConversation', () => {
    it('should return null for non-existent conversation', () => {
      const result = updateConversation('non-existent-id', { model: 'gpt-4' });
      expect(result).toBeNull();
    });

    it('should update conversation model', () => {
      const conv = createConversation('llama3.2');
      const updated = updateConversation(conv.id, { model: 'gpt-4' });

      expect(updated).not.toBeNull();
      expect(updated?.model).toBe('gpt-4');
    });

    it('should update conversation settings', () => {
      const conv = createConversation();
      const newSettings = { temperature: 0.8, top_k: 40 };
      const updated = updateConversation(conv.id, { settings: newSettings });

      expect(updated?.settings).toEqual(newSettings);
    });

    it('should update modified timestamp', () => {
      const conv = createConversation();
      const originalModified = conv.modified;

      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      const updated = updateConversation(conv.id, { model: 'gpt-4' });

      vi.useRealTimers();

      expect(updated?.modified).toBeGreaterThan(originalModified);
    });

    it('should not change id or created timestamp', () => {
      const conv = createConversation();
      const originalId = conv.id;
      const originalCreated = conv.created;

      const updated = updateConversation(conv.id, {
        model: 'gpt-4',
        title: 'Updated Title'
      });

      expect(updated?.id).toBe(originalId);
      expect(updated?.created).toBe(originalCreated);
    });

    it('should auto-generate title from first user message', () => {
      const conv = createConversation();

      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: Date.now(),
        },
      ];

      const updated = updateConversation(conv.id, { messages });

      expect(updated?.title).toBe('Hello, how are you?');
    });

    it('should truncate long titles', () => {
      const conv = createConversation();

      const longMessage = 'A'.repeat(60);
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: longMessage,
          timestamp: Date.now(),
        },
      ];

      const updated = updateConversation(conv.id, { messages });

      expect(updated?.title).toHaveLength(53); // 50 chars + '...'
      expect(updated?.title).toMatch(/^A{50}\.\.\.$/);
    });

    it('should not regenerate title if already set', () => {
      const conv = createConversation();

      // First update with a title
      const updated1 = updateConversation(conv.id, { title: 'Custom Title' });

      // Second update with messages
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'This should not become the title',
          timestamp: Date.now(),
        },
      ];
      const updated2 = updateConversation(conv.id, { messages });

      expect(updated2?.title).toBe('Custom Title');
    });

    it('should handle empty messages array', () => {
      const conv = createConversation();
      const updated = updateConversation(conv.id, { messages: [] });

      expect(updated?.messages).toEqual([]);
      expect(updated?.title).toBe('New Conversation');
    });

    it('should generate title from first user message, skipping system messages', () => {
      const conv = createConversation();

      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'system',
          content: 'System prompt',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'User question',
          timestamp: Date.now(),
        },
      ];

      const updated = updateConversation(conv.id, { messages });

      expect(updated?.title).toBe('User question');
    });
  });

  describe('deleteConversation', () => {
    it('should return false for non-existent conversation', () => {
      const result = deleteConversation('non-existent-id');
      expect(result).toBe(false);
    });

    it('should delete an existing conversation', () => {
      const conv = createConversation();
      const result = deleteConversation(conv.id);

      expect(result).toBe(true);
      expect(getConversation(conv.id)).toBeNull();
    });

    it('should only delete the specified conversation', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();

      deleteConversation(conv1.id);

      expect(getConversation(conv1.id)).toBeNull();
      expect(getConversation(conv2.id)).not.toBeNull();
    });
  });

  describe('deleteAllConversations', () => {
    it('should remove all conversations', () => {
      createConversation();
      createConversation();
      createConversation();

      expect(getAllConversations()).toHaveLength(3);

      deleteAllConversations();

      expect(getAllConversations()).toHaveLength(0);
    });

    it('should work when no conversations exist', () => {
      expect(() => deleteAllConversations()).not.toThrow();
      expect(getAllConversations()).toHaveLength(0);
    });
  });

  describe('exportConversations', () => {
    it('should export conversations as JSON', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();

      const exported = exportConversations();
      const parsed = JSON.parse(exported) as Conversation[];

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed.map((c) => c.id)).toContain(conv1.id);
      expect(parsed.map((c) => c.id)).toContain(conv2.id);
    });

    it('should export empty array when no conversations exist', () => {
      const exported = exportConversations();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual([]);
    });

    it('should export valid JSON', () => {
      createConversation();
      const exported = exportConversations();

      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('importConversations', () => {
    it('should import conversations from JSON', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          title: 'Imported 1',
          created: Date.now(),
          modified: Date.now(),
          messages: [],
          model: 'gpt-4',
          settings: {},
        },
        {
          id: 'conv-2',
          title: 'Imported 2',
          created: Date.now(),
          modified: Date.now(),
          messages: [],
          model: 'llama3.2',
          settings: {},
        },
      ];

      const json = JSON.stringify(conversations);
      const count = importConversations(json);

      expect(count).toBe(2);
      expect(getAllConversations()).toHaveLength(2);
    });

    it('should merge with existing conversations', () => {
      const existing = createConversation();

      const newConv: Conversation = {
        id: 'conv-imported',
        title: 'Imported',
        created: Date.now(),
        modified: Date.now(),
        messages: [],
        model: 'gpt-4',
        settings: {},
      };

      const count = importConversations(JSON.stringify([newConv]));

      expect(count).toBe(1);
      expect(getAllConversations()).toHaveLength(2);
      expect(getConversation(existing.id)).not.toBeNull();
      expect(getConversation(newConv.id)).not.toBeNull();
    });

    it('should handle duplicate IDs by keeping newest', () => {
      const oldConv = createConversation();
      const oldModified = oldConv.modified;

      vi.useFakeTimers();
      vi.advanceTimersByTime(5000);

      const newerVersion: Conversation = {
        ...oldConv,
        title: 'Updated Title',
        modified: Date.now(),
      };

      vi.useRealTimers();

      importConversations(JSON.stringify([newerVersion]));

      const stored = getConversation(oldConv.id);
      expect(stored?.title).toBe('Updated Title');
      expect(stored?.modified).toBeGreaterThan(oldModified);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => importConversations('invalid json')).toThrow();
    });

    it('should throw error for non-array input', () => {
      expect(() => importConversations('{}')).toThrow();
    });

    it('should return count of imported conversations', () => {
      const conversations = [
        createConversation(),
        createConversation(),
        createConversation(),
      ];

      const json = JSON.stringify(conversations);
      const count = importConversations(json);

      expect(count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle conversations with webview content', () => {
      const conv = createConversation();

      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Show me a chart',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Here is the chart',
          timestamp: Date.now(),
          webview: {
            type: 'html',
            html: '<div>Chart</div>',
            source: 'chat',
          },
        },
      ];

      const updated = updateConversation(conv.id, { messages });
      const retrieved = getConversation(conv.id);

      expect(retrieved?.messages[1].webview).toBeDefined();
      expect(retrieved?.messages[1].webview?.html).toBe('<div>Chart</div>');
    });

    it('should handle conversations with MCP tool metadata', () => {
      const conv = createConversation();

      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Tool response',
          timestamp: Date.now(),
          mcpTool: {
            serverName: 'test-server',
            toolName: 'test-tool',
            args: { foo: 'bar' },
          },
        },
      ];

      const updated = updateConversation(conv.id, { messages });
      const retrieved = getConversation(conv.id);

      expect(retrieved?.messages[0].mcpTool).toBeDefined();
      expect(retrieved?.messages[0].mcpTool?.serverName).toBe('test-server');
    });

    it('should handle empty string in user message for title generation', () => {
      const conv = createConversation();

      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: '   ',
          timestamp: Date.now(),
        },
      ];

      const updated = updateConversation(conv.id, { messages });

      expect(updated?.title).toBe('New Conversation');
    });
  });
});
