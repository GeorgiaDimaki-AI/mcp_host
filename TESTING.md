# Testing Guide

## Quick Test - NPX Installation

The easiest way to test the package is using NPX:

```bash
npx mcp-webview-host
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
- [ ] Click "MCP Tools" button (if configured)
- [ ] Check that MCP servers connect (if configured)
- [ ] Test elicitation forms (if MCP server provides them)

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
npm install -g mcp-webview-host-0.1.0-beta.1.tgz
mcp-webview-host
```

### NPX Test
```bash
# Test NPX distribution
npx mcp-webview-host
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
PORT=3001 mcp-webview-host
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

## Reporting Issues

Found a bug? Please report it at:
https://github.com/GeorgiaDimaki-AI/mcp_host/issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Console logs and errors
