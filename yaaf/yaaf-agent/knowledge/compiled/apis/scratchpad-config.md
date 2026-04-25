---
export_name: ScratchpadConfig
source_file: src/agents/scratchpad.ts
category: type
summary: Defines the configuration options for initializing a Scratchpad instance, including base directory, maximum size, and file limits.
title: ScratchpadConfig
entity_type: api
search_terms:
 - scratchpad configuration
 - temporary file storage options
 - agent shared directory settings
 - configure scratchpad size
 - set scratchpad base directory
 - limit number of scratchpad files
 - maxTotalBytes setting
 - maxFiles setting
 - baseDir configuration
 - shared agent workspace setup
 - cross-agent file sharing config
 - temporary directory management
stub: false
compiled_at: 2026-04-24T17:35:44.240Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/scratchpad.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ScratchpadConfig` type defines the structure of the configuration object passed to the `Scratchpad` class constructor. It allows for customization of the shared writable directory used by agents, including its location on the filesystem, its total size capacity, and the maximum number of files it can contain.

All properties within `ScratchpadConfig` are optional. If a property is not provided, the `Scratchpad` instance will use a default value [Source 1].

## Signature

```typescript
export type ScratchpadConfig = {
  /** Base directory for scratchpad files. Default: OS tmpdir + random suffix. */
  baseDir?: string;
  /** Maximum total size in bytes. Default: 50MB. */
  maxTotalBytes?: number;
  /** Maximum number of files. Default: 100. */
  maxFiles?: number;
};
```
[Source 1]

## Properties

### `baseDir`
- **Type:** `string` (optional)
- **Description:** The path to the base directory where scratchpad files will be stored.
- **Default:** If not specified, a new directory is created within the operating system's default temporary directory with a random suffix [Source 1].

### `maxTotalBytes`
- **Type:** `number` (optional)
- **Description:** The maximum total size, in bytes, of all files stored in the scratchpad.
- **Default:** 50MB [Source 1].

### `maxFiles`
- **Type:** `number` (optional)
- **Description:** The maximum number of files that can be stored in the scratchpad.
- **Default:** 100 [Source 1].

## Examples

### Basic Initialization

This example shows how to create a `Scratchpad` instance using a custom configuration object.

```typescript
import { Scratchpad, ScratchpadConfig } from 'yaaf';

// Define a custom configuration for the scratchpad
const config: ScratchpadConfig = {
  baseDir: '/tmp/my-agent-scratchpad',
  maxTotalBytes: 100 * 1024 * 1024, // 100MB
  maxFiles: 200,
};

// Instantiate Scratchpad with the custom configuration
const scratch = new Scratchpad(config);

// ... use the scratchpad instance
```
[Source 1]

### Partial Configuration

Since all properties are optional, you can provide only the ones you wish to override.

```typescript
import { Scratchpad, ScratchpadConfig } from 'yaaf';

// Only override the base directory, using defaults for size and file limits
const partialConfig: ScratchpadConfig = {
  baseDir: '/var/run/yaaf-session-123',
};

const scratch = new Scratchpad(partialConfig);
```
[Source 1]

## See Also

- `Scratchpad`: The class that consumes this configuration object to create a shared file space for agents.

## Sources

[Source 1]: src/agents/scratchpad.ts