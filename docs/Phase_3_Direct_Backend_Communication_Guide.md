# Phase 3: Direct Backend Communication - Developer Guide

**Status**: ✅ Implemented
**Last Updated**: 2025-11-22

## Overview

Phase 3 introduces direct backend communication for MCP webviews, allowing sensitive data to bypass the parent window entirely. This prevents parent window JavaScript, DevTools, and browser extensions from intercepting sensitive user input.

## Architecture

### Before Phase 3 (postMessage flow):
```
┌─────────────┐
│ Form Data   │
└─────┬───────┘
      │
      ▼
┌─────────────────┐
│  postMessage    │ ← Parent window can see data
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│ React Component │ ← DevTools can intercept
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│  WebSocket      │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│  Backend        │
└─────────────────┘
```

### After Phase 3 (Direct submission):
```
┌─────────────┐
│ Form Data   │
└─────┬───────┘
      │
      ▼
┌─────────────────┐
│  fetch() POST   │ ← Direct to backend!
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│  Backend API    │ ← Parent window bypassed
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│  MCP Service    │
└─────────────────┘
```

## Security Benefits

| Aspect | Phase 2 (postMessage) | Phase 3 (Direct fetch) |
|--------|----------------------|------------------------|
| **Parent Window Visibility** | ✗ Can see all data | ✓ Cannot see data |
| **DevTools Interception** | ✗ Possible | ✓ Not possible |
| **Browser Extension Access** | ✗ Possible | ✓ Blocked |
| **Console Logging Risk** | ✗ High | ✓ None |
| **Network Security** | Local only | HTTP/HTTPS |

## For MCP Server Developers

### Available Functions in Webview

Every webview iframe (for trusted/verified MCPs) has access to two functions:

#### 1. `window.sendToHost(data)` - Phase 2 (Non-Sensitive Data)
Use for UI updates, progress notifications, and non-sensitive communication:

```javascript
// Good for: UI updates, status messages
window.sendToHost({
  type: 'progress',
  message: 'Processing...',
  percentage: 50
});
```

#### 2. `window.sendToBackend(data)` - Phase 3 (Sensitive Data)
Use for passwords, API keys, credentials, and any sensitive user input:

```javascript
// Good for: Credentials, API keys, sensitive forms
await window.sendToBackend({
  username: 'user@example.com',
  password: 'secret123',
  apiKey: 'sk-...'
});
```

### Example: Login Form with Direct Backend Submission

```html
<form id="loginForm">
  <label>Username:</label>
  <input type="text" name="username" required />

  <label>Password:</label>
  <input type="password" name="password" required />

  <button type="submit">Login Securely</button>
</form>

<script>
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const credentials = {
    username: formData.get('username'),
    password: formData.get('password')
  };

  // ✓ Direct backend submission - parent window never sees this data
  const result = await window.sendToBackend(credentials);

  if (result.success) {
    // Form will automatically show success message
    // You can also send UI updates to parent
    window.sendToHost({ type: 'login-success' });
  }
});
</script>
```

### Example: API Key Configuration Form

```html
<form id="apiKeyForm">
  <h3>Configure API Access</h3>

  <label>Service Name:</label>
  <input type="text" name="serviceName" required />

  <label>API Key:</label>
  <input type="password" name="apiKey" required autocomplete="off" />

  <label>Secret Key (optional):</label>
  <input type="password" name="secretKey" autocomplete="off" />

  <button type="submit">Save Securely</button>
</form>

<script>
document.getElementById('apiKeyForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const config = {
    serviceName: formData.get('serviceName'),
    apiKey: formData.get('apiKey'),
    secretKey: formData.get('secretKey') || null
  };

  // ✓ Sensitive API keys go directly to backend
  const result = await window.sendToBackend(config);

  if (!result.success) {
    // Handle error (e.g., show error message)
    document.getElementById('error').textContent = result.error;
  }
});
</script>
```

### Hybrid Approach (Recommended)

Use both methods based on data sensitivity:

```html
<form id="profileForm">
  <label>Display Name:</label>
  <input type="text" name="displayName" />

  <label>API Token:</label>
  <input type="password" name="apiToken" />

  <button type="submit">Save Profile</button>
</form>

<script>
document.getElementById('profileForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  // Non-sensitive data: use postMessage
  window.sendToHost({
    type: 'profile-update',
    displayName: formData.get('displayName')
  });

  // Sensitive data: use direct backend
  if (formData.get('apiToken')) {
    await window.sendToBackend({
      apiToken: formData.get('apiToken')
    });
  }
});
</script>
```

## Backend Implementation Details

### Endpoint: `POST /api/mcp/elicitation-data`

The backend provides a secure endpoint for direct iframe submissions:

**Request Format:**
```json
{
  "requestId": "mcp-server-name:1234567890",
  "action": "accept",
  "content": {
    "username": "user@example.com",
    "password": "secret123"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Elicitation response submitted successfully"
}
```

**Response (Error):**
```json
{
  "error": "Invalid or expired request ID"
}
```

### Security Features

1. **Request Validation**: Each request is validated against active elicitation requests
2. **One-Time Use**: Requests can only be used once (prevents replay attacks)
3. **Expiration**: Requests expire after 5 minutes
4. **Origin Validation**: CORS configured to allow only specific origins
5. **Request Tracking**: All requests are tracked with timestamps

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:5173` (Frontend dev server)
- `http://localhost:3000` (WebSocket server)
- `http://localhost:3001` (API server)
- Custom origins via `CORS_ORIGIN` environment variable

## Request Lifecycle

1. **MCP Server Requests Elicitation**
   ```javascript
   // MCP server SDK
   await client.request({
     method: 'elicitation/request',
     params: {
       mode: 'form',
       message: 'Please enter your credentials',
       requestedSchema: { ... }
     }
   });
   ```

2. **Backend Creates Request ID**
   ```typescript
   const requestId = `${serverName}:${Date.now()}`;
   this.activeRequests.set(requestId, {
     timestamp: Date.now(),
     used: false,
     serverName
   });
   ```

3. **Frontend Displays Webview**
   - Webview HTML is rendered in iframe
   - `REQUEST_ID` is injected into iframe context
   - `sendToBackend()` function is available

4. **User Submits Form**
   ```javascript
   await window.sendToBackend({ username: '...', password: '...' });
   ```

5. **Direct Backend Submission**
   - HTTP POST to `/api/mcp/elicitation-data`
   - Request validated (not used, not expired)
   - Marked as used
   - Forwarded to MCP service

6. **MCP Server Receives Response**
   ```javascript
   // MCP server receives:
   {
     action: 'accept',
     content: { username: '...', password: '...' }
   }
   ```

## Best Practices

### ✓ DO Use Direct Backend for:
- Passwords and credentials
- API keys and tokens
- Credit card information
- Social Security Numbers
- Any PII (Personally Identifiable Information)
- Security questions/answers

### ✗ DON'T Use Direct Backend for:
- UI state updates
- Progress notifications
- Non-sensitive form data
- Public information
- Display preferences

### Security Recommendations

1. **Always use HTTPS in production** - Direct backend submissions use HTTP fetch
2. **Validate on backend** - Never trust client-side data
3. **Use appropriate input types** - `type="password"` for sensitive fields
4. **Disable autocomplete** - `autocomplete="off"` for sensitive fields
5. **Clear forms after submission** - Prevent data from staying in DOM
6. **Show visual feedback** - Indicate secure submission to users

### User Experience Tips

1. **Show submission status** - The `sendToBackend()` function returns a result:
   ```javascript
   const result = await window.sendToBackend(data);
   if (result.success) {
     // Success feedback is shown automatically
     // But you can also update UI
   } else {
     // Show error to user
     showError(result.error);
   }
   ```

2. **Provide clear security messaging**:
   ```html
   <p style="color: #10b981; font-size: 12px;">
     🔒 This form uses secure direct submission. Your data will not pass through the browser.
   </p>
   ```

3. **Handle errors gracefully**:
   ```javascript
   const result = await window.sendToBackend(data);
   if (!result.success) {
     if (result.error.includes('expired')) {
       showMessage('Session expired. Please refresh and try again.');
     } else {
       showMessage('Submission failed. Please try again.');
     }
   }
   ```

## Testing Your Implementation

### 1. Test with DevTools
1. Open browser DevTools
2. Go to Network tab
3. Submit your form
4. Verify: You should see a POST request to `/api/mcp/elicitation-data`
5. Verify: Data should NOT appear in parent window console

### 2. Test Request Validation
```javascript
// Try submitting twice - should fail the second time
await window.sendToBackend({ test: 'data' }); // ✓ Success
await window.sendToBackend({ test: 'data' }); // ✗ "Request already used"
```

### 3. Test Expiration
Requests expire after 5 minutes. Wait 5+ minutes and try submitting.

### 4. Test Error Handling
```javascript
// Test with invalid data
const result = await window.sendToBackend(null);
console.log(result.error); // Should show error message
```

## Migration from Phase 2 to Phase 3

If you have existing MCP servers using `sendToHost()` for sensitive data:

### Before (Phase 2):
```javascript
// ✗ Sensitive data goes through parent window
window.sendToHost({
  type: 'credentials',
  username: username,
  password: password  // ← Parent window can see this!
});
```

### After (Phase 3):
```javascript
// ✓ Sensitive data goes directly to backend
await window.sendToBackend({
  username: username,
  password: password  // ← Parent window never sees this!
});

// Still use sendToHost for UI updates
window.sendToHost({
  type: 'login-status',
  message: 'Logging in...'
});
```

## Troubleshooting

### "No request ID available for backend submission"
**Cause**: The webview was created without a requestId in metadata
**Fix**: Ensure your MCP tool includes elicitation context when returning webviews

### "Invalid or expired request ID"
**Cause**: Request was already used or has expired (> 5 minutes)
**Fix**: Refresh the webview or create a new elicitation request

### "CORS error"
**Cause**: Frontend origin not allowed in backend CORS configuration
**Fix**: Check backend `server.ts` CORS settings and add your origin

### "Request already used - possible replay attack"
**Cause**: Attempting to submit the same form twice
**Fix**: This is expected behavior. Each request can only be used once for security.

## Summary

Phase 3 provides a secure, direct path from MCP webview iframes to the backend, preventing sensitive data from being visible to:
- Parent window JavaScript
- Browser DevTools
- Browser extensions
- Console logs

Use `window.sendToBackend()` for all sensitive data, and `window.sendToHost()` for UI updates and non-sensitive communication.

---

**For more information:**
- See [MCP Security Implementation](./2025-11-21_23-53_MCP_Security_Implementation.md) for full security architecture
- See [MCP Webview Developer Guide](./MCP_WEBVIEW_DEVELOPER_GUIDE.md) for general webview development
- See [Webview Security Assessment](./WEBVIEW_SECURITY_ASSESSMENT.md) for security analysis
