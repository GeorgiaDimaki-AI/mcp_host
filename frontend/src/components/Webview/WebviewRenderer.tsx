/**
 * WebviewRenderer Component
 * Renders HTML content in a sandboxed iframe
 */

import { useEffect, useMemo } from 'react';
import { WebviewContent } from '../../types';

interface WebviewRendererProps {
  content: WebviewContent;
  onMessage?: (data: any) => void;
}

export function WebviewRenderer({ content, onMessage }: WebviewRendererProps) {
  // Get parent origin for secure postMessage
  const parentOrigin = useMemo(() => window.location.origin, []);

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
    ${content.html}
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
  </body>
</html>`;
  }, [content.html, parentOrigin]);

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
    <iframe
      srcDoc={htmlDocument}
      // SECURITY: Removed 'allow-same-origin' to prevent sandbox escape
      // See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
      sandbox="allow-scripts allow-forms"
      className="w-full border-0"
      style={{ minHeight: '250px' }}
      title="webview"
    />
  );
}
