---
title: Access Policy (Concept)
summary: A high-level definition of rules and configurations governing access control, data scoping, and identity resolution within an agent.
tags:
 - security
 - configuration
entity_type: concept
related_subsystems:
 - IAM
search_terms:
 - agent security
 - YAAF access control
 - how to secure an agent
 - RBAC in YAAF
 - ABAC in YAAF
 - multi-tenancy for agents
 - data scoping
 - user identity in agents
 - tool authorization
 - permission management
 - IAM configuration
 - what is an AccessPolicy
 - agent audit logging
stub: false
compiled_at: 2026-04-24T17:51:00.413Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

An Access Policy is a unified configuration object that defines the security and data access rules for a YAAF agent. It serves as the central surface for the framework's Identity and Access Management (IAM) system, combining rules for [Authorization](./authorization.md) (what a user can do), [Data Scoping](./data-scoping.md) (what data a user can see), and identity resolution (who the user is) into a single configuration [Source 1].

The primary problem an Access Policy solves is enforcing security boundaries on agent operations. It ensures that [when](../apis/when.md) an agent acts on behalf of a user, it adheres to that user's specific permissions, preventing unauthorized actions and data leakage [Source 1].

## How It Works in YAAF

The Access Policy integrates several distinct but related security concepts into the agent's lifecycle. It is composed of four main components: an Identity Provider, an Authorization Strategy, a Data Scope Strategy, and an audit callback [Source 1].

1.  **Identity Resolution**: In server-based runtimes (like HTTP or WebSocket), an `IdentityProvider` is used to resolve an incoming request into a `UserContext`. This `UserContext` object contains the user's unique ID, roles, and a flexible set of attributes (e.g., department, tenant ID, clearance level). This context is the foundation for all subsequent security decisions, enabling both Role-Based Access Control ([rbac](../apis/rbac.md)) and Attribute-Based Access Control ([abac](../apis/abac.md)) [Source 1].

2.  **Authorization**: Before a tool is executed, the configured `AuthorizationStrategy` evaluates whether the current `UserContext` permits the action. The strategy returns a decision of `allow`, `deny`, or `abstain` (deferring to the next strategy in a chain). YAAF provides concrete implementations such as `RoleStrategy` for RBAC and `AttributeStrategy` for ABAC. If no authorization strategy is configured, all [Tool Calls](./tool-calls.md) are permitted by default for backward compatibility [Source 1].

3.  **Data Scoping**: If a tool call is authorized, the `DataScopeStrategy` is invoked to determine the specific data the tool is allowed to access for the current user. It resolves the `UserContext` into a `DataScope` object, which contains a set of filters. [Tools](../subsystems/tools.md) are expected to apply these filters to their queries and API calls (e.g., as `WHERE` clauses or API parameters). This mechanism is crucial for implementing patterns like multi-tenancy or resource ownership. If no data scope strategy is provided, tools have unrestricted data access by default [Source 1]. For more complex scenarios, a `PermissionResolver` can be used to query external systems like Jira or Confluence to determine a user's access rights, which then informs the `DataScope` [Source 1].

4.  **Auditing**: After each authorization decision is made, the optional `onDecision` callback is invoked with an `AccessDecisionEvent`. This allows developers to implement comprehensive audit logging for compliance and security monitoring purposes [Source 1].

## Configuration

An Access Policy is configured by passing an `accessPolicy` object to the `Agent` constructor. This object specifies the strategies for authorization and data scoping, and can optionally include an identity provider and an audit logger [Source 1].

```typescript
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Authorization strategy: decides if a tool call is allowed.
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),

    // Data scoping strategy: determines what data tools can access.
    dataScope: new TenantScopeStrategy(),

    // Audit callback: called after every authorization decision.
    onDecision: (event) => auditLog.write(event),

    // Identity provider: resolves UserContext from incoming requests.
    // (Only used in server modes)
    identityProvider: new MyIdentityProvider(),
  },
});
```
In this example, the agent is configured with a role-based authorization strategy, a strategy for isolating data by tenant, and a callback to log all access decisions [Source 1].

## Sources

[Source 1]: src/iam/types.ts