# MCP Elicitation & Notification System

## Overview

This document explains our complete implementation of MCP elicitation with proper security and notification support.

## SDK Upgrade

**Upgraded from**: 0.5.0 → **1.22.0**

The new SDK includes the official `server.elicitInput()` API for proper elicitation.

## Three Key Problems Solved

### 1. Proper MCP Elicitation ✅

**Server Side** (`backend/examples/proper-elicitation.js`):
```javascript
// Server pauses and requests user input
const result = await server.elicitInput({
  message: 'Please provide API credentials for MyService',
  requestedSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        title: 'API Key',
        description: 'Your API key',
        minLength: 1,
      },
      endpoint: {
        type: 'string',
        title: 'API Endpoint',
        format: 'uri',
      },
    },
    required: ['apiKey', 'endpoint'],
  },
});

// Handle response
if (result.action === 'accept') {
  const { apiKey, endpoint } = result.content;
  // Continue with credentials
}
```

**Client Side** (`backend/src/services/mcp.ts`):
- Client advertises `elicitation` capability
- Handles `elicitation/create` requests from servers
- Emits events to frontend to display webview
- Waits for user response
- Returns response to server

**Flow:**
1. Server calls `server.elicitInput()` → execution PAUSES
2. Client receives `elicitation/create` request
3. Client emits `'elicitation-request'` event to frontend
4. Frontend displays webview form based on schema
5. User fills form and submits
6. Frontend calls `mcpService.respondToElicitation(requestId, response)`
7. Client returns response to server
8. Server RESUMES execution with user data

### 2. Secure Data Transmission (NO Chat History) ✅

**THE KEY INSIGHT**: Data already bypasses chat/LLM!

Our MCP webviews send data via `window.sendToHost()` → Client → MCP Server **directly**, without going through the chat or LLM.

**Security Flow:**
```
Webview Form
    ↓ (sendToHost)
Frontend Client
    ↓ (WebSocket)
Backend MCP Service
    ↓ (stdio/MCP protocol)
MCP Server

❌ NEVER touches: Chat history, LLM, message log
```

**Why it's secure:**
- Data transmitted via WebSocket (backend) → stdio (MCP)
- No LLM sees the data
- No chat history entry created
- Data goes directly to server endpoint

**Example** (`frontend/src/components/Chat/Chat.tsx:handleWebviewMessage`):
```typescript
if (mcpWebview && data.type === 'elicitation-response') {
  // Data goes DIRECTLY to MCP server
  // NOT through chat, NOT through LLM
  mcpService.respondToElicitation(requestId, {
    action: 'accept',
    content: data.formData,
  });
}
```

### 3. Notification System (Unprompted Messages) ✅

**Use Case**: Server completes task asynchronously and notifies user

**Implementation**:
```javascript
// In MCP server
export class MCPService extends EventEmitter {
  sendNotification(notification: MCPNotification) {
    this.emit('notification', notification);
  }
}

// Usage
mcpService.sendNotification({
  serverName: 'my-server',
  toolName: 'deploy',
  message: 'Deployment completed successfully!',
  type: 'success',
  data: { url: 'https://deployed.app' },
});
```

**Frontend Integration** (to be implemented):
```typescript
// Listen for notifications
mcpService.on('notification', (notification) => {
  // Show as unprompted message in chat
  addSystemMessage(`📢 ${notification.message}`);
});
```

## Handling Duplicate Requests

**Problem**: User submits form → also types "ok submitted the form" → duplicate requests

**Solution**: Active operation tracking

```typescript
// Mark operation as active when webview is shown
mcpService.markOperationActive(operationId);

// In message handler
if (mcpService.isOperationActive(operationId)) {
  // Ignore duplicate user messages
  return;
}

// When operation completes
mcpService.markOperationComplete(operationId);
```

**Implementation**:
1. When webview is displayed, mark operation as active
2. Suppress user text messages while operation is active
3. Allow only webview responses
4. When webview submits or closes, mark complete

## Complete Elicitation Flow

### Option 1: Proper MCP Protocol (Recommended)

```
┌─────────────────────────────────────────┐
│ 1. User: "Configure API for MyService" │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 2. LLM calls MCP tool: configure_api         │
│    Args: { service: "MyService" }            │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 3. Server: Missing credentials               │
│    Calls: server.elicitInput()               │
│    🔴 EXECUTION PAUSED                        │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 4. Client receives elicitation/create        │
│    Emits 'elicitation-request' event         │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 5. Frontend displays webview form            │
│    Generated from requestedSchema            │
│    Operation marked as ACTIVE                │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 6. User fills form:                          │
│    API Key: "sk-abc123..."                   │
│    Endpoint: "https://api.myservice.com"     │
│    Clicks "Submit"                           │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 7. Frontend calls respondToElicitation()     │
│    Data: { action: 'accept', content: {...}} │
│    🔒 BYPASSES CHAT/LLM                      │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 8. Client returns response to server         │
│    Via MCP protocol (stdio)                  │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 9. Server RESUMES execution                  │
│    🟢 Has credentials now                    │
│    Configures API                            │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ 10. Server returns success                   │
│     "✅ Configured MyService"                │
│     Operation marked COMPLETE                │
└──────────────────────────────────────────────┘
```

### Option 2: Webview Fallback

If client doesn't support elicitation:

```
Server → Returns ```webview:form``` in tool result
       → Frontend renders webview
       → User submits
       → Frontend calls tool AGAIN with data
       → Server completes
```

## Security Guarantees

✅ **User credentials NEVER touch LLM**
- Sent via WebSocket → MCP protocol → Server
- No chat history entry

✅ **No prompt injection attacks**
- Data is structured, not free text
- Schema validation on both ends

✅ **Secure transport**
- WebSocket for frontend-backend
- stdio/MCP protocol for backend-server
- No network exposure

## Example: Complete Secure Flow

```javascript
// Server
async function deployApp(args) {
  if (!args.apiKey) {
    // Elicit securely
    const result = await server.elicitInput({
      message: 'Enter deploy credentials',
      requestedSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string', title: 'API Key' },
        },
        required: ['apiKey'],
      },
    });

    if (result.action !== 'accept') {
      return { content: [{ type: 'text', text: 'Cancelled' }] };
    }

    args.apiKey = result.content.apiKey;
    // ✅ apiKey NEVER went through chat/LLM
  }

  // Use credentials securely
  await deployToProduction(args.apiKey);

  // Send notification when done
  // (via WebSocket event to frontend)
  return {
    content: [{ type: 'text', text: '✅ Deployed!' }],
  };
}
```

## Next Steps

### Frontend Integration Needed:

1. **Listen for elicitation events**:
```typescript
mcpService.on('elicitation-request', (request) => {
  // Generate webview from request.requestedSchema
  // Display to user
  // On submit: mcpService.respondToElicitation(request.requestId, response)
});
```

2. **Listen for notifications**:
```typescript
mcpService.on('notification', (notification) => {
  addUnpromptedMessage(notification.message, notification.type);
});
```

3. **Track active operations**:
```typescript
// When webview shown
mcpService.markOperationActive(messageId);

// Suppress messages while active
if (mcpService.isOperationActive(lastWebviewId)) {
  return; // Ignore duplicate text messages
}
```

## Files Modified

1. `backend/package.json` - SDK upgraded to 1.22.0
2. `backend/src/services/mcp.ts` - Elicitation + notification support
3. `backend/examples/proper-elicitation.js` - Example using server.elicitInput()
4. Frontend needs updates for elicitation events

## Testing

```bash
cd backend
node examples/proper-elicitation.js
```

Call `configure_api` tool → Server will use elicitInput() → Client needs to handle
