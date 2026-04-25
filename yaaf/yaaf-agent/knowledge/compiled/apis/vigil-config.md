---
export_name: VigilConfig
source_file: src/vigil.ts
category: type
summary: Configuration interface for the Vigil autonomous agent, defining parameters for its tick interval, task persistence, and output handling.
title: VigilConfig
entity_type: api
search_terms:
 - Vigil agent settings
 - configure autonomous agent
 - tick interval setup
 - cron task storage
 - agent persistence directory
 - how to set tick prompt
 - Vigil onBrief handler
 - recurring task expiration
 - storageDir configuration
 - agent wake-up interval
 - disable tick mode
 - Vigil constructor options
 - agent wake-up prompt
stub: false
compiled_at: 2026-04-24T17:47:50.690Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`VigilConfig` is a TypeScript type that defines the configuration options for a `Vigil` agent instance. It extends the base `AgentConfig` type, adding properties specific to Vigil's autonomous capabilities, such as its proactive "tick" loop, persistent task scheduling, and [Structured Output](../concepts/structured-output.md) handling [Source 1].

This configuration object is passed to the `Vigil` class constructor or the `vigil` factory function to customize the agent's behavior [Source 1].

## Signature

`VigilConfig` is an interface that extends `AgentConfig`.

```typescript
import type { AgentConfig } from "./agent.js";

export type VigilConfig = AgentConfig & {
  /**
   * Milliseconds between autonomous tick probes.
   * Set to 0 to disable tick-driven mode (cron-only).
   * Default: 60_000 (1 minute)
   */
  tickInterval?: number;

  /**
   * The tick prompt injected into the agent on each wake-up.
   * Receives the current ISO timestamp and tick count.
   * Default: `<tick timestamp="...">You're awake — what needs attention now?</tick>`
   */
  tickPrompt?: (timestamp: string, count: number) => string;

  /**
   * Maximum number of recurring task auto-expiry in ms.
   * Set to 0 to never expire. Default: 7 days.
   */
  recurringMaxAgeMs?: number;

  /**
   * Directory for persisting scheduled tasks and the [[[[[[[[Session Journal]]]]]]]].
   * Default: `./.vigil` in the current working directory.
   */
  storageDir?: string;

  /**
   * Interceptor called when the agent produces output.
   * Use this to route agent messages to a UI, webhook, etc.
   * Also emitted as `brief` events.
   */
  onBrief?: (message: string) => void;
};
```
[Source 1]

### Properties

*   **`tickInterval`** `number` (optional)
    The interval in milliseconds between the agent's autonomous "tick" probes. This determines how often the agent wakes up to proactively decide what to do. Setting this to `0` disables the tick-driven mode, making the agent rely solely on scheduled cron tasks. The default value is `60_000` (1 minute) [Source 1].

*   **`tickPrompt`** `(timestamp: string, count: number) => string` (optional)
    A function that generates the prompt sent to the agent on each tick. It receives the current ISO timestamp and the total tick count as arguments. The default prompt is `"<tick timestamp="...">You're awake — what needs attention now?</tick>"` [Source 1].

*   **`recurringMaxAgeMs`** `number` (optional)
    The maximum age in milliseconds for recurring tasks before they automatically expire and are removed. This prevents old, non-permanent tasks from accumulating. Setting this to `0` disables auto-expiry. The default is 7 days [Source 1].

*   **`storageDir`** `string` (optional)
    The file system path to a directory where Vigil will persist its state, including scheduled tasks and the daily Session Journal. The default location is a directory named `.vigil` in the current working directory [Source 1].

*   **`onBrief`** `(message: string) => void` (optional)
    A callback function that acts as an interceptor for structured output from the agent. This is the primary way to receive communications from the agent and route them to other systems, such as a user interface or a webhook. This output is also available via the `brief` event on the `Vigil` instance [Source 1].

## Examples

### Basic Configuration

This example shows how to define a `VigilConfig` object to create an agent that wakes up every 30 seconds, uses a custom storage directory, and logs any "brief" messages to the console.

```typescript
import { Vigil, type VigilConfig } from 'yaaf';
// Assume myTools is an array of Tool instances defined elsewhere
import { myTools } from './my-tools.js';

// Define a configuration object for a Vigil agent
const config: VigilConfig = {
  systemPrompt: 'You are a proactive assistant. Check for new work.',
  tools: myTools,
  tickInterval: 30_000, // Wake up every 30 seconds
  storageDir: './data/my-agent', // Custom storage path
  onBrief: (message) => {
    console.log(`[AGENT OUTPUT]: ${message}`);
  },
};

// Use the configuration to create a new Vigil instance
const agent = new Vigil(config);

// Start the agent's autonomous loop
// agent.start();
```
[Source 1]

### Custom Tick Prompt

This example demonstrates how to provide a custom `tickPrompt` function.

```typescript
import { Vigil, type VigilConfig } from 'yaaf';
import { myTools } from './my-tools.js';

const config: VigilConfig = {
  systemPrompt: 'You are a helpful bot.',
  tools: myTools,
  tickInterval: 60_000,
  tickPrompt: (timestamp, count) => {
    return `[Wake-up Call #${count} at ${timestamp}] Time to check for tasks.`;
  },
};

const agent = new Vigil(config);
```
[Source 1]

## Sources

[Source 1]: src/vigil.ts