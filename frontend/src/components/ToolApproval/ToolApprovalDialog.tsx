/**
 * Tool Approval Dialog Component
 * Shows approval UI when MCP tools are about to be executed
 */

import { useEffect } from 'react';

export interface ToolApprovalRequest {
  toolName: string;
  serverName: string;
  description: string;
  args: any;
  requestId: string;
}

export interface ToolApprovalDialogProps {
  request: ToolApprovalRequest;
  onResponse: (response: 'allow-once' | 'decline' | 'allow-session') => void;
}

export function ToolApprovalDialog({ request, onResponse }: ToolApprovalDialogProps) {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onResponse('decline');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResponse]);

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div className="bg-background-secondary border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Simple header bar */}
        <div className="bg-yellow-500 bg-opacity-10 border-b border-yellow-500 border-opacity-20 px-4 py-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-text-primary">
              <span className="font-semibold">{request.serverName}</span> wants to use <span className="font-semibold">{request.toolName}</span>
            </span>
          </div>
        </div>

        {/* Compact content */}
        <div className="p-4">
          <p className="text-sm text-text-secondary mb-3">{request.description}</p>

          {/* Arguments - collapsed by default if present */}
          {request.args && Object.keys(request.args).length > 0 && (
            <details className="mb-3">
              <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
                View arguments
              </summary>
              <div className="mt-2 bg-surface rounded p-2 border border-border">
                <pre className="text-xs text-text-secondary overflow-auto max-h-24">{JSON.stringify(request.args, null, 2)}</pre>
              </div>
            </details>
          )}

          {/* Simple action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onResponse('decline')}
              className="px-3 py-1.5 text-sm bg-surface text-text-secondary rounded hover:bg-surface-hover transition-colors border border-border"
            >
              Decline
            </button>
            <button
              onClick={() => onResponse('allow-once')}
              className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            >
              Allow Once
            </button>
            <button
              onClick={() => onResponse('allow-session')}
              className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Always Allow
            </button>
            <span className="text-xs text-text-tertiary ml-2">ESC to decline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
