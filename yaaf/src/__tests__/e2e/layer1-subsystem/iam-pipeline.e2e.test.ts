/**
 * L1-08: IAM Pipeline E2E
 *
 * Tests real wiring between Authorization Strategies, Data Scoping, and factories.
 */

import { describe, it, expect } from "vitest";
import {
  RoleStrategy,
  AttributeStrategy,
  CompositeStrategy,
  rbac,
  abac,
  when,
  allowAllStrategy,
  denyAllStrategy,
} from "../../../iam/authorization.js";
import {
  TenantScopeStrategy,
  OwnershipScopeStrategy,
} from "../../../iam/scoping.js";
import type {
  UserContext,
  AuthorizationContext,
} from "../../../iam/types.js";

describe("L1-08: IAM Pipeline E2E", () => {
  // ── Authorization ──────────────────────────────────────────────────────────

  it("RoleStrategy → allows admin, denies viewer for write operations", () => {
    const strategy = rbac({
      admin: ["*"],
      viewer: ["search_*", "read_*"],
    });

    const adminResult = strategy.evaluate({
      user: { userId: "admin-1", roles: ["admin"] },
      toolName: "write_file",
      arguments: {},
    });
    expect(adminResult.action).toBe("allow");

    const viewerResult = strategy.evaluate({
      user: { userId: "viewer-1", roles: ["viewer"] },
      toolName: "write_file",
      arguments: {},
    });
    expect(viewerResult.action).toBe("deny");
  });

  it("RoleStrategy → viewer can use read tools", () => {
    const strategy = rbac({
      viewer: ["search_*", "read_*"],
    });

    const result = strategy.evaluate({
      user: { userId: "viewer-1", roles: ["viewer"] },
      toolName: "read_file",
      arguments: {},
    });
    expect(result.action).toBe("allow");
  });

  it("AttributeStrategy → conditional rule evaluation", async () => {
    const strategy = abac([
      {
        name: "department-gate",
        condition: (user) =>
          (user.attributes?.department as string) === "engineering",
        tools: ["deploy_*", "build_*"],
        action: "allow",
      },
    ]);

    const engResult = await strategy.evaluate({
      user: {
        userId: "eng-1",
        attributes: { department: "engineering" },
      },
      toolName: "deploy_app",
      arguments: {},
    });
    expect(engResult.action).toBe("allow");

    // Marketing user → condition returns false → abstain (default)
    const mktResult = await strategy.evaluate({
      user: {
        userId: "mkt-1",
        attributes: { department: "marketing" },
      },
      toolName: "deploy_app",
      arguments: {},
    });
    expect(mktResult.action).toBe("abstain");
  });

  it("CompositeStrategy.allOf → deny-rule blocks even when RBAC allows", async () => {
    const roleStrat = rbac({ admin: ["*"] });
    // This ABAC rule explicitly DENIES when clearance is not top-secret
    const clearanceGate = abac([
      {
        name: "clearance-deny",
        condition: (user) => (user.attributes?.clearance as string) !== "top-secret",
        tools: ["*"],
        action: "deny" as const,
      },
    ]);

    const composite = CompositeStrategy.allOf([roleStrat, clearanceGate]);

    // Admin role but no clearance → ABAC explicitly denies → blocked
    const noClearance = await composite.evaluate({
      user: { userId: "admin-1", roles: ["admin"], attributes: {} },
      toolName: "read_classified",
      arguments: {},
    });
    expect(noClearance.action).toBe("deny");

    // Admin WITH clearance → deny condition is false → ABAC abstains → RBAC allows
    const hasBoth = await composite.evaluate({
      user: {
        userId: "admin-2",
        roles: ["admin"],
        attributes: { clearance: "top-secret" },
      },
      toolName: "read_classified",
      arguments: {},
    });
    expect(hasBoth.action).toBe("allow");
  });

  it("CompositeStrategy.anyOf → either allowing is sufficient", async () => {
    const roleStrat = rbac({ admin: ["*"] });
    const guestStrat = rbac({ guest: ["read_*"] });

    const composite = CompositeStrategy.anyOf([roleStrat, guestStrat]);

    // Admin role → first strategy allows
    const adminResult = await composite.evaluate({
      user: { userId: "admin-1", roles: ["admin"] },
      toolName: "write_file",
      arguments: {},
    });
    expect(adminResult.action).toBe("allow");
  });

  it("CompositeStrategy.firstMatch → first opinion wins", async () => {
    const denyEverything = denyAllStrategy("blocked by policy");
    const allowAll = allowAllStrategy();

    const composite = CompositeStrategy.firstMatch([denyEverything, allowAll]);

    const result = await composite.evaluate({
      user: { userId: "user-1" },
      toolName: "anything",
      arguments: {},
    });
    expect(result.action).toBe("deny");
    expect(result.action === "deny" && result.reason).toContain("blocked");
  });

  it("when() builder creates ABAC rules fluently", async () => {
    const rules = [
      when((user) => user.attributes?.isContractor === true)
        .deny(["delete_*"], "Contractors cannot delete"),
      when((user) => (user.attributes?.department as string) === "finance")
        .allow("query_invoices"),
    ];

    const strategy = abac(rules);

    // Contractor trying to delete
    const contractorResult = await strategy.evaluate({
      user: { userId: "c1", attributes: { isContractor: true } },
      toolName: "delete_user",
      arguments: {},
    });
    expect(contractorResult.action).toBe("deny");

    // Finance user querying invoices
    const financeResult = await strategy.evaluate({
      user: { userId: "f1", attributes: { department: "finance" } },
      toolName: "query_invoices",
      arguments: {},
    });
    expect(financeResult.action).toBe("allow");
  });

  // ── Data Scoping ───────────────────────────────────────────────────────────

  it("TenantScopeStrategy → scopes data by tenant_id", () => {
    const strategy = new TenantScopeStrategy();

    const scope = strategy.resolve({
      user: {
        userId: "user-1",
        attributes: { tenantId: "acme-corp" },
      },
      toolName: "search",
      arguments: {},
    });
    expect(scope.filters.tenantId).toBe("acme-corp");
  });

  it("TenantScopeStrategy → bypass roles skip scoping", () => {
    const strategy = new TenantScopeStrategy({
      bypassRoles: ["super_admin"],
    });

    const scope = strategy.resolve({
      user: {
        userId: "super-1",
        roles: ["super_admin"],
        attributes: { tenantId: "acme-corp" },
      },
      toolName: "search",
      arguments: {},
    });
    // Super admin → unrestricted
    expect(scope.unrestricted).toBe(true);
  });

  it("OwnershipScopeStrategy → filters by user ownership", () => {
    const strategy = new OwnershipScopeStrategy();

    const scope = strategy.resolve({
      user: { userId: "alice-123" },
      toolName: "list_files",
      arguments: {},
    });

    // Default ownerField is "createdBy" and value is userId
    expect(scope.filters.createdBy).toBe("alice-123");
  });

  it("OwnershipScopeStrategy → admin bypass", () => {
    const strategy = new OwnershipScopeStrategy({
      adminRoles: ["admin"],
    });

    const scope = strategy.resolve({
      user: { userId: "admin-1", roles: ["admin"] },
      toolName: "list_files",
      arguments: {},
    });

    expect(scope.unrestricted).toBe(true);
  });

  // ── Full Pipeline ──────────────────────────────────────────────────────────

  it("Full pipeline: RBAC → TenantScope → combined result", () => {
    const authStrategy = rbac({
      editor: ["read_*", "write_*"],
      viewer: ["read_*"],
    });

    const scopeStrategy = new TenantScopeStrategy();

    // Editor in tenant "acme" trying to write
    const user: UserContext = {
      userId: "editor-1",
      roles: ["editor"],
      attributes: { tenantId: "acme" },
    };

    const authResult = authStrategy.evaluate({
      user,
      toolName: "write_doc",
      arguments: {},
    });
    expect(authResult.action).toBe("allow");

    const scope = scopeStrategy.resolve({
      user,
      toolName: "write_doc",
      arguments: {},
    });
    expect(scope.filters.tenantId).toBe("acme");

    // Viewer trying to write → denied
    const viewerResult = authStrategy.evaluate({
      user: { userId: "v1", roles: ["viewer"], attributes: { tenantId: "acme" } },
      toolName: "write_doc",
      arguments: {},
    });
    expect(viewerResult.action).toBe("deny");
  });
});
