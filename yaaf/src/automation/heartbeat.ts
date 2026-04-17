/**
 * Heartbeat — Proactive scheduling and Standing Orders.
 *
 * Enables agents to proactively reach out to users on a schedule,
 * run recurring tasks, and maintain "standing orders" (persistent
 * instructions the agent checks regularly).
 *
 * Inspired by OpenClaw's heartbeat system, cron jobs, and standing orders.
 *
 * @example
 * ```ts
 * const heartbeat = new Heartbeat({
 * agent: myAgentRunner,
 * onOutput: async (text) => {
 * await gateway.send({ text, channelName: 'telegram', recipientId: 'user123' });
 * },
 * });
 *
 * // Morning briefing at 8am
 * heartbeat.addTask({
 * id: 'morning-brief',
 * schedule: '0 8 * * *',
 * prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
 * });
 *
 * // Standing order: always check email before briefings
 * heartbeat.addStandingOrder({
 * id: 'email-check',
 * instruction: 'Before any briefing, check my email for urgent items.',
 * });
 *
 * heartbeat.start();
 * ```
 *
 * @module automation/heartbeat
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ScheduledTask = {
  /** Unique task identifier */
  id: string;
  /** Cron expression (e.g., '0 8 * * *' for daily at 8am) */
  schedule: string;
  /** Prompt to send to the agent */
  prompt: string;
  /** Whether this task is active */
  active: boolean;
  /** Only send output if the agent deems it relevant */
  onlyIfRelevant?: boolean;
  /** Maximum time (ms) to wait for the agent before aborting */
  timeoutMs?: number;
  /** Last execution time */
  lastRun?: number;
  /** Last result */
  lastResult?: string;
  /**
   * Per-task execution lock.
   * Prevents a slow task from running concurrently with itself when the
   * tick interval is shorter than task execution time.
   */
  _running?: boolean;
};

export type StandingOrder = {
  /** Unique order identifier */
  id: string;
  /** Instruction that gets prepended to scheduled prompts */
  instruction: string;
  /** Whether this order is active */
  active: boolean;
  /** Optional schedule — if set, runs independently on this schedule */
  schedule?: string;
  /** Created timestamp */
  createdAt: number;
};

export type HeartbeatConfig = {
  /** The agent to invoke for scheduled tasks */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  /** Called with the agent's output after a scheduled run */
  onOutput: (text: string, task: ScheduledTask) => Promise<void>;
  /** Called when a scheduled task errors */
  onError?: (error: Error, task: ScheduledTask) => void;
  /** Check interval in ms (how often to evaluate schedules). Default: 60000 */
  checkIntervalMs?: number;
};

import { nextCronRunMs } from "../utils/cron.js";

// ── Cron helpers ─────────────────────────────────────────────────────────────

/** Check if a cron expression matches the current minute. */
function matchesCron(expression: string, date: Date): boolean {
  // Use the full-featured parser: compute the next run after 1 minute ago.
  // If the returned time matches the current minute, we have a match.
  const oneMinuteAgo = new Date(date.getTime() - 60_000);
  const next = nextCronRunMs(expression, oneMinuteAgo.getTime());
  if (next === null) return false;
  const nextDate = new Date(next);
  return (
    nextDate.getMinutes() === date.getMinutes() &&
    nextDate.getHours() === date.getHours() &&
    nextDate.getDate() === date.getDate() &&
    nextDate.getMonth() === date.getMonth()
  );
}

// ── Heartbeat System ─────────────────────────────────────────────────────────

export class Heartbeat {
  private tasks: Map<string, ScheduledTask> = new Map();
  private standingOrders: Map<string, StandingOrder> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly config: HeartbeatConfig;
  private running = false;

  constructor(config: HeartbeatConfig) {
    this.config = config;
  }

  // ── Task Management ──────────────────────────────────────────────────────

  /** Add a scheduled task. */
  addTask(task: Omit<ScheduledTask, "active"> & { active?: boolean }): void {
    this.tasks.set(task.id, { active: true, ...task });
  }

  /** Remove a scheduled task. */
  removeTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /** Enable or disable a task. */
  setTaskActive(id: string, active: boolean): void {
    const task = this.tasks.get(id);
    if (task) task.active = active;
  }

  /** Get all tasks. */
  getTasks(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  // ── Standing Orders ──────────────────────────────────────────────────────

  /** Add a standing order. */
  addStandingOrder(
    order: Omit<StandingOrder, "active" | "createdAt"> & { active?: boolean; createdAt?: number },
  ): void {
    this.standingOrders.set(order.id, {
      active: true,
      createdAt: Date.now(),
      ...order,
    });
  }

  /** Remove a standing order. */
  removeStandingOrder(id: string): boolean {
    return this.standingOrders.delete(id);
  }

  /** Get all standing orders. */
  getStandingOrders(): StandingOrder[] {
    return [...this.standingOrders.values()];
  }

  /** Get active standing orders as a prompt preamble. */
  private getStandingOrdersPreamble(): string {
    const active = [...this.standingOrders.values()].filter((o) => o.active);
    if (active.length === 0) return "";

    return (
      "# Standing Orders\nThese are persistent instructions that apply to this task:\n" +
      active.map((o) => `- ${o.instruction}`).join("\n") +
      "\n\n"
    );
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Start the heartbeat engine. */
  start(): void {
    if (this.running) return;
    this.running = true;

    const intervalMs = this.config.checkIntervalMs ?? 60_000;

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    // Also run immediately
    void this.tick();
  }

  /** Stop the heartbeat engine. */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Check if the heartbeat is running. */
  isRunning(): boolean {
    return this.running;
  }

  /** Manually trigger a specific task (bypass schedule). */
  async trigger(taskId: string): Promise<string | null> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    return this.executeTask(task);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const now = new Date();

    for (const task of this.tasks.values()) {
      if (!task.active) continue;

      // Check if this task matches the current minute
      if (!matchesCron(task.schedule, now)) continue;

      // Debounce: don't run the same task twice in the same minute
      if (task.lastRun && Date.now() - task.lastRun < 55_000) continue;

      // Per-task running guard.
      // Fire-and-forget (void this.executeTask) allowed the same task to run
      // concurrently across tick intervals, causing concurrent agent.run() calls
      // that race on shared session state. We now:
      // 1. Skip tasks already running (cross-interval overlap guard).
      // 2. await each task sequentially within a tick to prevent intra-tick
      // parallelism from creating concurrent agent.run() calls.
      if (task._running) continue;
      await this.executeTask(task);
    }

    // Also check standing orders with their own schedules
    for (const order of this.standingOrders.values()) {
      if (!order.active || !order.schedule) continue;
      if (!matchesCron(order.schedule, now)) continue;

      // Same guard for standing orders (create transient lock key)
      const pseudoId = `standing-${order.id}`;
      const pseudoTask = this.tasks.get(pseudoId);
      if (pseudoTask?._running) continue;
      await this.executeStandingOrder(order);
    }
  }

  private async executeTask(task: ScheduledTask): Promise<string | null> {
    // Set the per-task running guard before any await so concurrent
    // tick() invocations see the lock immediately.
    task._running = true;
    task.lastRun = Date.now();

    try {
      const preamble = this.getStandingOrdersPreamble();
      const fullPrompt = preamble + task.prompt;

      const controller = new AbortController();
      const timeout = task.timeoutMs ?? 120_000;
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await this.config.agent.run(fullPrompt, controller.signal);
        task.lastResult = result;

        if (result.trim()) {
          await this.config.onOutput(result, task);
        }

        return result;
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)), task);
      return null;
    } finally {
      // Always release the per-task lock.
      task._running = false;
    }
  }

  private async executeStandingOrder(order: StandingOrder): Promise<void> {
    // Create a temporary task for the standing order
    const pseudoTask: ScheduledTask = {
      id: `standing-${order.id}`,
      schedule: order.schedule!,
      prompt: order.instruction,
      active: true,
    };

    await this.executeTask(pseudoTask);
  }
}
