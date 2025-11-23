# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- No unreleased features yet

### Fixed

- No unreleased fixes yet

### Changed

- No unreleased changes yet

## [0.6.0-beta] - 2025-11-23

### Added

- **Light/Dark Mode Theme System**
  - Three-mode theme support: light, dark, and system
  - System preference detection via `prefers-color-scheme` media query
  - Real-time OS theme change detection and auto-switching
  - Theme preference persistence via localStorage
  - WCAG 2.1 AA compliant color palette
  - Seamless theme toggle UI component

- **Intelligent Conversation Title Generation**
  - Auto-generated conversation titles from first user message
  - Smart truncation (max 50 characters) for clean sidebar display
  - Automatic title update when first message is sent
  - Default "New Conversation" for empty conversations
  - Support for future manual title editing

- **Full MCP Tool Calling Support**
  - LLM can directly execute MCP tools during conversations
  - Streaming tool call detection and execution
  - Tool result feedback in chat messages
  - Tool execution status indicators
  - Integration with OpenAI-style function calling format
  - Per-conversation MCP server selection

- **Chat Summary & Export Features**
  - Generate conversation summaries (Markdown or Plain Text format)
  - Copy summary to clipboard
  - Download summary as file (`.md` or `.txt`)
  - Statistics display: message counts, tool usage
  - Conversation import/export (JSON format)

- **Enhanced MCP Info Display**
  - Modal showing all available MCP servers
  - Tool descriptions and input schemas
  - Server connection status
  - Helpful information for developers and users

### Fixed

- **MCP Tool Calling Bug**
  - Fixed issue where LLM would stop abruptly when tool calling was enabled
  - Improved streaming implementation for tool calls
  - Better error handling for failed tool execution

- **MCP Config Loading Issue**
  - Fixed port mismatch (3001 → 3000) in MCP config initialization
  - Improved MCP server connection stability
  - Better error messages for configuration issues

- **Conversation Isolation**
  - Fixed cross-contamination when switching conversations
  - Proper message buffer management between conversation switches
  - Accurate model and settings per conversation

### Changed

- **Conversation Title Handling**
  - Changed from truncated first message to smart auto-generation
  - Titles now reflect actual conversation content
  - Better sidebar UX with cleaner conversation names

- **Theme Implementation**
  - Transitioned from inline styles to CSS class-based theming
  - Improved performance with semantic color tokens
  - Better maintainability and extensibility

- **MCP Server Selection**
  - Added per-conversation MCP server selection
  - Improved server connection flow
  - Better feedback during server operations

### Deprecated

- Direct HTML in conversation titles (now auto-generated)

## [0.5.0-beta] - 2025-11-23

### Added

- **Restaurant MCP Server Example** - La Maison Élégante
  - Interactive restaurant reservation system
  - Menu viewing with photos and descriptions
  - Wine pairing recommendations
  - Chef's special and daily features
  - Secure payment form demonstration
  - Complete example MCP server implementation

- **Stop/Cancel Generation**
  - Stop button to cancel ongoing LLM generation
  - Clean cancellation of streaming responses
  - Improved UX during long-running queries

- **Auto-scroll to Streaming Content**
  - Automatic scrolling to show latest generated text
  - Smooth scrolling behavior during streaming
  - Better visibility of AI responses

- **Senior Engineer Review Documentation**
  - Comprehensive code review and analysis
  - Architecture assessment
  - Security evaluation
  - Performance recommendations

### Fixed

- **Form Submission Flicker**
  - Fixed visual flicker when submitting forms in webviews
  - Improved form state management
  - Smoother user experience

- **Direct Backend POST for Forms**
  - Forms now POST directly to backend
  - Sensitive data bypasses chat interface
  - Improved security for form submissions

- **MCP Tool Calling with System Prompts**
  - Improved system prompts for better tool calling
  - More reliable tool execution
  - Better context handling

- **Chat Summary Text Visibility in Dark Mode**
  - Fixed contrast issues in dark mode
  - Improved readability
  - Better color accessibility

- **Assistant Typing Indicator**
  - Made typing indicator scrollable
  - Fixed position issues
  - Better visual feedback

### Changed

- **README Improvements**
  - Updated documentation
  - Better examples and use cases
  - Clearer installation instructions

## [0.4.0-beta] - 2025-11-22

### Added

- **Tool Approval System**
  - Per-conversation tool approval settings
  - User control over MCP tool execution
  - Approval prompts for sensitive operations
  - Configurable approval preferences

### Fixed

- **Dark Mode Issues**
  - Fixed color contrast in dark mode
  - Improved visibility of UI elements
  - Better theme consistency

- **Tool Approval UX**
  - Improved button styling
  - Better approval flow
  - Clearer user feedback

### Changed

- **Message Suppression**
  - Suppress duplicate messages after webview display
  - Cleaner chat history
  - Better message flow management

## [0.3.0-beta] - 2025-11-22

### Added

- **Light/Dark Mode Foundation**
  - Initial theme system implementation
  - Theme toggle UI component
  - Theme persistence via localStorage

- **Inline Conversation Title Editing**
  - Edit conversation titles directly in sidebar
  - Real-time title updates
  - Better conversation organization

- **MCP Developer Documentation**
  - Comprehensive help modal
  - Tool listing and information
  - Developer guidance for creating MCP servers

- **Comprehensive Test Suite**
  - Theme system tests
  - MCP resource handling tests
  - Conversation title tests
  - Improved test coverage

### Fixed

- **MCP Tool Calling**
  - Implemented complete tool execution loop
  - Fixed TypeScript build errors
  - Better error handling

- **MCP Resource Handling**
  - Extract webview HTML from resource blocks correctly
  - Improved resource parsing
  - Better webview display

- **Stale Closure in Tool Execution**
  - Fixed closure issues in WebSocket handlers
  - Improved state management
  - More reliable tool execution

- **Theme Colors**
  - Fixed dark mode color palette
  - Improved contrast ratios
  - Better accessibility

- **Duplicate Webviews**
  - Prevent LLM from generating duplicate webviews
  - Better webview state management
  - Cleaner user experience

### Changed

- **MCP Info Display**
  - Replaced "MCP Tools" button with comprehensive "MCP Info"
  - Enhanced server information display
  - Better tool documentation

- **Webview Instructions**
  - Improved guidance for webview usage
  - Better user onboarding
  - Clearer documentation

## [0.2.0-beta] - 2025-11-22

### Added

- Comprehensive MCP developer documentation with Help Modal
- MCP tool listing and information display
- Per-conversation model settings (temperature, top_p, top_k)
- System prompt customization
- Model download and management UI
- Chat summary feature (download/copy)
- Conversation import/export functionality
- Complete webview security assessment

### Fixed

- Packaging and build issues
- MCP config loading from filesystem
- LLM-MCP tool calling integration
- Certificate generation for HTTPS support
- Webview elicitation request handling
- Form data display in chat messages

### Changed

- Replaced "MCP Tools" button with comprehensive "MCP Info" display
- Improved webview instructions and guidance
- Enhanced UI with better status indicators
- Major UX overhaul for settings and configuration

## [0.1.0-beta] - 2025-11-01

### Added

- Initial release of MCP Webview Host
- Full MCP Protocol support (tools, resources, prompts, elicitation)
- Secure webview rendering with sandboxing
- Phase 1-3 security features (XSS prevention, CSP, sandbox attributes)
- Elicitation support (form and URL modes)
- Real-time WebSocket communication
- React + TypeScript + Tailwind CSS UI
- 126 tests covering security features
- Complete documentation suite

### Features

- 🔌 Full MCP Protocol Support
- 🖼️ Secure Webview Rendering
- 🔒 Phase 1-3 Security
- 📋 Elicitation Support
- ⚡ Real-time Updates
- 🎨 Modern UI
- ✅ Well Tested (90% backend, 82% frontend coverage)

## Version History

### Commits

- **f8b54aa** - Merge pull request #9: Add comprehensive MCP developer documentation
- **570549c** - Add comprehensive MCP developer documentation with Help Modal
- **21d0738** - Fix packaging, MCP config loading, and integrate LLM-MCP tool calling
- **9203aae** - Major UX overhaul: Replace MCP Tools with MCP Info
- **1f8df54** - Fix MCP connection error and commit working mcp-config.json
- **ce5a02b** - Fix MCP config initialization and add per-conversation MCP server selection
- **63b69ff** - Add major features: improved webview instructions, model customization, certificate system
- **0f04195** - Update package-lock.json for version 0.2.0-beta
- **3dda088** - Bump version to 0.2.0-beta
- **fb02ec8** - Improve UX with model selector, conversation isolation, and export/import
- **8080c9f** - Fix webview rendering and add model download feature
- **1c4d7e2** - Add conversation management and model settings features

## Notes

### Breaking Changes

None yet. API is still in beta phase.

### Deprecations

- Direct HTML content in titles (use auto-generation)
- Manual title entry (replaced with auto-generation from content)

### Upcoming Features

- Manual conversation title editing
- Multi-session support
- Remote LLM backend support
- Additional theme customization
- Conversation search and filtering
- Advanced model parameter presets

## Reporting Issues

Found a bug? Please report it at:
https://github.com/GeorgiaDimaki-AI/mcp_host/issues

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Console logs and errors

## Contributing

Contributions are welcome! Please see the repository for contribution guidelines.
