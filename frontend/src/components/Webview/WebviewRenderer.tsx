/**
 * WebviewRenderer Component
 * Renders HTML content in a sandboxed iframe
 */

import { useEffect, useRef, useState } from 'react';
import { WebviewContent } from '../../types';

interface WebviewRendererProps {
  content: WebviewContent;
  onMessage?: (data: any) => void;
}

export function WebviewRenderer({ content, onMessage }: WebviewRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      // Create a sandboxed HTML document
      const doc = iframe.contentDocument;
      if (!doc) {
        setError('Unable to access iframe document');
        return;
      }

      // Build the HTML with a wrapper for styling
      const html = `
        <!DOCTYPE html>
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
                padding: 12px;
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
              }
              button {
                background: #0ea5e9;
                color: white;
                border: none;
                cursor: pointer;
                font-weight: 500;
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
        </html>
      `;

      doc.open();
      doc.write(html);
      doc.close();

      setError(null);
    } catch (err) {
      console.error('Error rendering webview:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [content]);

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

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <strong>Error rendering webview:</strong> {error}
      </div>
    );
  }

  return (
    <div className="webview-container border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span className="text-xs text-gray-600 font-medium">
            {content.type === 'form' ? 'Interactive Form' :
             content.type === 'result' ? 'Result' : 'HTML View'}
          </span>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-forms"
        className="w-full h-64 border-0"
        title="webview"
      />
    </div>
  );
}
