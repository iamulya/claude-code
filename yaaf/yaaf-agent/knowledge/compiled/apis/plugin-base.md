---
summary: Shared base class for all YAAF plugins, providing common properties and a default health check.
export_name: PluginBase
source_file: src/plugin/base.ts
category: class
title: PluginBase
entity_type: api
search_terms:
 - base class for plugins
 - how to create a plugin
 - YAAF plugin architecture
 - plugin lifecycle
 - implementing a new plugin
 - Plugin interface
 - PluginCapability
 - plugin health check
 - abstract plugin class
 - extending PluginBase
 - plugin boilerplate
 - common plugin properties
stub: false
compiled_at: 2026-04-24T17:28:28.220Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/plugin/base.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`PluginBase` is an abstract base class that serves as the foundation for all plugins within the YAAF framework [Source 3]. It implements the `Plugin` interface and provides common boilerplate properties such as `name`, `version`, and `capabilities`, along with a default implementation for the `healthCheck()` method.

By extending `PluginBase`, developers can create new plugins without needing to re-implement this common functionality, allowing them to focus on the unique logic of their specific component [Source 3]. Many core YAAF components, such as `BaseLLMAdapter` and `FirecrackerSandboxBackend`, extend `PluginBase` to integrate with the framework's lifecycle management and health monitoring systems, often provided by a `PluginHost` [Source 1, Source 2].

## Signature / Constructor

`PluginBase` is an abstract class that implements the `Plugin` interface.

```typescript
import type { Plugin, PluginCapability } from "./types.js";

export abstract class PluginBase implements Plugin {
  constructor(name: string, capabilities: PluginCapability[]);

  // ... properties and methods
}
```

**Constructor Parameters:**

*   `name` (`string`): A unique identifier for the plugin instance.
*   `capabilities` (`PluginCapability[]`): An array of strings declaring the capabilities the plugin provides (e.g., `'memory'`, `'llm'`, `'sandbox'`).

## Methods & Properties

`PluginBase` provides the following public properties and a default method implementation:

*   **`name`**: `string`
    *   A unique name for the plugin, set via the constructor.

*   **`capabilities`**: `PluginCapability[]`
    *   An array of capabilities the plugin implements, set via the constructor.

*   **`version`**: `string`
    *   The version of the plugin.

*   **`healthCheck()`**: `Promise<{ ok: boolean; message?: string; }>`
    *   A default implementation of the health check method. Concrete plugin classes can override this to provide custom health-check logic.

## Examples

### Basic Plugin Implementation

This example shows the minimal code required to create a new plugin by extending `PluginBase`.

```typescript
import { PluginBase } from 'yaaf';
import type { MemoryAdapter } from 'yaaf'; // Assuming MemoryAdapter is a defined interface

export class MyPlugin extends PluginBase implements MemoryAdapter {
  constructor() {
    // Call the super constructor with a unique name and capabilities array
    super('my-plugin', ['memory']);
  }

  // ... implement MemoryAdapter methods
}
```
[Source 3]

### Dual-Purpose Component

A component can extend `PluginBase` to enable integration with a `PluginHost` for lifecycle management, while also implementing another interface for standalone use. The `FirecrackerSandboxBackend` is an example of this pattern.

```typescript
import { PluginBase } from 'yaaf';
import type { SandboxExternalBackend } from 'yaaf';

// This class can be used as a standalone backend for a Sandbox,
// or registered with a PluginHost for automatic lifecycle management.
export class MyCustomBackend extends PluginBase implements SandboxExternalBackend {
  constructor(config: MyConfig) {
    super('my-custom-backend', ['sandbox']);
    // ... initialization logic
  }

  // ... implement SandboxExternalBackend methods

  // Optionally override the default health check
  async healthCheck() {
    // ... custom logic to check backend status
    return { ok: true };
  }
}
```
[Source 1]

## Sources

*   [Source 1]: `src/integrations/sandbox.firecracker.ts`
*   [Source 2]: `src/models/base.ts`
*   [Source 3]: `src/plugin/base.ts`