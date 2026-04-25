---
title: Authorization
summary: The process of determining whether a user or agent has permission to perform a specific action, such as invoking a tool.
tags:
 - security
 - access-control
entity_type: concept
related_subsystems:
 - iam
search_terms:
 - access control
 - permissions
 - RBAC
 - ABAC
 - how to restrict tool usage
 - user permissions for agents
 - secure agent actions
 - AuthorizationStrategy
 - RoleStrategy
 - AttributeStrategy
 - CompositeStrategy
 - allow or deny tool calls
 - agent security policy
stub: false
compiled_at: 2026-04-24T17:52:38.201Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Authorization in YAAF is the mechanism that decides whether a given user is permitted to invoke a specific tool, potentially with specific arguments [Source 1]. It serves as a critical security layer, preventing unauthorized actions and ensuring that agents operate within the bounds of the end-user's permissions. This process is distinct from authentication (verifying a user's identity) and [Data Scoping](./data-scoping.md) (filtering the data a tool can see).

The primary goal of the [Authorization System](../subsystems/authorization-system.md) is to enforce access policies on tool usage, supporting common security patterns like Role-Based Access Control ([rbac](../apis/rbac.md)) and Attribute-Based Access Control ([abac](../apis/abac.md)) [Source 1].

## How It Works in YAAF

The core of YAAF's authorization system is the `AuthorizationStrategy` interface. Any class implementing this interface can be used to make access decisions [Source 1].

An `AuthorizationStrategy` has a single method, `evaluate`, which takes an `AuthorizationContext` (containing the `UserContext`, tool name, and arguments) and returns an `AuthorizationDecision`. The decision can be one of three actions [Source 1]:

*   **`allow`**: The tool call is permitted and proceeds.
*   **`deny`**: The tool call is blocked, and the agent's execution is halted. A reason for the denial can be provided.
*   **`abstain`**: The current strategy has no opinion on the request. This allows another strategy in a chain to make the final decision.

This decision-making process relies on the `UserContext`, which provides the identity information needed by the strategy. The `UserContext` can carry a list of `roles` for RBAC checks and a flexible `attributes` record for ABAC rules [Source 1].

YAAF provides several built-in strategy implementations [Source 1]:

*   **`RoleStrategy`**: Implements RBAC by mapping user roles to permitted [Tools](../subsystems/tools.md).
*   **`AttributeStrategy`**: Implements ABAC by evaluating rules or predicates against user attributes.
*   **`CompositeStrategy`**: Allows multiple strategies to be chained together. A request is evaluated by each strategy in order until one returns `allow` or `deny`. If all strategies `abstain`, the final outcome is typically a denial.

Authorization is configured as part of a broader `AccessPolicy` object passed to the agent. If no `authorization` strategy is provided in the policy, YAAF defaults to allowing all [Tool Calls](./tool-calls.md) to maintain backward compatibility [Source 1].

## Configuration

Authorization is configured on an `Agent` instance via the `accessPolicy` property. A developer provides an instance of an `AuthorizationStrategy` to the `authorization` key within the policy object.

The following example demonstrates how to configure an agent with an access policy that includes an authorization strategy [Source 1].

```typescript
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // The authorization strategy decides if a tool call is allowed.
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),

    // Other access policy configurations
    dataScope: new TenantScopeStrategy(),
    onDecision: (event) => auditLog.write(event),
  },
});
```

In this example, a role-based strategy is used. Users with the `viewer` role can only call tools whose names start with `read_`, while `admin` users can call any tool. If the `authorization` property were omitted, all tool calls would be permitted by default [Source 1].

## Sources

[Source 1] src/iam/types.ts