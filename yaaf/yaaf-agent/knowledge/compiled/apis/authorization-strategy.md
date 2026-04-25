---
summary: An interface for deciding whether a user can invoke a specific tool with specific arguments.
export_name: AuthorizationStrategy
source_file: src/iam/types.ts
category: interface
title: AuthorizationStrategy
entity_type: api
search_terms:
 - tool authorization
 - access control for agents
 - how to secure tools
 - RBAC for LLM agents
 - ABAC for LLM agents
 - user permissions
 - agent security policy
 - allow or deny tool calls
 - implementing security rules
 - RoleStrategy
 - AttributeStrategy
 - CompositeStrategy
 - IAM for agents
 - authorization context
stub: false
compiled_at: 2026-04-24T16:51:47.300Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `[[[[[[[[Authorization]]]]]]]]Strategy` interface defines the contract for making Authorization decisions within the YAAF framework [Source 2]. Its primary purpose is to determine whether a given user, represented by a `UserContext`, is permitted to invoke a specific tool with a particular set of arguments. This allows for fine-grained access control over an agent's capabilities [Source 1, Source 2].

An `AuthorizationStrategy` is a core component of the `AccessPolicy` system. [when](./when.md) its `evaluate` method is called, it returns a decision of `allow`, `deny`, or `abstain`. The `abstain` decision is crucial for composing multiple strategies, as it allows a strategy to defer the decision to the next one in a chain [Source 2].

YAAF provides several concrete implementations of this interface [Source 2]:
*   `RoleStrategy`: Implements Role-Based Access Control ([rbac](./rbac.md)), mapping user roles to allowed or denied tool patterns.
*   `AttributeStrategy`: Implements Attribute-Based Access Control ([abac](./abac.md)), using flexible rules based on user attributes and tool arguments.
*   `CompositeStrategy`: Allows combining multiple strategies using `allOf`, `anyOf`, or `firstMatch` logic.

## Signature

`AuthorizationStrategy` is a TypeScript interface with one property and one method [Source 2].

```typescript
export interface AuthorizationStrategy {
  readonly name: string;

  evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> | AuthorizationDecision;
}
```

The `evaluate` method returns an `AuthorizationDecision` object, which has the following structure [Source 2]:

```typescript
export type AuthorizationDecision =
  | { action: "allow"; reason?: string }
  | { action: "deny"; reason: string }
  | { action: "abstain"; reason?: string };
```

## Methods & Properties

### `name`

A read-only string that provides a human-readable name for the strategy implementation. This is useful for logging and debugging purposes [Source 2].

*   **Type**: `readonly string`

### `evaluate(ctx)`

The core method of the interface. It evaluates the provided authorization context and returns a decision. This method can be synchronous or asynchronous [Source 2].

*   **Signature**: `evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> | AuthorizationDecision`
*   **Parameters**:
    *   `ctx`: `AuthorizationContext` - An object containing all the information needed to make a decision, including the `UserContext`, the name of the tool being invoked, and the arguments passed to it.
*   **Returns**: An `AuthorizationDecision` object indicating whether the action is allowed, denied, or if the strategy abstains from making a decision.

## Examples

An `AuthorizationStrategy` is typically configured on an agent via the `AccessPolicy`. The following example demonstrates configuring an agent with an RBAC-based strategy created using the `rbac` factory function [Source 1, Source 2].

```typescript
import { Agent } from 'yaaf';
import { rbac } from 'yaaf/iam';

// Define an RBAC authorization strategy
const myAuthorizationStrategy = rbac({
  viewer: { allow: ['search_*', 'read_*'] },
  editor: { allow: ['search_*', 'read_*', 'write_*'], deny: ['delete_*'] },
  admin: { allow: ['*'] },
});

// Create an agent with the strategy defined in its access policy
const agent = new Agent({
  tools: [/* ... your tools ... */],
  accessPolicy: {
    authorization: myAuthorizationStrategy,
    onDecision: (event) => console.log('Authorization Decision:', event),
  },
});

// When the agent attempts to use a tool, `myAuthorizationStrategy.evaluate()`
// will be called to determine if the user is authorized.
```

## See Also

*   **Implementations**: `RoleStrategy`, `AttributeStrategy`, `CompositeStrategy`
*   **Factory Functions**: `rbac`, `abac`, `when`
*   **Related Concepts**: `AccessPolicy`, `UserContext`

## Sources

*   [Source 1]: `src/iam/authorization.ts`
*   [Source 2]: `src/iam/types.ts`