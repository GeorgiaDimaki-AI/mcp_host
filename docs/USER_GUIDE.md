# MCP Webview Host - User Guide

A comprehensive guide to using the MCP Webview Host application, covering theme preferences, conversation management, and MCP tool integration.

## Table of Contents

- [Getting Started](#getting-started)
- [Theme System](#theme-system)
- [Conversation Management](#conversation-management)
- [MCP Tool Calling](#mcp-tool-calling)
- [Chat Features](#chat-features)
- [Tips & Tricks](#tips--tricks)

## Getting Started

### Launching the Application

The easiest way to get started is using NPX:

```bash
npx @gdimaki-ai/mcp-webview-host
```

The application will:
1. Install dependencies automatically
2. Start the backend server (port 3000)
3. Start the frontend (port 5173)
4. Open your browser automatically

For local development, see [QUICKSTART.md](./QUICKSTART.md).

## Theme System

### Overview

The application supports a sophisticated three-mode theme system:

- **Light Mode**: Clean, bright interface with light backgrounds
- **Dark Mode**: Easy-on-the-eyes dark interface
- **System Mode**: Automatically matches your OS preference

### Setting Your Theme Preference

1. Click the theme toggle button in the header
2. Select your preferred mode:
   - Light
   - Dark
   - System (default)

### How It Works

- **Storage**: Your preference is saved to the browser's localStorage
- **System Detection**: When set to "System", the app detects your OS preference using the `prefers-color-scheme` media query
- **Real-time Sync**: If you change your OS theme while "System" is selected, the app updates automatically
- **Persistence**: Your selection is remembered across browser sessions

### Technical Details

- Uses CSS class-based theming (`.light` and `.dark` classes on `<html>` element)
- WCAG 2.1 AA compliant color palette
- Tailwind CSS for responsive design
- Works seamlessly with system dark mode (Windows, macOS, Linux)

## Conversation Management

### Creating Conversations

1. Click **"New Chat"** button in the left sidebar
2. A new conversation is created with the default model (llama3.2)
3. Start typing to begin your conversation

### Automatic Titles

Conversation titles are automatically generated from your first message:

- **Extraction**: The system uses the first user message as the title
- **Truncation**: Titles are limited to 50 characters to keep the sidebar clean
- **Auto-Update**: Happens automatically when you send your first message
- **Manual Edit**: (Future feature) You'll be able to edit titles manually

### Examples

| First Message | Generated Title |
|---|---|
| "What is machine learning?" | "What is machine learning?" |
| "Explain the concept of quantum entanglement in simple terms with examples" | "Explain the concept of quantum..." |
| "Hello" | "Hello" |
| Empty conversation | "New Conversation" |

### Managing Conversations

#### Select a Conversation
Click any conversation in the sidebar to switch to it.

#### Delete a Conversation
1. Hover over a conversation in the sidebar
2. A delete button appears
3. Click once to show confirmation (button turns red)
4. Click again within 3 seconds to confirm deletion
5. After 3 seconds, the confirmation automatically cancels

#### Export Conversations
1. Click the menu icon (three dots) in the bottom-right of the sidebar
2. Select **"Export Conversations"**
3. A JSON file is downloaded with all your conversations
4. Filename format: `conversations-YYYY-MM-DD.json`

#### Import Conversations
1. Click the menu icon in the bottom-right of the sidebar
2. Select **"Import Conversations"**
3. Choose a previously exported JSON file
4. Conversations are merged (duplicates are handled automatically)
5. A confirmation shows how many were imported

#### Chat Summary
1. Click the **"Summary"** button in the top-right
2. View your complete conversation in a modal
3. Choose output format:
   - **Markdown**: Formatted for documentation/wikis
   - **Plain Text**: Simple text format
4. Options:
   - **Copy to Clipboard**: Quick sharing
   - **Download**: Save as `.md` or `.txt` file

## MCP Tool Calling

### What Are MCP Tools?

MCP (Model Context Protocol) tools are functions that your LLM can call to:
- Query databases
- Access external APIs
- Perform system operations
- Interact with specialized services

### How It Works

```
1. You ask the LLM to do something
2. LLM decides if it needs to call a tool
3. If yes, it formats a tool call request
4. The application executes the tool
5. LLM receives the result
6. LLM uses the result to answer your question
```

### Enabling MCP Tools

1. Click the **"MCP Info"** button in the top navigation
2. This shows:
   - Available MCP servers
   - Connected servers
   - Available tools and their descriptions
   - Current tool status

### Using Tools in Conversations

#### Automatic Tool Usage

Most of the time, tools are called automatically:

1. You ask a question that might need a tool
   - Example: "Show me the latest weather in New York"
2. The LLM decides to use a weather tool
3. The application calls the tool
4. The response is shown in chat
5. The LLM provides a final answer based on the tool result

#### Tool Call Feedback

During tool execution, you'll see:

- **Status Message**: "Calling tool..." notification
- **Tool Icon**: Shows which server the tool came from
- **Result Display**: Tool output appears as a system message
- **Final Answer**: LLM's response using the tool data

### Troubleshooting Tools

#### Tools Not Appearing
- Check that MCP servers are configured in `backend/mcp-config.json`
- Verify server executables are in your PATH or use full path
- Restart the application
- Check console for connection errors

#### Tools Fail to Execute
- Check MCP server is running properly
- Verify tool arguments are correct
- Check server logs for detailed error messages
- Review the MCP server's documentation

#### Tool Execution Too Slow
- Some tools might be slow by nature
- Verify server has sufficient resources
- Check network connectivity (for remote servers)
- Consider timeout settings in configuration

## Chat Features

### Model Selection

1. Click the **"Settings"** icon in the top bar
2. Select **"Model Settings"**
3. Choose your preferred model from dropdown
4. The selected model is saved per conversation

### Model Parameters

Customize how the model responds:

- **Temperature** (0.0-2.0): Controls randomness
  - Lower (0.0): More deterministic, focused answers
  - Higher (2.0): More creative, varied responses
- **Top P** (0.0-1.0): Controls diversity via probability mass
- **Top K**: Number of top alternatives to consider

### System Prompt

Set a custom system prompt to influence the model's behavior:

```
Example: "You are a Python expert. Answer all questions with code examples."
```

### Message Operations

- **Copy Message**: Hover over any message and copy its content
- **Clear Conversation**: Settings menu
- **Export Conversation**: Via summary feature

## Tips & Tricks

### Productivity Tips

1. **Use Clear Titles**: Your first message becomes the conversation title, so make it descriptive
2. **Keep Related Topics Together**: Use separate conversations for different topics
3. **Leverage Export**: Export important conversations for backup or sharing
4. **System Prompt Power**: Set a system prompt for consistent behavior across messages

### MCP Server Tips

1. **Tool Descriptions**: Read tool descriptions in MCP Info to understand what they do
2. **Tool Requirements**: Check input schema to see what parameters tools need
3. **Chaining Tools**: The LLM can call multiple tools in sequence to answer complex questions
4. **Error Handling**: If a tool fails, the LLM will try alternative approaches

### Performance Tips

1. **Lightweight Models**: Use smaller models (e.g., llama3.2:1b) for faster responses
2. **System Resources**: Ensure your system has enough RAM for your chosen model
3. **Network**: Good internet connection helps with external API tools
4. **Browser Cache**: Clear cache if you experience issues

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift+Enter**: New line in input (when supported)
- **Cmd/Ctrl+K**: Search conversations (when supported)

## Frequently Asked Questions

### Q: Where is my data stored?
**A**: All conversations are stored in your browser's localStorage. They're only on your local machine and never sent to external servers.

### Q: Can I clear my data?
**A**: Yes, you can delete conversations individually or export them for backup before clearing your browser data.

### Q: How do I connect external tools?
**A**: Configure MCP servers in `backend/mcp-config.json`. See [MCP_WEBVIEW_DEVELOPER_GUIDE.md](./MCP_WEBVIEW_DEVELOPER_GUIDE.md) for details.

### Q: Is tool calling secure?
**A**: Yes! Tool calls are executed on your local backend. Sensitive data never travels through untrusted channels. See [WEBVIEW_SECURITY_ASSESSMENT.md](./WEBVIEW_SECURITY_ASSESSMENT.md) for details.

### Q: Can I use this with remote LLM servers?
**A**: Currently, the app expects a local Ollama instance. Future versions may support remote LLM backends.

### Q: What if I want to use a different LLM?
**A**: If your LLM supports tool calling via the OpenAI function calling format, you can configure it. Contact us for other integration needs.

## Need More Help?

- **Setup Issues**: See [QUICKSTART.md](./QUICKSTART.md)
- **Security Questions**: See [WEBVIEW_SECURITY_ASSESSMENT.md](./WEBVIEW_SECURITY_ASSESSMENT.md)
- **MCP Development**: See [MCP_WEBVIEW_DEVELOPER_GUIDE.md](./MCP_WEBVIEW_DEVELOPER_GUIDE.md)
- **Testing**: See [TESTING.md](../TESTING.md)
- **Report Bugs**: https://github.com/GeorgiaDimaki-AI/mcp_host/issues
