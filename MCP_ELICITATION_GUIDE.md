# MCP Elicitation Guide

## Simple Credential Collection with Proper MCP Protocol

This guide demonstrates **proper MCP elicitation** using the standard protocol's `server.createMessage()` method.

## What is Elicitation?

Elicitation is when an MCP tool needs additional information from the user and requests it through the MCP client, rather than failing or returning incomplete results.

## Two Approaches

### 1. Proper MCP Protocol (Recommended)

Use `server.createMessage()` to request user input through the client's sampling capability:

```javascript
async function handleConfigureAPI(args) {
  const { service, apiKey, endpoint } = args;

  // Check if we need credentials
  if (!apiKey || !endpoint) {
    // Request user input through MCP protocol
    const response = await server.createMessage({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please provide API credentials for ${service}:

API Key: ${apiKey || '[required]'}
Endpoint URL: ${endpoint || '[required]'}

Provide the missing information.`,
          },
        },
      ],
      maxTokens: 1000,
    });

    // Extract credentials from user's response
    const extractedApiKey = apiKey || extractFromResponse(response.content.text, 'API Key');
    const extractedEndpoint = endpoint || extractFromResponse(response.content.text, 'Endpoint');

    // Continue with the credentials
    return configureService(service, extractedApiKey, extractedEndpoint);
  }

  // Already have everything
  return configureService(service, apiKey, endpoint);
}
```

**How it works:**
1. Tool checks if it has required information
2. If missing, calls `server.createMessage()` to ask the client
3. Client prompts user and returns their response
4. Tool extracts needed data and continues execution
5. Returns final result

### 2. Webview Fallback

If the client doesn't support sampling, use webview elicitation:

```javascript
function elicitViaWebview(service) {
  return {
    content: [
      {
        type: 'text',
        text: '```webview:form\n' + createCredentialForm(service) + '\n```',
      },
    ],
  };
}

function createCredentialForm(service) {
  return `
<form id="credForm">
  <label>API Key *</label>
  <input type="password" name="apiKey" required>

  <label>Endpoint URL *</label>
  <input type="url" name="endpoint" required>

  <button type="submit">Save Configuration</button>
</form>

<script>
document.getElementById('credForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  window.sendToHost({
    type: 'form-submit',
    formData: {
      apiKey: formData.get('apiKey'),
      endpoint: formData.get('endpoint'),
    }
  });
});
</script>
  `;
}
```

## Complete Example

See `backend/examples/simple-elicitation.js` for a complete working example that:
- Uses `server.createMessage()` for proper MCP elicitation
- Falls back to webview if client doesn't support sampling
- Collects API credentials in a single function
- Returns success result with masked credentials

## Key Points

1. **Use MCP Protocol First**: Try `server.createMessage()` before falling back to webviews
2. **Handle Errors**: Wrap in try/catch for clients without sampling support
3. **Keep It Simple**: Single function, single purpose
4. **Secure Data**: Mask credentials in responses, don't log sensitive data
5. **Extract Data**: Parse user responses to extract needed information

## Testing

To test the example:

1. Add to `backend/mcp-config.json`:
```json
{
  "mcpServers": {
    "simple-elicitation": {
      "command": "node",
      "args": ["examples/simple-elicitation.js"]
    }
  }
}
```

2. Restart backend server
3. Click "MCP Tools" in UI
4. Call `configure_api` with just a service name
5. Client will prompt for credentials
6. Tool continues with the provided credentials

## Benefits of MCP Protocol Elicitation

- **Standard**: Uses official MCP protocol
- **Client-Agnostic**: Works with any MCP client supporting sampling
- **No UI Code**: Server doesn't need to generate HTML forms
- **Natural**: User interacts through their normal client interface
- **Flexible**: Client decides how to present the request to user
