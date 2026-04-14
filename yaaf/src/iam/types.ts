/**
 * IAM — Identity and Access Management types
 *
 * Core type definitions for YAAF's authorization and data-scoping system.
 * Three layers:
 *
 * 1. **Identity** (`UserContext`) — who is the user?
 * 2. **Authorization** (`AuthorizationStrategy`) — can they call this tool?
 * 3. **Data Scoping** (`DataScopeStrategy`) — what data can they see?
 *
 * Plus two integration interfaces:
 * - `IdentityProvider` — resolve identity from incoming requests
 * - `PermissionResolver` — query external systems for permissions
 *
 * @module iam/types
 */

// ── User Identity ────────────────────────────────────────────────────────────

/**
 * Identity of the end-user making a request through the agent.
 * Carries roles AND attributes — enabling both RBAC and ABAC.
 *
 * @example
 * ```ts
 * const user: UserContext = {
 *   userId: 'alice-123',
 *   name: 'Alice Chen',
 *   roles: ['editor', 'eng-team'],
 *   attributes: {
 *     department: 'engineering',
 *     tenantId: 'acme-corp',
 *     region: 'eu-west',
 *     clearanceLevel: 'confidential',
 *     isContractor: false,
 *   },
 *   credentials: {
 *     type: 'bearer',
 *     token: 'eyJ...',
 *     scopes: ['confluence:read', 'jira:read'],
 *   },
 * }
 * ```
 */
export type UserContext = {
  /** Unique user identifier */
  userId: string

  /** Display name (for audit logs, not authorization) */
  name?: string

  /**
   * Roles — used by RoleStrategy.
   * Can also be treated as the attribute `roles` in ABAC.
   */
  roles?: string[]

  /**
   * Open-ended attributes — the core of ABAC.
   *
   * Examples:
   * - `department: 'engineering'`
   * - `clearanceLevel: 'top-secret'`
   * - `tenantId: 'acme-corp'`
   * - `region: 'eu-west'`
   * - `subscription: 'enterprise'`
   * - `teamId: 'platform-team'`
   * - `isContractor: true`
   */
  attributes?: Record<string, unknown>

  /**
   * Credentials for downstream propagation.
   * Used by tools that call external APIs on behalf of the user.
   */
  credentials?: UserCredentials
}

/** Credentials that can be forwarded to downstream APIs */
export type UserCredentials = {
  type: 'bearer' | 'api_key' | 'oauth2' | 'custom'

  /** The token or key value */
  token: string

  /** OAuth scopes this token grants */
  scopes?: string[]

  /** Token expiry (tools can check freshness) */
  expiresAt?: Date

  /** Refresh token for automatic renewal */
  refreshToken?: string

  /** Custom headers to forward (e.g., X-User-Id for internal services) */
  headers?: Record<string, string>
}

// ── Authorization ────────────────────────────────────────────────────────────

/**
 * Decides whether a user can invoke a specific tool with specific arguments.
 *
 * Implementations:
 * - `RoleStrategy` — RBAC (role-to-tool mapping)
 * - `AttributeStrategy` — ABAC (attribute predicate rules)
 * - `CompositeStrategy` — compose multiple strategies
 */
export interface AuthorizationStrategy {
  readonly name: string

  /**
   * Evaluate whether the user is authorized.
   * @returns Decision: allow, deny, or abstain (defer to next strategy)
   */
  evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> | AuthorizationDecision
}

/** Context passed to authorization strategies */
export type AuthorizationContext = {
  /** The user making the request */
  user: UserContext
  /** Tool being called */
  toolName: string
  /** Arguments the LLM wants to pass */
  arguments: Record<string, unknown>
  /** Additional context (agent name, session ID, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Authorization decision.
 * - `allow` — tool call proceeds
 * - `deny` — tool call blocked with reason
 * - `abstain` — this strategy has no opinion; defer to the next one in the chain
 */
export type AuthorizationDecision =
  | { action: 'allow'; reason?: string }
  | { action: 'deny'; reason: string }
  | { action: 'abstain' }

// ── Data Scoping ─────────────────────────────────────────────────────────────

/**
 * Resolves a DataScope from the user context.
 * Tools use the scope to filter queries, API calls, etc.
 *
 * Implementations:
 * - `TenantScopeStrategy` — multi-tenant isolation
 * - `OwnershipScopeStrategy` — user-owns-resource filtering
 * - `AttributeScopeStrategy` — attribute-based data filtering
 * - `HierarchyScopeStrategy` — org-chart-based access
 * - `ResolverScopeStrategy` — backed by a PermissionResolver
 */
export interface DataScopeStrategy {
  readonly name: string

  /**
   * Resolve the scope for this request.
   * @returns A DataScope that tools use for filtering
   */
  resolve(ctx: ScopeContext): Promise<DataScope> | DataScope
}

/** Context passed to data scoping strategies */
export type ScopeContext = {
  user: UserContext
  toolName: string
  arguments: Record<string, unknown>
}

/**
 * The resolved scope — passed to tools via ToolExecutionContext.
 * Tools use this to filter data, set query parameters, etc.
 */
export type DataScope = {
  /** Strategy that produced this scope */
  strategy: string

  /**
   * Filters to apply.
   * Tools apply these as WHERE clauses, API filters, etc.
   */
  filters: Record<string, unknown>

  /**
   * Whether this scope allows unrestricted access.
   * When true, tools can skip filtering entirely.
   */
  unrestricted?: boolean

  /**
   * Human-readable description for audit logs.
   * e.g., "Scoped to tenant acme-corp" or "Filtered to user's department"
   */
  description?: string
}

// ── Permission Resolver ──────────────────────────────────────────────────────

/**
 * Queries an external system (Confluence, Jira, GDrive, etc.) to discover
 * what a specific user can access.
 *
 * Results are typically fed into a `ResolverScopeStrategy` to produce
 * DataScope filters that tools use.
 */
export interface PermissionResolver {
  readonly name: string

  /**
   * The external system this resolver queries.
   * Used for matching resolvers to tools.
   */
  readonly system: string  // e.g., 'confluence', 'jira', 'gdrive'

  /**
   * Resolve the user's permissions in the external system.
   * @returns A set of resource grants (what they can access)
   */
  resolve(user: UserContext): Promise<ResolvedPermissions>

  /**
   * Optional: check if a specific resource is accessible.
   * More efficient than resolving all permissions for single checks.
   */
  check?(user: UserContext, resourceId: string): Promise<boolean>
}

/** Result of resolving a user's permissions in an external system */
export type ResolvedPermissions = {
  /** System this applies to */
  system: string

  /** Granted resources */
  grants: PermissionGrant[]

  /** When these permissions were resolved (for cache freshness) */
  resolvedAt: Date

  /** Suggested cache TTL in seconds */
  cacheTTL?: number
}

/** A single permission grant — resources a user can access */
export type PermissionGrant = {
  /** Resource type (e.g., 'space', 'page', 'project', 'folder') */
  resourceType: string

  /** Resource IDs the user can access */
  resourceIds: string[]

  /** Access level */
  accessLevel: 'read' | 'write' | 'admin'
}

// ── Identity Provider ────────────────────────────────────────────────────────

/**
 * Resolves a UserContext from an incoming request.
 * Used in A2A/HTTP/WebSocket server modes.
 */
export interface IdentityProvider {
  readonly name: string

  /**
   * Extract user identity from the request context.
   * Returns null if the request is unauthenticated.
   */
  resolve(request: IncomingRequest): Promise<UserContext | null>
}

/** Incoming request context (from A2A, HTTP, WebSocket) */
export type IncomingRequest = {
  /** HTTP headers */
  headers: Record<string, string>
  /** Query parameters */
  query?: Record<string, string>
  /** Pre-parsed JWT claims */
  claims?: Record<string, unknown>
  /** Raw bearer token */
  token?: string
}

// ── Access Policy ────────────────────────────────────────────────────────────

/**
 * Unified configuration surface for the IAM system.
 * Combines authorization + data scoping + audit in one config.
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   tools: [...],
 *   accessPolicy: {
 *     authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),
 *     dataScope: new TenantScopeStrategy(),
 *     onDecision: (event) => auditLog.write(event),
 *   },
 * })
 * ```
 */
export type AccessPolicy = {
  /**
   * Authorization strategy — decides if a tool call is allowed.
   * Default: allow all (backward-compatible)
   */
  authorization?: AuthorizationStrategy

  /**
   * Data scoping strategy — determines what data tools can access.
   * Default: no scoping (unrestricted)
   */
  dataScope?: DataScopeStrategy

  /**
   * Identity provider — resolve UserContext from incoming requests.
   * Only used in server modes (A2A, HTTP, WebSocket).
   */
  identityProvider?: IdentityProvider

  /**
   * Audit callback — called after every authorization decision.
   * Use for compliance logging.
   */
  onDecision?: (event: AccessDecisionEvent) => void
}

/** Audit event emitted after every authorization decision */
export type AccessDecisionEvent = {
  user: UserContext
  toolName: string
  arguments: Record<string, unknown>
  decision: AuthorizationDecision
  scope?: DataScope
  timestamp: Date
  durationMs: number
}
