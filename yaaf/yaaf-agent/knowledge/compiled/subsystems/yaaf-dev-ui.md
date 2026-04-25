---
title: YAAF Dev UI
entity_type: subsystem
summary: Provides a self-contained HTML developer UI for YAAF agents, served at GET / when enabled.
primary_files:
 - src/runtime/devUi.ts
 - devUi.styles.css
 - devUi.client.js
exports:
 - DevUiOptions
 - buildDevUiHtml
search_terms:
 - agent development interface
 - debugging YAAF agents
 - how to enable dev ui
 - agent testing UI
 - local agent server
 - YAAF web interface
 - inspect agent state
 - view system prompt
 - export agent conversation
 - streaming agent output
 - mobile inspector
 - self-contained UI
stub: false
compiled_at: 2026-04-24T18:21:52.524Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/devUi.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The YAAF Dev UI subsystem provides a self-contained HTML interface for developers to interact with and inspect a running YAAF agent [Source 1]. It is designed to have zero dependencies and is served by the agent's built-in server at the root path (`GET /`) [when](../apis/when.md) enabled. The UI offers a range of features for testing and debugging, including syntax highlighting, conversation export, and a mobile-friendly inspector [Source 1].

## Architecture

The Dev UI is architected as a single, self-contained HTML page. To manage complexity and avoid string escaping issues within TypeScript template literals, the CSS and client-side JavaScript are maintained in separate files (`devUi.styles.css` and `devUi.client.js` respectively) [Source 1].

At server startup, the `buildDevUiHtml` function reads the contents of these asset files from the disk. It then inlines them directly into the HTML structure. This generated HTML string is cached and served for all subsequent requests to the root endpoint, ensuring minimal runtime overhead [Source 1].

The UI includes a lightweight, custom-built syntax highlighter that uses a single-pass, sticky-regex tokenizer to format code blocks for JavaScript/TypeScript, Python, JSON, Bash/Shell, and CSS [Source 1].

## Integration Points

The primary integration point for the Dev UI is the `createServer()` function in the YAAF runtime. The UI is activated by setting the `devUi: true` option in the server configuration. The server then uses the `buildDevUiHtml` function from this subsystem to generate the page to be served [Source 1].

## Key APIs

### `buildDevUiHtml(opts: DevUiOptions): string`

This function is the core of the subsystem. It constructs the complete HTML string for the Dev UI page by inlining CSS and JavaScript assets and populating the UI with agent-specific information provided in the `opts` parameter. It is typically called only once when the agent server starts [Source 1].

### `DevUiOptions`

A type definition that specifies the configuration data required to render the Dev UI. It includes properties such as [Source 1]:
- `name`: The agent's display name.
- `version`: The agent's version.
- `[[[[[[[[Streaming]]]]]]]]`: A boolean indicating if the agent supports Streaming responses.
- `model`: The identifier of the [LLM](../concepts/llm.md) in use.
- `multiTurn`: A boolean indicating if server-side [multi-turn history](../concepts/multi-turn-history.md) is active.
- `systemPrompt`: The agent's [System Prompt](../concepts/system-prompt.md), displayed read-only in the UI's settings.

## Configuration

The Dev UI is enabled via the configuration passed to the agent's server factory. To activate it, a developer must set `devUi: true` in the server options [Source 1]. The content displayed within the UI, such as the agent's name and model, is configured through the `DevUiOptions` object passed to the `buildDevUiHtml` function [Source 1].

## Sources

[Source 1]: src/runtime/devUi.ts