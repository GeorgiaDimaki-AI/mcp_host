/**
 * WebviewRenderer Component
 * Renders HTML content in a sandboxed iframe
 */

import { useEffect, useMemo } from 'react';
import { WebviewContent, TrustLevel } from '../../types';
import { sanitizeHTML, getSandboxAttribute, getTrustBadge } from '../../utils/htmlSanitizer';

interface WebviewRendererProps {
  content: WebviewContent;
  onMessage?: (data: any) => void;
}

export function WebviewRenderer({ content, onMessage }: WebviewRendererProps) {
  // Get parent origin for secure postMessage
  const parentOrigin = useMemo(() => window.location.origin, []);

  // Determine trust level (default to unverified for safety)
  const trustLevel: TrustLevel = content.trustLevel || 'unverified';

  // Get trust badge info
  const trustBadge = useMemo(() => getTrustBadge(trustLevel), [trustLevel]);

  // Sanitize HTML based on trust level
  const sanitizedHTML = useMemo(() => {
    return sanitizeHTML(content.html, { trustLevel });
  }, [content.html, trustLevel]);

  // Build the complete HTML document
  const htmlDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Content Security Policy for iframe security -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; connect-src http://localhost:*; form-action 'self';">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        padding: 16px;
        background: #ffffff;
      }
      /* Form styling */
      input, textarea, select, button {
        font-family: inherit;
        font-size: 14px;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        margin: 4px 0;
        width: 100%;
      }
      button {
        background: #0ea5e9;
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 500;
        width: auto;
      }
      button:hover {
        background: #0284c7;
      }
      label {
        display: block;
        margin: 8px 0 4px;
        font-weight: 500;
        color: #374151;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        padding: 8px;
      }
    </style>
  </head>
  <body>
    ${sanitizedHTML}
    ${trustLevel !== 'unverified' ? `
    <script>
      // Message passing to parent window with specific origin (security fix)
      const PARENT_ORIGIN = '${parentOrigin}';

      window.sendToHost = function(data) {
        // Use specific origin instead of '*' to prevent external eavesdropping
        window.parent.postMessage({
          type: 'webview-message',
          data: data
        }, PARENT_ORIGIN);
      };
    </script>
    ` : ''}
  </body>
</html>`;
  }, [sanitizedHTML, trustLevel, parentOrigin]);

  // Listen for messages from iframe with origin validation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate message origin to prevent external eavesdropping
      if (event.origin !== window.location.origin) {
        console.warn('[WebviewRenderer] Blocked message from unauthorized origin:', event.origin);
        return;
      }

      // Process valid messages
      if (event.data?.type === 'webview-message' && onMessage) {
        onMessage(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  return (
    <div className="relative">
      {/* Trust Badge */}
      {content.source === 'mcp' && (
        <div className="flex items-center justify-between mb-2 px-2 py-1 bg-gray-50 rounded-t border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {content.mcpServer && `${content.mcpServer}`}
              {content.mcpTool && ` → ${content.mcpTool}`}
            </span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${trustBadge.bgColor} ${trustBadge.color}`}>
            <span>{trustBadge.icon}</span>
            <span>{trustBadge.label}</span>
          </div>
        </div>
      )}

      {/* Webview iframe */}
      <iframe
        srcDoc={htmlDocument}
        // SECURITY: Trust-based sandbox configuration
        // - Unverified: No scripts, no forms (empty sandbox)
        // - Trusted/Verified: Scripts and forms allowed
        // - Never use 'allow-same-origin' (prevents sandbox escape)
        sandbox={getSandboxAttribute(trustLevel)}
        className="w-full border-0"
        style={{ minHeight: '250px' }}
        title="webview"
      />

      {/* Warning for unverified MCPs */}
      {trustLevel === 'unverified' && content.source === 'mcp' && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>⚠️ Security:</strong> This MCP is unverified. Only static HTML is displayed. Scripts and forms are disabled.
          {content.mcpServer && (
            <span> Go to Settings to mark <strong>{content.mcpServer}</strong> as trusted.</span>
          )}
        </div>
      )}
    </div>
  );
}
