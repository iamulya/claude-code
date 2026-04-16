---
title: DevUiOptions
entity_type: api
summary: Configuration options for the YAAF Dev UI, including agent metadata and feature flags.
export_name: DevUiOptions
source_file: src/runtime/devUi.ts
category: type
stub: false
compiled_at: 2026-04-16T14:32:48.952Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/devUi.ts
confidence: 1
---

## Overview
`DevUiOptions` is a configuration type used to define the metadata and feature capabilities of an agent for the YAAF Dev UI. The Dev UI is a self-contained, zero-dependency HTML interface served during development to provide a chat interface, inspector, and debugging tools.

These options are typically passed to the `buildDevUiHtml` function at server startup to customize the UI's appearance and behavior based on the specific agent's configuration.

## Signature / Constructor

```typescript
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

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The display name of the agent, shown in the UI header and welcome state. |
| `version` | `string` | The version identifier for the agent. |
| `streaming` | `boolean` | Indicates if the agent supports streaming responses. When true, the UI enables partial markdown previews during message generation. |
| `model` | `string \| null` | The identifier of the underlying LLM (e.g., "gpt-4"). Displayed in the mobile inspector/drawer. |
| `multiTurn` | `boolean` | Specifies if the agent is configured to handle multi-turn conversation history formatting on the server side. |
| `systemPrompt` | `string \| null` | The system instructions used by the agent. If provided, it is displayed as a read-only field in the UI's Settings section. |

## Examples

### Basic Configuration
```typescript
import { DevUiOptions } from 'yaaf';

const options: DevUiOptions = {
  name: "WeatherBot",
  version: "1.2.0",
  streaming: true,
  model: "gpt-4o",
  multiTurn: true,
  systemPrompt: "You are a helpful assistant that provides weather updates."
};
```

### Minimal Configuration
```typescript
const options: DevUiOptions = {
  name: "SimpleAgent",
  version: "0.1.0",
  streaming: false,
  model: null,
  multiTurn: false,
  systemPrompt: null
};
```