# IAM Multi-Tenant

A realistic SaaS scenario demonstrating YAAF's full IAM pipeline: **RBAC + ABAC authorization → data scoping → external permission resolution**.

## Scenario: "DataHub" Analytics Platform

- Users from different tenants (Acme Corp, Globex Inc) use the same agent
- Each user sees only their tenant's data
- Roles control which tools are available (viewer, analyst, admin)
- ABAC rules enforce additional constraints (contractors, time-of-day, regions)
- External permissions (Confluence spaces) are resolved and cached

## Run

```bash
GEMINI_API_KEY=... npm start
```

## What It Demonstrates

- **rbac()** — role → allowed tools mapping
- **abac()** / **when()** — attribute-based restrictions (e.g. contractors can't export)
- **CompositeStrategy.firstMatch()** — ABAC overrides, then RBAC fallback
- **TenantScopeStrategy** — automatic tenant data isolation
- **OwnershipScopeStrategy** — user-owns-resource filtering
- **ResolverScopeStrategy** — external permission sync (Confluence) with caching
- **systemAwareScope** — different scoping per tool/system
- **accessPolicy.onDecision** — audit logging of every IAM decision
