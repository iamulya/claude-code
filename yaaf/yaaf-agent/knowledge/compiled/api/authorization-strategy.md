---
summary: Interface for deciding whether a user can invoke a specific tool with specific arguments.
export_name: AuthorizationStrategy
source_file: src/iam/types.ts
category: interface
title: AuthorizationStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:19:52.985Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`AuthorizationStrategy` is the core interface for implementing access control logic within the YAAF framework. It defines how the system evaluates whether a specific user, represented by a `UserContext`, is permitted to execute a tool. 

The framework supports multiple authorization models through this interface, including:
*   **Role-Based Access Control (RBAC)**: Mapping user roles to specific tool permissions.
*   **Attribute-Based Access Control (ABAC)**: Using fine-grained user attributes (e.g., department, clearance level) to determine access.
*   **Composite Strategies**: Combining multiple strategies where decisions can be deferred or aggregated.

## Signature / Constructor

```typescript
export interface AuthorizationStrategy {
  readonly name: string;

  /**
   * Evaluate whether the user is authorized.
   * @returns Decision: allow, deny, or abstain (defer to next strategy)
   */
  evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> | AuthorizationDecision;
}
```

### Related Types

#### AuthorizationDecision
The result of an evaluation. It can take one of three forms:
*   `allow`: The tool call is permitted to proceed.
*   `deny`: The tool call is blocked, typically including a reason for the rejection.
*   `abstain`: The strategy has no opinion on the request and defers the decision to the next strategy in a chain.

## Methods & Properties

| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | A read-only identifier for the strategy, used for logging and debugging. |
| `evaluate` | `Method` | Accepts an `AuthorizationContext` and returns an `AuthorizationDecision`. This method can be synchronous or asynchronous. |

## Examples

### Implementing a Simple Attribute-Based Strategy
This example demonstrates a strategy that only allows users with a specific clearance level to access tools.

```typescript
import { AuthorizationStrategy, AuthorizationContext, AuthorizationDecision } from 'yaaf';

class ClearanceStrategy implements AuthorizationStrategy {
  readonly name = 'ClearanceStrategy';

  evaluate(ctx: AuthorizationContext): AuthorizationDecision {
    const { user } = ctx;
    
    const clearance = user.attributes?.clearanceLevel;

    if (clearance === 'top-secret') {
      return { action: 'allow' };
    }

    return { 
      action: 'deny', 
      reason: 'Insufficient clearance level.' 
    };
  }
}
```

### Using a Strategy in an Access Policy
Strategies are typically registered within an `AccessPolicy` when initializing an agent.

```typescript
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    authorization: new ClearanceStrategy(),
  },
});
```

## See Also
* `UserContext`
* `AccessPolicy`
* `DataScopeStrategy`