/**
 * Chat Summary Component
 * Allows users to export/download/copy their chat conversation
 */

import { useState } from 'react';
import { Message } from '../../types';

interface ChatSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export function ChatSummary({ isOpen, onClose, messages }: ChatSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'markdown' | 'text'>('markdown');

  if (!isOpen) return null;

  // Generate summary content
  const generateSummary = (formatType: 'markdown' | 'text'): string => {
    const isMarkdown = formatType === 'markdown';

    let summary = '';

    // Header
    if (isMarkdown) {
      summary += `# Chat Summary\n\n`;
      summary += `**Generated**: ${new Date().toLocaleString()}\n`;
      summary += `**Total Messages**: ${messages.length}\n\n`;
      summary += `---\n\n`;
    } else {
      summary += `CHAT SUMMARY\n`;
      summary += `=${'='.repeat(50)}\n\n`;
      summary += `Generated: ${new Date().toLocaleString()}\n`;
      summary += `Total Messages: ${messages.length}\n\n`;
      summary += `${'='.repeat(50)}\n\n`;
    }

    // Messages
    messages.forEach((msg) => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : 'System';

      if (isMarkdown) {
        summary += `## ${role} (${time})\n\n`;
        summary += `${msg.content}\n\n`;

        if (msg.webview) {
          summary += `_[Webview content: ${msg.webview.type}]_\n\n`;
        }

        if (msg.mcpTool) {
          summary += `**🔧 Tool Used**: ${msg.mcpTool.serverName} → ${msg.mcpTool.toolName}\n\n`;
          if (msg.mcpTool.args) {
            summary += `**Arguments**:\n\`\`\`json\n${JSON.stringify(msg.mcpTool.args, null, 2)}\n\`\`\`\n\n`;
          }
        }

        summary += `---\n\n`;
      } else {
        summary += `[${role}] ${time}\n`;
        summary += `${msg.content}\n`;

        if (msg.webview) {
          summary += `[Webview content: ${msg.webview.type}]\n`;
        }

        if (msg.mcpTool) {
          summary += `Tool Used: ${msg.mcpTool.serverName} → ${msg.mcpTool.toolName}\n`;
          if (msg.mcpTool.args) {
            summary += `Arguments: ${JSON.stringify(msg.mcpTool.args)}\n`;
          }
        }

        summary += `\n${'-'.repeat(50)}\n\n`;
      }
    });

    // Footer
    if (isMarkdown) {
      summary += `## Summary Statistics\n\n`;
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;
      const systemMessages = messages.filter(m => m.role === 'system').length;
      const toolCalls = messages.filter(m => m.mcpTool).length;

      summary += `- **User Messages**: ${userMessages}\n`;
      summary += `- **Assistant Messages**: ${assistantMessages}\n`;
      summary += `- **System Messages**: ${systemMessages}\n`;
      summary += `- **MCP Tool Calls**: ${toolCalls}\n`;
    }

    return summary;
  };

  const summaryText = generateSummary(format);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Download as file
  const handleDownload = () => {
    const filename = `chat-summary-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'txt'}`;
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Chat Summary</h2>
            <p className="text-sm text-text-secondary mt-1">{messages.length} messages</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-text-secondary transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-6 py-3 border-b border-border bg-background-primary">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-text-secondary">Format:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  format === 'markdown'
                    ? 'bg-blue-600 text-white'
                    : 'bg-background-secondary text-text-secondary border border-border-dark hover:bg-background-primary'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setFormat('text')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  format === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-background-secondary text-text-secondary border border-border-dark hover:bg-background-primary'
                }`}
              >
                Plain Text
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-background-primary">
          <div className="bg-background-secondary rounded-lg border border-border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap text-text-primary max-h-[50vh] overflow-y-auto">
              {summaryText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background-primary">
          <div className="text-sm text-text-secondary">
            {format === 'markdown' ? '📝 Markdown format' : '📄 Plain text format'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
