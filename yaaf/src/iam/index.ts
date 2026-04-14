/**
 * IAM — Identity and Access Management
 *
 * Production-grade authorization and data scoping for YAAF agents.
 *
 * Three layers:
 * 1. **Identity** — Who is the user? (`UserContext`, `IdentityProvider`)
 * 2. **Authorization** — Can they call this tool? (`AuthorizationStrategy`, RBAC/ABAC)
 * 3. **Data Scoping** — What data can they see? (`DataScopeStrategy`, tenant/ownership/attribute)
 *
 * Plus:
 * - `PermissionResolver` — query external systems (Confluence, Jira, etc.) for permissions
 * - `AccessPolicy` — unified config surface combining all layers
 *
 * @example Quick RBAC
 * ```ts
 * import { rbac } from 'yaaf'
 *
 * const agent = new Agent({
 *   tools: [...],
 *   accessPolicy: {
 *     authorization: rbac({
 *       viewer: ['search_*', 'read_*'],
 *       editor: ['search_*', 'read_*', 'write_*'],
 *       admin: ['*'],
 *     }),
 *   },
 * })
 * ```
 *
 * @example ABAC + Data Scoping
 * ```ts
 * import { abac, when, CompositeStrategy, TenantScopeStrategy } from 'yaaf'
 *
 * const agent = new Agent({
 *   accessPolicy: {
 *     authorization: CompositeStrategy.firstMatch([
 *       abac([
 *         when((u) => u.attributes?.isContractor).deny('delete_*', 'Contractors cannot delete'),
 *         when((u) => u.attributes?.department === 'finance').allow('query_invoices'),
 *       ]),
 *       rbac({ viewer: ['read_*'], admin: ['*'] }),
 *     ]),
 *     dataScope: new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
 *   },
 * })
 *
 * await agent.run('Show me invoices', {
 *   user: { userId: 'alice', roles: ['viewer'], attributes: { tenantId: 'acme' } },
 * })
 * ```
 *
 * @module iam
 */

// ── Core Types ───────────────────────────────────────────────────────────────
export type {
  UserContext,
  UserCredentials,
  AuthorizationStrategy,
  AuthorizationContext,
  AuthorizationDecision,
  DataScopeStrategy,
  DataScope,
  ScopeContext,
  PermissionResolver,
  ResolvedPermissions,
  PermissionGrant,
  IdentityProvider,
  IncomingRequest,
  AccessPolicy,
  AccessDecisionEvent,
} from './types.js'

// ── Authorization Strategies ─────────────────────────────────────────────────
export {
  RoleStrategy,
  AttributeStrategy,
  CompositeStrategy,
  rbac,
  abac,
  when,
  allowAllStrategy,
  denyAllStrategy,
  type RoleStrategyConfig,
  type AttributeRule,
  type AttributeStrategyConfig,
} from './authorization.js'

// ── Data Scoping Strategies ──────────────────────────────────────────────────
export {
  TenantScopeStrategy,
  OwnershipScopeStrategy,
  AttributeScopeStrategy,
  HierarchyScopeStrategy,
  ResolverScopeStrategy,
  CompositeScope,
  systemAwareScope,
  type TenantScopeConfig,
  type OwnershipScopeConfig,
  type AttributeScopeRule,
  type AttributeScopeConfig,
  type HierarchyNode,
  type HierarchyScopeConfig,
  type ResolverScopeConfig,
  type SystemAwareScopeConfig,
} from './scoping.js'
