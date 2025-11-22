/**
 * Webview Renderer Tests
 * Tests for webview rendering with Phase 3 direct backend communication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WebviewRenderer } from '../components/Webview/WebviewRenderer';
import { WebviewContent } from '../types';

describe('WebviewRenderer', () => {
  let mockOnMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnMessage = vi.fn();
  });

  describe('Trust Badge Display', () => {
    it('should show verified badge for verified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test content</p>',
        source: 'mcp',
        mcpServer: 'test-server',
        mcpTool: 'test-tool',
        trustLevel: 'verified',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('test-server → test-tool')).toBeInTheDocument();
    });

    it('should show trusted badge for trusted MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test content</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.getByText('Trusted')).toBeInTheDocument();
    });

    it('should show unverified badge for unverified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test content</p>',
        source: 'mcp',
        mcpServer: 'unknown-server',
        trustLevel: 'unverified',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.getByText('Unverified')).toBeInTheDocument();
    });

    it('should not show badge for non-MCP content', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Chat content</p>',
        source: 'chat',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('Trusted')).not.toBeInTheDocument();
      expect(screen.queryByText('Unverified')).not.toBeInTheDocument();
    });
  });

  describe('Security Warning', () => {
    it('should show security warning for unverified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'unverified-server',
        trustLevel: 'unverified',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.getByText(/This MCP is unverified/)).toBeInTheDocument();
      expect(screen.getByText(/Only static HTML is displayed/)).toBeInTheDocument();
    });

    it('should not show warning for verified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'verified-server',
        trustLevel: 'verified',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.queryByText(/This MCP is unverified/)).not.toBeInTheDocument();
    });

    it('should not show warning for trusted MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
      };

      render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      expect(screen.queryByText(/This MCP is unverified/)).not.toBeInTheDocument();
    });
  });

  describe('HTML Sanitization', () => {
    it('should sanitize HTML for unverified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<script>alert("xss")</script><p>Safe content</p>',
        source: 'mcp',
        mcpServer: 'unverified-server',
        trustLevel: 'unverified',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();

      // Check that iframe has proper sandbox attribute (no scripts for unverified)
      expect(iframe?.getAttribute('sandbox')).toBe('');
    });

    it('should allow scripts for trusted MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<script>console.log("allowed")</script><p>Content</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-forms');
    });

    it('should allow scripts for verified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<script>console.log("verified")</script>',
        source: 'mcp',
        mcpServer: 'verified-server',
        trustLevel: 'verified',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-forms');
    });
  });

  describe('Phase 1: Sandbox Security', () => {
    it('should never include allow-same-origin (prevent sandbox escape)', () => {
      const trustLevels: Array<'verified' | 'trusted' | 'unverified'> = [
        'verified',
        'trusted',
        'unverified',
      ];

      trustLevels.forEach((trustLevel) => {
        const content: WebviewContent = {
          type: 'html',
          html: '<p>Test</p>',
          source: 'mcp',
          mcpServer: 'test-server',
          trustLevel,
        };

        const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);
        const iframe = container.querySelector('iframe');

        expect(iframe?.getAttribute('sandbox')).not.toContain('allow-same-origin');
      });
    });
  });

  describe('Phase 3: Direct Backend Communication', () => {
    it('should inject sendToBackend function for trusted MCP with requestId', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
        metadata: {
          requestId: 'test-request-123',
        },
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('window.sendToBackend');
      expect(srcDoc).toContain('test-request-123');
      expect(srcDoc).toContain('/api/mcp/elicitation-data');
    });

    it('should inject sendToHost function for trusted MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('window.sendToHost');
      expect(srcDoc).toContain('postMessage');
    });

    it('should not inject scripts for unverified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'unverified-server',
        trustLevel: 'unverified',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).not.toContain('window.sendToBackend');
      expect(srcDoc).not.toContain('window.sendToHost');
    });

    it('should inject BACKEND_URL constant', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
        metadata: {
          requestId: 'req-456',
        },
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('const BACKEND_URL');
      expect(srcDoc).toContain(':3000');
    });

    it('should inject REQUEST_ID constant when metadata provided', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'verified-server',
        trustLevel: 'verified',
        metadata: {
          requestId: 'metadata-request-789',
        },
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('const REQUEST_ID');
      expect(srcDoc).toContain('metadata-request-789');
    });
  });

  describe('Phase 2: CSP Configuration', () => {
    it('should have restrictive CSP for unverified MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'unverified-server',
        trustLevel: 'unverified',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('Content-Security-Policy');
      expect(srcDoc).toContain("default-src 'none'");
      expect(srcDoc).not.toContain("script-src 'unsafe-inline'");
    });

    it('should have permissive CSP for trusted MCP', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'mcp',
        mcpServer: 'trusted-server',
        trustLevel: 'trusted',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcDoc');

      expect(srcDoc).toContain('Content-Security-Policy');
      expect(srcDoc).toContain("script-src 'unsafe-inline'");
      expect(srcDoc).toContain("connect-src http://localhost:*");
    });
  });

  describe('Iframe Rendering', () => {
    it('should render iframe with srcDoc', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test content</p>',
        source: 'chat',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute('srcDoc')).toContain('Test content');
    });

    it('should have proper iframe styling', () => {
      const content: WebviewContent = {
        type: 'html',
        html: '<p>Test</p>',
        source: 'chat',
      };

      const { container } = render(<WebviewRenderer content={content} onMessage={mockOnMessage} />);

      const iframe = container.querySelector('iframe');
      expect(iframe?.className).toContain('w-full');
      expect(iframe?.className).toContain('border-0');
      expect(iframe?.style.minHeight).toBe('250px');
    });
  });
});
