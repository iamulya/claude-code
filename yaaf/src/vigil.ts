/**
 * Vigil — Autonomous Agent Mode for YAAF
 *
 * An always-on autonomous execution engine where the agent runs continuously,
 * not just in response to user messages. Vigil extends Agent with a
 * tick-driven proactive loop and a cron-based task scheduler.
 *
 * ## Architecture
 *
 * 1. **Autonomous loop** — a tick-driven proactive execution model.
 * The agent wakes on a configurable interval, receiving periodic prompts
 * that signal "you're awake — decide what to do next".
 *
 * 2. **Cron scheduler** — agents schedule work on standard cron expressions.
 * Tasks are stored on disk and survive restarts. One-shot or recurring.
 *
 * 3. **Brief output channel** — structured output pathway for the agent
 * to communicate results without blocking on user input.
 *
 * 4. **Append-only session journal** — daily log files capturing every tick,
 * cron fire, and brief for debugging and memory.
 *
 * ## Architecture diagram
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ Vigil │
 * │ │
 * │ ┌──────────────┐ ┌────────────┐ ┌──────────────┐ │
 * │ │ Agent loop │ │ Scheduler │ │ Journal │ │
 * │ │ (tick/cron) │ │ (cron.ts) │ │ (daily log) │ │
 * │ └──────┬───────┘ └──────┬─────┘ └──────┬───────┘ │
 * │ └─────────────────►│◄────────────────┘ │
 * │ ▼ │
 * │ AgentRunner (inherited from Agent) │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```ts
 * // Minimal: autonomous agent that wakes every minute
 * const agent = new Vigil({
 * systemPrompt: 'You are a proactive assistant. Check for new work.',
 * tools: myTools,
 * tickInterval: 60_000,
 * });
 *
 * agent.on('tick', ({ count }) => console.log(`Tick #${count}`));
 * agent.on('cron:fire', ({ task }) => console.log(`Cron fired: ${task.id}`));
 * agent.on('brief', ({ message }) => console.log(`Agent says: ${message}`));
 *
 * await agent.start();
 * // Agent now runs autonomously. Stop it with:
 * agent.stop();
 * ```
 *
 * @example
 * ```ts
 * // With scheduled tasks
 * const agent = new Vigil({
 * systemPrompt: 'You monitor GitHub PRs and notify on new reviews.',
 * tools: [githubTool, notifyTool],
 * });
 *
 * // Check PRs every hour
 * agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');
 *
 * // Run a one-shot wake-up 5 minutes from now
 * const inFive = new Date(Date.now() + 5 * 60_000);
 * agent.scheduleOnce(
 * `${inFive.getMinutes()} ${inFive.getHours()} * * *`,
 * 'Initial orientation run — summarise open PRs.',
 * );
 *
 * await agent.start();
 * ```
 */

import { randomUUID } from "crypto";
import * as path from "path";
import * as fsp from "fs/promises";

import { Agent, type AgentConfig } from "./agent.js";
import { nextCronRunMs, validateCron } from "./utils/cron.js";
import { Logger } from "./utils/logger.js";

const logger = new Logger("vigil");

// ── Types ────────────────────────────────────────────────────────────────────

export type ScheduledTask = {
  id: string;
  /** 5-field cron expression (local time) */
  cron: string;
  /** Prompt to run when the task fires */
  prompt: string;
  /** Creation timestamp (epoch ms) */
  createdAt: number;
  /** Last fire timestamp (epoch ms). Only written for recurring tasks. */
  lastFiredAt?: number;
  /** When true, task reschedules after firing (default: one-shot) */
  recurring: boolean;
  /** When true, skips recurringMaxAgeMs auto-expiry */
  permanent?: boolean;
  /**
   * Task execution priority.
   * Higher values execute first when multiple tasks are due simultaneously.
   * Default: 0. Range: -100 to 100.
   */
  priority?: number;
};

export type VigilEvents = {
  /** Agent processed a tick (proactive wake-up interval) */
  tick: { count: number; response: string };
  /** Cron task fired and was dispatched to the agent */
  "cron:fire": { task: ScheduledTask; response: string };
  /**
   * Cron task was delayed due to a busy agent (exponential back-off).
   * Observable so operators can detect tasks that are consistently deferred.
   */
  "cron:delayed": { taskId: string; retryCount: number; delayMs: number; reason: string };
  /** Agent produced structured output via the brief channel */
  brief: { message: string; timestamp: Date };
  /** Tick, cron task, persistence, or watchdog operation failed */
  error: { source: "tick" | "cron" | "persist" | "watchdog"; error: Error; task?: ScheduledTask };
  /** Vigil started autonomous loop */
  start: { tickInterval: number; taskCount: number };
  /** Vigil stopped */
  stop: { ticksRun: number; tasksRun: number };
};

export type VigilEventHandler<K extends keyof VigilEvents> = (data: VigilEvents[K]) => void;

export type VigilConfig = AgentConfig & {
  /**
   * Milliseconds between autonomous tick probes.
   * Set to 0 to disable tick-driven mode (cron-only).
   * Default: 60_000 (1 minute)
   */
  tickInterval?: number;

  /**
   * The tick prompt injected into the agent on each wake-up.
   * Receives the current ISO timestamp and tick count.
   * Default: `<tick timestamp="...">You're awake — what needs attention now?</tick>`
   */
  tickPrompt?: (timestamp: string, count: number) => string;

  /**
   * Maximum number of recurring task auto-expiry in ms.
   * Set to 0 to never expire. Default: 7 days.
   */
  recurringMaxAgeMs?: number;

  /**
   * Directory for persisting scheduled tasks and the session journal.
   * Default: `./.vigil` in the current working directory.
   */
  storageDir?: string;

  /**
   * Interceptor called when the agent produces output.
   * Use this to route agent messages to a UI, webhook, etc.
   * Also emitted as `brief` events.
   */
  onBrief?: (message: string) => void;
};

// ── Vigil ──────────────────────────────────────────────────────────────

/**
 * Vigil — an autonomous, always-on agent with cron scheduling.
 *
 * Extends Agent with:
 * - Tick-driven proactive loop (periodic wake-ups)
 * - Cron task scheduler (file-backed, persistent across restarts)
 * - Brief output channel for structured agent → world communication
 * - Append-only session journal for memory
 */
export class Vigil extends Agent {
  private readonly tickInterval: number;
  private readonly tickPromptFn: (ts: string, count: number) => string;
  private readonly recurringMaxAgeMs: number;
  private readonly storageDir: string;
  private readonly onBrief?: (message: string) => void;

  private readonly tasks: Map<string, ScheduledTask & { nextFireAt: number }> = new Map();
  private readonly vigilEventHandlers = new Map<
    keyof VigilEvents,
    Array<VigilEventHandler<keyof VigilEvents>>
  >();

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  /** Precision scheduler uses setTimeout chain instead of setInterval */
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  /** Watchdog timer detects stuck _isExecuting */
  private _watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private _executingStartedAt = 0;
  private tickCount = 0;
  private tasksRun = 0;
  private running = false;
  /**
   * REENTRANCY COUNTER FIX: Changed from boolean to a numeric counter.
   * A boolean `_isExecuting` incorrectly handles the case where a tool
   * internally triggers `agent.run()` (e.g., via a side-channel). The second
   * entry sees `true` and applies exponential backoff to an already-running task
   * instead of detecting the nesting depth. With a counter:
   * - > 0 = busy (at least one run in progress)
   * - == 0 = idle
   * - > 1 = nested/reentrant (logged as a warning)
   */
  private _executionDepth = 0;
  /** Persistence mutex — prevents concurrent writes corrupting the task file */
  private _isPersisting = false;
  private _persistPending = false;
  /** Promise that resolves when the current execution (tick/cron) completes */
  private _executionPromise: Promise<void> | null = null;
  private _resolveExecution: (() => void) | null = null;
  /**
   * AbortController for the currently-running tick or cron LLM call.
   * When the watchdog detects a stuck execution it aborts this controller so the
   * in-flight agent.run() is cancelled — preventing concurrent mutations of the
   * agent's message history when the watchdog races a just-completing run().
   */
  private _currentTickController: AbortController | null = null;
  /** Track pending journal writes for backpressure */
  private _pendingJournalWrites = 0;
  private static readonly MAX_PENDING_JOURNAL_WRITES = 100;
  /**
   * Counter for journal entries dropped due to backpressure.
   * Visible to operators via getStats() so they can detect data loss on
   * slow filesystems without having to parse log output.
   */
  private _droppedJournalWrites = 0;

  // Session journal (append-only daily log)
  /** Cached date string for journal filename; updated on date change. */
  private _journalDate: string = "";
  /**
   * In-memory journal ring-buffer, capped at 1,000 entries.
   * The real durable record is the on-disk journal file; this in-memory array
   * was never read after being populated, so unbounded growth was pure waste.
   */
  private journalEntries: string[] = [];
  private static readonly MAX_JOURNAL_ENTRIES = 1_000;

  constructor(config: VigilConfig) {
    super(config);

    this.tickInterval = config.tickInterval ?? 60_000;
    this.tickPromptFn =
      config.tickPrompt ??
      ((ts, count) =>
        `<tick timestamp="${ts}" count="${count}">You're running autonomously. The current time is ${ts}. What needs your attention right now?</tick>`);
    this.recurringMaxAgeMs = config.recurringMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
    this.storageDir = config.storageDir ?? path.join(process.cwd(), ".vigil");
    this.onBrief = config.onBrief;
    // journalPath is now computed dynamically inside appendJournal()
    // so midnight rollovers naturally produce new daily log files.
    // The field is kept as a cache (invalidated when the date changes).
  }

  // ── Vigil event system ───────────────────────────────────────────────────

  onVigil<K extends keyof VigilEvents>(event: K, handler: VigilEventHandler<K>): this {
    if (!this.vigilEventHandlers.has(event)) {
      this.vigilEventHandlers.set(event, []);
    }
    this.vigilEventHandlers.get(event)!.push(handler as VigilEventHandler<keyof VigilEvents>);
    return this;
  }

  private emitVigil<K extends keyof VigilEvents>(event: K, data: VigilEvents[K]): void {
    const handlers = this.vigilEventHandlers.get(event);
    if (handlers) for (const h of handlers) h(data);
  }

  // ── Scheduler API ─────────────────────────────────────────────────────────

  /**
   * Schedule a recurring task. Returns the task ID.
   *
   * @example
   * ```ts
   * agent.schedule('0 9 * * 1-5', 'Check for overnight GitHub notifications.');
   * agent.schedule('*' + '/15 * * * *', 'Scan the build queue for failures.');
   * ```
   */
  schedule(cron: string, prompt: string): string {
    return this.addTask(cron, prompt, true);
  }

  /**
   * Schedule a one-shot task. Fires once, then auto-removes.
   *
   * @example
   * ```ts
   * // Fire 10 minutes from now
   * const t = new Date(Date.now() + 10 * 60_000);
   * agent.scheduleOnce(
   * t.getMinutes() + ' ' + t.getHours() + ' ' + t.getDate() + ' ' + (t.getMonth() + 1) + ' *',
   * 'Send the daily summary report.'
   * );
   * ```
   */
  scheduleOnce(cron: string, prompt: string): string {
    return this.addTask(cron, prompt, false);
  }

  /**
   * Cancel a scheduled task by ID.
   */
  cancel(taskId: string): boolean {
    const existed = this.tasks.has(taskId);
    this.tasks.delete(taskId);
    void this.persistTasks();
    return existed;
  }

  /**
   * List all active scheduled tasks.
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(({ nextFireAt: _, ...t }) => t);
  }

  /**
   * Get the next scheduled fire time across all tasks (epoch ms), or null.
   */
  getNextFireTime(): number | null {
    let min = Infinity;
    for (const t of this.tasks.values()) {
      if (t.nextFireAt < min) min = t.nextFireAt;
    }
    return min === Infinity ? null : min;
  }

  // ── Brief output channel ──────────────────────────────────────────────────

  /**
   * Emit a structured message from the agent to the world.
   * The primary output pathway for structured agent → world communication.
   * Fan-outs to registered NotificationAdapter plugins automatically.
   */
  brief(message: string): void {
    const timestamp = new Date();
    this.onBrief?.(message);
    this.emitVigil("brief", { message, timestamp });
    this.journalEntry(`[brief] ${message}`);
    // Guard with hasCapability before calling notify().
    // The orchestrator already uses this pattern; brief() was missing the check.
    // Without it, notify() fans out to all plugins including non-notification ones,
    // which may throw or behave unexpectedly.
    if (this._pluginHost?.hasCapability("notification")) {
      void this._pluginHost
        .notify({
          type: "info",
          title: "Agent Brief",
          message,
          timestamp: timestamp.toISOString(),
        })
        .catch(() => {});
    }
  }

  // ── Session Journal ───────────────────────────────────────────────────────

  /**
   * Append an entry to the session journal.
   * Journal is append-only; entries are never modified after writing.
   */
  journalEntry(text: string): void {
    const entry = `[${new Date().toISOString()}] ${text}`;
    // Ring-buffer eviction — evict the oldest half when at capacity.
    if (this.journalEntries.length >= Vigil.MAX_JOURNAL_ENTRIES) {
      this.journalEntries = this.journalEntries.slice(Math.floor(Vigil.MAX_JOURNAL_ENTRIES / 2));
    }
    this.journalEntries.push(entry);
    // Non-blocking fire-and-forget append
    void this.appendJournal(entry);
  }

  private async appendJournal(entry: string): Promise<void> {
    // Backpressure — skip writes when too many are pending.
    // Prevents unbounded promise accumulation on slow filesystems.
    if (this._pendingJournalWrites >= Vigil.MAX_PENDING_JOURNAL_WRITES) {
      // Emit an observable event and track the drop count so
      // operators know that journal data is being lost, not just silently dropped.
      this._droppedJournalWrites++;
      this.emitVigil("error", {
        source: "persist",
        error: new Error(
          `Journal write dropped (backpressure): ${this._pendingJournalWrites} pending writes. ` +
            `Total dropped: ${this._droppedJournalWrites}. Consider a faster storage device.`,
        ),
      });
      return;
    }
    this._pendingJournalWrites++;
    try {
      await fsp.mkdir(this.storageDir, { recursive: true });
      // Compute journal path dynamically so midnight rollovers produce
      // new daily files without requiring a restart.
      const today = new Date().toISOString().split("T")[0]!;
      if (today !== this._journalDate) this._journalDate = today;
      const journalPath = path.join(this.storageDir, `journal-${this._journalDate}.log`);
      await fsp.appendFile(journalPath, entry + "\n", "utf8");
    } catch {
      // Journal writes are best-effort
    } finally {
      this._pendingJournalWrites--;
    }
  }

  /**
   * Read today's journal entries.
   */
  async readJournal(date?: Date): Promise<string[]> {
    const dateStr = (date ?? new Date()).toISOString().split("T")[0];
    const journalFile = path.join(this.storageDir, `journal-${dateStr}.log`);
    try {
      const raw = await fsp.readFile(journalFile, "utf8");
      return raw.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start the autonomous agent.
   * - Loads persisted tasks from storage
   * - Starts the cron scheduler (1s tick)
   * - Starts the periodic agent wake-up loop (tickInterval)
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Ensure storage dir exists and load persisted tasks
    await fsp.mkdir(this.storageDir, { recursive: true });
    await this.loadTasks();

    this.emitVigil("start", {
      tickInterval: this.tickInterval,
      taskCount: this.tasks.size,
    });

    this.journalEntry(
      `Vigil started | tickInterval=${this.tickInterval}ms | tasks=${this.tasks.size}`,
    );

    // 1. Cron scheduler — use precision setTimeout chain instead of
    // setInterval so each fire is pinned to the next task's exact epoch ms,
    // eliminating drift and concurrent async accumulation.
    this.scheduleNextCronCheck();

    // 2. Tick loop (proactive wake-ups)
    if (this.tickInterval > 0) {
      this.tickTimer = setInterval(() => {
        void this.tick();
      }, this.tickInterval);
      this.tickTimer.unref?.();
    }

    // Watchdog timer — detect and reset a stuck _isExecuting flag.
    // If the flag stays true for longer than 3 × tickInterval, reset it forcibly
    // and emit a warning so operators know something went wrong.
    const watchdogInterval = Math.max(this.tickInterval * 3, 30_000);
    this._watchdogTimer = setInterval(() => {
      if (this._executionDepth > 0 && this._executingStartedAt > 0) {
        const stuckMs = Date.now() - this._executingStartedAt;
        if (stuckMs > watchdogInterval) {
          this.journalEntry(
            `[watchdog] execution stuck for ${stuckMs}ms (depth=${this._executionDepth}) — aborting and force-resetting`,
          );
          this.emitVigil("error", {
            source: "watchdog",
            error: new Error(
              `Vigil stuck: execution depth ${this._executionDepth} for ${stuckMs}ms. Force-reset.`,
            ),
          });
          // Abort the in-flight LLM call BEFORE resetting the depth counter.
          // Without this, the stuck run() would eventually resolve and decrement the
          // counter concurrently with the next tick that has already incremented it,
          // producing two simultaneous agent.run() calls on the same message history.
          this._currentTickController?.abort(
            new Error("Vigil watchdog: execution timeout — aborting stuck run"),
          );
          this._currentTickController = null;
          this._executionDepth = 0;
          this._executingStartedAt = 0;
          this._resolveExecution?.();
          this._executionPromise = null;
        }
      }
    }, watchdogInterval);
    this._watchdogTimer.unref?.();
  }

  /**
   * Stop the autonomous agent (non-blocking — does not wait for in-progress tasks).
   * Use `stopGracefully()` to wait for the current task to finish.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }

    this.journalEntry(`Vigil stopped | ticks=${this.tickCount} | tasksRun=${this.tasksRun}`);
    this.emitVigil("stop", { ticksRun: this.tickCount, tasksRun: this.tasksRun });
  }

  /**
   * Stop the autonomous agent gracefully, waiting for any
   * in-progress tick or cron task to complete before returning.
   *
   * This prevents race conditions where tool execution, session journal
   * writes, or plugin cleanup races with in-progress work.
   */
  async stopGracefully(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }

    // Wait for in-progress execution to finish
    if (this._executionPromise) {
      try {
        await this._executionPromise;
      } catch {
        /* already handled by emitVigil('error') */
      }
    }

    this.journalEntry(
      `Vigil stopped (graceful) | ticks=${this.tickCount} | tasksRun=${this.tasksRun}`,
    );
    this.emitVigil("stop", { ticksRun: this.tickCount, tasksRun: this.tasksRun });
  }

  /**
   * Run the agent once on-demand (bypass tick interval).
   */
  async tick(): Promise<string> {
    // skip if a previous tick or cron task is still running
    if (this._executionDepth > 0) {
      this.journalEntry(
        `[tick #${this.tickCount + 1}] skipped — previous execution still running (depth=${this._executionDepth})`,
      );
      return "[skipped: agent busy]";
    }

    this._executionDepth++;
    if (this._executionDepth > 1) {
      // Reentrant call — log as a warning but allow it (counter tracks nesting)
      this.journalEntry(
        `[tick] WARNING: reentrant execution detected (depth=${this._executionDepth})`,
      );
    }
    this._executingStartedAt = Date.now(); // watchdog timestamp
    // Track the AbortController for this execution so the watchdog
    // can cancel the in-flight LLM call rather than just resetting the counter.
    const ac = new AbortController();
    this._currentTickController = ac;
    // Track execution promise so stopGracefully() can await it
    this._executionPromise = new Promise<void>((r) => {
      this._resolveExecution = r;
    });
    this.tickCount++;
    const ts = new Date().toISOString();
    const prompt = this.tickPromptFn(ts, this.tickCount);

    this.journalEntry(`[tick #${this.tickCount}] ${prompt.slice(0, 120)}`);

    try {
      const response = await this.run(prompt, ac.signal);
      this.emitVigil("tick", { count: this.tickCount, response });
      this.journalEntry(`[tick #${this.tickCount} response] ${response.slice(0, 200)}`);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitVigil("error", { source: "tick", error });
      throw error;
    } finally {
      this._currentTickController = null;
      this._executionDepth = Math.max(0, this._executionDepth - 1);
      if (this._executionDepth === 0) {
        this._executingStartedAt = 0;
        this._resolveExecution?.();
        this._executionPromise = null;
      }
    }
  }

  // ── Internal scheduler ────────────────────────────────────────────────────

  /**
   * Precision scheduler — arm a single setTimeout to the next task's
   * exact fire time, then re-arm after each check. This eliminates the
   * 1s-setInterval drift and prevents accumulation of unresolved async calls.
   */
  private scheduleNextCronCheck(): void {
    if (!this.running) return;

    // Find the soonest task fire time
    let nextMs = Infinity;
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.nextFireAt < nextMs) nextMs = task.nextFireAt;
    }

    let waitMs: number;
    if (isFinite(nextMs)) {
      // We have tasks — wake at the next fire time, but cap at 60s so newly-added
      // tasks are picked up promptly without waiting for a distant future fire time.
      waitMs = Math.min(Math.max(0, nextMs - now), 60_000);
    } else {
      // SCHEDULER CAP FIX: No tasks scheduled — previously woke every 60s regardless
      // (1,440 unnecessary wakes/day for agents with only daily cron tasks).
      // Now sleeps for 5 minutes when idle. New tasks added via schedule() call
      // scheduleNextCronCheck() which immediately re-arms to the correct next time.
      waitMs = 5 * 60_000;
    }

    if (this.schedulerTimer) clearTimeout(this.schedulerTimer);
    this.schedulerTimer = setTimeout(async () => {
      await this.checkScheduler();
      this.scheduleNextCronCheck(); // re-arm
    }, waitMs);
    this.schedulerTimer.unref?.();
  }

  private async checkScheduler(): Promise<void> {
    if (!this.running) return;
    const now = Date.now();
    const toFire: Array<ScheduledTask & { nextFireAt: number }> = [];

    for (const task of this.tasks.values()) {
      if (task.nextFireAt <= now) toFire.push(task);
    }

    // Sort by priority (highest first) so high-priority
    // tasks execute before low-priority ones when multiple are due.
    toFire.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const task of toFire) {
      await this.fireTask(task, Date.now());
    }

    if (toFire.length > 0) void this.persistTasks();
  }

  private async fireTask(task: ScheduledTask & { nextFireAt: number }, now: number): Promise<void> {
    // skip if a tick or other cron task is already running.
    // Use capped exponential back-off for re-queue instead of hardcoded 60s.
    if (this._executionDepth > 0) {
      const retryCount = (task as ScheduledTask & { _retryCount?: number })._retryCount ?? 0;
      // Exponential back-off: 30s, 60s, 120s, 240s, capped at 300s
      const delayMs = Math.min(30_000 * 2 ** retryCount, 300_000);
      (task as ScheduledTask & { _retryCount?: number })._retryCount = retryCount + 1;
      task.nextFireAt = now + delayMs;
      this.journalEntry(
        `[cron:delayed] task=${task.id} retry=${retryCount + 1} delayMs=${delayMs} — agent busy (depth=${this._executionDepth})`,
      );
      this.emitVigil("cron:delayed", {
        taskId: task.id,
        retryCount: retryCount + 1,
        delayMs,
        reason: "agent busy",
      });
      // Re-arm scheduler to wake up at the new fire time
      this.scheduleNextCronCheck();
      return;
    }

    this._executionDepth++;
    this._executingStartedAt = Date.now(); // watchdog timestamp
    // Track the AbortController so the watchdog can abort this cron run.
    const ac = new AbortController();
    this._currentTickController = ac;
    // Track execution promise so stopGracefully() can await it
    this._executionPromise = new Promise<void>((r) => {
      this._resolveExecution = r;
    });
    this.tasksRun++;
    this.journalEntry(`[cron:fire] task=${task.id} cron="${task.cron}"`);

    try {
      const response = await this.run(task.prompt, ac.signal);

      const { nextFireAt: _nextFire, ...taskSnap } = task;

      this.emitVigil("cron:fire", { task: taskSnap, response });
      this.journalEntry(`[cron:result] task=${task.id} ${response.slice(0, 200)}`);

      // Reschedule or remove
      // Use lastFiredAt (not createdAt) as the age reference point.
      // A task that was created 8 days ago but has been firing daily is still
      // active and should not be aged out. lastFiredAt reflects recent activity.
      const ageReference = task.lastFiredAt ?? task.createdAt;
      const isAged =
        this.recurringMaxAgeMs > 0 &&
        task.recurring &&
        !task.permanent &&
        now - ageReference >= this.recurringMaxAgeMs;

      if (task.recurring && !isAged) {
        task.lastFiredAt = now;
        const next = nextCronRunMs(task.cron, now);
        task.nextFireAt = next ?? Infinity;
      } else {
        this.tasks.delete(task.id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const taskSnap: ScheduledTask = { ...task };
      this.emitVigil("error", { source: "cron", error, task: taskSnap });
      // Remove failed non-recurring (one-shot) tasks.
      // Previously, a one-shot task that always throws was never removed from
      // this.tasks because deletion only happened in the success path. The task
      // would re-fire on every scheduler check, flooding the error log forever.
      if (!task.recurring) {
        this.tasks.delete(task.id);
      } else {
        // For recurring tasks, advance nextFireAt so the task doesn't immediately
        // re-fire and thrash — use the same backoff as the busy-agent deferral.
        const next = nextCronRunMs(task.cron, Date.now());
        task.nextFireAt = next ?? Infinity;
      }
    } finally {
      this._currentTickController = null;
      this._executionDepth = Math.max(0, this._executionDepth - 1);
      if (this._executionDepth === 0) {
        this._executingStartedAt = 0; // reset watchdog timestamp
        this._resolveExecution?.();
        this._executionPromise = null;
      }
      // reset retry counter on successful fire
      delete (task as ScheduledTask & { _retryCount?: number })._retryCount;
      // re-arm the precision scheduler after task completion
      this.scheduleNextCronCheck();
    }
  }

  // ── Task persistence ──────────────────────────────────────────────────────

  private tasksFilePath(): string {
    return path.join(this.storageDir, "scheduled_tasks.json");
  }

  private addTask(cron: string, prompt: string, recurring: boolean): string {
    if (!validateCron(cron)) throw new Error(`Invalid cron expression: "${cron}"`);
    // Use full UUID to prevent collision risk over long-running deployments.
    // 8-char truncation has birthday-problem collisions around ~65K tasks.
    const id = randomUUID();
    const createdAt = Date.now();
    const nextFireAt = nextCronRunMs(cron, createdAt) ?? Infinity;

    this.tasks.set(id, { id, cron, prompt, createdAt, recurring, nextFireAt });
    void this.persistTasks();
    return id;
  }

  /**
   * Persist with a mutex to prevent concurrent writes.
   * If persistence is already in progress, flags a pending re-persist
   * which runs after the current write completes.
   *
   * Uses atomic write (temp file + rename) to prevent
   * file corruption if the process crashes mid-write. `rename()` is
   * atomic on POSIX systems.
   */
  private async persistTasks(): Promise<void> {
    // If already persisting, schedule a follow-up
    if (this._isPersisting) {
      this._persistPending = true;
      return;
    }

    this._isPersisting = true;
    const filePath = this.tasksFilePath();
    const tmpPath = filePath + ".tmp." + Date.now();
    const data = {
      tasks: Array.from(this.tasks.values()).map(({ nextFireAt: _, ...t }) => t),
    };
    try {
      await fsp.mkdir(this.storageDir, { recursive: true });
      // Atomic write — write to temp file, then rename.
      // rename() is atomic on POSIX, preventing corruption on crash.
      await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      await fsp.rename(tmpPath, filePath);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Failed to persist tasks", { error: error.message });
      this.emitVigil("error", { source: "persist", error });
      // Clean up temp file on failure
      try {
        await fsp.unlink(tmpPath);
      } catch {
        /* best effort */
      }
    } finally {
      this._isPersisting = false;
      // If another persist was requested while we were writing, do it now
      if (this._persistPending) {
        this._persistPending = false;
        void this.persistTasks();
      }
    }
  }

  private async loadTasks(): Promise<void> {
    const filePath = this.tasksFilePath();
    try {
      const raw = await fsp.readFile(filePath, "utf8");
      const data = JSON.parse(raw) as { tasks: unknown[] };
      if (!Array.isArray(data.tasks)) return;
      for (const raw of data.tasks) {
        // Strict per-field type validation. A maliciously crafted
        // scheduled_tasks.json could inject arbitrary prompts or escalate
        // priority. Reject any record that doesn't pass all checks.
        const t = raw as Record<string, unknown>;
        if (typeof t.id !== "string" || t.id.length === 0) continue;
        if (typeof t.cron !== "string") continue;
        if (typeof t.prompt !== "string" || t.prompt.length === 0) continue;
        if (!validateCron(t.cron)) continue;
        if (t.createdAt !== undefined && typeof t.createdAt !== "number") continue;
        if (t.lastFiredAt !== undefined && typeof t.lastFiredAt !== "number") continue;
        if (t.priority !== undefined && typeof t.priority !== "number") continue;
        if (t.recurring !== undefined && typeof t.recurring !== "boolean") continue;
        if (t.permanent !== undefined && typeof t.permanent !== "boolean") continue;
        // Sanitize: truncate prompt to a safe max length to limit injection surface
        const prompt = t.prompt.slice(0, 4_096);
        const task = {
          id: t.id,
          cron: t.cron,
          prompt,
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          recurring: typeof t.recurring === "boolean" ? t.recurring : false,
          lastFiredAt: typeof t.lastFiredAt === "number" ? t.lastFiredAt : undefined,
          priority: typeof t.priority === "number" ? t.priority : undefined,
          permanent: typeof t.permanent === "boolean" ? t.permanent : undefined,
        } as ScheduledTask;
        const anchor = task.lastFiredAt ?? task.createdAt;
        const nextFireAt = nextCronRunMs(task.cron, anchor) ?? Infinity;
        this.tasks.set(task.id, { ...task, nextFireAt });
      }
    } catch {
      // No file yet — start fresh
    }
  }
}

// ── Factory helper ────────────────────────────────────────────────────────────

/**
 * Create a Vigil that wakes up every N minutes.
 *
 * @example
 * ```ts
 * const agent = vigil({
 * systemPrompt: 'You are a proactive DevOps assistant.',
 * tools: [checkBuildTool, alertTool],
 * tickEveryMinutes: 5,
 * });
 * await agent.start();
 * ```
 */
export function vigil(
  config: Omit<VigilConfig, "tickInterval"> & { tickEveryMinutes?: number },
): Vigil {
  return new Vigil({
    ...config,
    tickInterval: (config.tickEveryMinutes ?? 1) * 60_000,
  });
}
