---
summary: A factory function that creates a DataScopeStrategy that maps tools to backing systems and routes scope resolution accordingly.
export_name: systemAwareScope
source_file: src/iam/scoping.ts
category: function
title: systemAwareScope
entity_type: api
search_terms:
 - tool-specific data scoping
 - route scope by tool
 - different permissions for different tools
 - system-based access control
 - map tools to systems
 - per-system data scope
 - fallback scope strategy
 - how to scope jira and confluence tools differently
 - tool system mapping
 - conditional data scope
 - dynamic scope resolution
 - multi-system authorization
stub: false
compiled_at: 2026-04-25T00:14:59.108Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `systemAwareScope` function is a factory that creates a [DataScopeStrategy](./data-scope-strategy.md). This strategy enables applying different data scoping rules based on the specific tool being executed. It is designed for scenarios where an agent uses tools that interact with multiple distinct backend systems (e.g., Jira, Confluence, a CRM), each requiring its own set of access control rules [Source 1].

The strategy works by first mapping tool names (which can be glob patterns) to logical "system" identifiers. Then, it maps each system identifier to a specific [DataScopeStrategy](./data-scope-strategy.md) instance. When determining the data scope for a tool call, it looks up the tool's associated system and uses the corresponding strategy. If a tool does not match any defined system, a fallback strategy can be used [Source 1].

## Signature

`systemAwareScope` is a function that accepts a configuration object and returns an instance of [DataScopeStrategy](./data-scope-strategy.md).

```typescript
export function systemAwareScope(config: SystemAwareScopeConfig): DataScopeStrategy;
```

### `SystemAwareScopeConfig`

The configuration object for `systemAwareScope` has the following structure [Source 1]:

```typescript
export type SystemAwareScopeConfig = {
  /** 
   * Map tool names (glob patterns) to system identifiers.
   * Example: { 'search_confluence': 'confluence', 'jira_*': 'jira' }
   */
  toolSystems: Record<string, string>;

  /** 
   * Map system identifiers to their scoping strategies.
   * Example: { confluence: confluenceScope, jira: jiraScope }
   */
  scopes: Record<string, DataScopeStrategy>;

  /** 
   * Fallback strategy to use when a tool does not match any system 
   * defined in `toolSystems`.
   */
  fallback?: DataScopeStrategy;
};
```

## Examples

The following example demonstrates how to configure `systemAwareScope` to apply different scoping strategies for tools interacting with Confluence and Jira, with a default tenant-based strategy for all other tools [Source 1].

```typescript
import { systemAwareScope, DataScopeStrategy } from 'yaaf';

// Assume these are pre-configured DataScopeStrategy instances
declare const confluenceScopeStrategy: DataScopeStrategy;
declare const jiraScopeStrategy: DataScopeStrategy;
declare const tenantScopeStrategy: DataScopeStrategy;

const scopeStrategy = systemAwareScope({
  // 1. Map tool names to system identifiers
  toolSystems: {
    search_confluence: 'confluence',
    query_jira: 'jira',
  },
  // 2. Map system identifiers to their respective strategies
  scopes: {
    confluence: confluenceScopeStrategy,
    jira: jiraScopeStrategy,
  },
  // 3. Provide a fallback for any other tool
  fallback: tenantScopeStrategy,
});

// When `scopeStrategy.getScope()` is called for the 'search_confluence' tool,
// it will delegate to `confluenceScopeStrategy`.
// For the 'query_jira' tool, it will use `jiraScopeStrategy`.
// For any other tool, it will use `tenantScopeStrategy`.
```

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The interface implemented by the strategy created by this function.

## Sources

[Source 1]: src/iam/scoping.ts