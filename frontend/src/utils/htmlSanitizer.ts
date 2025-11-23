/**
 * HTML Sanitizer for Untrusted MCP Content
 * Uses DOMPurify for robust sanitization against XSS attacks
 */

import DOMPurify from 'dompurify';
import { TrustLevel } from '../types';

export interface SanitizeOptions {
  trustLevel: TrustLevel;
  allowForms?: boolean;
}

/**
 * Sanitize HTML based on trust level
 * - verified/trusted: Allow everything (no sanitization)
 * - unverified: Use DOMPurify to strip dangerous content
 */
export function sanitizeHTML(html: string, options: SanitizeOptions): string {
  const { trustLevel, allowForms = false } = options;

  // Verified and trusted MCPs: no sanitization needed
  if (trustLevel === 'verified' || trustLevel === 'trusted') {
    return html;
  }

  // Add hook to sanitize style attributes (remove javascript: protocol)
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('style')) {
      const style = node.getAttribute('style');
      if (style && style.toLowerCase().includes('javascript:')) {
        node.removeAttribute('style');
      }
    }
  });

  try {
    // Unverified MCPs: enforce static HTML with DOMPurify
    const config = {
      // Allow only safe display tags
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'ul', 'ol', 'li',
        'br', 'hr',
        'strong', 'em', 'b', 'i', 'u',
        'code', 'pre',
        'a', 'img',
      ],

      // Very limited attributes for styling only
      ALLOWED_ATTR: ['class', 'style', 'href', 'src', 'alt', 'title'],

      // Block all dangerous tags
      FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'applet', 'link',
                    'base', 'meta', 'style', 'form', 'input', 'button',
                    'textarea', 'select', 'option'],

      // Block all event handlers
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
                    'onfocus', 'onblur', 'onchange', 'onsubmit', 'oninput'],

      // Don't allow data attributes (can be used for XSS)
      ALLOW_DATA_ATTR: false,

      // Allowed protocols for links and images
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

      // Safer defaults
      SAFE_FOR_TEMPLATES: true,
    };

    // Additional config for forms if needed
    if (allowForms) {
      config.ALLOWED_TAGS?.push('form', 'input', 'button', 'textarea', 'select', 'option', 'label');
      config.ALLOWED_ATTR?.push('type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly');

      // Remove form tags from forbidden list
      config.FORBID_TAGS = config.FORBID_TAGS?.filter(tag =>
        !['form', 'input', 'button', 'textarea', 'select', 'option'].includes(tag)
      );
    }

    // Sanitize with DOMPurify (returns string when RETURN_DOM is false, which is default)
    // DOMPurify will remove all forbidden tags and attributes based on config
    const result = DOMPurify.sanitize(html, config) as string;

    return result;
  } finally {
    // Bug #8: Always remove hook, even if sanitization fails
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
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
