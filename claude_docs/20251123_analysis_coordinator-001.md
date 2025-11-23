# Codebase Analysis & Swarm Deployment Plan
**Date:** 2025-11-23
**Branch:** claude/fix-mcp-tools-0127BWaGrx5gpUK6xdTNHNzD
**Coordinator:** Agent-001 (Staff Engineer)

## Executive Summary

Analysis of user interaction logs and codebase reveals one critical bug and two features that need verification. Deploying 3-agent swarm for parallel execution.

## Issues Identified

### 🔴 CRITICAL: MCP Resource Handling Bug
**Location:** `backend/src/services/mcp.ts:264-313`

**Root Cause:**
The `callTool()` method only extracts `text` type items from MCP response, completely ignoring `resource` type items that contain webview HTML.

```typescript
// Current code (BUGGY):
content = response.content
  .map(item => {
    if (item.type === 'text') {
      return item.text;
    }
    return ''; // <-- IGNORES resource items!
  })
  .join('\n');
```

**Impact:**
- Webview-example-server returns HTML in `resource` blocks (MCP spec compliant)
- Backend ignores resource blocks → no HTML extracted
- LLM receives empty result → stops abruptly with no explanation
- User sees: "Created todo list: My To-Do List" but no actual list

**Evidence from logs:**
```
📞 Calling tool: webview-example/create_todo_list
✅ Tool result: {
  "content": "Created todo list: My To-Do List\n",
  "hasWebview": false  <-- SHOULD BE TRUE!
}
```

**Fix Required:**
Extract both text AND resource items, parse resource.text for HTML webviews.

### ✅ Theme Toggle - Already Implemented
**Status:** Code exists, needs runtime verification

- `ThemeContext.tsx` - implements 3-state theme (light/dark/system)
- `ThemeToggle.tsx` - UI component integrated in Chat.tsx:814
- CSS variables in tailwind config
- Need to verify DOM classes are applied correctly

### ✅ Conversation Titles - Already Implemented
**Status:** Code exists and working

- `titleGenerator.ts` - generates 1-3 word titles
- `conversationService.ts:113-119` - auto-generates on first message
- No fixes needed, but will verify with tests

## Swarm Deployment Strategy

### Agent 1: MCP Resource Handler (CRITICAL PATH)
**Priority:** P0 - Blocking all MCP functionality
**Task:** Fix `mcp.ts` to handle resource items
**Deliverables:**
1. Update `callTool()` to extract resource items
2. Parse `resource.text` for HTML webviews
3. Add unit tests for resource handling
4. Commit: "Fix MCP resource handling - extract webview HTML from resource blocks"

**Success Criteria:**
- `hasWebview: true` when resource contains HTML
- `webviewHtml` populated with resource.text content
- Tool result test passes

### Agent 2: Theme System Verifier
**Priority:** P1 - User-facing feature
**Task:** Verify theme toggle works, fix if broken
**Deliverables:**
1. Test theme toggle in browser (manual)
2. Verify DOM classes apply (light/dark)
3. Check localStorage persistence
4. Add E2E tests for theme switching
5. Fix any CSS/DOM issues found
6. Commit: "Verify and fix theme toggle functionality"

**Success Criteria:**
- Theme toggle cycles: light → system → dark → light
- Document root gets `class="light"` or `class="dark"`
- localStorage persists selection
- Visual changes visible

### Agent 3: Test Suite Builder
**Priority:** P1 - Quality assurance
**Task:** Add comprehensive tests for all changes
**Deliverables:**
1. Backend tests for MCP resource handling
2. Frontend tests for theme context
3. Integration test for full MCP tool flow
4. Update existing tests if needed
5. Commit: "Add comprehensive tests for MCP resources and theme system"

**Success Criteria:**
- MCP resource tests pass
- Theme tests pass
- Code coverage >80% for changed files
- All existing tests still pass

## Coordination Protocol

1. **Parallel Deployment:** All 3 agents start simultaneously
2. **No Dependencies:** Agent 1, 2, 3 work on isolated codepaths
3. **Individual Commits:** Each agent commits their work separately
4. **Coordinator Review:** Agent-001 reviews all commits before merge
5. **Conflict Resolution:** Coordinator handles any merge conflicts
6. **Final Push:** Single push after all work verified

## Risk Mitigation

- **Agent 1 failure:** Critical path - coordinator takes over if needed
- **Agent 2/3 failure:** Non-blocking - can merge Agent 1 first
- **Merge conflicts:** Unlikely - separate files
- **Test failures:** Each agent fixes their own tests before commit

## Timeline Estimate

- Agent deployment: 1 min
- Parallel execution: 10-15 min
- Coordinator review: 5 min
- Final merge & push: 2 min
- **Total:** ~20 minutes

## Success Metrics

✅ MCP tools work (show_greeting_card, create_todo_list display HTML)
✅ Theme toggle cycles and persists
✅ All tests pass
✅ Clean git history with 3 focused commits
✅ PR ready for review

---
**Next Step:** Deploy agents in parallel with detailed prompts
