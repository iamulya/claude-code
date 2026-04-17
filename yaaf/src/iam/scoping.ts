/**
 * Data Scoping Strategies — Tenant, Ownership, Attribute, Hierarchy, Resolver-based
 *
 * Determines WHAT data a tool can access, not WHETHER it can be called.
 *
 * Strategies:
 * 1. **TenantScopeStrategy** — Multi-tenant SaaS isolation
 * 2. **OwnershipScopeStrategy** — User-owns-resource filtering
 * 3. **AttributeScopeStrategy** — Attribute-based data filtering (most flexible)
 * 4. **HierarchyScopeStrategy** — Org-chart / tree-based access
 * 5. **ResolverScopeStrategy** — Backed by an external PermissionResolver
 * 6. **CompositeScope** — Merge or prioritize multiple strategies
 *
 * @module iam/scoping
 */

import type {
  DataScopeStrategy,
  DataScope,
  ScopeContext,
  UserContext,
  PermissionResolver,
  PermissionGrant,
} from "./types.js";

// ── TenantScopeStrategy ──────────────────────────────────────────────────────

/**
 * Multi-tenant isolation — filter data by tenant ID.
 *
 * @example
 * ```ts
 * const scope = new TenantScopeStrategy({
 * tenantKey: 'tenantId',
 * bypassRoles: ['super_admin'],
 * })
 * // User with tenantId='acme' → { filters: { tenantId: 'acme' } }
 * // Super admin → { unrestricted: true }
 * ```
 */
export type TenantScopeConfig = {
  /**
   * Attribute key to use as tenant identifier.
   * Checked in: `user.attributes[tenantKey]`
   * Default: 'tenantId'
   */
  tenantKey?: string;
  /**
   * The field name to use in the filter output.
   * Default: same as `tenantKey`
   */
  filterField?: string;
  /** Roles that bypass tenant isolation */
  bypassRoles?: string[];
};

export class TenantScopeStrategy implements DataScopeStrategy {
  readonly name = "tenant";
  private readonly tenantKey: string;
  private readonly filterField: string;
  private readonly bypassRoles: Set<string>;

  constructor(config?: TenantScopeConfig) {
    this.tenantKey = config?.tenantKey ?? "tenantId";
    this.filterField = config?.filterField ?? this.tenantKey;
    this.bypassRoles = new Set(config?.bypassRoles ?? []);
  }

  resolve(ctx: ScopeContext): DataScope {
    // Check bypass roles
    if (ctx.user.roles?.some((r) => this.bypassRoles.has(r))) {
      return {
        strategy: "tenant",
        filters: {},
        unrestricted: true,
        description: "Tenant bypass (privileged role)",
      };
    }

    const tenantId = ctx.user.attributes?.[this.tenantKey];
    if (!tenantId) {
      return {
        strategy: "tenant",
        filters: { [this.filterField]: null },
        description: "No tenant ID — empty scope",
      };
    }

    return {
      strategy: "tenant",
      filters: { [this.filterField]: tenantId },
      description: `Scoped to tenant ${tenantId}`,
    };
  }
}

// ── OwnershipScopeStrategy ───────────────────────────────────────────────────

/**
 * User-owns-resource filtering.
 * Regular users see only their own resources; managers see team resources.
 *
 * @example
 * ```ts
 * const scope = new OwnershipScopeStrategy({
 * ownerField: 'createdBy',
 * managerRoles: ['team_lead', 'admin'],
 * teamField: 'teamId',
 * })
 * ```
 */
export type OwnershipScopeConfig = {
  /** Field in data records that identifies the owner (default: 'createdBy') */
  ownerField?: string;
  /** Roles that can see all records (bypass ownership) */
  adminRoles?: string[];
  /** Roles that can see team members' resources */
  managerRoles?: string[];
  /** Attribute key for team membership (default: 'teamId') */
  teamField?: string;
};

export class OwnershipScopeStrategy implements DataScopeStrategy {
  readonly name = "ownership";
  private readonly ownerField: string;
  private readonly adminRoles: Set<string>;
  private readonly managerRoles: Set<string>;
  private readonly teamField: string;

  constructor(config?: OwnershipScopeConfig) {
    this.ownerField = config?.ownerField ?? "createdBy";
    this.adminRoles = new Set(config?.adminRoles ?? ["admin"]);
    this.managerRoles = new Set(config?.managerRoles ?? []);
    this.teamField = config?.teamField ?? "teamId";
  }

  resolve(ctx: ScopeContext): DataScope {
    const { user } = ctx;

    // Admin bypass
    if (user.roles?.some((r) => this.adminRoles.has(r))) {
      return {
        strategy: "ownership",
        filters: {},
        unrestricted: true,
        description: "Admin: unrestricted access",
      };
    }

    // Manager: team-scoped
    if (user.roles?.some((r) => this.managerRoles.has(r))) {
      const teamId = user.attributes?.[this.teamField];
      if (teamId) {
        return {
          strategy: "ownership",
          filters: { [this.teamField]: teamId },
          description: `Manager scope: team ${teamId}`,
        };
      }
    }

    // Regular user: owner-scoped
    return {
      strategy: "ownership",
      filters: { [this.ownerField]: user.userId },
      description: `Owner scope: ${user.userId}`,
    };
  }
}

// ── AttributeScopeStrategy ───────────────────────────────────────────────────

/**
 * A single attribute-based scoping rule.
 */
export type AttributeScopeRule = {
  /** Condition — when should this rule produce filters? */
  condition: (user: UserContext) => boolean;

  /** Produce filters from user context */
  filters: (user: UserContext) => Record<string, unknown>;

  /** Human-readable description for audit logs */
  description?: string | ((user: UserContext) => string);
};

/**
 * Attribute-based data filtering — the most flexible scoping strategy.
 *
 * @example
 * ```ts
 * const scope = new AttributeScopeStrategy({
 * rules: [
 * {
 * condition: (user) => !user.roles?.includes('admin'),
 * filters: (user) => ({ department: user.attributes?.department }),
 * description: (user) =>
 * `Scoped to department ${user.attributes?.department}`,
 * },
 * {
 * condition: (user) => user.attributes?.region !== undefined,
 * filters: (user) => ({ region: user.attributes?.region }),
 * },
 * ],
 * })
 * ```
 */
export type AttributeScopeConfig = {
  rules: AttributeScopeRule[];
};

export class AttributeScopeStrategy implements DataScopeStrategy {
  readonly name = "attribute";
  private readonly rules: AttributeScopeRule[];

  constructor(config: AttributeScopeConfig) {
    this.rules = config.rules;
  }

  resolve(ctx: ScopeContext): DataScope {
    const mergedFilters: Record<string, unknown> = {};
    const descriptions: string[] = [];

    for (const rule of this.rules) {
      if (!rule.condition(ctx.user)) continue;

      // Merge filters from matching rules
      const filters = rule.filters(ctx.user);
      Object.assign(mergedFilters, filters);

      // Collect descriptions
      if (rule.description) {
        const desc =
          typeof rule.description === "function" ? rule.description(ctx.user) : rule.description;
        descriptions.push(desc);
      }
    }

    return {
      strategy: "attribute",
      filters: mergedFilters,
      description:
        descriptions.length > 0 ? descriptions.join("; ") : "No attribute scope rules matched",
    };
  }
}

// ── HierarchyScopeStrategy ───────────────────────────────────────────────────

/** A node in the organizational hierarchy */
export type HierarchyNode = {
  nodeId: string;
  ancestors: string[];
  descendants: string[];
  depth: number;
};

/**
 * Org-chart / tree-based access — managers see reports' data.
 *
 * @example
 * ```ts
 * const scope = new HierarchyScopeStrategy({
 * resolveHierarchy: async (userId) => orgTree.getNode(userId),
 * direction: 'down',
 * nodeField: 'departmentId',
 * })
 * ```
 */
export type HierarchyScopeConfig = {
  /** Resolve the user's position in the hierarchy */
  resolveHierarchy: (userId: string) => Promise<HierarchyNode | null>;
  /**
   * Direction of access:
   * - 'down' — user sees descendants' data (manager sees reports)
   * - 'up' — user sees ancestors' data
   * - 'both' — user sees both
   */
  direction?: "down" | "up" | "both";
  /** Field in data records that maps to a hierarchy node */
  nodeField?: string;
  /** Roles that bypass hierarchy (see everything) */
  bypassRoles?: string[];
};

export class HierarchyScopeStrategy implements DataScopeStrategy {
  readonly name = "hierarchy";
  private readonly config: Required<Omit<HierarchyScopeConfig, "bypassRoles">> & {
    bypassRoles: Set<string>;
  };

  constructor(config: HierarchyScopeConfig) {
    this.config = {
      resolveHierarchy: config.resolveHierarchy,
      direction: config.direction ?? "down",
      nodeField: config.nodeField ?? "nodeId",
      bypassRoles: new Set(config.bypassRoles ?? []),
    };
  }

  async resolve(ctx: ScopeContext): Promise<DataScope> {
    // Bypass check
    if (ctx.user.roles?.some((r) => this.config.bypassRoles.has(r))) {
      return {
        strategy: "hierarchy",
        filters: {},
        unrestricted: true,
        description: "Hierarchy bypass (privileged role)",
      };
    }

    const node = await this.config.resolveHierarchy(ctx.user.userId);
    if (!node) {
      return {
        strategy: "hierarchy",
        filters: { [this.config.nodeField]: ctx.user.userId },
        description: "No hierarchy node — self-scoped",
      };
    }

    let visibleIds: string[];
    switch (this.config.direction) {
      case "down":
        visibleIds = [node.nodeId, ...node.descendants];
        break;
      case "up":
        visibleIds = [node.nodeId, ...node.ancestors];
        break;
      case "both":
        visibleIds = [node.nodeId, ...node.ancestors, ...node.descendants];
        break;
    }

    return {
      strategy: "hierarchy",
      filters: { [this.config.nodeField]: { $in: visibleIds } },
      description: `Hierarchy (${this.config.direction}): ${visibleIds.length} nodes visible`,
    };
  }
}

// ── ResolverScopeStrategy ────────────────────────────────────────────────────

/**
 * Data scoping backed by an external PermissionResolver.
 * Queries the resolver, then maps the grants to a DataScope.
 *
 * @example
 * ```ts
 * const scope = new ResolverScopeStrategy({
 * resolver: new ConfluencePermissionResolver({ ... }),
 * toScope: (grants) => ({
 * strategy: 'confluence',
 * filters: { allowedSpaces: grants[0]?.resourceIds ?? [] },
 * }),
 * cache: { ttl: 300, maxEntries: 1000 },
 * })
 * ```
 */
export type ResolverScopeConfig = {
  resolver: PermissionResolver;
  /** Transform resolved grants into a DataScope */
  toScope: (grants: PermissionGrant[], user: UserContext) => DataScope;
  /** Cache configuration */
  cache?: {
    ttl: number; // seconds
    maxEntries?: number;
  };
};

export class ResolverScopeStrategy implements DataScopeStrategy {
  readonly name: string;
  private readonly resolver: PermissionResolver;
  private readonly toScope: (grants: PermissionGrant[], user: UserContext) => DataScope;
  private readonly cache?: Map<string, { scope: DataScope; expiresAt: number }>;
  private readonly cacheTTL: number;
  private readonly cacheMaxEntries: number;
  /**
   * Inflight promise map for cache miss coalescing.
   * When multiple concurrent requests arrive for the same userId after a cache
   * miss, they all wait on the same in-flight promise rather than each firing
   * a redundant external resolver call. Without this, a thundering herd (e.g.,
   * 50 parallel tool calls for the same user when the cache TTL expires) would
   * trigger 50 concurrent calls to Confluence/Jira/etc., exhausting rate limits.
   */
  private readonly inflight = new Map<string, Promise<DataScope>>();

  constructor(config: ResolverScopeConfig) {
    this.name = `resolver(${config.resolver.system})`;
    this.resolver = config.resolver;
    this.toScope = config.toScope;
    this.cacheTTL = (config.cache?.ttl ?? 0) * 1000;
    this.cacheMaxEntries = config.cache?.maxEntries ?? 1000;

    if (this.cacheTTL > 0) {
      this.cache = new Map();
    }
  }

  async resolve(ctx: ScopeContext): Promise<DataScope> {
    const cacheKey = ctx.user.userId;

    // Check cache (fresh)
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.scope;
      }
    }

    // Coalesce concurrent cache misses for the same userId.
    // If another request is already resolving for this user, wait for it
    // instead of making a redundant external call.
    const existing = this.inflight.get(cacheKey);
    if (existing) return existing;

    const promise = this._resolveAndCache(ctx).finally(() => {
      this.inflight.delete(cacheKey);
    });
    this.inflight.set(cacheKey, promise);
    return promise;
  }

  private async _resolveAndCache(ctx: ScopeContext): Promise<DataScope> {
    const cacheKey = ctx.user.userId;

    // Resolve from external system
    const resolved = await this.resolver.resolve(ctx.user);
    const scope = this.toScope(resolved.grants, ctx.user);

    // Cache result
    if (this.cache) {
      // LRU eviction: if at capacity, delete oldest
      if (this.cache.size >= this.cacheMaxEntries) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }

      const ttl = resolved.cacheTTL ? resolved.cacheTTL * 1000 : this.cacheTTL;
      this.cache.set(cacheKey, {
        scope,
        expiresAt: Date.now() + ttl,
      });
    }

    return scope;
  }

  /** Invalidate cache for a specific user */
  invalidate(userId: string): void {
    this.cache?.delete(userId);
  }

  /** Invalidate all cached entries */
  invalidateAll(): void {
    this.cache?.clear();
  }
}

// ── CompositeScope ───────────────────────────────────────────────────────────

/**
 * Compose multiple data scoping strategies.
 *
 * Two modes:
 * - `merge` — run all strategies, deep-merge their filters
 * - `firstMatch` — first strategy that produces a non-empty scope wins
 *
 * `merge()` semantics clarified:
 * - By default, if ANY strategy returns `unrestricted: true`, the entire merged
 * scope is unrestricted (filters cleared). This is the correct behavior when
 * a super-admin bypass scope is one of the strategies.
 * - Set `strictMerge: true` to treat unrestricted scopes like any other:
 * their (empty) filters are merged without granting global unrestricted access.
 * Use this when the composite intent is "restrict by TENANT, unless admin"
 * where the admin scope is a bypass but you still want tenant filters applied.
 *
 * @example
 * ```ts
 * // Merge: tenant + department isolation
 * const scope = CompositeScope.merge([tenantScope, departmentScope])
 * // → { filters: { tenantId: 'acme', department: 'engineering' } }
 *
 * // Priority: super-admin bypass, then tenant, then ownership
 * const scope = CompositeScope.firstMatch([
 * adminBypassScope,
 * tenantScope,
 * ownershipScope,
 * ])
 * ```
 */
export class CompositeScope implements DataScopeStrategy {
  readonly name: string;

  private constructor(
    private readonly strategies: DataScopeStrategy[],
    private readonly mode: "merge" | "firstMatch",
    /**
     * When true, unrestricted scopes contribute their (empty) filters
     * to the merge rather than short-circuiting to global unrestricted access.
     * Default: false (an unrestricted scope wins the merge — correct for admin bypass).
     */
    private readonly strictMerge: boolean,
  ) {
    const names = strategies.map((s) => s.name).join("+");
    this.name = `composite(${mode}:${names})`;
  }

  /** Merge all strategies' filters into one DataScope */
  static merge(
    strategies: DataScopeStrategy[],
    options?: {
      /**
       * Set to true to prevent a single unrestricted scope from
       * eliminating all other strategies' filters in the merged result.
       */
      strictMerge?: boolean;
    },
  ): CompositeScope {
    return new CompositeScope(strategies, "merge", options?.strictMerge ?? false);
  }

  /** First strategy with a definitive result wins */
  static firstMatch(strategies: DataScopeStrategy[]): CompositeScope {
    return new CompositeScope(strategies, "firstMatch", false);
  }

  async resolve(ctx: ScopeContext): Promise<DataScope> {
    if (this.mode === "merge") {
      return this.resolveMerge(ctx);
    }
    return this.resolveFirstMatch(ctx);
  }

  private async resolveMerge(ctx: ScopeContext): Promise<DataScope> {
    const mergedFilters: Record<string, unknown> = {};
    const descriptions: string[] = [];
    let anyUnrestricted = true; // start true; if ANY strategy restricts, result is restricted

    for (const strategy of this.strategies) {
      const scope = await strategy.resolve(ctx);

      if (!scope.unrestricted) {
        anyUnrestricted = false;
        Object.assign(mergedFilters, scope.filters);
      } else if (this.strictMerge) {
        // In strictMerge mode, treat unrestricted scopes like any other
        // — merge their (empty) filters without granting global unrestricted access.
        anyUnrestricted = false;
        // (no filters to merge from this scope, but don't grant unrestricted)
      }

      if (scope.description) {
        descriptions.push(scope.description);
      }
    }

    return {
      strategy: this.name,
      filters: mergedFilters,
      unrestricted: anyUnrestricted,
      description: descriptions.join("; "),
    };
  }

  private async resolveFirstMatch(ctx: ScopeContext): Promise<DataScope> {
    for (const strategy of this.strategies) {
      const scope = await strategy.resolve(ctx);
      // A strategy "matches" if it's unrestricted or has non-empty filters
      if (scope.unrestricted || Object.keys(scope.filters).length > 0) {
        return scope;
      }
    }

    // No strategy produced a scope
    return {
      strategy: this.name,
      filters: {},
      description: "No scoping strategy matched",
    };
  }
}

// ── systemAwareScope ─────────────────────────────────────────────────────────

/**
 * Maps tools to their backing systems and routes scope resolution
 * to the correct strategy per tool.
 *
 * @example
 * ```ts
 * const scope = systemAwareScope({
 * toolSystems: {
 * search_confluence: 'confluence',
 * query_jira: 'jira',
 * },
 * scopes: {
 * confluence: confluenceScopeStrategy,
 * jira: jiraScopeStrategy,
 * },
 * fallback: tenantScopeStrategy,
 * })
 * ```
 */
export type SystemAwareScopeConfig = {
  /** Map tool names (glob patterns) to system identifiers */
  toolSystems: Record<string, string>;
  /** Map system identifiers to their scoping strategies */
  scopes: Record<string, DataScopeStrategy>;
  /** Fallback strategy when no system matches */
  fallback?: DataScopeStrategy;
};

export function systemAwareScope(config: SystemAwareScopeConfig): DataScopeStrategy {
  return {
    name: "system-aware",
    async resolve(ctx: ScopeContext): Promise<DataScope> {
      // Direct match
      const system = config.toolSystems[ctx.toolName];
      if (system && config.scopes[system]) {
        return config.scopes[system].resolve(ctx);
      }

      // Fallback
      if (config.fallback) {
        return config.fallback.resolve(ctx);
      }

      // Default to restricted (unrestricted: false) when no system
      // mapping exists for the tool and no fallback is configured.
      // The previous default of unrestricted: true silently granted new/unmapped
      // tools full data access, which is a privilege-escalation footgun.
      // Tools must be explicitly mapped or have a fallback strategy.
      return {
        strategy: "system-aware",
        filters: {},
        unrestricted: false,
        description: `No system mapping for tool "${ctx.toolName}" — applying empty restricted scope`,
      };
    },
  };
}
