---
title: ScopeContext
entity_type: api
summary: An object containing user and tool call information provided to a DataScopeStrategy to determine data access rights.
export_name: ScopeContext
source_file: src/iam/types.ts
category: type
search_terms:
 - data scoping context
 - user context for data scope
 - DataScopeStrategy input
 - tenant id scoping
 - multi-tenancy authorization
 - filter data by user
 - what data can a user see
 - IAM data filtering
 - tool call scope
 - user attributes for scoping
 - access control context
 - data visibility
stub: false
compiled_at: 2026-04-25T00:13:11.728Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ScopeContext` is a data structure used within YAAF's Identity and Access Management (IAM) subsystem. It provides the necessary context to a [DataScopeStrategy](./data-scope-strategy.md) for it to resolve what data a user is permitted to access during a specific operation [Source 1].

This object bundles information about the user making the request (the `UserContext`, including their ID, roles, and attributes) and the specific tool call being executed. This allows for the implementation of fine-grained data filtering rules, such as multi-tenancy, ownership checks, or other attribute-based access control for data [Source 1].

## Signature

While the source material does not provide the full definition, a `ScopeContext` object typically contains the user's context and the relevant tool call.

```typescript
import type { UserContext } from './types.js';
import type { ToolCall } from '../tool.js';

export type ScopeContext = {
  /**
   * The user context for the current operation, containing identity,
   * roles, and attributes.
   */
  user: UserContext;

  /**
   * The tool call that is being evaluated for data scoping.
   */
  toolCall: ToolCall;
};
```

## Properties

- **`user`**: `UserContext`
  - An object representing the user initiating the action. It includes their unique identifier, roles, and any other attributes (like `tenantId`) needed for access decisions.

- **`toolCall`**: `ToolCall`
  - The specific tool invocation being performed. This allows a [DataScopeStrategy](./data-scope-strategy.md) to apply different scoping rules based on the action being taken.

## Examples

When an agent run is initiated with a `UserContext`, YAAF internally creates a `ScopeContext` and passes it to the configured [DataScopeStrategy](./data-scope-strategy.md) before executing a tool.

The following example shows how a `TenantScopeStrategy` would implicitly use a `ScopeContext` generated from the `user` object provided to `agent.run`.

```typescript
import { Agent, TenantScopeStrategy } from 'yaaf';

// A custom DataScopeStrategy that logs the context it receives.
class LoggingTenantScopeStrategy extends TenantScopeStrategy {
  async resolve(context: ScopeContext) {
    console.log('Resolving data scope for user:', context.user.userId);
    console.log('Based on attributes:', context.user.attributes);
    return super.resolve(context);
  }
}

const agent = new Agent({
  // ... other agent config
  accessPolicy: {
    // This strategy will receive a ScopeContext for each tool call.
    dataScope: new LoggingTenantScopeStrategy({ bypassRoles: ['super_admin'] }),
  },
});

// When this runs, the agent creates a ScopeContext containing this user object
// and passes it to the LoggingTenantScopeStrategy.
await agent.run('Show me invoices', {
  user: {
    userId: 'alice',
    roles: ['viewer'],
    attributes: { tenantId: 'acme' },
  },
});

// Expected console output from the strategy:
// Resolving data scope for user: alice
// Based on attributes: { tenantId: 'acme' }
```

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The primary consumer of the `ScopeContext`, used to implement data filtering logic.
- [AccessPolicy](./access-policy.md): The configuration surface where a [DataScopeStrategy](./data-scope-strategy.md) is attached to an agent.
- `UserContext`: The type defining the user's identity, roles, and attributes, which is a key part of `ScopeContext`.

## Sources

[Source 1]: src/iam/index.ts