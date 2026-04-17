/**
 * IAM (Identity & Access Management) Test Suite
 *
 * Tests the full authorization and data-scoping pipeline:
 *
 * - RoleStrategy — RBAC with glob patterns, conflict resolution
 * - AttributeStrategy — ABAC with user/arg predicates
 * - CompositeStrategy — allOf, anyOf, firstMatch composition
 * - Convenience factories — rbac(), abac(), when()
 * - TenantScopeStrategy — multi-tenant isolation
 * - OwnershipScopeStrategy — user-owns-resource filtering
 * - AttributeScopeStrategy — attribute-based data filtering
 * - HierarchyScopeStrategy — org-chart access
 * - ResolverScopeStrategy — external permission resolver with caching
 * - CompositeScope — merge/firstMatch scope composition
 * - systemAwareScope — per-tool system routing
 * - Full pipeline — Agent.run() with user context → authorization → scoping → tool execution
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RoleStrategy,
  AttributeStrategy,
  CompositeStrategy,
  rbac,
  abac,
  when,
  allowAllStrategy,
  denyAllStrategy,
  TenantScopeStrategy,
  OwnershipScopeStrategy,
  AttributeScopeStrategy,
  HierarchyScopeStrategy,
  ResolverScopeStrategy,
  CompositeScope,
  systemAwareScope,
  type UserContext,
  type AuthorizationContext,
  type PermissionResolver,
  type ResolvedPermissions,
  type DataScope,
  type AttributeRule,
} from "../iam/index.js";
import { AgentRunner, type ChatResult } from "../agents/runner.js";
import { buildTool } from "../tools/tool.js";
import { createMockModel } from "./_helpers.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: "alice-123",
    name: "Alice Chen",
    roles: ["viewer"],
    attributes: {
      department: "engineering",
      tenantId: "acme-corp",
      region: "eu-west",
      isContractor: false,
    },
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    user: makeUser(),
    toolName: "search_docs",
    arguments: { query: "test" },
    ...overrides,
  };
}

// ── RoleStrategy (RBAC) ──────────────────────────────────────────────────────

describe("RoleStrategy (RBAC)", () => {
  const strategy = new RoleStrategy({
    roles: {
      viewer: { allow: ["search_*", "read_*"] },
      editor: { allow: ["search_*", "read_*", "write_*"], deny: ["delete_*"] },
      admin: { allow: ["*"] },
    },
  });

  it("allows tools matching role patterns", () => {
    const result = strategy.evaluate(makeCtx({ toolName: "search_docs" }));
    expect(result).toEqual({ action: "allow" });
  });

  it("denies tools not matching any role pattern", () => {
    const result = strategy.evaluate(makeCtx({ toolName: "deploy_production" }));
    expect(result).toEqual({
      action: "deny",
      reason: 'No role grants access to "deploy_production"',
    });
  });

  it("allows wildcard admin access", () => {
    const ctx = makeCtx({
      user: makeUser({ roles: ["admin"] }),
      toolName: "deploy_production",
    });
    expect(strategy.evaluate(ctx)).toEqual({ action: "allow" });
  });

  it("denies explicitly denied tools", () => {
    const ctx = makeCtx({
      user: makeUser({ roles: ["editor"] }),
      toolName: "delete_record",
    });
    const result = strategy.evaluate(ctx);
    expect(result.action).toBe("deny");
    expect((result as { reason: string }).reason).toContain("denies");
  });

  it("uses most-restrictive conflict resolution by default", () => {
    // User has both editor (deny delete_*) and admin (allow *) roles
    const ctx = makeCtx({
      user: makeUser({ roles: ["editor", "admin"] }),
      toolName: "delete_record",
    });
    const result = strategy.evaluate(ctx);
    expect(result.action).toBe("deny"); // deny wins
  });

  it("supports most-permissive conflict resolution", () => {
    const lenient = new RoleStrategy({
      roles: {
        editor: { deny: ["delete_*"] },
        admin: { allow: ["*"] },
      },
      conflictResolution: "most-permissive",
    });
    const ctx = makeCtx({
      user: makeUser({ roles: ["editor", "admin"] }),
      toolName: "delete_record",
    });
    expect(lenient.evaluate(ctx)).toEqual({
      action: "allow",
      reason: "Allowed by most-permissive conflict resolution",
    });
  });

  it("denies users with no roles", () => {
    const ctx = makeCtx({ user: makeUser({ roles: [] }) });
    const result = strategy.evaluate(ctx);
    expect(result.action).toBe("deny");
    expect((result as { reason: string }).reason).toContain("no roles");
  });

  it("supports abstain as defaultAction", () => {
    const abstaining = new RoleStrategy({
      roles: { viewer: { allow: ["read_*"] } },
      defaultAction: "abstain",
    });
    const ctx = makeCtx({
      user: makeUser({ roles: ["viewer"] }),
      toolName: "deploy",
    });
    expect(abstaining.evaluate(ctx)).toEqual({ action: "abstain" });
  });
});

// ── AttributeStrategy (ABAC) ────────────────────────────────────────────────

describe("AttributeStrategy (ABAC)", () => {
  const strategy = new AttributeStrategy({
    rules: [
      {
        name: "contractors-no-writes",
        tools: ["write_*", "delete_*"],
        condition: (user) => user.attributes?.isContractor === true,
        action: "deny",
        reason: "Contractors cannot modify data",
      },
      {
        name: "finance-billing-access",
        tools: ["query_invoices", "create_invoice"],
        condition: (user) => user.attributes?.department === "finance",
        action: "allow",
      },
      {
        name: "eng-search-access",
        tools: ["search_*"],
        condition: (user) => user.attributes?.department === "engineering",
        action: "allow",
      },
    ],
    defaultAction: "abstain",
  });

  it("denies contractors from write operations", async () => {
    const ctx = makeCtx({
      user: makeUser({
        attributes: { ...makeUser().attributes, isContractor: true },
      }),
      toolName: "write_file",
    });
    const result = await strategy.evaluate(ctx);
    expect(result.action).toBe("deny");
    expect((result as { reason: string }).reason).toBe("Contractors cannot modify data");
  });

  it("allows finance users billing access", async () => {
    const ctx = makeCtx({
      user: makeUser({
        attributes: { ...makeUser().attributes, department: "finance" },
      }),
      toolName: "query_invoices",
    });
    const result = await strategy.evaluate(ctx);
    expect(result.action).toBe("allow");
  });

  it("allows engineering users search access", async () => {
    const ctx = makeCtx({ toolName: "search_codebase" });
    const result = await strategy.evaluate(ctx);
    expect(result.action).toBe("allow");
    expect((result as { reason: string }).reason).toContain("eng-search-access");
  });

  it("abstains when no rule matches", async () => {
    const ctx = makeCtx({
      user: makeUser({ attributes: { department: "marketing" } }),
      toolName: "deploy",
    });
    const result = await strategy.evaluate(ctx);
    expect(result).toEqual({ action: "abstain" });
  });

  it("supports async conditions", async () => {
    const asyncStrategy = new AttributeStrategy({
      rules: [
        {
          name: "async-check",
          condition: async (user) => {
            await new Promise((r) => setTimeout(r, 1));
            return user.roles?.includes("admin") === true;
          },
          action: "allow",
        },
      ],
    });
    const ctx = makeCtx({ user: makeUser({ roles: ["admin"] }) });
    const result = await asyncStrategy.evaluate(ctx);
    expect(result.action).toBe("allow");
  });

  it("supports content-aware conditions that inspect tool arguments", async () => {
    const contentAware = new AttributeStrategy({
      rules: [
        {
          name: "region-check",
          tools: ["query_*"],
          condition: (user, args) => (args.region as string) !== user.attributes?.region,
          action: "deny",
          reason: "Cannot query data outside your region",
        },
      ],
    });
    const ctx = makeCtx({
      toolName: "query_orders",
      arguments: { region: "us-east" },
    });
    const result = await contentAware.evaluate(ctx);
    expect(result.action).toBe("deny");
    expect((result as { reason: string }).reason).toContain("region");
  });
});

// ── CompositeStrategy ────────────────────────────────────────────────────────

describe("CompositeStrategy", () => {
  const roleStrat = rbac({
    viewer: ["search_*", "read_*"],
    admin: ["*"],
  });

  const abacStrat = abac([
    when((u) => u.attributes?.isContractor === true).deny(
      ["delete_*"],
      "Contractors cannot delete",
    ),
  ]);

  describe("firstMatch", () => {
    it("returns first non-abstaining decision", async () => {
      const composite = CompositeStrategy.firstMatch([abacStrat, roleStrat]);

      // ABAC has no rule for search_docs → abstains, RBAC approves
      const ctx = makeCtx();
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("allow");
    });

    it("ABAC deny wins over RBAC allow in ordered priority", async () => {
      const composite = CompositeStrategy.firstMatch([abacStrat, roleStrat]);
      const ctx = makeCtx({
        user: makeUser({
          roles: ["admin"],
          attributes: { isContractor: true },
        }),
        toolName: "delete_record",
      });
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("deny");
    });
  });

  describe("allOf", () => {
    it("allows only when all strategies agree", async () => {
      const composite = CompositeStrategy.allOf([roleStrat, allowAllStrategy()]);
      const ctx = makeCtx();
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("allow");
    });

    it("denies if any strategy denies", async () => {
      const composite = CompositeStrategy.allOf([roleStrat, denyAllStrategy("Maintenance mode")]);
      const ctx = makeCtx();
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("deny");
      expect((result as { reason: string }).reason).toBe("Maintenance mode");
    });
  });

  describe("anyOf", () => {
    it("allows if any strategy allows", async () => {
      const composite = CompositeStrategy.anyOf([denyAllStrategy(), allowAllStrategy()]);
      const ctx = makeCtx();
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("allow");
    });

    it("denies only when all deny", async () => {
      const composite = CompositeStrategy.anyOf([
        denyAllStrategy("Reason A"),
        denyAllStrategy("Reason B"),
      ]);
      const ctx = makeCtx();
      const result = await composite.evaluate(ctx);
      expect(result.action).toBe("deny");
    });
  });
});

// ── Convenience Factories ────────────────────────────────────────────────────

describe("Convenience factories", () => {
  describe("rbac()", () => {
    it("creates a RoleStrategy from shorthand", () => {
      const strategy = rbac({ viewer: ["read_*"], admin: ["*"] });
      expect(strategy.name).toBe("rbac");

      const result = strategy.evaluate(
        makeCtx({ user: makeUser({ roles: ["viewer"] }), toolName: "read_file" }),
      );
      expect(result.action).toBe("allow");
    });
  });

  describe("when()", () => {
    it("creates allow rules", () => {
      const rule = when((u) => u.roles?.includes("admin") === true).allow("deploy_*");
      expect(rule.action).toBe("allow");
      expect(rule.tools).toEqual(["deploy_*"]);
    });

    it("creates deny rules with tool patterns", () => {
      const rule = when((u) => u.attributes?.isContractor === true).deny(
        ["write_*", "delete_*"],
        "Contractors cannot modify",
      );
      expect(rule.action).toBe("deny");
      expect(rule.tools).toEqual(["write_*", "delete_*"]);
      expect(rule.reason).toBe("Contractors cannot modify");
    });

    it("creates deny rules with reason only (applies to all tools)", () => {
      const rule = when((u) => u.attributes?.banned === true).deny("Account suspended");
      expect(rule.action).toBe("deny");
      expect(rule.tools).toBeUndefined();
      expect(rule.reason).toBe("Account suspended");
    });
  });

  describe("allow/deny strategies", () => {
    it("allowAllStrategy allows everything", () => {
      const s = allowAllStrategy();
      expect(s.evaluate(makeCtx())).toEqual({ action: "allow" });
    });

    it("denyAllStrategy denies everything", () => {
      const s = denyAllStrategy("Locked down");
      expect(s.evaluate(makeCtx())).toEqual({ action: "deny", reason: "Locked down" });
    });
  });
});

// ── TenantScopeStrategy ──────────────────────────────────────────────────────

describe("TenantScopeStrategy", () => {
  const strategy = new TenantScopeStrategy({
    bypassRoles: ["super_admin"],
  });

  it("scopes to user tenant", () => {
    const scope = strategy.resolve({
      user: makeUser(),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ tenantId: "acme-corp" });
    expect(scope.unrestricted).toBeUndefined();
    expect(scope.description).toContain("acme-corp");
  });

  it("bypasses for privileged roles", () => {
    const scope = strategy.resolve({
      user: makeUser({ roles: ["super_admin"] }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.unrestricted).toBe(true);
  });

  it("returns null tenant when attribute missing", () => {
    const scope = strategy.resolve({
      user: makeUser({ attributes: {} }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ tenantId: null });
    expect(scope.description).toContain("No tenant");
  });

  it("supports custom tenant key", () => {
    const custom = new TenantScopeStrategy({
      tenantKey: "orgId",
      filterField: "organization_id",
    });
    const scope = custom.resolve({
      user: makeUser({ attributes: { orgId: "org-42" } }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ organization_id: "org-42" });
  });
});

// ── OwnershipScopeStrategy ───────────────────────────────────────────────────

describe("OwnershipScopeStrategy", () => {
  const strategy = new OwnershipScopeStrategy({
    managerRoles: ["team_lead"],
    teamField: "teamId",
  });

  it("scopes regular users to their own resources", () => {
    const scope = strategy.resolve({
      user: makeUser({ roles: ["viewer"] }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ createdBy: "alice-123" });
  });

  it("scopes managers to their team", () => {
    const scope = strategy.resolve({
      user: makeUser({
        roles: ["team_lead"],
        attributes: { teamId: "platform-team" },
      }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ teamId: "platform-team" });
  });

  it("gives admins unrestricted access", () => {
    const scope = strategy.resolve({
      user: makeUser({ roles: ["admin"] }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.unrestricted).toBe(true);
  });
});

// ── AttributeScopeStrategy ──────────────────────────────────────────────────

describe("AttributeScopeStrategy", () => {
  const strategy = new AttributeScopeStrategy({
    rules: [
      {
        condition: (user) => !user.roles?.includes("admin"),
        filters: (user) => ({ department: user.attributes?.department }),
        description: (user) => `Dept: ${user.attributes?.department}`,
      },
      {
        condition: (user) => user.attributes?.region !== undefined,
        filters: (user) => ({ region: user.attributes?.region }),
        description: "Region filter",
      },
    ],
  });

  it("merges matching rules", () => {
    const scope = strategy.resolve({
      user: makeUser(),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({
      department: "engineering",
      region: "eu-west",
    });
    expect(scope.description).toContain("Dept: engineering");
    expect(scope.description).toContain("Region filter");
  });

  it("skips non-matching rules", () => {
    const scope = strategy.resolve({
      user: makeUser({ roles: ["admin"], attributes: { region: "us-east" } }),
      toolName: "query",
      arguments: {},
    });
    // Admin skips the department rule, but region still applies
    expect(scope.filters).toEqual({ region: "us-east" });
  });
});

// ── HierarchyScopeStrategy ──────────────────────────────────────────────────

describe("HierarchyScopeStrategy", () => {
  const strategy = new HierarchyScopeStrategy({
    resolveHierarchy: async (userId) => {
      if (userId === "alice-123") {
        return {
          nodeId: "eng",
          ancestors: ["company"],
          descendants: ["frontend", "backend", "infra"],
          depth: 1,
        };
      }
      return null;
    },
    direction: "down",
    nodeField: "departmentId",
    bypassRoles: ["ceo"],
  });

  it("resolves downward hierarchy", async () => {
    const scope = await strategy.resolve({
      user: makeUser(),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({
      departmentId: { $in: ["eng", "frontend", "backend", "infra"] },
    });
    expect(scope.description).toContain("4 nodes");
  });

  it("falls back to self-scoped for unknown users", async () => {
    const scope = await strategy.resolve({
      user: makeUser({ userId: "unknown-999" }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.filters).toEqual({ departmentId: "unknown-999" });
    expect(scope.description).toContain("self-scoped");
  });

  it("bypasses for privileged roles", async () => {
    const scope = await strategy.resolve({
      user: makeUser({ roles: ["ceo"] }),
      toolName: "query",
      arguments: {},
    });
    expect(scope.unrestricted).toBe(true);
  });
});

// ── ResolverScopeStrategy ────────────────────────────────────────────────────

describe("ResolverScopeStrategy", () => {
  const mockResolver: PermissionResolver = {
    name: "mock-confluence",
    system: "confluence",
    async resolve(user: UserContext): Promise<ResolvedPermissions> {
      const email = user.attributes?.email as string;
      if (email === "alice@acme.co") {
        return {
          system: "confluence",
          grants: [
            {
              resourceType: "space",
              resourceIds: ["ENG", "PLATFORM", "DEVOPS"],
              accessLevel: "read",
            },
          ],
          resolvedAt: new Date(),
          cacheTTL: 60,
        };
      }
      return {
        system: "confluence",
        grants: [],
        resolvedAt: new Date(),
      };
    },
  };

  it("resolves external permissions into scope filters", async () => {
    const strategy = new ResolverScopeStrategy({
      resolver: mockResolver,
      toScope: (grants) => ({
        strategy: "confluence",
        filters: {
          allowedSpaces: grants[0]?.resourceIds ?? [],
        },
        description: `Confluence: ${grants[0]?.resourceIds.length ?? 0} spaces`,
      }),
    });

    const scope = await strategy.resolve({
      user: makeUser({ attributes: { email: "alice@acme.co" } }),
      toolName: "search_confluence",
      arguments: {},
    });
    expect(scope.filters).toEqual({
      allowedSpaces: ["ENG", "PLATFORM", "DEVOPS"],
    });
    expect(scope.description).toContain("3 spaces");
  });

  it("returns empty scope for unknown users", async () => {
    const strategy = new ResolverScopeStrategy({
      resolver: mockResolver,
      toScope: (grants) => ({
        strategy: "confluence",
        filters: { allowedSpaces: grants[0]?.resourceIds ?? [] },
      }),
    });

    const scope = await strategy.resolve({
      user: makeUser({ attributes: { email: "unknown@acme.co" } }),
      toolName: "search_confluence",
      arguments: {},
    });
    expect(scope.filters).toEqual({ allowedSpaces: [] });
  });

  it("caches resolved permissions", async () => {
    const resolveSpy = vi.fn(mockResolver.resolve.bind(mockResolver));
    const spyResolver = { ...mockResolver, resolve: resolveSpy };

    const strategy = new ResolverScopeStrategy({
      resolver: spyResolver,
      toScope: (grants) => ({
        strategy: "confluence",
        filters: { spaces: grants[0]?.resourceIds ?? [] },
      }),
      cache: { ttl: 300 },
    });

    const ctx = {
      user: makeUser({ attributes: { email: "alice@acme.co" } }),
      toolName: "search_confluence",
      arguments: {},
    };

    await strategy.resolve(ctx);
    await strategy.resolve(ctx);
    await strategy.resolve(ctx);

    expect(resolveSpy).toHaveBeenCalledTimes(1); // resolved once, cached twice
  });

  it("supports cache invalidation", async () => {
    const resolveSpy = vi.fn(mockResolver.resolve.bind(mockResolver));
    const spyResolver = { ...mockResolver, resolve: resolveSpy };

    const strategy = new ResolverScopeStrategy({
      resolver: spyResolver,
      toScope: (grants) => ({
        strategy: "confluence",
        filters: { spaces: grants[0]?.resourceIds ?? [] },
      }),
      cache: { ttl: 300 },
    });

    const ctx = {
      user: makeUser({ attributes: { email: "alice@acme.co" } }),
      toolName: "search_confluence",
      arguments: {},
    };

    await strategy.resolve(ctx);
    strategy.invalidate("alice-123");
    await strategy.resolve(ctx);

    expect(resolveSpy).toHaveBeenCalledTimes(2); // cache miss after invalidation
  });
});

// ── CompositeScope ───────────────────────────────────────────────────────────

describe("CompositeScope", () => {
  describe("merge", () => {
    it("merges filters from multiple strategies", async () => {
      const composite = CompositeScope.merge([
        new TenantScopeStrategy(),
        new AttributeScopeStrategy({
          rules: [
            {
              condition: () => true,
              filters: (user) => ({ department: user.attributes?.department }),
            },
          ],
        }),
      ]);

      const scope = await composite.resolve({
        user: makeUser(),
        toolName: "query",
        arguments: {},
      });

      expect(scope.filters).toEqual({
        tenantId: "acme-corp",
        department: "engineering",
      });
      expect(scope.unrestricted).toBe(false);
    });
  });

  describe("firstMatch", () => {
    it("uses first strategy with non-empty scope", async () => {
      const composite = CompositeScope.firstMatch([
        new TenantScopeStrategy(),
        new OwnershipScopeStrategy(),
      ]);

      const scope = await composite.resolve({
        user: makeUser(),
        toolName: "query",
        arguments: {},
      });

      expect(scope.strategy).toBe("tenant");
      expect(scope.filters).toEqual({ tenantId: "acme-corp" });
    });
  });
});

// ── systemAwareScope ─────────────────────────────────────────────────────────

describe("systemAwareScope", () => {
  it("routes tools to system-specific scoping", async () => {
    const tenantScope = new TenantScopeStrategy();
    const ownerScope = new OwnershipScopeStrategy();

    const strategy = systemAwareScope({
      toolSystems: {
        search_confluence: "confluence",
        query_jira: "jira",
      },
      scopes: {
        confluence: tenantScope,
        jira: ownerScope,
      },
      fallback: tenantScope,
    });

    // Confluence tool → tenant scope
    const confScope = await strategy.resolve({
      user: makeUser(),
      toolName: "search_confluence",
      arguments: {},
    });
    expect(confScope.strategy).toBe("tenant");
    expect(confScope.filters).toEqual({ tenantId: "acme-corp" });

    // Jira tool → ownership scope
    const jiraScope = await strategy.resolve({
      user: makeUser(),
      toolName: "query_jira",
      arguments: {},
    });
    expect(jiraScope.strategy).toBe("ownership");
    expect(jiraScope.filters).toEqual({ createdBy: "alice-123" });

    // Unknown tool → fallback (tenant)
    const unknownScope = await strategy.resolve({
      user: makeUser(),
      toolName: "random_tool",
      arguments: {},
    });
    expect(unknownScope.strategy).toBe("tenant");
  });
});

// ── Full Pipeline: Agent → IAM → Tool ────────────────────────────────────────

describe("Full IAM pipeline (StreamingToolExecutor integration)", () => {
  // These tests use the AgentRunner directly with mock models
  // to verify the full pipeline: user context → authorization → scope → tool

  const scopeCapture: { scope?: DataScope; user?: UserContext }[] = [];

  beforeEach(() => {
    scopeCapture.length = 0;
  });

  const scopedTool = buildTool({
    name: "query_data",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
    },
    maxResultChars: 10_000,
    describe: () => "Query data",
    async call(input: Record<string, unknown>, ctx) {
      // Capture what IAM injected
      scopeCapture.push({
        scope: ctx.extra?.scope as DataScope | undefined,
        user: ctx.extra?.user as UserContext | undefined,
      });
      return { data: `Results for: ${input.query}` };
    },
    isReadOnly: () => true,
  });

  it("injects user and scope into tool context", async () => {
    const model = createMockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "query_data", arguments: JSON.stringify({ query: "test" }) },
        ],
        finishReason: "tool_calls" as const,
      },
      { content: "Done", finishReason: "stop" as const },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [scopedTool],
      systemPrompt: "Test",
      accessPolicy: {
        authorization: rbac({ viewer: ["query_*"] }),
        dataScope: new TenantScopeStrategy(),
      },
    });

    const user = makeUser();
    runner.setCurrentUser(user);
    const result = await runner.run("Query something");

    expect(result).toBe("Done");
    expect(scopeCapture.length).toBe(1);
    expect(scopeCapture[0]!.user?.userId).toBe("alice-123");
    expect(scopeCapture[0]!.scope?.filters).toEqual({ tenantId: "acme-corp" });
  });

  it("blocks unauthorized tool calls", async () => {
    const model = createMockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "query_data", arguments: JSON.stringify({ query: "test" }) },
        ],
        finishReason: "tool_calls" as const,
      },
      { content: "Access was denied", finishReason: "stop" as const },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [scopedTool],
      systemPrompt: "Test",
      accessPolicy: {
        authorization: rbac({ viewer: ["read_*"] }), // query_* not allowed for viewer
      },
    });

    runner.setCurrentUser(makeUser({ roles: ["viewer"] }));
    const result = await runner.run("Query something");

    expect(result).toBe("Access was denied");
    // Tool was never called
    expect(scopeCapture.length).toBe(0);
  });

  it("fires audit callback on authorization decisions", async () => {
    const decisions: { toolName: string; action: string }[] = [];

    const model = createMockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "query_data", arguments: JSON.stringify({ query: "test" }) },
        ],
        finishReason: "tool_calls" as const,
      },
      { content: "Done", finishReason: "stop" as const },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [scopedTool],
      systemPrompt: "Test",
      accessPolicy: {
        authorization: rbac({ viewer: ["query_*"] }),
        onDecision: (event) => {
          decisions.push({
            toolName: event.toolName,
            action: event.decision.action,
          });
        },
      },
    });

    runner.setCurrentUser(makeUser());
    await runner.run("Query");

    expect(decisions.length).toBe(1);
    expect(decisions[0]).toEqual({ toolName: "query_data", action: "allow" });
  });
});
