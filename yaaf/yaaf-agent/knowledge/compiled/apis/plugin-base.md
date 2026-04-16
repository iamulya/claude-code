---
export_name: PluginBase
source_file: src/plugin/base.ts
category: class
summary: An abstract base class providing boilerplate implementation for YAAF plugins, including versioning and health checks.
title: PluginBase
entity_type: api
stub: false
compiled_at: 2026-04-16T14:31:57.481Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/base.ts
confidence: 1
---

## Overview
`PluginBase` is an abstract base class designed to simplify the creation of YAAF plugins. It implements the standard `Plugin` interface and provides boilerplate implementations for common properties such as naming, versioning, and capability declaration. By extending `PluginBase`, developers can focus on implementing the specific logic of their plugin (such as memory management or LLM provider integration) without manually re-implementing standard framework requirements.

## Signature / Constructor
```typescript
export abstract class PluginBase implements Plugin {
  constructor(name: string, capabilities: PluginCapability[])
}
```

### Parameters
*   `name`: The unique string identifier for the plugin.
*   `capabilities`: An array of `PluginCapability` values that define the functional roles the plugin fulfills within the framework.

## Methods & Properties
*   `name`: (Property) The name of the plugin as provided during construction.
*   `capabilities`: (Property) An array of capabilities supported by the plugin.
*   `version`: (Property) A string representing the version of the plugin.
*   `healthCheck()`: (Method) A default implementation for verifying the operational status of the plugin. Concrete classes can override this to provide specific diagnostic logic.

## Examples
The following example demonstrates how to extend `PluginBase` to create a custom memory adapter.

```typescript
import { PluginBase } from 'yaaf';
import type { MemoryAdapter } from 'yaaf/types';

export class MyPlugin extends PluginBase implements MemoryAdapter {
  constructor() {
    // Initialize with a unique name and the 'memory' capability
    super('my-plugin', ['memory']);
  }

  // Implement MemoryAdapter specific methods...
}
```

## See Also
*   `Plugin`
*   `PluginCapability`