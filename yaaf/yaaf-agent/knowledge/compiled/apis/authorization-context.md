---
title: AuthorizationContext
entity_type: api
summary: A data structure containing all relevant information for an authorization decision, passed to an AuthorizationStrategy.
export_name: AuthorizationContext
source_file: src/iam/types.ts
category: type
search_terms:
 - authorization context object
 - IAM decision context
 - user permissions check
 - tool call authorization
 - ABAC context
 - RBAC context
 - security context for agent
 - what data is available for auth
 - AuthorizationStrategy input
 - agent security object
 - access control context
 - user context for tools
stub: false
compiled_at: 2026-04-25T00:05:07.635Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`AuthorizationContext` is a type alias for the object passed to an [AuthorizationStrategy](./authorization-strategy.md) to make an access control decision. It encapsulates all the relevant information about the current request, including the user's identity, the tool they are attempting to use, and any other contextual data needed for evaluation [Source 1].

This context object is a central component of YAAF's Identity and Access Management (IAM) subsystem. The [Agent](./agent.md) runtime automatically constructs this object and passes it to the configured authorization strategy before executing a tool call, ensuring that security policies are consistently applied [Source 1].

## Signature

The specific fields of the `AuthorizationContext` type are defined in `src/iam/types.ts`. The provided source material exports the type but does not include its detailed definition [Source 1].

```typescript
// Exported from src/iam/index.ts
export type { AuthorizationContext } from "./types.js";
```

Based on its role, the context typically includes:
*   `user`: The [UserContext](./user-context.md) of the user initiating the action.
*   `toolName`: The name of the tool being invoked.
*   `toolArgs`: The arguments passed to the tool.

## Examples

The `AuthorizationContext` is not typically created or managed directly by the developer. Instead, it is created by the YAAF runtime and passed to the authorization strategies defined in the [Agent](./agent.md)'s [AccessPolicy](./access-policy.md).

The following example shows how to configure an [abac](./abac.md) (Attribute-Based Access Control) strategy. This strategy internally receives an `AuthorizationContext` to evaluate its rules, such as checking the user's `department` attribute [Source 1].

```typescript
import { Agent, abac, when } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    authorization: abac([
      // This 'when' function receives an AuthorizationContext implicitly
      // and uses its `user` property.
      when(
        (ctx) => ctx.user.attributes?.department === 'finance'
      ).allow('query_invoices'),
      
      // Deny all other actions by default
      when(() => true).deny('*', 'Default deny policy'),
    ]),
  },
  tools: [
    // ... your tools, including 'query_invoices'
  ],
});

// When this runs, the agent will create an AuthorizationContext
// containing the user object and pass it to the abac strategy.
await agent.run('Show me invoices for last month', {
  user: { 
    userId: 'alice', 
    roles: ['viewer'], 
    attributes: { department: 'finance', tenantId: 'acme' } 
  },
});
```

## See Also

*   [AuthorizationStrategy](./authorization-strategy.md): The interface that consumes the `AuthorizationContext` to make a decision.
*   [AccessPolicy](./access-policy.md): The configuration surface for defining authorization and data scoping rules for an agent.
*   [abac](./abac.md): An attribute-based access control strategy that uses the context.
*   `UserContext`: The type representing the user's identity, typically included within the `AuthorizationContext`.

## Sources

*   [Source 1]: `src/iam/index.ts`