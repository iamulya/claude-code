---
summary: Configuration options for the systemAwareScope function.
export_name: SystemAwareScopeConfig
source_file: src/iam/scoping.ts
category: type
title: SystemAwareScopeConfig
entity_type: api
search_terms:
 - tool-specific data scoping
 - system-based access control
 - route data scope by tool
 - map tools to systems
 - per-system authorization
 - fallback data scope
 - how to scope different tools
 - multi-system data access
 - glob pattern tool mapping
 - system aware scope configuration
 - DataScopeStrategy mapping
 - IAM scoping
stub: false
compiled_at: 2026-04-25T00:15:01.119Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`SystemAwareScopeConfig` is a type alias that defines the configuration for the `systemAwareScope` function. This configuration allows for routing data scope resolution to different [DataScopeStrategies](./data-scope-strategy.md) based on which tool is being used. It is essential for agents that interact with multiple backend systems (e.g., Jira, Confluence, a private database), each with its own distinct data access and isolation rules [Source 1].

The configuration works by first mapping tool names, which can be glob patterns, to abstract "system" identifiers. Then, it maps each system identifier to a specific [DataScopeStrategy](./data-scope-strategy.md). A fallback strategy can also be provided for any tools that do not match a defined system [Source 1].

## Signature

`SystemAwareScopeConfig` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type SystemAwareScopeConfig = {
  /**
   * Maps tool names (which can be glob patterns) to system identifiers.
   * For example, { 'jira_*': 'jira', 'confluence_search': 'confluence' }.
   */
  toolSystems: Record<string, string>;

  /**
   * Maps the system identifiers defined in `toolSystems` to their
   * corresponding data scoping strategies.
   */
  scopes: Record<string, DataScopeStrategy>;

  /**
   * An optional fallback strategy to use for any tool that does not match
   * a pattern in `toolSystems`.
   */
  fallback?: DataScopeStrategy;
};
```

## Examples

The following example demonstrates how to configure a `systemAwareScope` to use different strategies for Confluence and Jira tools, with a tenant-based strategy as a default fallback [Source 1].

```typescript
import {
  systemAwareScope,
  SystemAwareScopeConfig,
  TenantScopeStrategy,
  ResolverScopeStrategy,
} from 'yaaf';

// Assume these strategies are already configured
const confluenceScopeStrategy = new ResolverScopeStrategy({ /* ... */ });
const jiraScopeStrategy = new ResolverScopeStrategy({ /* ... */ });
const tenantScopeStrategy = new TenantScopeStrategy({ tenantKey: 'orgId' });

const config: SystemAwareScopeConfig = {
  // 1. Map tool names to system identifiers
  toolSystems: {
    search_confluence: 'confluence',
    query_jira: 'jira',
  },
  // 2. Map system identifiers to their scoping strategies
  scopes: {
    confluence: confluenceScopeStrategy,
    jira: jiraScopeStrategy,
  },
  // 3. Provide a fallback for any other tool
  fallback: tenantScopeStrategy,
};

// Create the composite data scope strategy
const scope = systemAwareScope(config);

// When a tool like 'search_confluence' is used, `confluenceScopeStrategy` will be invoked.
// When 'query_jira' is used, `jiraScopeStrategy` is invoked.
// For any other tool, `tenantScopeStrategy` is used.
```

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The core interface implemented by all data scoping strategies.

## Sources

[Source 1]: src/iam/scoping.ts