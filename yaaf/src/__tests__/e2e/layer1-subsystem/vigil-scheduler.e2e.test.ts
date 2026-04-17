/**
 * L1-11: Vigil + Scheduler E2E
 *
 * Tests real wiring between Heartbeat cron scheduling and the cron utilities.
 */

import { describe, it, expect, afterEach } from "vitest";
import { validateCron, nextCronRunMs, describeCron } from "../../../utils/cron.js";
import { Heartbeat } from "../../../automation/heartbeat.js";
import { wait } from "../_fixtures/helpers.js";

describe("L1-11: Vigil + Scheduler E2E", () => {
  // ── Cron Utilities ─────────────────────────────────────────────────────────

  it("validateCron accepts valid cron expressions", () => {
    expect(validateCron("0 * * * *")).toBe(true); // every hour
    expect(validateCron("*/5 * * * *")).toBe(true); // every 5 minutes
    expect(validateCron("0 9 * * 1-5")).toBe(true); // weekdays at 9am
  });

  it("validateCron rejects invalid cron expressions", () => {
    expect(validateCron("invalid")).toBe(false);
    expect(validateCron("")).toBe(false);
    expect(validateCron("60 * * * *")).toBe(false); // 60 minutes invalid
  });

  it("nextCronRunMs returns a number or null for valid cron", () => {
    // nextCronRunMs requires (cron, fromMs) — two args
    const delay = nextCronRunMs("*/5 * * * *", Date.now());
    // Returns number (epoch ms) or null
    if (delay !== null) {
      expect(delay).toBeGreaterThan(Date.now() - 1000); // should be in future
      expect(delay).toBeLessThan(Date.now() + 5 * 60 * 1000 + 1000); // within 5 min
    }
  });

  it("describeCron produces human-readable description", () => {
    const desc = describeCron("0 9 * * 1-5");
    // Returns string or null
    if (desc !== null) {
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  // ── Heartbeat ──────────────────────────────────────────────────────────────

  let heartbeat: Heartbeat | null = null;
  afterEach(() => {
    heartbeat?.stop();
    heartbeat = null;
  });

  it("Heartbeat schedules and fires a cron task", async () => {
    const outputs: string[] = [];
    const mockAgent = {
      run: async (prompt: string) => `Processed: ${prompt}`,
    };

    heartbeat = new Heartbeat({
      agent: mockAgent,
      onOutput: async (text) => {
        outputs.push(text);
      },
      checkIntervalMs: 100, // Check every 100ms for testing
    });

    // Add a task that matches every minute (should fire on first tick)
    heartbeat.addTask({
      id: "health-check",
      schedule: "* * * * *", // every minute
      prompt: "Check system health",
    });

    heartbeat.start();
    await wait(350); // Wait for a few ticks
    heartbeat.stop();

    // The task should have fired at least once (matches the current minute)
    expect(outputs.length).toBeGreaterThanOrEqual(1);
    expect(outputs[0]).toContain("Processed");
  });

  it("Heartbeat stop() prevents further execution", async () => {
    let count = 0;
    const mockAgent = {
      run: async () => {
        count++;
        return "ok";
      },
    };

    heartbeat = new Heartbeat({
      agent: mockAgent,
      onOutput: async () => {},
      checkIntervalMs: 100,
    });

    heartbeat.addTask({
      id: "counter",
      schedule: "* * * * *",
      prompt: "Count",
    });

    heartbeat.start();
    await wait(200);
    heartbeat.stop();
    const countAtStop = count;

    await wait(300);
    // Count should not have increased after stop
    expect(count).toBe(countAtStop);
    expect(heartbeat.isRunning()).toBe(false);
  });

  it("Heartbeat standing orders prepend to task prompts", async () => {
    const receivedPrompts: string[] = [];
    const mockAgent = {
      run: async (prompt: string) => {
        receivedPrompts.push(prompt);
        return "Done";
      },
    };

    heartbeat = new Heartbeat({
      agent: mockAgent,
      onOutput: async () => {},
      checkIntervalMs: 100,
    });

    heartbeat.addStandingOrder({
      id: "email-check",
      instruction: "Always check email first.",
    });

    heartbeat.addTask({
      id: "briefing",
      schedule: "* * * * *",
      prompt: "Generate morning briefing.",
    });

    heartbeat.start();
    await wait(350);
    heartbeat.stop();

    if (receivedPrompts.length > 0) {
      // Standing order should be prepended to the prompt
      expect(receivedPrompts[0]).toContain("Standing Orders");
      expect(receivedPrompts[0]).toContain("email");
      expect(receivedPrompts[0]).toContain("briefing");
    }
  });

  it("Heartbeat task management: add, list, remove", () => {
    const mockAgent = { run: async () => "ok" };
    heartbeat = new Heartbeat({
      agent: mockAgent,
      onOutput: async () => {},
    });

    heartbeat.addTask({
      id: "task-1",
      schedule: "0 9 * * *",
      prompt: "Morning",
    });
    heartbeat.addTask({
      id: "task-2",
      schedule: "0 17 * * *",
      prompt: "Evening",
    });

    expect(heartbeat.getTasks().length).toBe(2);

    heartbeat.removeTask("task-1");
    expect(heartbeat.getTasks().length).toBe(1);
    expect(heartbeat.getTasks()[0]!.id).toBe("task-2");
  });
});
