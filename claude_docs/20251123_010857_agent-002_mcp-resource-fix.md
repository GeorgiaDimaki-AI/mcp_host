# Agent-002 MCP Resource Handling Fix Report
**Date:** 2025-11-23 01:08:57
**Agent:** Agent-002 (Backend Developer)
**Commit:** 93da162

## Executive Summary

Fixed critical bug in MCP service where resource-type items containing HTML webviews were being completely ignored, causing the LLM to receive incomplete data and stop processing prematurely.

## Problem Description

### Original Bug
The `callTool()` method in `/home/user/mcp_host/backend/src/services/mcp.ts` (lines 280-287) was only extracting `text` type items from MCP response.content arrays, completely ignoring `resource` type items.

**Buggy Code:**
```typescript
content = response.content
  .map(item => {
    if (item.type === 'text') {
      return item.text;
    }
    return ''; // <-- IGNORES resource items!
  })
  .join('\n');
```

### Impact
When MCP servers (like webview-example-server) returned responses with both text and resource items:
```javascript
{
  content: [
    { type: 'text', text: 'Created todo list: My To-Do List' },
    {
      type: 'resource',
      resource: {
        uri: 'webview://todo-list',
        mimeType: 'text/html',
        text: '<div>...HTML HERE...</div>'
      }
    }
  ]
}
```

The resource block was **completely ignored**, resulting in:
- `hasWebview` remained `false`
- No HTML was extracted or passed to the LLM
- LLM received incomplete information and stopped processing

## Changes Made

### 1. Fixed `/home/user/mcp_host/backend/src/services/mcp.ts`

**Lines 277-328:** Rewrote the content extraction logic to:

```typescript
// Extract text content and resource items
let textContent = '';
let webviewHtml = '';
let hasWebview = false;

if (Array.isArray(response.content)) {
  for (const item of response.content) {
    if (item.type === 'text') {
      textContent += item.text + '\n';
    } else if (item.type === 'resource' && item.resource) {
      // Check if resource contains HTML webview
      if (item.resource.mimeType === 'text/html' && item.resource.text) {
        hasWebview = true;
        webviewHtml = item.resource.text;
      }
    }
  }
}

// Trim the text content
textContent = textContent.trim();

// Still check for markdown webview syntax as fallback (backward compatibility)
if (!hasWebview) {
  const webviewMatch = textContent.match(/```webview:(\w+)\n([\s\S]*?)```/);
  if (webviewMatch) {
    const [fullMatch, type, html] = webviewMatch;
    const contentWithoutWebview = textContent.replace(fullMatch, '').trim();

    return {
      content: contentWithoutWebview,
      hasWebview: true,
      webviewType: type as 'form' | 'result' | 'html',
      webviewHtml: html.trim(),
    };
  }
}

// Return result with resource-based webview if found
if (hasWebview) {
  return {
    content: textContent,
    hasWebview: true,
    webviewType: 'html',
    webviewHtml,
  };
}

return {
  content: textContent,
  hasWebview: false,
};
```

**Key Features:**
- Extracts both `text` and `resource` items
- Checks `resource.mimeType === 'text/html'` to identify webviews
- Extracts `resource.text` as webview HTML
- Maintains backward compatibility with markdown `webview:` syntax
- Prioritizes resource-based webviews over markdown syntax

### 2. Added Comprehensive Tests

**File:** `/home/user/mcp_host/backend/src/__tests__/mcp-service.test.ts`

Added 6 new test cases in "MCP Resource Handling" suite:

1. **should extract HTML from resource blocks**
   - Tests basic resource extraction with HTML webview
   - Verifies `hasWebview=true`, correct HTML extraction, and text content

2. **should handle text + resource combination**
   - Tests multiple text items combined with resource item
   - Ensures all text is concatenated and resource HTML is extracted

3. **should maintain backward compatibility with markdown webview syntax**
   - Verifies old `webview:html` markdown syntax still works
   - Ensures no regression for existing implementations

4. **should handle text-only responses without resources**
   - Tests responses with only text items
   - Verifies `hasWebview=false` for non-webview responses

5. **should ignore non-HTML resources**
   - Tests resources with non-HTML mimeType (e.g., application/json)
   - Ensures only HTML resources trigger webview detection

6. **should prioritize resource webview over markdown syntax**
   - Tests mixed responses with both markdown and resource webviews
   - Verifies resource-based webview takes precedence

## Test Results

```
PASS src/__tests__/mcp-service.test.ts
  MCPService
    Phase 3: Request Tracking
      ✓ should track active elicitation requests (4 ms)
      ✓ should reject invalid request ID (18 ms)
      ✓ should reject already used request (1 ms)
      ✓ should reject expired requests (1 ms)
    Connection Management
      ✓ should initialize with no connections (1 ms)
      ✓ should handle connection errors gracefully (54 ms)
    Tool Management
      ✓ should list tools when connected (1 ms)
      ✓ should return empty array when no servers connected (1 ms)
    Operation Tracking
      ✓ should track active operations (2 ms)
      ✓ should handle multiple concurrent operations (1 ms)
    Event Emission
      ✓ should emit notification events (1 ms)
      ✓ should handle elicitation-complete events (7 ms)
    MCP Resource Handling
      ✓ should extract HTML from resource blocks (1 ms)
      ✓ should handle text + resource combination (1 ms)
      ✓ should maintain backward compatibility with markdown webview syntax (1 ms)
      ✓ should handle text-only responses without resources (1 ms)
      ✓ should ignore non-HTML resources (1 ms)
      ✓ should prioritize resource webview over markdown syntax (1 ms)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        2.808 s
```

**Result:** ✅ All 18 tests passed (6 new tests + 12 existing tests)

## Verification Steps

### Manual Verification Checklist

1. ✅ **Code Review**
   - Verified resource extraction logic handles all edge cases
   - Confirmed backward compatibility maintained
   - Checked for proper type checking and null safety

2. ✅ **Test Coverage**
   - All new functionality covered by unit tests
   - Edge cases tested (non-HTML resources, text-only, mixed content)
   - Backward compatibility explicitly tested

3. ✅ **Integration Points**
   - MCPToolResult interface unchanged (no breaking changes)
   - Frontend/backend contract maintained
   - Existing markdown syntax still supported

### Recommended Next Steps

1. **Integration Testing**
   - Test with actual webview-example-server
   - Verify create_todo_list tool returns proper webview
   - Confirm LLM receives complete HTML content

2. **End-to-End Testing**
   - Run full conversation flow with MCP tools
   - Verify webviews render correctly in frontend
   - Test multiple tool calls in sequence

3. **Performance Monitoring**
   - Monitor for any performance impact from additional parsing
   - Verify no memory leaks with large HTML content

## Files Modified

1. `/home/user/mcp_host/backend/src/services/mcp.ts`
   - Lines 271-333 (callTool method)
   - Added resource extraction logic
   - Maintained backward compatibility

2. `/home/user/mcp_host/backend/src/__tests__/mcp-service.test.ts`
   - Lines 1-6 (added jest import)
   - Lines 157-328 (added MCP Resource Handling test suite)
   - 6 new comprehensive test cases

## Technical Details

### Resource Detection Algorithm
1. Iterate through response.content array
2. For each item:
   - If `type === 'text'`: Append to textContent
   - If `type === 'resource'`: Check for HTML webview
3. Check resource.mimeType for 'text/html'
4. Extract resource.text as webviewHtml if HTML found
5. Fallback to markdown syntax parsing if no resource found
6. Return appropriate MCPToolResult structure

### Backward Compatibility
- Markdown `webview:type` syntax still supported
- Used as fallback when no resource items found
- Resource-based webviews take precedence
- No breaking changes to MCPToolResult interface

## Commit Information

**Commit SHA:** 93da162
**Branch:** claude/fix-mcp-tools-0127BWaGrx5gpUK6xdTNHNzD
**Files Changed:** 2 files, 212 insertions(+), 19 deletions(-)

**Commit Message:**
```
Fix MCP resource handling - extract webview HTML from resource blocks

The callTool() method was ignoring resource-type items in MCP responses,
causing webview HTML to be lost. Now properly extracts both text and
resource items, checking for text/html mimeType in resources.

This fixes the issue where MCP tools like create_todo_list would return
HTML in resource blocks but the backend would report hasWebview=false.

Tests added for resource extraction and backward compatibility.
```

## Conclusion

The critical bug in MCP resource handling has been successfully fixed. The backend now properly:

1. ✅ Extracts HTML from resource-type items
2. ✅ Detects text/html mimeType correctly
3. ✅ Returns hasWebview=true with proper HTML content
4. ✅ Maintains backward compatibility with markdown syntax
5. ✅ Passes all 18 unit tests (including 6 new tests)

This fix enables the full MCP webview workflow, allowing MCP tools to return rich HTML interfaces that are properly detected and rendered by the frontend.

---

**Agent-002 Task Complete** ✅
