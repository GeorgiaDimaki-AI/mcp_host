# Code Review Report - MCP Security Implementation

**Date**: November 22, 2025
**Reviewer**: Claude (Automated Code Review)
**Scope**: Frontend security implementation (Phases 1 & 2)
**Branch**: claude/llm-client-webview-ui-01DoGJpsn4DJ1gYzhsEhmiAw

---

## Executive Summary

**Overall Assessment**: 🟡 **Good with Critical Issues**

The implementation successfully addresses the primary security vulnerabilities (sandbox escape, postMessage eavesdropping) and adds a robust trust system. However, several bugs and design issues were identified that need to be addressed before production use.

### Critical Issues Found: 3
### High Priority Issues: 4
### Medium Priority Issues: 6
### Low Priority Issues: 3

---

## 🔴 Critical Issues

### CRITICAL-1: HTML Sanitizer Regex Bypass Vulnerability

**File**: `frontend/src/utils/htmlSanitizer.ts`
**Lines**: 30, 33-34, 37

**Issue**: Regular expressions for HTML sanitization can be bypassed with malformed or encoded HTML.

**Problematic Code**:
```typescript
// Line 30: Can be bypassed with uppercase/mixed case
sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

// Line 33-34: Event handlers with no quotes can bypass
sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

// Line 37: Case-sensitive, can be bypassed with JavaScript: or jAvAsCrIpT:
sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
```

**Attack Vectors**:
```html
<!-- Bypass 1: Self-XSS via data attributes -->
<div data-onclick="alert(1)">Click</div>
<script>document.querySelector('[data-onclick]').onclick = eval(div.dataset.onclick)</script>

<!-- Bypass 2: SVG script injection -->
<svg><script>alert('XSS')</script></svg>

<!-- Bypass 3: Style-based XSS -->
<div style="background:url('javascript:alert(1)')">

<!-- Bypass 4: Base64 encoded javascript -->
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">Click</a>
```

**Severity**: 🔴 **CRITICAL** - Unverified MCPs can still execute scripts

**Recommendation**: Use DOMPurify library instead of regex-based sanitization
```bash
npm install dompurify @types/dompurify
```

**Fix**:
```typescript
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string, options: SanitizeOptions): string {
  const { trustLevel } = options;

  if (trustLevel === 'verified' || trustLevel === 'trusted') {
    return html;
  }

  // Use DOMPurify for robust sanitization
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'table', 'tr', 'td', 'th',
                   'ul', 'ol', 'li', 'br', 'hr', 'strong', 'em', 'code', 'pre'],
    ALLOWED_ATTR: ['class', 'id', 'style'], // Very limited attributes
    FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'applet', 'link', 'style'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
    ALLOW_DATA_ATTR: false,
  });
}
```

---

### CRITICAL-2: Race Condition in Trust Level Loading

**File**: `frontend/src/components/Webview/WebviewRenderer.tsx`
**Line**: 20

**Issue**: Trust level defaults to 'unverified', but MCP webview content might not have trust level set yet, causing all content to be sanitized initially even if it should be trusted.

**Problematic Code**:
```typescript
const trustLevel: TrustLevel = content.trustLevel || 'unverified';
```

**Problem Flow**:
```
1. MCP sends webview → content.trustLevel = undefined
2. Component renders with 'unverified' → HTML sanitized
3. Backend loads config → adds trust level
4. Re-render with correct trust level → HTML rendered properly
```

**Result**: Trusted MCPs briefly show sanitized (broken) content, then flash to correct content.

**Severity**: 🔴 **CRITICAL** - Poor UX, can break functionality

**Recommendation**: Load MCP server configurations before rendering webviews

**Fix**: Pass trust level from Chat component based on server configuration
```typescript
// In Chat.tsx - when receiving MCP webview
const mcpConfig = await loadMCPServerConfig(webview.mcpServer);
const webviewContent = {
  ...webview,
  trustLevel: mcpConfig.trustLevel || 'unverified'
};
```

---

### CRITICAL-3: Missing Trust Level Propagation from Backend

**File**: Backend MCP service
**File**: `frontend/src/components/Chat/Chat.tsx`

**Issue**: When MCP server sends webview content, the trust level is not included in the response. Frontend has no way to know if an MCP is trusted/verified.

**Problem**:
- Backend loads `mcp-config.json` with trust levels
- MCP server sends webview HTML
- Frontend receives HTML but NO trust level info
- Defaults to 'unverified' even if server is trusted

**Severity**: 🔴 **CRITICAL** - Trust system doesn't actually work

**Recommendation**: Backend must include server's trust level in all MCP responses

**Fix Required**:
1. Backend: Include trust level in webview responses
2. Frontend: Receive and apply trust level

**Backend Fix Needed** (in `backend/src/services/mcp.ts`):
```typescript
// When MCP tool returns webview
const serverConfig = this.getServerConfig(serverName);
const webviewData = {
  html: result.html,
  type: result.type,
  source: 'mcp',
  mcpServer: serverName,
  mcpTool: toolName,
  trustLevel: serverConfig.trustLevel || 'unverified' // ADD THIS
};
```

---

## 🟠 High Priority Issues

### HIGH-1: Form Sanitization Creates Invalid HTML

**File**: `frontend/src/utils/htmlSanitizer.ts`
**Lines**: 42-50

**Issue**: Adding attributes to existing tags creates duplicate disabled/readonly attributes

**Problematic Code**:
```typescript
sanitized = sanitized.replace(/<input/gi, '<input readonly disabled');
```

**Result**:
```html
<!-- Original -->
<input type="text" disabled>

<!-- After sanitization -->
<input readonly disabled type="text" disabled>
<!-- ^^ duplicate disabled attribute -->
```

**Impact**: Invalid HTML, can cause parsing issues in some browsers

**Severity**: 🟠 **HIGH** - Can break forms in some browsers

**Fix**:
```typescript
// Check if attribute already exists before adding
sanitized = sanitized.replace(/<input(?![^>]*\bdisabled\b)/gi, '<input disabled');
sanitized = sanitized.replace(/<input(?![^>]*\breadonly\b)/gi, match =>
  match.includes('disabled') ? match : match + ' readonly'
);
```

---

### HIGH-2: CSP Allows Unsafe Inline Scripts

**File**: `frontend/src/components/Webview/WebviewRenderer.tsx`
**Line**: 38

**Issue**: CSP policy allows `'unsafe-inline'` for scripts, which defeats the purpose of CSP

**Problematic Code**:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; ...">
```

**Why It's Bad**: `'unsafe-inline'` allows inline `<script>` tags and `onclick` handlers, which is exactly what we're trying to prevent.

**Severity**: 🟠 **HIGH** - CSP provides no protection

**Fix**: Use nonce-based CSP or remove CSP if we allow inline scripts
```typescript
// Option 1: Use nonce (best)
const nonce = generateNonce();
const csp = `script-src 'nonce-${nonce}'; style-src 'unsafe-inline'`;
// Then add nonce to allowed scripts

// Option 2: Remove CSP for trusted (acceptable)
${trustLevel !== 'unverified' ? `
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; ...">
` : `
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
`}
```

---

### HIGH-3: Memory Leak in WebviewRenderer

**File**: `frontend/src/components/Webview/WebviewRenderer.tsx`
**Lines**: 106-108

**Issue**: `window.addEventListener` for message events, but cleanup may not always execute

**Problematic Code**:
```typescript
window.addEventListener('message', handleMessage);
return () => window.removeEventListener('message', handleMessage);
```

**Problem**: If `onMessage` prop changes frequently, new listeners are added but old ones may not be removed due to closure issues.

**Severity**: 🟠 **HIGH** - Memory leak, multiple handlers firing

**Fix**: Use `useCallback` for stable reference
```typescript
const handleMessage = useCallback((event: MessageEvent) => {
  if (event.origin !== window.location.origin) {
    console.warn('[WebviewRenderer] Blocked message from unauthorized origin:', event.origin);
    return;
  }

  if (event.data?.type === 'webview-message' && onMessage) {
    onMessage(event.data.data);
  }
}, [onMessage]); // Depends on onMessage

useEffect(() => {
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, [handleMessage]); // Re-run when handleMessage changes
```

---

### HIGH-4: Trust Badge Display Error for Non-MCP Content

**File**: `frontend/src/components/Webview/WebviewRenderer.tsx`
**Lines**: 113-126

**Issue**: Trust badge is only shown for `source === 'mcp'`, but trust badge component uses `trustBadge` which is calculated for all content

**Problematic Code**:
```typescript
const trustBadge = useMemo(() => getTrustBadge(trustLevel), [trustLevel]);
// ^^^ Calculated for all content

{content.source === 'mcp' && (  // But only used for MCP
  <div ...>
    <span>{trustBadge.icon}</span>
  </div>
)}
```

**Impact**: Unnecessary computation for non-MCP content

**Severity**: 🟠 **HIGH** - Performance issue

**Fix**:
```typescript
const trustBadge = useMemo(() => {
  if (content.source !== 'mcp') return null;
  return getTrustBadge(trustLevel);
}, [trustLevel, content.source]);
```

---

## 🟡 Medium Priority Issues

### MEDIUM-1: Missing Input Validation in ElicitationDialog

**File**: `frontend/src/components/Elicitation/ElicitationDialog.tsx`
**Lines**: 200+

**Issue**: Form validation only checks `required` attribute, doesn't validate data types or formats

**Example**:
```typescript
// No validation for:
// - Email format
// - Number ranges
// - String patterns
// - Enum values
```

**Severity**: 🟡 **MEDIUM** - Can send invalid data to MCP servers

**Fix**: Add proper JSON Schema validation
```typescript
import Ajv from 'ajv';

const validateFormData = (data: any, schema: any): string | null => {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  if (!validate(data)) {
    return validate.errors?.[0]?.message || 'Validation failed';
  }

  return null;
};
```

---

### MEDIUM-2: Hardcoded Backend URL

**File**: `frontend/src/components/Settings/MCPServerSettings.tsx`
**Line**: 32

**Issue**: Backend URL is hardcoded
```typescript
const response = await fetch('http://localhost:3001/api/mcp/config');
```

**Impact**: Won't work in production or different environments

**Severity**: 🟡 **MEDIUM** - Environment-specific issue

**Fix**: Use environment variable
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const response = await fetch(`${BACKEND_URL}/api/mcp/config`);
```

---

### MEDIUM-3: No Error Boundaries

**Files**: All React components

**Issue**: No error boundaries to catch rendering errors

**Impact**: Single error can crash entire app

**Severity**: 🟡 **MEDIUM** - Poor error handling

**Fix**: Add ErrorBoundary components
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    console.error('Error caught:', error, info);
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
```

---

### MEDIUM-4: URL Parsing Can Throw Exceptions

**File**: `frontend/src/components/Elicitation/ElicitationDialog.tsx`
**Lines**: 85-86

**Issue**: `new URL()` can throw if URL is malformed

**Problematic Code**:
```typescript
<span>{new URL(request.url).hostname}</span>
```

**Impact**: Component crashes if MCP sends invalid URL

**Severity**: 🟡 **MEDIUM** - Can crash dialog

**Fix**:
```typescript
const parseURL = (url: string | undefined) => {
  if (!url) return { hostname: '', pathname: '', search: '' };
  try {
    const parsed = new URL(url);
    return {
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search
    };
  } catch {
    return { hostname: 'Invalid URL', pathname: '', search: '' };
  }
};

const urlParts = parseURL(request.url);
```

---

### MEDIUM-5: Missing ARIA Labels

**Files**: All UI components

**Issue**: No ARIA labels for accessibility

**Severity**: 🟡 **MEDIUM** - Accessibility issue

**Fix**: Add ARIA attributes
```typescript
<button aria-label="Close settings dialog" onClick={onClose}>
  <svg aria-hidden="true">...</svg>
</button>
```

---

### MEDIUM-6: No Request Timeout in Settings

**File**: `frontend/src/components/Settings/MCPServerSettings.tsx`
**Lines**: 32, 53

**Issue**: fetch() requests have no timeout

**Impact**: UI hangs if backend is down

**Severity**: 🟡 **MEDIUM** - Poor UX

**Fix**:
```typescript
const fetchWithTimeout = async (url: string, options: any, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
```

---

## 🔵 Low Priority Issues

### LOW-1: Console Warnings in Production

**Issue**: `console.warn()` statements in production code

**Fix**: Use proper logging library or remove in production builds

---

### LOW-2: Magic Strings

**Issue**: Repeated string literals like `'unverified'`, `'trusted'`, `'verified'`

**Fix**: Use constants
```typescript
export const TRUST_LEVELS = {
  VERIFIED: 'verified',
  TRUSTED: 'trusted',
  UNVERIFIED: 'unverified',
} as const;
```

---

### LOW-3: Missing TypeScript Strict Mode

**Issue**: Some `any` types used

**Fix**: Enable strict mode and fix type issues

---

## Code Quality Assessment

### Security: 🟡 7/10
- ✅ Sandbox escape prevented
- ✅ postMessage origin validated
- ✅ Trust system implemented
- ⚠️ HTML sanitization has bypass vulnerabilities
- ⚠️ Trust level propagation broken
- ❌ CSP allows unsafe-inline

### Correctness: 🟡 6/10
- ✅ Core functionality works
- ⚠️ Trust system doesn't propagate from backend
- ⚠️ Race conditions in trust level loading
- ⚠️ Invalid HTML generation in sanitizer

### Performance: 🟢 8/10
- ✅ Efficient rendering
- ✅ Proper memoization (mostly)
- ⚠️ Memory leak potential in event listeners
- ⚠️ Unnecessary computations for non-MCP content

### Maintainability: 🟢 8/10
- ✅ Well-organized code
- ✅ Good comments
- ✅ Clear separation of concerns
- ⚠️ Some magic strings
- ⚠️ Missing error boundaries

### Testing: 🔴 3/10
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ✅ Manual testing performed

---

## Recommendations

### Immediate Actions Required (Before Production):

1. **Fix CRITICAL-1**: Replace regex sanitizer with DOMPurify
2. **Fix CRITICAL-2**: Implement proper trust level loading
3. **Fix CRITICAL-3**: Add trust level propagation from backend
4. **Fix HIGH-1**: Fix HTML attribute duplication
5. **Fix HIGH-2**: Fix or remove CSP
6. **Fix HIGH-3**: Fix memory leak in message listeners

### Before Next Phase:

1. Add comprehensive unit tests
2. Add integration tests
3. Implement error boundaries
4. Add proper error handling
5. Use environment variables for URLs
6. Add TypeScript strict mode

### Nice to Have:

1. Add accessibility improvements
2. Refactor magic strings to constants
3. Add request timeouts
4. Remove console.log statements

---

## Testing Plan

### Unit Tests Needed:

```typescript
// htmlSanitizer.test.ts
describe('HTML Sanitization', () => {
  test('should block SVG script injection');
  test('should block data: URI XSS');
  test('should block style-based XSS');
  test('should not create duplicate attributes');
});

// WebviewRenderer.test.ts
describe('Trust Level', () => {
  test('should load trust level from config');
  test('should not flash sanitized content for trusted MCPs');
});
```

### Integration Tests Needed:

```typescript
describe('MCP Webview Flow', () => {
  test('should render unverified MCP as static HTML');
  test('should render trusted MCP with scripts');
  test('should show correct trust badge');
});
```

---

## Conclusion

The implementation successfully addresses the primary security goals but has several critical bugs that must be fixed:

1. **HTML sanitizer is bypassable** - Must use DOMPurify
2. **Trust levels don't propagate from backend** - System doesn't work
3. **Race conditions in loading** - Poor UX

**Recommendation**: Fix critical issues before proceeding to Phase 3.

**Estimated Fix Time**: 4-6 hours

---

**Report Generated**: 2025-11-22
**Next Review**: After critical fixes implemented
