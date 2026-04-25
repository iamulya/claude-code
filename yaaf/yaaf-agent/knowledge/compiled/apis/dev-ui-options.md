---
title: DevUiOptions
entity_type: api
summary: Defines the configuration options for the YAAF Dev UI.
export_name: DevUiOptions
source_file: src/runtime/devUi.ts
category: type
search_terms:
 - dev ui configuration
 - development server options
 - configure agent name in ui
 - show system prompt in dev ui
 - enable streaming in dev ui
 - set model name for dev server
 - multi-turn history setting
 - agent version display
 - YAAF server UI settings
 - debug interface options
 - createServer dev ui
 - buildDevUiHtml options
stub: false
compiled_at: 2026-04-24T17:02:03.248Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/devUi.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `DevUiOptions` type defines the configuration object used to customize the YAAF Development UI [Source 1]. This UI is a self-contained HTML page served by the YAAF server (created via `createServer()`) [when](./when.md) its `devUi` option is enabled. The properties of a `DevUiOptions` object control the information displayed about the agent, such as its name, version, and capabilities like [Streaming](../concepts/streaming.md) support [Source 1].

This configuration is passed to the `buildDevUiHtml` function at server startup to generate the UI's HTML content [Source 1].

## Signature

`DevUiOptions` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type DevUiOptions = {
  /** Agent display name */
  name: string;
  /** Agent version */
  version: string;
  /** Whether the agent supports runStream() */
  streaming: boolean;
  /** Model identifier (shown in inspector). Null = not known. */
  model: string | null;
  /** Whether server-side multi-turn history formatting is active */
  multiTurn: boolean;
  /** System prompt to show read-only in Settings. Null = not exposed. */
  systemPrompt: string | null;
};
```

### Properties

- **`name`**: `string`
  The display name of the agent, which appears in the UI header.

- **`version`**: `string`
  The version of the agent, also displayed in the UI.

- **`streaming`**: `boolean`
  Set to `true` if the agent supports streaming responses via a `runStream()` method. This affects UI elements related to streaming.

- **`model`**: `string | null`
  The identifier of the language model being used by the agent (e.g., "gpt-4o"). This is shown in the UI's inspector panel. If the model is not known or not applicable, this should be `null`.

- **`multiTurn`**: `boolean`
  Indicates whether the server is configured to handle multi-turn conversation history.

- **`systemPrompt`**: `string | null`
  The [System Prompt](../concepts/system-prompt.md) used by the agent. If a string is provided, it will be displayed in a read-only format in the UI's settings panel. If `null`, the system prompt is not exposed in the UI.

## Examples

Below is an example of a `DevUiOptions` object for a fictional "HelpDesk" agent.

```typescript
import { DevUiOptions } from 'yaaf';

const helpDeskAgentUiOptions: DevUiOptions = {
  name: 'HelpDesk Agent',
  version: '1.2.0',
  streaming: true,
  model: 'claude-3-5-sonnet-20240620',
  multiTurn: true,
  systemPrompt: 'You are a helpful assistant for our internal IT help desk.',
};

// This object would be passed to a function like buildDevUiHtml
// to generate the development UI.
```

## See Also

- The `buildDevUiHtml` function, which consumes this options object to generate the UI.
- The `createServer` function, which can be configured to serve the Development UI.

## Sources

[Source 1]: src/runtime/devUi.ts