/**
 * HTML Sanitizer Tests
 * Tests for DOMPurify integration and trust-based sanitization (Phase 1 & 2)
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHTML, getSandboxAttribute, getTrustBadge } from '../utils/htmlSanitizer';

describe('htmlSanitizer', () => {
  describe('sanitizeHTML', () => {
    describe('Verified Trust Level', () => {
      it('should not sanitize HTML for verified servers', () => {
        const html = '<script>alert("test")</script><div onclick="alert()">Content</div>';
        const result = sanitizeHTML(html, { trustLevel: 'verified' });
        expect(result).toBe(html);
      });

      it('should preserve all content for verified servers', () => {
        const html = '<form><input type="text" /><button onclick="submit()">Submit</button></form>';
        const result = sanitizeHTML(html, { trustLevel: 'verified' });
        expect(result).toBe(html);
      });
    });

    describe('Trusted Trust Level', () => {
      it('should not sanitize HTML for trusted servers', () => {
        const html = '<script>console.log("trusted")</script><p>Content</p>';
        const result = sanitizeHTML(html, { trustLevel: 'trusted' });
        expect(result).toBe(html);
      });
    });

    describe('Unverified Trust Level - XSS Prevention', () => {
      it('should remove script tags', () => {
        const html = '<script>alert("XSS")</script><p>Safe content</p>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
        expect(result).toContain('Safe content');
      });

      it('should remove event handlers', () => {
        const html = '<div onclick="alert()">Click me</div>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('onclick');
        expect(result).toContain('Click me');
      });

      it('should block javascript: protocol', () => {
        const html = '<a href="javascript:alert()">Link</a>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('javascript:');
      });

      it('should remove SVG script injection', () => {
        const html = '<svg><script>alert("XSS")</script></svg>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
      });

      it('should remove iframe tags', () => {
        const html = '<iframe src="http://evil.com"></iframe><p>Content</p>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('<iframe');
        expect(result).toContain('Content');
      });

      it('should remove embed and object tags', () => {
        const html = '<embed src="evil.swf" /><object data="evil.swf"></object>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('<embed');
        expect(result).not.toContain('<object');
      });

      it('should remove style tags', () => {
        const html = '<style>body { background: url("javascript:alert()") }</style>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('<style>');
      });

      it('should allow safe HTML tags', () => {
        const html = '<div><h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul></div>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).toContain('<h1>');
        expect(result).toContain('<p>');
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>');
      });

      it('should allow safe attributes', () => {
        const html = '<div class="container" style="color: red;">Content</div>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).toContain('class="container"');
        expect(result).toContain('style=');
      });

      it('should remove data attributes', () => {
        const html = '<div data-secret="password">Content</div>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('data-secret');
        expect(result).toContain('Content');
      });
    });

    describe('Form Handling', () => {
      it('should remove forms by default for unverified', () => {
        const html = '<form><input type="text" /><button>Submit</button></form>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified', allowForms: false });
        expect(result).not.toContain('<form');
        expect(result).not.toContain('<input');
        expect(result).not.toContain('<button');
      });

      it('should allow forms when allowForms is true', () => {
        const html = '<form><input type="text" name="test" /><button>Submit</button></form>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified', allowForms: true });
        expect(result).toContain('<form');
        expect(result).toContain('<input');
        expect(result).toContain('type="text"');
        expect(result).toContain('name="test"');
      });

      it('should allow safe form attributes when allowForms is true', () => {
        const html = '<input type="text" name="username" placeholder="Enter name" required />';
        const result = sanitizeHTML(html, { trustLevel: 'unverified', allowForms: true });
        expect(result).toContain('type="text"');
        expect(result).toContain('name="username"');
        expect(result).toContain('placeholder=');
        expect(result).toContain('required');
      });
    });

    describe('Phase 1: Attack Vectors', () => {
      it('should prevent data URI XSS', () => {
        const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">Click</a>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('data:text/html');
      });

      it('should prevent style-based XSS', () => {
        const html = '<div style="background:url(\'javascript:alert(1)\')">Content</div>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('javascript:');
      });

      it('should prevent onerror attribute XSS', () => {
        const html = '<img src="x" onerror="alert(1)" />';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('onerror');
      });

      it('should prevent onload attribute XSS', () => {
        const html = '<body onload="alert(1)">Content</body>';
        const result = sanitizeHTML(html, { trustLevel: 'unverified' });
        expect(result).not.toContain('onload');
      });
    });
  });

  describe('getSandboxAttribute', () => {
    it('should return empty string for unverified', () => {
      expect(getSandboxAttribute('unverified')).toBe('');
    });

    it('should return allow-scripts allow-forms for trusted', () => {
      expect(getSandboxAttribute('trusted')).toBe('allow-scripts allow-forms');
    });

    it('should return allow-scripts allow-forms for verified', () => {
      expect(getSandboxAttribute('verified')).toBe('allow-scripts allow-forms');
    });

    it('should never include allow-same-origin (Phase 1 fix)', () => {
      expect(getSandboxAttribute('unverified')).not.toContain('allow-same-origin');
      expect(getSandboxAttribute('trusted')).not.toContain('allow-same-origin');
      expect(getSandboxAttribute('verified')).not.toContain('allow-same-origin');
    });
  });

  describe('getTrustBadge', () => {
    describe('Verified Badge', () => {
      it('should return correct badge for verified', () => {
        const badge = getTrustBadge('verified');
        expect(badge.icon).toBe('✓');
        expect(badge.label).toBe('Verified');
        expect(badge.color).toBe('text-green-700');
        expect(badge.bgColor).toBe('bg-green-100');
      });
    });

    describe('Trusted Badge', () => {
      it('should return correct badge for trusted', () => {
        const badge = getTrustBadge('trusted');
        expect(badge.icon).toBe('⚡');
        expect(badge.label).toBe('Trusted');
        expect(badge.color).toBe('text-blue-700');
        expect(badge.bgColor).toBe('bg-blue-100');
      });
    });

    describe('Unverified Badge', () => {
      it('should return correct badge for unverified', () => {
        const badge = getTrustBadge('unverified');
        expect(badge.icon).toBe('⚠️');
        expect(badge.label).toBe('Unverified');
        expect(badge.color).toBe('text-yellow-700');
        expect(badge.bgColor).toBe('bg-yellow-100');
      });
    });
  });
});
