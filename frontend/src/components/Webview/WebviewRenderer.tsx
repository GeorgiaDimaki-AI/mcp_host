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
  // Build the complete HTML document
  const htmlDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      // Message passing to parent window
      window.sendToHost = function(data) {
        window.parent.postMessage({
          type: 'webview-message',
          data: data
        }, '*');
      };
    </script>
  </body>
</html>`;
  }, [content.html]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
      sandbox="allow-scripts allow-forms allow-same-origin"
      className="w-full border-0"
      style={{ minHeight: '250px' }}
      title="webview"
    />
  );
}
