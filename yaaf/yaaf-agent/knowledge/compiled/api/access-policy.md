---
summary: Unified configuration surface for the agent's IAM system, combining authorization and data scoping.
export_name: AccessPolicy
source_file: src/iam/types.ts
category: type
title: AccessPolicy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:19:55.127Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`AccessPolicy` is the central configuration interface for the Identity and Access Management (IAM) system within YAAF. It provides a unified surface to define how an agent identifies users, authorizes tool execution, restricts data access through scoping, and audits security decisions.

This type is typically used when initializing an agent to transition from a permissive "allow-all" state to a production-grade security model.

## Signature
```typescript
export type AccessPolicy = {
  authorization?: AuthorizationStrategy
  dataScope?: DataScopeStrategy
  identityProvider?: IdentityProvider
  onDecision?: (event: AccessDecisionEvent) => void
}
```

## Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `authorization` | `AuthorizationStrategy` | Optional. A strategy that decides if a specific tool call is allowed based on the user context. If omitted, the agent defaults to allowing all tool calls. |
| `dataScope` | `DataScopeStrategy` | Optional. A strategy that determines what specific data subsets (e.g., tenants, departments) a tool is permitted to access. If omitted, access is unrestricted. |
| `identityProvider` | `IdentityProvider` | Optional. Responsible for resolving a `UserContext` from incoming requests. This is primarily utilized in server-side runtimes such as HTTP, WebSocket, or Agent-to-Agent (A2A) modes. |
| `onDecision` | `(event: AccessDecisionEvent) => void` | Optional. An audit callback triggered after every authorization evaluation. This is used for compliance logging and security monitoring. |

## Examples

### Basic RBAC Configuration
This example demonstrates configuring an agent with a Role-Based Access Control (RBAC) strategy and a multi-tenant data scoping strategy.

```typescript
import { Agent, rbac, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Define tool-level permissions based on roles
    authorization: rbac({ 
      viewer: ['read_*'], 
      admin: ['*'] 
    }),
    
    // Ensure tools only see data belonging to the user's tenant
    dataScope: new TenantScopeStrategy(),
    
    // Log all decisions for auditing
    onDecision: (event) => {
      console.log(`User ${event.userId} attempted ${event.tool}: ${event.action}`);
    },
  },
});
```

## See Also
* `AuthorizationStrategy`
* `DataScopeStrategy`
* `IdentityProvider`
* `UserContext`