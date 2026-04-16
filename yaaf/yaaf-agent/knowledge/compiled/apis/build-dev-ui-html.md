---
title: buildDevUiHtml
entity_type: api
summary: Generates the full HTML string for the Dev UI, inlining styles and client-side scripts.
export_name: buildDevUiHtml
source_file: src/runtime/devUi.ts
category: function
stub: false
compiled_at: 2026-04-16T14:32:58.360Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/devUi.ts
confidence: 1
---

## Overview
`buildDevUiHtml` is a utility function responsible for generating the complete, self-contained HTML markup for the YAAF Dev UI. It is designed to be served by the YAAF runtime (typically via `createServer`) when the `devUi` configuration is enabled.

The function produces a zero-dependency HTML page where all CSS and client-side JavaScript are inlined. This architecture avoids the complexity of managing external assets or escaping JavaScript within TypeScript template literals by reading separate source files (`devUi.styles.css` and `devUi.client.js`) at module load time and injecting them into the final string.

Key features of the generated UI include:
*   **Syntax Highlighting**: An inline, single-pass tokenizer for JS/TS, Python, JSON, Bash/Shell, and CSS.
*   **Streaming Support**: Real-time partial Markdown previews during agent execution.
*   **Mobile Inspector**: A slide-up drawer for inspecting agent state on narrow viewports.
*   **Data Export**: Functionality to export the current conversation as a Markdown file.
*   **Welcome State**: An empty-state interface featuring prompt chips for quick interaction.

## Signature / Constructor

```typescript
export function buildDevUiHtml(opts: DevUiOptions): string;

export type DevUiOptions = {
  /** Agent display name */
  name: string
  /** Agent version */
  version: string
  /** Whether the agent supports runStream() */
  streaming: boolean
  /** Model identifier (shown in inspector). Null = not known. */
  model: string | null
  /** Whether server-side multi-turn history formatting is active */
  multiTurn: boolean
  /** System prompt to show read-only in Settings. Null = not exposed. */
  systemPrompt: string | null
}
```

### Parameters
*   `opts`: A `DevUiOptions` object containing metadata and configuration flags that customize the generated interface.
    *   `name`: The display name of the agent shown in the UI header.
    *   `version`: The version string of the agent.
    *   `streaming`: A boolean indicating if the UI should enable streaming-specific interface elements.
    *   `model`: The identifier of the LLM being used, displayed in the inspector panel.
    *   `multiTurn`: Indicates if the agent is configured to handle multi-turn conversation history.
    *   `systemPrompt`: The system instructions for the agent, displayed as read-only text in the UI settings.

## Examples

### Basic Usage
This example demonstrates how to generate the HTML string for a standard agent configuration.

```typescript
import { buildDevUiHtml } from './runtime/devUi';

const html = buildDevUiHtml({
  name: "WeatherAgent",
  version: "1.2.0",
  streaming: true,
  model: "gpt-4o",
  multiTurn: true,
  systemPrompt: "You are a helpful assistant that provides weather updates."
});

// The resulting 'html' string can be served via an HTTP response
```

### Minimal Configuration
If certain details like the model or system prompt are unknown or should be hidden, they can be set to `null`.

```typescript
const html = buildDevUiHtml({
  name: "SimpleBot",
  version: "0.1.0",
  streaming: false,
  model: null,
  multiTurn: false,
  systemPrompt: null
});
```