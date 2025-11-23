/**
 * Conversation Service
 * Manages conversation persistence using localStorage
 */

import { Message } from '../types';
import { generateTitle as generateTitleFromMessage } from '../utils/titleGenerator';

export interface ModelSettings {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  systemPrompt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created: number;
  modified: number;
  messages: Message[];
  model: string;
  settings: ModelSettings;
  mcpServer?: string; // Selected MCP server for this conversation
}

const STORAGE_KEY = 'mcp_conversations';

/**
 * Generate a title from messages using intelligent title generation
 */
function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const existingTitles = getAllConversations().map(c => c.title);
  return generateTitleFromMessage(firstUserMessage?.content, existingTitles);
}

/**
 * Get all conversations from localStorage
 */
export function getAllConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const conversations = JSON.parse(stored) as Conversation[];
    // Sort by modified date descending (most recent first)
    return conversations.sort((a, b) => b.modified - a.modified);
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Get a specific conversation by ID
 */
export function getConversation(id: string): Conversation | null {
  const conversations = getAllConversations();
  return conversations.find((c) => c.id === id) || null;
}

/**
 * Create a new conversation
 */
export function createConversation(
  model: string = 'llama3.2',
  settings: ModelSettings = {}
): Conversation {
  const now = Date.now();
  const conversation: Conversation = {
    id: `conv_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: 'New Conversation',
    created: now,
    modified: now,
    messages: [],
    model,
    settings,
  };

  const conversations = getAllConversations();
  conversations.push(conversation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));

  return conversation;
}

/**
 * Update an existing conversation
 */
export function updateConversation(
  id: string,
  updates: Partial<Omit<Conversation, 'id' | 'created'>>
): Conversation | null {
  const conversations = getAllConversations();
  const index = conversations.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  const conversation = conversations[index];
  const updated: Conversation = {
    ...conversation,
    ...updates,
    id: conversation.id, // Ensure id doesn't change
    created: conversation.created, // Ensure created doesn't change
    modified: Date.now(),
  };

  // Auto-generate title if messages were updated and title is still default
  if (
    updates.messages &&
    updates.messages.length > 0 &&
    (conversation.title === 'New Conversation' || !conversation.title)
  ) {
    updated.title = generateTitle(updates.messages);
  }

  conversations[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));

  return updated;
}

/**
 * Delete a conversation
 */
export function deleteConversation(id: string): boolean {
  const conversations = getAllConversations();
  const filtered = conversations.filter((c) => c.id !== id);

  if (filtered.length === conversations.length) {
    return false; // Nothing was deleted
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Delete all conversations
 */
export function deleteAllConversations(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export conversations as JSON
 */
export function exportConversations(): string {
  const conversations = getAllConversations();
  return JSON.stringify(conversations, null, 2);
}

/**
 * Import conversations from JSON
 */
export function importConversations(json: string): number {
  try {
    const imported = JSON.parse(json) as Conversation[];
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array of conversations');
    }

    const existing = getAllConversations();
    const merged = [...existing, ...imported];

    // Remove duplicates by ID, keeping the newest
    const uniqueMap = new Map<string, Conversation>();
    merged.forEach((conv) => {
      const existing = uniqueMap.get(conv.id);
      if (!existing || conv.modified > existing.modified) {
        uniqueMap.set(conv.id, conv);
      }
    });

    const unique = Array.from(uniqueMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));

    return imported.length;
  } catch (error) {
    console.error('Failed to import conversations:', error);
    throw new Error('Failed to import conversations: ' + (error as Error).message);
  }
}
