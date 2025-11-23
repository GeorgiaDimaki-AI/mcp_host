/**
 * Sidebar Component
 * Displays conversation list with create, select, and delete actions
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  Conversation,
  exportConversations,
  importConversations,
  exportConversationAsJSON,
  exportConversationAsMarkdown
} from '../../services/conversationService';

export interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onConversationsImported?: () => void; // Callback to refresh after import
}

export function Sidebar({
  conversations,
  currentConversationId,
  isCollapsed,
  onToggleCollapse,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onUpdateConversation,
  onConversationsImported,
}: SidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deleteConfirmId === id) {
      onDeleteConversation(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleStartEdit = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
    // Focus the input after state update
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onUpdateConversation(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExport = () => {
    let url: string | null = null;
    try {
      const json = exportConversations();
      const blob = new Blob([json], { type: 'application/json' });
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export conversations');
    } finally {
      // Bug #7: Always revoke URL to prevent memory leak
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const count = importConversations(json);
        alert(`Successfully imported ${count} conversation(s)`);
        if (onConversationsImported) {
          onConversationsImported();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to import';
        alert('Import failed: ' + message);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportConversation = (conv: Conversation, format: 'json' | 'markdown', e: React.MouseEvent) => {
    e.stopPropagation();
    let url: string | null = null;
    try {
      const content = format === 'json'
        ? exportConversationAsJSON(conv.id)
        : exportConversationAsMarkdown(conv.id);

      if (!content) {
        alert('Failed to export conversation');
        return;
      }

      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/markdown'
      });
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedTitle = conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${sanitizedTitle}.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setExportMenuId(null);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export conversation');
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  };

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      // Search title
      if (conv.title.toLowerCase().includes(query)) return true;

      // Search message content
      const hasMatchingMessage = conv.messages.some(msg =>
        msg.content.toLowerCase().includes(query)
      );
      if (hasMatchingMessage) return true;

      // Search model name
      if (conv.model.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [conversations, searchQuery]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-background-secondary border-r border-border flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>

        <button
          onClick={onCreateConversation}
          className="mt-4 p-2 hover:bg-surface-hover rounded-lg transition-colors"
          title="New conversation"
          aria-label="New conversation"
        >
          <svg
            className="w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-background-secondary border-r border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Conversations</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-surface-hover rounded transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <svg
            className="w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onCreateConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-hover rounded transition-colors"
              title="Clear search"
            >
              <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-text-secondary">
            {filteredConversations.length} of {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-text-tertiary text-sm">
            No conversations yet.
            <br />
            Start a new chat!
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-text-tertiary text-sm">
            No conversations match "{searchQuery}"
            <br />
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-primary-600 hover:text-primary-700 text-xs"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`
                  group relative px-3 py-2 mx-2 mb-1 rounded-lg cursor-pointer transition-colors
                  ${
                    currentConversationId === conv.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-background-tertiary border border-transparent'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === conv.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                          onBlur={() => handleSaveEdit(conv.id)}
                          className="text-sm font-medium px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                          maxLength={50}
                        />
                        <button
                          onClick={() => handleSaveEdit(conv.id)}
                          className="p-1 hover:bg-green-100 rounded text-green-600"
                          title="Save"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/title">
                        <h3
                          className={`text-sm font-medium truncate flex-1 ${
                            currentConversationId === conv.id
                              ? 'text-primary-900'
                              : 'text-text-primary'
                          }`}
                        >
                          {conv.title}
                        </h3>
                        <button
                          onClick={(e) => handleStartEdit(conv.id, conv.title, e)}
                          className="p-1 hover:bg-surface-hover rounded opacity-0 group-hover/title:opacity-100 transition-opacity"
                          title="Edit title"
                        >
                          <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-text-tertiary">
                        {formatDate(conv.modified)}
                      </p>
                      {conv.messages.length > 0 && (
                        <>
                          <span className="text-xs text-text-tertiary">•</span>
                          <p className="text-xs text-text-tertiary">
                            {conv.messages.length} msg
                            {conv.messages.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                    </div>
                    {conv.model && (
                      <p className="text-xs text-text-tertiary mt-1 truncate">
                        {conv.model}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Export Button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportMenuId(exportMenuId === conv.id ? null : conv.id);
                        }}
                        className="flex-shrink-0 rounded hover:bg-surface-hover text-text-tertiary p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Export conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>

                      {/* Export Dropdown */}
                      {exportMenuId === conv.id && (
                        <div
                          className="absolute bottom-full right-0 mb-1 w-32 bg-background-secondary border border-border rounded-lg shadow-lg z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleExportConversation(conv, 'json', e)}
                            className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-background-tertiary rounded-t-lg transition-colors"
                          >
                            Export as JSON
                          </button>
                          <button
                            onClick={(e) => handleExportConversation(conv, 'markdown', e)}
                            className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-background-tertiary rounded-b-lg transition-colors"
                          >
                            Export as MD
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(conv.id, e)}
                      className={`
                        flex-shrink-0 rounded transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1
                        ${
                          deleteConfirmId === conv.id
                            ? 'bg-red-500 text-white px-2 py-1 opacity-100 font-medium'
                            : 'hover:bg-surface-hover text-text-tertiary p-1'
                        }
                      `}
                      title={
                        deleteConfirmId === conv.id
                          ? 'Click to confirm deletion'
                          : 'Delete conversation'
                      }
                      aria-label={
                        deleteConfirmId === conv.id
                          ? 'Confirm delete conversation'
                          : 'Delete conversation'
                      }
                    >
                      {deleteConfirmId === conv.id ? (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-xs">Delete?</span>
                        </>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Last message preview */}
                {conv.messages.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-2 truncate">
                    {conv.messages[conv.messages.length - 1].content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Export/Import */}
      <div className="p-3 border-t border-border bg-background-tertiary">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-surface-hover rounded transition-colors"
              title="Manage conversations"
              aria-label="Manage conversations"
            >
              <svg
                className="w-4 h-4 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-background-secondary border border-border rounded-lg shadow-lg z-10">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-background-tertiary rounded-t-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Conversations
                </button>
                <button
                  onClick={handleImportClick}
                  className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-background-tertiary rounded-b-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Conversations
                </button>
                <div className="px-4 py-2 border-t border-border">
                  <p className="text-xs text-text-tertiary">
                    Data is stored in your browser's localStorage
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
