/**
 * HTML Sanitizer for Untrusted MCP Content
 * Strips dangerous elements to create static HTML
 */

import { TrustLevel } from '../types';

export interface SanitizeOptions {
  trustLevel: TrustLevel;
  allowForms?: boolean;
}

/**
 * Sanitize HTML based on trust level
 * - verified/trusted: Allow everything (no sanitization)
 * - unverified: Strip scripts, event handlers, and disable forms
 */
export function sanitizeHTML(html: string, options: SanitizeOptions): string {
  const { trustLevel, allowForms = false } = options;

  // Verified and trusted MCPs: no sanitization needed
  if (trustLevel === 'verified' || trustLevel === 'trusted') {
    return html;
  }

  // Unverified MCPs: enforce static HTML
  let sanitized = html;

  // 1. Remove all <script> tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove inline event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // 3. Remove javascript: protocol in links and attributes
  sanitized = sanitized.replace(/javascript:/gi, 'blocked:');

  // 4. Disable forms if not allowed
  if (!allowForms) {
    // Make all inputs readonly
    sanitized = sanitized.replace(/<input/gi, '<input readonly disabled');
    sanitized = sanitized.replace(/<textarea/gi, '<textarea readonly disabled');
    sanitized = sanitized.replace(/<select/gi, '<select disabled');

    // Disable form submission
    sanitized = sanitized.replace(/<form/gi, '<form onsubmit="return false"');

    // Disable buttons
    sanitized = sanitized.replace(/<button/gi, '<button disabled');
  }

  // 5. Remove potentially dangerous tags
  const dangerousTags = ['iframe', 'embed', 'object', 'applet', 'link'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  return sanitized;
}

/**
 * Get sandbox attribute value based on trust level
 */
export function getSandboxAttribute(trustLevel: TrustLevel): string {
  switch (trustLevel) {
    case 'verified':
    case 'trusted':
      // Allow scripts and forms for trusted MCPs
      return 'allow-scripts allow-forms';

    case 'unverified':
    default:
      // Most restrictive: no scripts, no forms
      return '';
  }
}

/**
 * Get trust badge info for UI
 */
export function getTrustBadge(trustLevel: TrustLevel): {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
} {
  switch (trustLevel) {
    case 'verified':
      return {
        icon: '✓',
        label: 'Verified',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      };

    case 'trusted':
      return {
        icon: '⚡',
        label: 'Trusted',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      };

    case 'unverified':
    default:
      return {
        icon: '⚠️',
        label: 'Unverified',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
      };
  }
}

/**
 * Get trust level description for users
 */
export function getTrustDescription(trustLevel: TrustLevel): string {
  switch (trustLevel) {
    case 'verified':
      return 'This MCP server has been officially verified. Full capabilities enabled.';

    case 'trusted':
      return 'You have marked this MCP as trusted. Interactive features are enabled.';

    case 'unverified':
    default:
      return 'This MCP is unverified. Only static HTML is displayed for security. No scripts or forms.';
  }
}
