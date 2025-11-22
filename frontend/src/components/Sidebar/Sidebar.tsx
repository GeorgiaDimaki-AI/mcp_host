/**
 * Sidebar Component
 * Displays conversation list with create, select, and delete actions
 */

import React, { useState } from 'react';
import { Conversation } from '../../services/conversationService';

export interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  isCollapsed,
  onToggleCollapse,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-5 h-5 text-gray-600"
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
          className="mt-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="New conversation"
          aria-label="New conversation"
        >
          <svg
            className="w-5 h-5 text-gray-600"
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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <svg
            className="w-5 h-5 text-gray-600"
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
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onCreateConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
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

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No conversations yet.
            <br />
            Start a new chat!
          </div>
        ) : (
          <div className="py-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`
                  group relative px-3 py-2 mx-2 mb-1 rounded-lg cursor-pointer transition-colors
                  ${
                    currentConversationId === conv.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-sm font-medium truncate ${
                        currentConversationId === conv.id
                          ? 'text-blue-900'
                          : 'text-gray-900'
                      }`}
                    >
                      {conv.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatDate(conv.modified)}
                      </p>
                      {conv.messages.length > 0 && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            {conv.messages.length} msg
                            {conv.messages.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                    </div>
                    {conv.model && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {conv.model}
                      </p>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className={`
                      flex-shrink-0 p-1 rounded transition-colors opacity-0 group-hover:opacity-100
                      ${
                        deleteConfirmId === conv.id
                          ? 'bg-red-100 text-red-600 opacity-100'
                          : 'hover:bg-gray-200 text-gray-500'
                      }
                    `}
                    title={
                      deleteConfirmId === conv.id
                        ? 'Click again to confirm'
                        : 'Delete conversation'
                    }
                    aria-label={
                      deleteConfirmId === conv.id
                        ? 'Confirm delete conversation'
                        : 'Delete conversation'
                    }
                  >
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
                  </button>
                </div>

                {/* Last message preview */}
                {conv.messages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {conv.messages[conv.messages.length - 1].content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
