/**
 * WebviewRenderer Component
 * Renders HTML content in a sandboxed iframe
 */

import { useEffect, useMemo, useRef } from 'react';
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

  // Get CSP based on trust level
  const cspPolicy = useMemo(() => {
    const basePolicy = "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:;";

    if (trustLevel === 'unverified') {
      // Unverified: No scripts, no forms, no network connections
      return basePolicy;
    } else {
      // Trusted/Verified: Allow inline scripts (needed for sendToHost) and forms
      return basePolicy + " script-src 'unsafe-inline'; connect-src http://localhost:*; form-action 'self';";
    }
  }, [trustLevel]);

  // Build the complete HTML document
  const htmlDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Content Security Policy for iframe security -->
    <meta http-equiv="Content-Security-Policy" content="${cspPolicy}">
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
      const BACKEND_URL = '${window.location.protocol}//${window.location.hostname}:3000';
      const REQUEST_ID = '${content.metadata?.requestId || ''}';

      // Phase 2: Parent window messaging (for non-sensitive UI updates)
      window.sendToHost = function(data) {
        // Use specific origin instead of '*' to prevent external eavesdropping
        window.parent.postMessage({
          type: 'webview-message',
          data: data
        }, PARENT_ORIGIN);
      };

      // Phase 3: Direct backend submission (for sensitive data)
      // Bypasses parent window, DevTools, and browser extensions
      window.sendToBackend = async function(data) {
        if (!REQUEST_ID) {
          console.error('No request ID available for backend submission');
          return { success: false, error: 'No request ID' };
        }

        try {
          const response = await fetch(BACKEND_URL + '/api/mcp/elicitation-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: REQUEST_ID,
              action: 'accept',
              content: data
            })
          });

          const result = await response.json();

          if (response.ok) {
            // Show success message
            document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><p style="color: #10b981; font-size: 16px; font-weight: 500;">✓ Submitted securely!</p><p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your data was sent directly to the backend.</p></div>';
            return { success: true, data: result };
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (error) {
          console.error('Submission error:', error);
          document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><p style="color: #ef4444; font-size: 16px; font-weight: 500;">✗ Submission error</p><p style="color: #6b7280; font-size: 14px; margin-top: 8px;">' + (error instanceof Error ? error.message : 'Unknown error') + '</p></div>';
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      };
    </script>
    ` : ''}
  </body>
</html>`;
  }, [sanitizedHTML, trustLevel, parentOrigin, cspPolicy, content.metadata]);

  // Store onMessage callback in a ref to avoid re-registering listener
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Listen for messages from iframe with origin validation
  // Using ref to avoid memory leak from frequent listener re-registration
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate message origin to prevent external eavesdropping
      if (event.origin !== window.location.origin) {
        console.warn('[WebviewRenderer] Blocked message from unauthorized origin:', event.origin);
        return;
      }

      // Process valid messages
      if (event.data?.type === 'webview-message' && onMessageRef.current) {
        onMessageRef.current(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Empty deps - listener registered once and uses ref for latest callback

  return (
    <div className="relative">
      {/* Webview container with badge */}
      <div className="border border-border rounded-lg">
        {/* Trust Badge */}
        {content.source === 'mcp' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-background-primary border-b border-border rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
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

        {/* LLM-generated content badge (different color) */}
        {content.source === 'chat' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border-b border-indigo-200 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-700 font-medium">
                Generated by {content.mcpServer || 'LLM'}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              <span>🤖</span>
              <span>LLM Content</span>
            </div>
          </div>
        )}

        {/* Webview iframe with scrollable container */}
        <div className="rounded-b-lg overflow-auto bg-background-secondary" style={{ maxHeight: '600px' }}>
          <iframe
            srcDoc={htmlDocument}
            // SECURITY: Trust-based sandbox configuration
            // - Unverified: No scripts, no forms (empty sandbox)
            // - Trusted/Verified: Scripts and forms allowed
            // - Never use 'allow-same-origin' (prevents sandbox escape)
            sandbox={getSandboxAttribute(trustLevel)}
            className="w-full border-0 bg-background-secondary"
            style={{ minHeight: '300px', height: '500px' }}
            title="webview"
          />
        </div>
      </div>

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
