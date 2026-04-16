---
summary: Interface for resolving data filters (DataScope) based on the user context.
export_name: DataScopeStrategy
source_file: src/iam/types.ts
category: interface
title: DataScopeStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:19:56.151Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`DataScopeStrategy` is a core interface within the YAAF Identity and Access Management (IAM) subsystem. While authorization strategies determine whether a user is permitted to invoke a specific tool, a `DataScopeStrategy` defines the boundaries of the data that the tool is allowed to access during its execution.

The strategy transforms a user's identity and context into a `DataScope` object. This object contains filters that tools are expected to apply to database queries, search engine requests, or external API calls to ensure data isolation and security.

Common implementation patterns for this interface include:
*   **Multi-tenant isolation**: Filtering data by a `tenantId`.
*   **Ownership-based filtering**: Restricting access to resources owned by the requesting user.
*   **Attribute-based filtering**: Using user attributes (e.g., department, region) to constrain data access.
*   **Organizational hierarchy**: Filtering based on the user's position in an org chart.
*   **External resolution**: Querying a third-party system (like Jira or Confluence) to determine accessible resources.

## Signature

```typescript
export interface DataScopeStrategy {
  readonly name: string

  /**
   * Resolve the scope for this request.
   * @returns A DataScope that tools use for filtering
   */
  resolve(ctx: ScopeContext): Promise<DataScope> | DataScope
}
```

## Methods & Properties

### name
`readonly name: string`

A unique identifier for the strategy implementation. This name is typically included in the resulting `DataScope` to provide traceability for which strategy produced the filters.

### resolve()
`resolve(ctx: ScopeContext): Promise<DataScope> | DataScope`

The primary logic for the strategy. It accepts a context containing the user's identity and returns a `DataScope`. The implementation can be synchronous or asynchronous, allowing for strategies that need to query external databases or permission services.

## Examples

### Implementing a Tenant Isolation Strategy
This example demonstrates a strategy that extracts a `tenantId` from the user's attributes to ensure they only see data belonging to their organization.

```typescript
import { DataScopeStrategy, ScopeContext, DataScope } from 'yaaf';

export class TenantScopeStrategy implements DataScopeStrategy {
  readonly name = 'tenant-scope';

  resolve(ctx: ScopeContext): DataScope {
    const tenantId = ctx.user.attributes?.tenantId;

    if (!tenantId) {
      return {
        strategy: this.name,
        filters: {},
        unrestricted: false,
        description: 'No tenant context found; access denied by default.'
      };
    }

    return {
      strategy: this.name,
      filters: { tenantId },
      description: `Scoped to tenant: ${tenantId}`
    };
  }
}
```

### Configuring an Agent with Data Scoping
The `DataScopeStrategy` is integrated into an agent via the `AccessPolicy` configuration.

```typescript
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    dataScope: new TenantScopeStrategy(),
    // ... other IAM settings
  },
});
```

## See Also
* `DataScope`
* `UserContext`
* `AccessPolicy`
* `PermissionResolver`