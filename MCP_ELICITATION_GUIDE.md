# MCP Elicitation Guide

## True Elicitation: Pause, Collect, Resume

This guide explains **true elicitation** - where an MCP tool pauses mid-execution to collect additional information from the user, then resumes and completes the task.

## What is Elicitation?

**Elicitation** is the pattern where a tool execution is paused to request additional information from the user before continuing.

### Traditional Approach (NOT Elicitation)
```
User: "Create a form"
Tool: Returns a form
User: Fills form
Tool: (separate call) Processes form data
```

### True Elicitation (THIS Guide)
```
User: "Deploy my app"
Tool: Starts deploying... realizes it needs API key
Tool: PAUSES and asks for API key
User: Provides API key
Tool: RESUMES deployment with the key
Tool: Returns final result
```

## Key Difference

| Aspect | Regular Form | Elicitation |
|--------|--------------|-------------|
| **Execution** | Separate tool calls | Single continuous execution |
| **Context** | No shared state | Maintains execution context |
| **Flow** | Independent actions | Pause → Resume |
| **Use Case** | Data collection | Mid-task requirements |

## Architecture

### Elicitation Flow

```
┌─────────────────────────────────────┐
│ 1. User initiates tool              │
│    "Deploy my-app"                  │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 2. Tool starts execution            │
│    Checks: Do I have all I need?    │
│    Missing: API key, environment    │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 3. Tool PAUSES and elicits          │
│    Returns webview form             │
│    type: "elicitation-response"     │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 4. User provides information        │
│    Fills form with API key, etc.    │
│    Form includes continuation data  │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 5. Frontend calls tool AGAIN        │
│    with _elicitationData            │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 6. Tool RESUMES execution           │
│    Uses collected data              │
│    Completes the deployment         │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ 7. Returns final result             │
│    "Deployment successful!"         │
└─────────────────────────────────────┘
```

## Implementation

### Step 1: Tool Checks for Required Data

```javascript
// At the top of your file, import the required schemas:
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

function handleDeployApplication(args) {
  const { appName, apiKey, environment, _elicitationData } = args;

  // If this is a continuation (resuming from elicitation)
  if (_elicitationData) {
    // Use the collected data and complete execution
    return performDeployment({
      appName,
      apiKey: _elicitationData.apiKey,
      environment: _elicitationData.environment,
    });
  }

  // Check if we have all required data
  if (!apiKey || !environment) {
    // PAUSE and elicit missing information
    return elicitDeploymentInfo(appName);
  }

  // We have everything, proceed directly
  return performDeployment({ appName, apiKey, environment });
}
```

### Step 2: Return Elicitation Request

```javascript
function elicitDeploymentInfo(appName) {
  return {
    content: [{
      type: 'text',
      text: `I need more information to deploy ${appName}:

\`\`\`webview:form
<form id="deployForm">
  <label>API Key:</label>
  <input type="password" name="apiKey" required />

  <label>Environment:</label>
  <select name="environment" required>
    <option value="staging">Staging</option>
    <option value="production">Production</option>
  </select>

  <button type="submit">Continue Deployment</button>
</form>

<script>
document.getElementById('deployForm').addEventListener('submit', function(e) {
  e.preventDefault();

  // IMPORTANT: Mark this as elicitation response
  window.sendToHost({
    type: 'elicitation-response',  // Special type
    formData: {
      _continueExecution: true,      // Flag to continue
      _tool: 'deploy_application',   // Tool to resume
      _elicitationData: {            // Collected data
        apiKey: e.target.apiKey.value,
        environment: e.target.environment.value,
      },
      appName: '${appName}'          // Original args
    }
  });
});
</script>
\`\`\``,
    }],
  };
}
```

### Step 3: Complete Execution with Collected Data

```javascript
function performDeployment(config) {
  // This function is called AFTER elicitation
  // It has access to all the collected data

  const { appName, apiKey, environment } = config;

  // Perform actual deployment
  const result = deploy(appName, apiKey, environment);

  return {
    content: [{
      type: 'text',
      text: `✅ ${appName} deployed to ${environment}!

Deployment ID: ${result.id}
Status: Active
URL: https://${environment}.example.com/${appName}

**Note:** This deployment used data collected via elicitation.
Your API key never touched the LLM.`,
    }],
  };
}
```

## Frontend Handling (Automatic)

The frontend automatically handles elicitation:

```typescript
// When user submits elicitation form
if (data.type === 'elicitation-response' && data.formData?._continueExecution) {
  const { _tool, _elicitationData, ...otherArgs } = data.formData;

  // Call the SAME tool again with collected data
  callMCPTool(serverName, _tool, {
    ...otherArgs,
    _elicitationData,
  });
}
```

## Complete Example: Deploy Application

See `examples/mcp-elicitation-example.js` for the full implementation:

```bash
# Run the example
node examples/mcp-elicitation-example.js
```

**Tool: deploy_application**
- Takes `appName` as required argument
- Optionally takes `apiKey`, `environment`
- If missing data, PAUSES and elicits
- User provides data via form
- Tool RESUMES and completes deployment

## Multi-Step Elicitation

You can chain multiple elicitation steps:

```javascript
function handleMultiStepConfig(args) {
  const { serviceName, _elicitationData, _step } = args;

  if (_step === 1) {
    return elicitStep1(serviceName);
  } else if (_step === 2 && _elicitationData) {
    return elicitStep2(serviceName, _elicitationData);
  } else if (_step === 3 && _elicitationData) {
    return applyConfiguration(serviceName, _elicitationData);
  }
}
```

Each step:
1. Returns a webview with `_step: nextStep`
2. Collects data
3. Calls tool again with incremented step
4. Repeats until final step

## Best Practices

### 1. Always Check for Continuation First

```javascript
function handleTool(args) {
  // FIRST: Check if this is a continuation
  if (args._elicitationData) {
    return continueExecution(args);
  }

  // THEN: Check if we need to elicit
  if (needsMoreInfo(args)) {
    return elicitInfo(args);
  }

  // FINALLY: Execute directly
  return executeDirectly(args);
}
```

### 2. Preserve Original Arguments

```javascript
// In your elicitation form, always include original args
<input type="hidden" name="originalArg" value="${args.originalArg}" />

// When submitting
formData: {
  _continueExecution: true,
  _tool: 'my_tool',
  _elicitationData: { /* collected data */ },
  originalArg: '${args.originalArg}',  // ← Preserve
}
```

### 3. Use Clear Visual Indicators

```html
<!-- Show that this is mid-execution -->
<div style="background: #fef3c7; padding: 12px; border-left: 4px solid #f59e0b;">
  ⏸️ <strong>Execution Paused</strong>
  <p>Please provide the following information to continue...</p>
</div>
```

### 4. Provide Cancel Option

```javascript
<button type="button" onclick="cancelExecution()">
  Cancel Deployment
</button>

<script>
function cancelExecution() {
  window.sendToHost({ type: 'elicitation-cancelled' });
}
</script>
```

### 5. Show Progress in Multi-Step

```html
<div style="background: #eff6ff; padding: 12px; border-radius: 4px;">
  Step 2 of 3: Advanced Configuration
</div>
```

## Use Cases

### Perfect For:

✅ **Deployment Tools** - Collect credentials mid-deployment
✅ **Database Operations** - Build queries interactively before execution
✅ **Configuration Wizards** - Multi-step setup with context
✅ **Approval Workflows** - Pause for user confirmation
✅ **API Integrations** - Collect OAuth tokens during setup
✅ **File Processing** - Select processing options mid-task

### Not Suitable For:

❌ **Simple Forms** - Use regular MCP webviews instead
❌ **Independent Operations** - Use separate tool calls
❌ **Pure Data Collection** - No need for continuation

## Comparison with Alternatives

### vs Regular MCP Webviews

| Feature | Regular Webview | Elicitation |
|---------|----------------|-------------|
| Execution | Complete | Paused |
| Context | None | Maintained |
| Use Case | Standalone forms | Mid-execution |

### vs Chat-Based Collection

| Feature | Chat Collection | Elicitation |
|---------|----------------|-------------|
| Privacy | Goes through LLM | Bypass LLM |
| Speed | Multiple exchanges | Single flow |
| UX | Conversational | Form-based |

### vs Traditional Parameters

| Feature | Parameters | Elicitation |
|---------|-----------|-------------|
| Timing | Upfront | On-demand |
| Flexibility | Static | Dynamic |
| UX | Must know args | Guided |

## Security Considerations

### ✅ Advantages

1. **No LLM Exposure** - Sensitive data never touches LLM
2. **Controlled Flow** - Tool manages state securely
3. **Validation** - Server-side validation before continuing
4. **Audit Trail** - Can log elicitation steps

### ⚠️ Considerations

1. **State Management** - Store execution state securely
2. **Timeout Handling** - Handle abandoned elicitations
3. **Input Validation** - Validate all collected data
4. **Session Security** - Ensure continuation belongs to same session

## Debugging

### Common Issues

**Issue: Elicitation doesn't resume**
```javascript
// Check: Did you include _continueExecution?
formData: {
  _continueExecution: true,  // ← Must be present
  _tool: 'tool_name',        // ← Must match tool name
  _elicitationData: { },     // ← Your collected data
}
```

**Issue: Data not reaching tool**
```javascript
// Check: Are you preserving original args?
formData: {
  // ...
  appName: '${appName}',  // ← Preserve from initial call
}
```

**Issue: Multiple elicitations failing**
```javascript
// Check: Are you passing accumulated data?
_elicitationData: {
  ...previousStepData,  // ← Include previous steps
  newData: value,
}
```

## Testing

```bash
# 1. Configure the example server
# Add to backend/mcp-config.json:
{
  "mcpServers": {
    "elicitation-example": {
      "command": "node",
      "args": ["examples/mcp-elicitation-example.js"]
    }
  }
}

# 2. Restart backend
cd backend && npm run dev

# 3. Test in UI
# - Click "MCP Tools"
# - Select "deploy_application"
# - Provide app name ONLY (omit other args)
# - Tool will elicit missing data
# - Fill form and submit
# - Tool resumes and completes!
```

## Complete Working Examples

See `examples/mcp-elicitation-example.js` for three complete examples:

1. **deploy_application** - Deployment with credential elicitation
2. **query_database** - Interactive query builder
3. **configure_service** - Multi-step configuration wizard

Each demonstrates a different elicitation pattern!

---

## Summary

**Elicitation** is powerful for:
- Collecting data mid-execution
- Building interactive wizards
- Handling sensitive information
- Creating dynamic workflows

**Key Points:**
1. Tool execution PAUSES when data is needed
2. User provides data via webview form
3. Tool RESUMES with collected data
4. Data never touches the LLM
5. Single logical operation, multiple steps

This pattern combines the best of both worlds:
- **MCP's structure** - Type-safe, validated tools
- **Interactive UX** - Guided, step-by-step collection
- **Privacy** - Sensitive data stays with MCP server
- **Context** - Tool maintains state throughout

Start with the examples and build from there!
