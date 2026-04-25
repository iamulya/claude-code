/**
 * Authorization Strategies — RBAC, ABAC, and Composite
 *
 * Three composable strategies for tool-level authorization:
 *
 * 1. **RoleStrategy** — Classic RBAC: map roles to allowed/denied tools
 * 2. **AttributeStrategy** — ABAC: attribute predicates with full user+args context
 * 3. **CompositeStrategy** — Compose strategies with allOf/anyOf/firstMatch semantics
 *
 * Plus convenience factories: `rbac()`, `abac()`, `when()`, `allowAllStrategy()`, `denyAllStrategy()`
 *
 * @module iam/authorization
 */

import type {
  AuthorizationStrategy,
  AuthorizationContext,
  AuthorizationDecision,
  UserContext,
} from "./types.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("iam");

// ── Glob → RegExp helper ─────────────────────────────────────────────────────

/**
 * Convert a glob pattern to a RegExp for tool name matching.
 *
 * Documentation clarifies wildcard semantics:
 * - `*` matches zero or more of ANY character (equivalent to `.*` in regex).
 * This means `admin_*` matches `admin_`, `admin_users`, AND `admin_deep_nested_thing`.
 * There is no single-segment wildcard distinction.
 * - `?` matches exactly one character.
 *
 * The result is anchored: `^pattern$` (full-match only).
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

// ── RoleStrategy (RBAC) ──────────────────────────────────────────────────────

/**
 * Role-based access control.
 *
 * Maps role names to lists of allowed (and optionally denied) tool patterns.
 * Supports glob patterns: `'search_*'`, `'admin_?_panel'`.
 *
 * @example
 * ```ts
 * const auth = new RoleStrategy({
 * roles: {
 * viewer: { allow: ['search_*', 'read_*'] },
 * editor: { allow: ['search_*', 'read_*', 'write_*'], deny: ['delete_*'] },
 * admin: { allow: ['*'] },
 * },
 * defaultAction: 'deny',
 * conflictResolution: 'most-restrictive',
 * })
 * ```
 */
export type RoleStrategyConfig = {
  roles: Record<
    string,
    {
      allow?: string[];
      deny?: string[];
    }
  >;
  /**
   * When a user has multiple roles, how to resolve conflicts.
   * - 'most-restrictive' — deny wins over allow (default, secure)
   * - 'most-permissive' — allow wins over deny (convenient)
   */
  conflictResolution?: "most-restrictive" | "most-permissive";
  /**
   * Action when no role matches the tool.
   * - 'deny' — fail-closed (default)
   * - 'abstain' — defer to next strategy in a composite
   */
  defaultAction?: "deny" | "abstain";
};

export class RoleStrategy implements AuthorizationStrategy {
  readonly name = "rbac";

  private readonly config: Required<RoleStrategyConfig>;
  private readonly compiledRoles: Map<
    string,
    {
      allow: RegExp[];
      deny: RegExp[];
    }
  >;

  constructor(config: RoleStrategyConfig) {
    this.config = {
      roles: config.roles,
      conflictResolution: config.conflictResolution ?? "most-restrictive",
      defaultAction: config.defaultAction ?? "deny",
    };

    // Pre-compile glob patterns
    this.compiledRoles = new Map();
    for (const [role, perms] of Object.entries(config.roles)) {
      this.compiledRoles.set(role, {
        allow: (perms.allow ?? []).map(globToRegex),
        deny: (perms.deny ?? []).map(globToRegex),
      });
    }
  }

  evaluate(ctx: AuthorizationContext): AuthorizationDecision {
    const userRoles = ctx.user.roles ?? [];

    // Collect allow/deny signals from all user roles
    let anyAllow = false;
    let anyDeny = false;
    let denyReason = "";

    for (const role of userRoles) {
      const compiled = this.compiledRoles.get(role);
      if (!compiled) continue;

      // Check deny rules
      for (const pattern of compiled.deny) {
        if (pattern.test(ctx.toolName)) {
          anyDeny = true;
          denyReason = `Role "${role}" denies "${ctx.toolName}"`;
        }
      }

      // Check allow rules
      for (const pattern of compiled.allow) {
        if (pattern.test(ctx.toolName)) {
          anyAllow = true;
        }
      }
    }

    // Resolve conflicts
    if (anyAllow && anyDeny) {
      return this.config.conflictResolution === "most-restrictive"
        ? { action: "deny", reason: denyReason }
        : { action: "allow", reason: "Allowed by most-permissive conflict resolution" };
    }

    if (anyDeny) return { action: "deny", reason: denyReason };
    if (anyAllow) return { action: "allow" };

    // No matching role/rule
    if (userRoles.length === 0) {
      return this.config.defaultAction === "abstain"
        ? { action: "abstain" }
        : { action: "deny", reason: "User has no roles assigned" };
    }

    return this.config.defaultAction === "abstain"
      ? { action: "abstain" }
      : { action: "deny", reason: `No role grants access to "${ctx.toolName}"` };
  }
}

// ── AttributeStrategy (ABAC) ─────────────────────────────────────────────────

/**
 * A single ABAC rule — a predicate over user attributes + tool arguments.
 */
export type AttributeRule = {
  /** Human-readable rule name (for audit logs) */
  name: string;

  /**
   * Tool patterns this rule applies to.
   * Omit or use `['*']` to apply to all tools.
   */
  tools?: string[];

  /**
   * Condition — predicate over user context and optionally tool arguments.
   * Return `true` if this rule should apply.
   */
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>;

  /** Action to take when condition matches */
  action: "allow" | "deny";

  /** Reason for denial (used when action is 'deny') */
  reason?: string;

  /**
   * Priority for rule evaluation order.
   * Higher numbers are evaluated first.
   * When omitted, defaults to 0.
   * Rules with the same priority preserve their insertion order.
   */
  priority?: number;
};

/**
 * Attribute-based access control.
 *
 * Define rules as predicates over user attributes and tool arguments.
 * Supports any attribute (department, clearance, time-of-day, etc.), plus
 * content-aware rules that inspect tool arguments.
 *
 * @example
 * ```ts
 * const auth = new AttributeStrategy({
 * rules: [
 * {
 * name: 'contractors-no-writes',
 * tools: ['write_*', 'delete_*'],
 * condition: (user) => user.attributes?.isContractor === true,
 * action: 'deny',
 * reason: 'Contractors cannot perform write operations',
 * },
 * {
 * name: 'finance-billing-access',
 * tools: ['query_invoices', 'create_invoice'],
 * condition: (user) => user.attributes?.department === 'finance',
 * action: 'allow',
 * },
 * {
 * name: 'business-hours-deploys',
 * tools: ['deploy_*'],
 * condition: () => {
 * const hour = new Date().getHours()
 * return hour >= 9 && hour <= 17
 * },
 * action: 'allow',
 * },
 * ],
 * defaultAction: 'abstain',
 * })
 * ```
 */
export type AttributeStrategyConfig = {
  rules: AttributeRule[];
  /**
   * Action when no rule matches.
   * - 'abstain' — defer to next strategy (default)
   * - 'deny' — fail-closed
   * - 'allow' — fail-open (use with caution)
   */
  defaultAction?: "abstain" | "deny" | "allow";
};

export class AttributeStrategy implements AuthorizationStrategy {
  readonly name = "abac";

  private readonly rules: Array<AttributeRule & { compiledTools?: RegExp[] }>;
  private readonly defaultAction: "abstain" | "deny" | "allow";

  constructor(config: AttributeStrategyConfig) {
    this.defaultAction = config.defaultAction ?? "abstain";
    // Sort rules by priority (highest first) for deterministic evaluation.
    // Rules with the same priority preserve their insertion order (stable sort).
    this.rules = [...config.rules]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((rule) => ({
        ...rule,
        compiledTools: rule.tools?.map(globToRegex),
      }));
  }

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    for (const rule of this.rules) {
      // Check tool pattern match
      if (rule.compiledTools) {
        const toolMatches = rule.compiledTools.some((rx) => rx.test(ctx.toolName));
        if (!toolMatches) continue;
      }

      // Wrap condition in try/catch — a crashing condition fails-closed
      // (denies the tool call) rather than propagating an uncaught exception that
      // the caller may silently swallow, allowing an unauthenticated tool call.
      let matches: boolean;
      try {
        matches = await rule.condition(ctx.user, ctx.arguments);
      } catch (condErr) {
        const msg = condErr instanceof Error ? condErr.message : String(condErr);
        logger.warn(
          `[yaaf/iam] ABAC rule "${rule.name}" condition threw: ${msg}. ` +
            "Failing closed — tool call denied.",
        );
        return {
          action: "deny",
          reason: `ABAC rule "${rule.name}" condition failed (${msg}) — access denied for safety`,
        };
      }
      if (!matches) continue;

      // Rule matched
      if (rule.action === "allow") {
        return {
          action: "allow",
          reason: `ABAC rule "${rule.name}" allows (priority=${rule.priority ?? 0})`,
        };
      }
      return {
        action: "deny",
        reason: rule.reason ?? `ABAC rule "${rule.name}" denies (priority=${rule.priority ?? 0})`,
      };
    }

    // No rule matched
    if (this.defaultAction === "allow") return { action: "allow" };
    if (this.defaultAction === "deny") return { action: "deny", reason: "No ABAC rule matched" };
    return { action: "abstain" };
  }
}

// ── CompositeStrategy ────────────────────────────────────────────────────────

/**
 * Compose multiple authorization strategies with explicit semantics.
 *
 * Three composition modes:
 * - `allOf` — ALL strategies must allow (intersection, most restrictive)
 * - `anyOf` — ANY strategy allowing is sufficient (union, most permissive)
 * - `firstMatch` — first non-abstaining decision wins (ordered priority)
 *
 * @example
 * ```ts
 * // ABAC overrides, RBAC fallback
 * const auth = CompositeStrategy.firstMatch([abacRules, rbacPolicy])
 *
 * // Both must agree
 * const strict = CompositeStrategy.allOf([rbac, abac])
 *
 * // Either is enough
 * const lenient = CompositeStrategy.anyOf([rbac, abac])
 * ```
 */
export class CompositeStrategy implements AuthorizationStrategy {
  readonly name: string;

  private constructor(
    private readonly strategies: AuthorizationStrategy[],
    private readonly mode: "allOf" | "anyOf" | "firstMatch",
    private readonly fallback: AuthorizationDecision,
  ) {
    const names = strategies.map((s) => s.name).join("+");
    this.name = `composite(${mode}:${names})`;
  }

  /** ALL strategies must allow (intersection — most restrictive) */
  static allOf(
    strategies: AuthorizationStrategy[],
    fallback?: AuthorizationDecision,
  ): CompositeStrategy {
    return new CompositeStrategy(
      strategies,
      "allOf",
      fallback ?? { action: "deny", reason: "Not all strategies agreed" },
    );
  }

  /** ANY strategy allowing is sufficient (union — most permissive) */
  static anyOf(
    strategies: AuthorizationStrategy[],
    fallback?: AuthorizationDecision,
  ): CompositeStrategy {
    return new CompositeStrategy(
      strategies,
      "anyOf",
      fallback ?? { action: "deny", reason: "No strategy allowed" },
    );
  }

  /** First non-abstaining decision wins (ordered priority) */
  static firstMatch(
    strategies: AuthorizationStrategy[],
    fallback?: AuthorizationDecision,
  ): CompositeStrategy {
    return new CompositeStrategy(
      strategies,
      "firstMatch",
      fallback ?? { action: "deny", reason: "No strategy had an opinion" },
    );
  }

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    switch (this.mode) {
      case "allOf":
        return this.evaluateAllOf(ctx);
      case "anyOf":
        return this.evaluateAnyOf(ctx);
      case "firstMatch":
        return this.evaluateFirstMatch(ctx);
    }
  }

  private async evaluateAllOf(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    let anyExplicitAllow = false;

    for (const strategy of this.strategies) {
      const decision = await strategy.evaluate(ctx);
      if (decision.action === "deny") return decision;
      if (decision.action === "allow") anyExplicitAllow = true;
      // 'abstain' — continue to next
    }

    // if ALL strategies abstained (none explicitly allowed),
    // return the fallback rather than treating silence as consent.
    if (!anyExplicitAllow) return this.fallback;
    return { action: "allow" };
  }

  private async evaluateAnyOf(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    let lastDeny: AuthorizationDecision | undefined;

    for (const strategy of this.strategies) {
      const decision = await strategy.evaluate(ctx);
      if (decision.action === "allow") return decision;
      if (decision.action === "deny") lastDeny = decision;
      // 'abstain' — try next
    }

    return lastDeny ?? this.fallback;
  }

  private async evaluateFirstMatch(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    for (const strategy of this.strategies) {
      const decision = await strategy.evaluate(ctx);
      if (decision.action !== "abstain") return decision;
    }
    return this.fallback;
  }
}

// ── Convenience Factories ────────────────────────────────────────────────────

/**
 * Quick RBAC setup — maps role names to allowed (and optionally denied) tool patterns.
 *
 * Accepts two forms per role:
 * - `string[]` — allow-list only (backwards compatible)
 * - `{ allow: string[], deny?: string[] }` — explicit allow + deny lists (FIX 4.1)
 *
 * @example
 * ```ts
 * const auth = rbac({
 * viewer: ['search_*', 'read_*'],
 * editor: { allow: ['search_*', 'read_*', 'write_*'], deny: ['write_config'] },
 * admin: ['*'],
 * })
 * ```
 */
export function rbac(
  roles: Record<string, string[] | { allow: string[]; deny?: string[] }>,
  options?: { conflictResolution?: "most-restrictive" | "most-permissive" },
): RoleStrategy {
  const config: RoleStrategyConfig = {
    roles: Object.fromEntries(
      Object.entries(roles).map(([role, perms]) => [
        role,
        Array.isArray(perms)
          ? { allow: perms } // backwards-compatible: string[] → allow-only
          : { allow: perms.allow, deny: perms.deny },
      ]),
    ),
    conflictResolution: options?.conflictResolution,
  };
  return new RoleStrategy(config);
}

/**
 * Quick ABAC setup — pass an array of attribute rules.
 *
 * @example
 * ```ts
 * const auth = abac([
 * when((user) => user.attributes?.department === 'hr')
 * .allow('query_employees', 'update_employee'),
 * when((user) => user.attributes?.isContractor)
 * .deny('delete_*', 'Contractors cannot delete'),
 * ])
 * ```
 */
export function abac(
  rules: AttributeRule[],
  options?: { defaultAction?: "abstain" | "deny" | "allow" },
): AttributeStrategy {
  return new AttributeStrategy({
    rules,
    defaultAction: options?.defaultAction,
  });
}

/**
 * ABAC rule builder — start with a condition, then chain `.allow()` or `.deny()`.
 *
 * @example
 * ```ts
 * when((user) => user.attributes?.isContractor === true)
 * .deny('delete_*', 'Contractors cannot delete')
 *
 * when((user, args) => (args.region as string) !== user.attributes?.region)
 * .deny('write_*', 'Cannot write to resources outside your region')
 *
 * when((user) => user.attributes?.clearanceLevel === 'top-secret')
 * .allow('query_classified_*')
 * ```
 */
export function when(
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>,
): {
  allow: (...tools: string[]) => AttributeRule;
  deny: (toolsOrReason: string | string[], reason?: string) => AttributeRule;
} {
  return {
    allow(...tools: string[]) {
      return {
        name: `when(…).allow(${tools.join(",")})`,
        tools: tools.length > 0 ? tools : undefined,
        condition,
        action: "allow" as const,
      };
    },
    deny(toolsOrReason: string | string[], reason?: string) {
      if (typeof toolsOrReason === "string" && !reason) {
        // deny('reason') — applies to all tools
        return {
          name: `when(…).deny(*)`,
          condition,
          action: "deny" as const,
          reason: toolsOrReason,
        };
      }
      const tools = Array.isArray(toolsOrReason) ? toolsOrReason : [toolsOrReason];
      return {
        name: `when(…).deny(${tools.join(",")})`,
        tools,
        condition,
        action: "deny" as const,
        reason: reason ?? `Denied by ABAC rule`,
      };
    },
  };
}

/** Strategy that allows everything (useful as fallback) */
export function allowAllStrategy(): AuthorizationStrategy {
  return {
    name: "allow-all",
    evaluate: () => ({ action: "allow" as const }),
  };
}

/** Strategy that denies everything (useful for locked-down mode) */
export function denyAllStrategy(reason = "Access denied"): AuthorizationStrategy {
  return {
    name: "deny-all",
    evaluate: () => ({ action: "deny" as const, reason }),
  };
}
