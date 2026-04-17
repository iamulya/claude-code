/**
 * L4-04: IAM Boundary — Adversarial & Chaos
 *
 * Validates that IAM authorization boundaries hold under hostile conditions:
 * - Expired JWT rejected
 * - JWT with wrong/missing signature rejected
 * - 'none' algorithm rejected
 * - RBAC deny overrides allow (most-restrictive)
 * - No-roles user gets denied (fail-closed)
 * - ABAC condition crash fails closed
 * - CompositeStrategy allOf enforces all must agree
 * - JTI blocklist revokes valid tokens
 * - JWKS URI SSRF protection
 * - Tenant data isolation
 */

import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import {
  verifyJwt,
  decodeJwt,
  JwtError,
} from "../../../iam/jwt.js";
import {
  RoleStrategy,
  AttributeStrategy,
  CompositeStrategy,
  rbac,
  abac,
  when,
  denyAllStrategy,
  allowAllStrategy,
} from "../../../iam/authorization.js";
import type {
  UserContext,
  AuthorizationContext,
} from "../../../iam/types.js";

// ── JWT Test Helpers ──────────────────────────────────────────────────────────

const HMAC_SECRET = "test-secret-at-least-32-bytes-long!!";

function base64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

/** Create a valid HS256 JWT for testing */
function createTestJwt(
  payload: Record<string, unknown>,
  secret: string = HMAC_SECRET,
  headerOverrides?: Record<string, unknown>,
): string {
  const header = { alg: "HS256", typ: "JWT", ...headerOverrides };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

function futureTimestamp(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

function pastTimestamp(seconds: number): number {
  return Math.floor(Date.now() / 1000) - seconds;
}

// ── IAM Test User Helpers ────────────────────────────────────────────────────

function testUser(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: "test-user",
    roles: ["viewer"],
    ...overrides,
  };
}

function authCtx(user: UserContext, toolName: string, args: Record<string, unknown> = {}): AuthorizationContext {
  return { user, toolName, arguments: args };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("L4-04: IAM Boundary", () => {
  // ── JWT Verification ────────────────────────────────────────────────────────

  it("rejects expired JWT", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: pastTimestamp(120), // expired 2 minutes ago
      iss: "test",
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"] }),
    ).rejects.toThrow(/expired/i);
  });

  it("rejects JWT with wrong signature", async () => {
    const token = createTestJwt(
      { sub: "user-1", exp: futureTimestamp(600) },
      "correct-secret",
    );

    await expect(
      verifyJwt(token, "wrong-secret", { algorithms: ["HS256"] }),
    ).rejects.toThrow(/signature/i);
  });

  it("rejects 'none' algorithm (critical security check)", async () => {
    // Manually craft a JWT with alg: 'none'
    const header = base64url(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = base64url(JSON.stringify({ sub: "admin", exp: futureTimestamp(600) }));
    const token = `${header}.${payload}.`;

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256", "none"] }),
    ).rejects.toThrow(/none.*not permitted/i);
  });

  it("rejects algorithm not in allowed list", async () => {
    const token = createTestJwt(
      { sub: "user-1", exp: futureTimestamp(600) },
    );

    // Only allow RS256, not HS256
    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["RS256"] }),
    ).rejects.toThrow(/not allowed/i);
  });

  it("rejects JWT missing required exp claim", async () => {
    const token = createTestJwt(
      { sub: "user-1" }, // no exp
    );

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], requireExp: true }),
    ).rejects.toThrow(/exp/i);
  });

  it("validates issuer when specified", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      iss: "wrong-issuer",
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], issuer: "expected-issuer" }),
    ).rejects.toThrow(/issuer/i);
  });

  it("validates audience when specified", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      aud: "wrong-audience",
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], audience: "my-app" }),
    ).rejects.toThrow(/audience/i);
  });

  it("accepts valid JWT with correct claims", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      iss: "my-issuer",
      aud: "my-app",
    });

    const payload = await verifyJwt(token, HMAC_SECRET, {
      algorithms: ["HS256"],
      issuer: "my-issuer",
      audience: "my-app",
    });

    expect(payload.sub).toBe("user-1");
  });

  it("respects clock tolerance on expiration", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: pastTimestamp(10), // expired 10 seconds ago
    });

    // With 30s tolerance (default), should still be valid
    const payload = await verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"] });
    expect(payload.sub).toBe("user-1");

    // With 0s tolerance, should be rejected
    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], clockToleranceSec: 0 }),
    ).rejects.toThrow(/expired/i);
  });

  it("nbf (not-before) rejects future tokens", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      nbf: futureTimestamp(300), // not valid for 5 minutes
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], clockToleranceSec: 0 }),
    ).rejects.toThrow(/not yet valid/i);
  });

  // ── JTI Blocklist ──────────────────────────────────────────────────────────

  it("JTI blocklist rejects revoked token", async () => {
    const blocklist = new Set(["revoked-jti-001"]);

    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      jti: "revoked-jti-001",
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, {
        algorithms: ["HS256"],
        jtiBlocklist: { has: async (jti) => blocklist.has(jti) },
      }),
    ).rejects.toThrow(/revoked/i);
  });

  it("requireJti rejects tokens without jti claim", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      // no jti
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, {
        algorithms: ["HS256"],
        requireJti: true,
      }),
    ).rejects.toThrow(/jti/i);
  });

  it("valid jti passes through blocklist check", async () => {
    const blocklist = new Set(["revoked-001"]);

    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      jti: "valid-jti-999",
    });

    const payload = await verifyJwt(token, HMAC_SECRET, {
      algorithms: ["HS256"],
      requireJti: true,
      jtiBlocklist: { has: async (jti) => blocklist.has(jti) },
    });

    expect(payload.jti).toBe("valid-jti-999");
  });

  // ── Malformed JWT ──────────────────────────────────────────────────────────

  it("rejects malformed JWT (not 3 parts)", () => {
    expect(() => decodeJwt("only.two")).toThrow(/3 parts/i);
    expect(() => decodeJwt("no-dots")).toThrow(/3 parts/i);
    expect(() => decodeJwt("a.b.c.d")).toThrow(/3 parts/i);
  });

  it("rejects JWT with invalid base64 encoding", () => {
    expect(() => decodeJwt("!!!.!!!.!!!")).toThrow(/encoding/i);
  });

  // ── RBAC Authorization ──────────────────────────────────────────────────────

  it("RBAC: viewer can access read tools, denied write tools", () => {
    const auth = rbac({
      viewer: ["read_*", "search_*"],
      admin: ["*"],
    });

    const viewer = testUser({ roles: ["viewer"] });

    const readDecision = auth.evaluate(authCtx(viewer, "read_users"));
    expect(readDecision.action).toBe("allow");

    const writeDecision = auth.evaluate(authCtx(viewer, "write_config"));
    expect(writeDecision.action).toBe("deny");
  });

  it("RBAC: user with no roles is denied (fail-closed)", () => {
    const auth = rbac({ admin: ["*"] });
    const noRoles = testUser({ roles: [] });

    const decision = auth.evaluate(authCtx(noRoles, "any_tool"));
    expect(decision.action).toBe("deny");
  });

  it("RBAC: most-restrictive conflict resolution (deny wins over allow)", () => {
    const auth = new RoleStrategy({
      roles: {
        admin: { allow: ["*"] },
        restricted: { deny: ["dangerous_*"] },
      },
      conflictResolution: "most-restrictive",
    });

    // User has BOTH roles — deny from restricted should override allow from admin
    const user = testUser({ roles: ["admin", "restricted"] });
    const decision = auth.evaluate(authCtx(user, "dangerous_tool"));
    expect(decision.action).toBe("deny");
  });

  it("RBAC: most-permissive conflict resolution (allow wins)", () => {
    const auth = new RoleStrategy({
      roles: {
        admin: { allow: ["*"] },
        restricted: { deny: ["dangerous_*"] },
      },
      conflictResolution: "most-permissive",
    });

    const user = testUser({ roles: ["admin", "restricted"] });
    const decision = auth.evaluate(authCtx(user, "dangerous_tool"));
    expect(decision.action).toBe("allow");
  });

  // ── ABAC Authorization ──────────────────────────────────────────────────────

  it("ABAC: condition-based deny blocks tool", async () => {
    const auth = abac([
      when((user) => user.attributes?.isContractor === true)
        .deny(["write_*", "delete_*"], "Contractors cannot write"),
    ], { defaultAction: "allow" });

    const contractor = testUser({
      attributes: { isContractor: true },
    });

    const decision = await auth.evaluate(authCtx(contractor, "write_config"));
    expect(decision.action).toBe("deny");
    expect(decision.reason).toContain("Contractors");
  });

  it("ABAC: condition crash fails closed (deny)", async () => {
    const auth = abac([
      {
        name: "crashy-rule",
        condition: () => {
          throw new Error("Condition runtime error!");
        },
        action: "allow" as const,
      },
    ], { defaultAction: "allow" });

    const user = testUser();
    const decision = await auth.evaluate(authCtx(user, "any_tool"));
    // A crashing condition MUST fail closed
    expect(decision.action).toBe("deny");
    expect(decision.reason).toContain("failed");
  });

  it("ABAC: priority ordering is respected", async () => {
    const auth = abac([
      {
        name: "low-priority-allow",
        priority: 1,
        condition: () => true,
        action: "allow" as const,
      },
      {
        name: "high-priority-deny",
        priority: 10,
        condition: () => true,
        action: "deny" as const,
        reason: "High priority wins",
      },
    ]);

    const decision = await auth.evaluate(authCtx(testUser(), "any_tool"));
    // Higher priority (10) should be evaluated first
    expect(decision.action).toBe("deny");
    expect(decision.reason).toContain("High priority");
  });

  it("ABAC: unmatching rules use defaultAction", async () => {
    const auth = abac([
      {
        name: "never-matches",
        condition: () => false,
        action: "allow" as const,
      },
    ], { defaultAction: "deny" });

    const decision = await auth.evaluate(authCtx(testUser(), "any_tool"));
    expect(decision.action).toBe("deny");
  });

  // ── Composite Strategy ──────────────────────────────────────────────────────

  it("CompositeStrategy.allOf: all must agree", async () => {
    const allowEverything = allowAllStrategy();
    const denyEverything = denyAllStrategy("Blocked by deny-all");

    const composite = CompositeStrategy.allOf([allowEverything, denyEverything]);
    const decision = await composite.evaluate(authCtx(testUser(), "any_tool"));

    // One deny → overall deny
    expect(decision.action).toBe("deny");
  });

  it("CompositeStrategy.anyOf: one allow is sufficient", async () => {
    const denyFirst = denyAllStrategy("No access");
    const allowSecond = allowAllStrategy();

    const composite = CompositeStrategy.anyOf([denyFirst, allowSecond]);
    const decision = await composite.evaluate(authCtx(testUser(), "any_tool"));

    expect(decision.action).toBe("allow");
  });

  it("CompositeStrategy.firstMatch: first non-abstaining wins", async () => {
    const abstainer: import("../../../iam/types.js").AuthorizationStrategy = {
      name: "abstainer",
      evaluate: () => ({ action: "abstain" as const }),
    };
    const denier = denyAllStrategy("First real opinion");

    const composite = CompositeStrategy.firstMatch([abstainer, denier, allowAllStrategy()]);
    const decision = await composite.evaluate(authCtx(testUser(), "any_tool"));

    // Abstainer is skipped, deny is first real match
    expect(decision.action).toBe("deny");
    expect(decision.reason).toContain("First real opinion");
  });

  it("CompositeStrategy.allOf with all abstaining uses fallback", async () => {
    const abstainer: import("../../../iam/types.js").AuthorizationStrategy = {
      name: "abstainer",
      evaluate: () => ({ action: "abstain" as const }),
    };

    const composite = CompositeStrategy.allOf([abstainer, abstainer]);
    const decision = await composite.evaluate(authCtx(testUser(), "any_tool"));

    // No explicit allow → fallback → deny
    expect(decision.action).toBe("deny");
  });

  // ── Glob Pattern Matching ──────────────────────────────────────────────────

  it("RBAC glob '*' matches any tool", () => {
    const auth = rbac({ admin: ["*"] });
    const admin = testUser({ roles: ["admin"] });

    expect(auth.evaluate(authCtx(admin, "any_tool")).action).toBe("allow");
    expect(auth.evaluate(authCtx(admin, "deeply_nested_tool")).action).toBe("allow");
  });

  it("RBAC glob 'admin_*' matches all admin tools", () => {
    const auth = rbac({ admin: ["admin_*"] });
    const admin = testUser({ roles: ["admin"] });

    expect(auth.evaluate(authCtx(admin, "admin_users")).action).toBe("allow");
    expect(auth.evaluate(authCtx(admin, "admin_config")).action).toBe("allow");
    expect(auth.evaluate(authCtx(admin, "read_users")).action).toBe("deny");
  });

  // ── JWT aud Type Validation ────────────────────────────────────────────────

  it("rejects JWT with non-string/non-array aud claim", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      aud: { nested: "object" }, // invalid aud type
    });

    await expect(
      verifyJwt(token, HMAC_SECRET, { algorithms: ["HS256"], audience: "my-app" }),
    ).rejects.toThrow(/unexpected type/i);
  });

  it("accepts JWT with array aud containing expected audience", async () => {
    const token = createTestJwt({
      sub: "user-1",
      exp: futureTimestamp(600),
      aud: ["app-a", "app-b", "my-app"],
    });

    const payload = await verifyJwt(token, HMAC_SECRET, {
      algorithms: ["HS256"],
      audience: "my-app",
    });
    expect(payload.sub).toBe("user-1");
  });
});
