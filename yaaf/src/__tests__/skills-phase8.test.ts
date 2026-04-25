/**
 * Skills — Phase 8 tests: Telemetry & Token-Aware Budget.
 *
 * Tests:
 * - SkillUsageTracker: record, score, ranking, import/export, clear
 * - Token-aware buildSkillSectionFromList with budget config
 * - Backward compatibility (no config = byte-based limit)
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  SkillUsageTracker,
  type SkillUsageRecord,
} from "../skills/index.js";
import {
  buildSkillSectionFromList,
  type SkillBudgetConfig,
} from "../skills/registry.js";
import type { Skill } from "../skills/types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSkill(name: string, desc?: string, instructions?: string): Skill {
  return {
    name,
    description: desc ?? "",
    instructions: instructions ?? `Instructions for ${name}`,
    always: true,
    source: "test",
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ══════════════════════════════════════════════════════════════════════════════
// SkillUsageTracker
// ══════════════════════════════════════════════════════════════════════════════

describe("SkillUsageTracker", () => {
  let tracker: SkillUsageTracker;

  beforeEach(() => {
    tracker = new SkillUsageTracker();
  });

  describe("record", () => {
    it("tracks first invocation", () => {
      tracker.record("test-skill");
      const record = tracker.get("test-skill");
      expect(record).toBeDefined();
      expect(record!.invocationCount).toBe(1);
      expect(record!.name).toBe("test-skill");
      expect(record!.firstUsedAt).toBeGreaterThan(0);
      expect(record!.lastUsedAt).toBe(record!.firstUsedAt);
    });

    it("increments count on subsequent invocations", () => {
      tracker.record("test-skill");
      tracker.record("test-skill");
      tracker.record("test-skill");
      const record = tracker.get("test-skill");
      expect(record!.invocationCount).toBe(3);
    });

    it("updates lastUsedAt but preserves firstUsedAt", () => {
      tracker.record("test-skill");
      const initial = tracker.get("test-skill")!;
      const firstUsedAt = initial.firstUsedAt;

      // Slight delay to ensure different timestamp
      tracker.record("test-skill");
      const updated = tracker.get("test-skill")!;
      expect(updated.firstUsedAt).toBe(firstUsedAt);
      expect(updated.lastUsedAt).toBeGreaterThanOrEqual(firstUsedAt);
    });

    it("tracks multiple skills independently", () => {
      tracker.record("skill-a");
      tracker.record("skill-b");
      tracker.record("skill-a");

      expect(tracker.get("skill-a")!.invocationCount).toBe(2);
      expect(tracker.get("skill-b")!.invocationCount).toBe(1);
    });
  });

  describe("get", () => {
    it("returns undefined for unknown skills", () => {
      expect(tracker.get("nonexistent")).toBeUndefined();
    });
  });

  describe("score", () => {
    it("returns 0 for untracked skills", () => {
      expect(tracker.score("nonexistent")).toBe(0);
    });

    it("gives full score for just-used skills", () => {
      tracker.record("test-skill");
      const now = Date.now();
      // Score = 1 * 0.5^(0/7) = 1 * 1.0 = 1.0
      const score = tracker.score("test-skill", now);
      expect(score).toBeCloseTo(1.0, 1);
    });

    it("decays score with half-life", () => {
      tracker.record("test-skill");
      const record = tracker.get("test-skill")!;

      // 7 days later (1 half-life)
      const sevenDaysLater = record.lastUsedAt + 7 * MS_PER_DAY;
      // Score = 1 * 0.5^(7/7) = 1 * 0.5 = 0.5
      const score = tracker.score("test-skill", sevenDaysLater);
      expect(score).toBeCloseTo(0.5, 2);
    });

    it("decays further at 2 half-lives", () => {
      tracker.record("test-skill");
      const record = tracker.get("test-skill")!;

      // 14 days later (2 half-lives)
      const fourteenDaysLater = record.lastUsedAt + 14 * MS_PER_DAY;
      // Score = 1 * 0.5^(14/7) = 1 * 0.25 = 0.25
      const score = tracker.score("test-skill", fourteenDaysLater);
      expect(score).toBeCloseTo(0.25, 2);
    });

    it("has a minimum recency factor floor", () => {
      tracker.record("test-skill");
      const record = tracker.get("test-skill")!;

      // 365 days later — should hit minimum recency factor
      const yearLater = record.lastUsedAt + 365 * MS_PER_DAY;
      const score = tracker.score("test-skill", yearLater);
      // Min factor is 0.01, so score = 1 * 0.01 = 0.01
      expect(score).toBeCloseTo(0.01, 2);
    });

    it("multiplies by invocation count", () => {
      // Record 10 invocations
      for (let i = 0; i < 10; i++) {
        tracker.record("popular-skill");
      }
      const now = Date.now();
      // Score = 10 * 1.0 = 10.0
      const score = tracker.score("popular-skill", now);
      expect(score).toBeCloseTo(10.0, 1);
    });

    it("respects custom half-life", () => {
      const customTracker = new SkillUsageTracker({ halfLifeDays: 1 });
      customTracker.record("fast-decay");
      const record = customTracker.get("fast-decay")!;

      // 1 day later (1 half-life of 1 day)
      const oneDayLater = record.lastUsedAt + 1 * MS_PER_DAY;
      const score = customTracker.score("fast-decay", oneDayLater);
      expect(score).toBeCloseTo(0.5, 2);
    });
  });

  describe("ranking", () => {
    it("returns empty array when no skills tracked", () => {
      expect(tracker.ranking()).toEqual([]);
    });

    it("returns skills sorted by score (highest first)", () => {
      // Record different amounts
      for (let i = 0; i < 10; i++) tracker.record("popular");
      for (let i = 0; i < 5; i++) tracker.record("medium");
      tracker.record("rare");

      const ranked = tracker.ranking();
      expect(ranked.length).toBe(3);
      expect(ranked[0]!.name).toBe("popular");
      expect(ranked[1]!.name).toBe("medium");
      expect(ranked[2]!.name).toBe("rare");
    });

    it("includes score in ranking", () => {
      tracker.record("test-skill");
      const ranked = tracker.ranking();
      expect(ranked[0]!.score).toBeGreaterThan(0);
    });
  });

  describe("size and trackedNames", () => {
    it("reports correct size", () => {
      expect(tracker.size).toBe(0);
      tracker.record("a");
      tracker.record("b");
      expect(tracker.size).toBe(2);
    });

    it("returns tracked names", () => {
      tracker.record("alpha");
      tracker.record("beta");
      const names = tracker.trackedNames();
      expect(names).toContain("alpha");
      expect(names).toContain("beta");
    });
  });

  describe("clear", () => {
    it("removes all tracking data", () => {
      tracker.record("a");
      tracker.record("b");
      tracker.clear();
      expect(tracker.size).toBe(0);
      expect(tracker.get("a")).toBeUndefined();
    });
  });

  describe("import/export", () => {
    it("exports all records", () => {
      tracker.record("x");
      tracker.record("y");
      const exported = tracker.export();
      expect(exported.length).toBe(2);
      expect(exported.map((r) => r.name).sort()).toEqual(["x", "y"]);
    });

    it("imports records into a fresh tracker", () => {
      const records: SkillUsageRecord[] = [
        { name: "imported-skill", invocationCount: 42, firstUsedAt: 1000, lastUsedAt: 2000 },
      ];
      tracker.import(records);
      expect(tracker.size).toBe(1);
      const r = tracker.get("imported-skill");
      expect(r!.invocationCount).toBe(42);
      expect(r!.firstUsedAt).toBe(1000);
    });

    it("roundtrips through export/import", () => {
      tracker.record("roundtrip");
      tracker.record("roundtrip");
      tracker.record("roundtrip");
      const exported = tracker.export();

      const newTracker = new SkillUsageTracker();
      newTracker.import(exported);

      const original = tracker.get("roundtrip")!;
      const restored = newTracker.get("roundtrip")!;
      expect(restored.invocationCount).toBe(original.invocationCount);
      expect(restored.firstUsedAt).toBe(original.firstUsedAt);
      expect(restored.lastUsedAt).toBe(original.lastUsedAt);
    });

    it("import creates defensive copies (mutation safety)", () => {
      const records: SkillUsageRecord[] = [
        { name: "mutable", invocationCount: 1, firstUsedAt: 1000, lastUsedAt: 2000 },
      ];
      tracker.import(records);

      // Mutate original
      records[0]!.invocationCount = 999;

      // Tracker should be unaffected
      expect(tracker.get("mutable")!.invocationCount).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Token-aware buildSkillSectionFromList
// ══════════════════════════════════════════════════════════════════════════════

describe("buildSkillSectionFromList with budget", () => {
  it("backward compat: works without config (byte-based)", () => {
    const skills = [makeSkill("my-skill", "A tool", "Do the thing")];
    const section = buildSkillSectionFromList(skills);
    expect(section).toContain("# Active Skills");
    expect(section).toContain("my-skill");
  });

  it("token-aware: includes skills within budget", () => {
    const skills = [
      makeSkill("small", "Small skill", "Do small thing"),
    ];
    const config: SkillBudgetConfig = {
      contextWindowTokens: 128_000,
      budgetPercent: 0.01, // 1280 tokens — plenty for 1 small skill
    };
    const section = buildSkillSectionFromList(skills, undefined, config);
    expect(section).toContain("small");
    expect(section).not.toContain("⚠️");
  });

  it("token-aware: truncates section when budget exceeded", () => {
    // Create many large skills that exceed the budget
    const skills = Array.from({ length: 50 }, (_, i) =>
      makeSkill(
        `skill-${i}`,
        `Description for skill ${i}`,
        "x".repeat(2000), // ~500 tokens each → 50 * 500 = 25K tokens
      ),
    );
    const config: SkillBudgetConfig = {
      contextWindowTokens: 10_000,
      budgetPercent: 0.1, // Only 1000 tokens budget
    };
    const section = buildSkillSectionFromList(skills, undefined, config);
    expect(section).toContain("⚠️");
    expect(section).toContain("token budget");
    // Should contain some skills but not all
    expect(section).toContain("skill-0");
  });

  it("token-aware: truncates long descriptions", () => {
    const longDesc = "A".repeat(500);
    const skills = [makeSkill("truncated", longDesc, "instructions")];
    const config: SkillBudgetConfig = {
      maxDescriptionChars: 50,
    };
    const section = buildSkillSectionFromList(skills, undefined, config);
    expect(section).toContain("…"); // Ellipsis from truncation
    // Should not contain the full 500-char description
    expect(section).not.toContain("A".repeat(500));
  });

  it("token-aware: returns empty string for no active skills", () => {
    const skills = [makeSkill("inactive")];
    // Mark as not always-on
    skills[0]!.always = false;
    const config: SkillBudgetConfig = {};
    const section = buildSkillSectionFromList(skills, undefined, config);
    expect(section).toBe("");
  });

  it("token-aware: respects forcedNames", () => {
    const skills = [makeSkill("forced")];
    skills[0]!.always = false;
    const config: SkillBudgetConfig = {};
    const section = buildSkillSectionFromList(skills, ["forced"], config);
    expect(section).toContain("forced");
  });

  it("descriptions under maxDescriptionChars are not truncated", () => {
    const shortDesc = "Short description";
    const skills = [makeSkill("short", shortDesc, "instructions")];
    const config: SkillBudgetConfig = {
      maxDescriptionChars: 250,
    };
    const section = buildSkillSectionFromList(skills, undefined, config);
    expect(section).toContain(shortDesc);
    expect(section).not.toContain("…");
  });
});
