---
summary: A flexible authorization model in YAAF that evaluates rules based on user attributes and tool parameters.
title: Attribute-Based Access Control (ABAC)
entity_type: concept
related_subsystems:
  - IAM
  - Security
stub: false
compiled_at: 2026-04-16T14:20:07.006Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 0.95
---

## What It Is
Attribute-Based Access Control (ABAC) is an authorization paradigm in YAAF that determines access rights by evaluating rules against the attributes of a user, rather than relying solely on static roles. This model provides a fine-grained approach to security, allowing developers to define complex permissions based on real-time data such as a user's department, geographic region, clearance level, or organizational tenant.

In YAAF, ABAC solves the problem of "role explosion" (where too many specific roles are required to handle edge cases) by using dynamic predicates to authorize tool execution and filter data access.

## How It Works in YAAF
ABAC in YAAF is implemented through the interaction of user identities, authorization strategies, and data scoping mechanisms.

### User Attributes
The foundation of ABAC is the `UserContext` object. While it supports traditional roles, its `attributes` field is a `Record<string, unknown>` designed to hold open-ended metadata. Common attributes include:
- `tenantId`: For multi-tenant isolation.
- `clearanceLevel`: For sensitivity-based access (e.g., "confidential", "top-secret").
- `region`: For geographic data residency requirements.
- `isContractor`: For distinguishing between internal and external staff.

### Authorization Evaluation
The framework uses the `AuthorizationStrategy` interface to decide if a tool call is permitted. The `AttributeStrategy` implementation specifically evaluates these user attributes against the parameters of the requested tool. When a tool is invoked, the strategy returns an `AuthorizationDecision`:
- **allow**: The tool call proceeds.
- **deny**: The tool call is blocked, often with a specific reason for audit logs.
- **abstain**: The strategy defers the decision to the next strategy in a `CompositeStrategy` chain.

### Data Scoping
Beyond simply allowing or denying a tool call, ABAC influences what data a tool can see via the `DataScopeStrategy`. The `AttributeScopeStrategy` resolves a user's attributes into a `DataScope`. This scope contains `filters` that tools apply to their internal logic (such as database queries or API calls) to ensure the user only interacts with authorized subsets of data.

## Configuration
ABAC is configured within the `AccessPolicy` of an agent. Developers define how identities are resolved and which strategies are used to evaluate attributes.

```typescript
import { Agent } from 'yaaf';
import { AttributeStrategy, AttributeScopeStrategy } from 'yaaf/iam';

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Use ABAC to authorize tool usage
    authorization: new AttributeStrategy({
      rules: [
        {
          effect: 'allow',
          mapping: (user) => user.attributes?.department === 'engineering'
        }
      ]
    }),
    // Use ABAC to filter data access
    dataScope: new AttributeScopeStrategy(),
    // Log decisions for compliance
    onDecision: (event) => {
      console.log(`User ${event.userId} ${event.action}ed for tool ${event.toolName}`);
    },
  },
});
```

### User Context Example
A `UserContext` populated for ABAC evaluation typically looks like the following:

```typescript
const user: UserContext = {
  userId: 'alice-123',
  name: 'Alice Chen',
  roles: ['editor'],
  attributes: {
    department: 'engineering',
    tenantId: 'acme-corp',
    region: 'eu-west',
    clearanceLevel: 'confidential',
    isContractor: false,
  },
  credentials: {
    type: 'bearer',
    token: 'eyJ...',
    scopes: ['confluence:read'],
  },
};
```

## Sources
- `src/iam/types.ts`