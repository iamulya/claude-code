/**
 * Permission policy test suite
 *
 * Tests PermissionPolicy for:
 * - allow rules
 * - deny rules
 * - wildcard matching
 * - deny overrides allow
 * - escalation order
 */

import { describe, it, expect } from "vitest";
import { PermissionPolicy } from "../permissions.js";

describe("PermissionPolicy", () => {
  it("denies by default (empty policy, fail-closed)", async () => {
    const policy = new PermissionPolicy();
    const result = await policy.evaluate("any_tool", {});
    expect(result.action).toBe("deny");
  });

  it("allows all when defaultAction is set to allow", async () => {
    const policy = new PermissionPolicy().defaultAction("allow");
    const result = await policy.evaluate("any_tool", {});
    expect(result.action).toBe("allow");
  });

  it("denies explicitly denied tools", async () => {
    const policy = new PermissionPolicy()
      .defaultAction("allow")
      .deny("dangerous_tool", "Too dangerous");

    const result = await policy.evaluate("dangerous_tool", {});
    expect(result.action).toBe("deny");
    if (result.action === "deny") {
      expect(result.reason).toContain("dangerous");
    }
  });

  it("allows explicitly allowed tools", async () => {
    const policy = new PermissionPolicy().allow("safe_tool");

    const result = await policy.evaluate("safe_tool", {});
    expect(result.action).toBe("allow");
  });

  it("deny overrides allow when deny rule comes first", async () => {
    const policy = new PermissionPolicy().deny("tool", "Denied").allow("tool");

    // deny rules take priority in rule evaluation order
    const result = await policy.evaluate("tool", {});
    expect(result.action).toBe("deny");
  });

  it("supports wildcard matching", async () => {
    const policy = new PermissionPolicy().allow("search_*");

    const result1 = await policy.evaluate("search_web", {});
    expect(result1.action).toBe("allow");

    const result2 = await policy.evaluate("search_files", {});
    expect(result2.action).toBe("allow");
  });

  it("requireApproval marks tool for escalation", async () => {
    const policy = new PermissionPolicy().requireApproval(
      "write_file",
      "File writes need approval",
    );

    const result = await policy.evaluate("write_file", {});
    // Default handler denies escalated requests (fail-closed)
    expect(result.action).toBe("deny");
  });
});
