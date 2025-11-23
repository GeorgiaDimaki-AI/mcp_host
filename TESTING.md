# Testing Guide

## Quick Test - NPX Installation

The easiest way to test the package is using NPX:

```bash
npx @gdimaki-ai/mcp-webview-host
```

This will:
- Download the latest published version
- Install dependencies automatically
- Start the server on http://localhost:3000
- Open your browser automatically

## What to Test

### 1. Basic Functionality
- [ ] Server starts without errors
- [ ] Browser opens automatically
- [ ] UI loads correctly with chat interface
- [ ] Can type and send messages

### 2. Demo Features
Click each demo button to test:
- [ ] **Simple HTML Demo** - Renders basic HTML with styling
- [ ] **Interactive Form Demo** - Shows a form with input fields
- [ ] **Data Visualization Demo** - Displays charts/graphs
- [ ] **Modal Demo** - Opens a modal overlay

### 3. Security Features
- [ ] **XSS Protection** - Try injecting `<script>alert('XSS')</script>` in chat - should be sanitized
- [ ] **Iframe Sandbox** - Webviews should be sandboxed and restricted
- [ ] **CSP Headers** - Check browser console for CSP violations (there should be none)

### 4. MCP Integration
- [ ] Click "MCP Info" button (if configured)
- [ ] Check that MCP servers connect (if configured)
- [ ] Test elicitation forms (if MCP server provides them)
- [ ] Verify MCP tool calling works (LLM can call tools)
- [ ] Check tool call status messages display correctly

### 5. Theme System
- [ ] Click theme toggle in header
- [ ] Test switching between Light, Dark, and System modes
- [ ] Verify theme persists after page reload
- [ ] Test system theme detection (if on Windows/macOS/Linux with dark mode)
- [ ] Verify theme changes in real-time when OS preference changes (in system mode)

### 6. Conversation Features
- [ ] Create new conversation
- [ ] Verify conversation title is auto-generated from first message
- [ ] Test title truncation with long first messages
- [ ] Switch between conversations
- [ ] Delete conversation (with confirmation)
- [ ] Export conversations to JSON
- [ ] Import conversations from JSON
- [ ] View chat summary (both Markdown and Plain Text formats)
- [ ] Download conversation summary as file

## Full Test Suite

To run the complete test suite:

```bash
# Clone the repository
git clone https://github.com/GeorgiaDimaki-AI/mcp_host.git
cd mcp_host

# Install dependencies
npm run install:all

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Test Coverage
- **Backend**: 48 tests (90% route coverage)
- **Frontend**: 78 tests (82% coverage)
- **Total**: 126 tests

## Development Testing

For local development and testing:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start Ollama (optional, for LLM features)
ollama serve
```

Then open http://localhost:5173

## Manual Test Checklist

### Installation Test
```bash
# Clean install test
npm pack
npm install -g gdimaki-ai-mcp-webview-host-0.1.0-beta.1.tgz
mcp-webview-host
```

### NPX Test
```bash
# Test NPX distribution
npx @gdimaki-ai/mcp-webview-host
```

### Security Test
1. Try to inject malicious HTML
2. Check iframe sandbox attributes
3. Verify CSP headers in Network tab
4. Test elicitation form submission (should bypass LLM)

### Performance Test
1. Send multiple messages quickly
2. Render multiple webviews
3. Check for memory leaks (dev tools)
4. Verify WebSocket connection stability

## Common Issues

### Port Already in Use
If port 3000 is in use:
```bash
PORT=3001 npx @gdimaki-ai/mcp-webview-host
```

### Ollama Not Running
If you see Ollama errors, either:
1. Start Ollama: `ollama serve`
2. Or ignore if you're only testing webview features

### Build Errors
If you see build errors:
```bash
# Clean rebuild
rm -rf backend/node_modules frontend/node_modules
npm run install:all
npm run build:all
```

## Testing New Features

### Testing Theme System

**Unit Tests Location**: Look for theme-related tests in frontend test files

**Manual Testing Checklist**:

1. **Theme Toggle**
   ```bash
   # Open DevTools Console
   # Check localStorage value changes
   localStorage.getItem('mcp-host-theme')
   # Should show: 'light', 'dark', or 'system'
   ```

2. **System Mode Detection**
   - Set OS to Dark Mode
   - Select "System" theme in app
   - Verify app switches to dark theme automatically
   - Change OS back to Light Mode
   - Verify app switches back to light theme

3. **Persistence**
   - Select a theme
   - Reload page
   - Verify same theme is still active

### Testing Conversation Titles

**Manual Testing Checklist**:

1. **Auto-Generation**
   - Create new conversation
   - Send first message: "What is quantum computing?"
   - Title should appear as: "What is quantum computing?"

2. **Truncation**
   - Send first message with 60+ characters
   - Title should be truncated to 50 characters with "..."

3. **Empty Conversation**
   - Create conversation but don't send message
   - Title should be "New Conversation"

### Testing MCP Tool Calling

**Manual Testing Checklist** (requires configured MCP server):

1. **Tool Call Detection**
   - Ask LLM to use a tool: "What is 2+2?" (if math tool available)
   - Monitor console for tool call events
   - Verify tool call appears in chat as system message

2. **Tool Execution**
   - Check that tool result displays correctly
   - Verify LLM uses result in final answer
   - Check for any error messages

3. **Multiple Tool Calls**
   - Ask question requiring multiple tool calls
   - Verify all tool calls execute in sequence
   - Check results are all displayed

4. **Tool Failures**
   - Ask tool to do something impossible
   - Verify error message is shown
   - Check LLM handles error gracefully

### Testing Conversation Export/Import

**Manual Testing Checklist**:

1. **Export**
   - Create conversation with multiple messages
   - Click menu (three dots) in sidebar
   - Select "Export Conversations"
   - File downloads successfully
   - Open file and verify JSON format

2. **Import**
   - Click menu in sidebar
   - Select "Import Conversations"
   - Choose previously exported JSON file
   - Verify import confirmation message
   - Check conversations appear in sidebar

3. **Merge**
   - Have 2 conversations locally
   - Export them
   - Delete one conversation
   - Import the file
   - Verify both are restored

### Testing Chat Summary

**Manual Testing Checklist**:

1. **Summary Generation**
   - Create conversation with 5+ messages
   - Click "Summary" button
   - Verify Markdown format shows formatted output
   - Switch to Plain Text format
   - Verify both formats display correctly

2. **Copy to Clipboard**
   - Click "Copy to Clipboard"
   - Verify "Copied!" message appears
   - Paste into text editor
   - Verify content is correct

3. **Download**
   - Click "Download"
   - File downloads with correct name format
   - Verify file extension matches format (.md or .txt)

## Performance Testing

### Load Testing

```bash
# Test with many conversations
# Create 50+ conversations locally
# Check:
# - Sidebar still responsive
# - No performance degradation
# - localStorage can handle data
```

### Memory Testing

```bash
# DevTools -> Performance
# 1. Take heap snapshot
# 2. Create/switch 10 conversations
# 3. Take another snapshot
# 4. Compare memory usage
# - Should be reasonable increase
# - No memory leaks
```

## Browser Compatibility Testing

Test on:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Automated Testing

Run test suites:

```bash
# All tests
npm test

# Frontend only (includes UI component tests)
npm run test:frontend

# Backend only (includes API and tool calling tests)
npm run test:backend

# With coverage
npm run test:coverage
```

### Test Coverage

Current coverage targets:
- Backend: 90% route coverage (48 tests)
- Frontend: 82% component coverage (78 tests)
- Total: 126 tests

## Reporting Issues

Found a bug? Please report it at:
https://github.com/GeorgiaDimaki-AI/mcp_host/issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Console logs and errors
- Feature being tested (theme, title generation, tool calling, etc.)
