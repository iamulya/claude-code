---
title: systemAwareScope
entity_type: api
summary: A factory function that routes scope resolution to specific strategies based on the tool being invoked.
export_name: systemAwareScope
source_file: src/iam/scoping.ts
category: function
stub: false
compiled_at: 2026-04-16T14:19:43.110Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`systemAwareScope` is a factory function used to create a routing data scoping strategy. It allows an agent to apply different security and data isolation logic depending on which specific tool is being invoked. By mapping tool names to system identifiers, developers can ensure that a Confluence search tool uses Confluence-specific permission resolvers while a Jira tool uses Jira-specific logic, all within the same agent context.

## Signature / Constructor

```typescript
export function systemAwareScope(config: SystemAwareScopeConfig): DataScopeStrategy
```

### SystemAwareScopeConfig
The configuration object defines how tools map to systems and which strategies govern those systems.

| Property | Type | Description |
| :--- | :--- | :--- |
| `toolSystems` | `Record<string, string>` | A map where keys are tool names (supporting glob patterns) and values are system identifiers. |
| `scopes` | `Record<string, DataScopeStrategy>` | A map of system identifiers to their corresponding `DataScopeStrategy` implementations. |
| `fallback` | `DataScopeStrategy` | (Optional) A strategy to use if the invoked tool does not match any pattern in `toolSystems`. |

## Examples

### Routing Multiple Systems
This example demonstrates routing scope resolution to different strategies for Confluence and Jira, with a default tenant-based isolation for other tools.

```typescript
const scope = systemAwareScope({
  toolSystems: {
    'search_confluence': 'confluence',
    'query_jira_*': 'jira', // Glob pattern matching
  },
  scopes: {
    confluence: confluenceScopeStrategy,
    jira: jiraScopeStrategy,
  },
  fallback: tenantScopeStrategy,
})
```

## See Also
- `TenantScopeStrategy`
- `OwnershipScopeStrategy`
- `AttributeScopeStrategy`
- `HierarchyScopeStrategy`
- `ResolverScopeStrategy`
- `CompositeScope`