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
 *    The agent wakes on a configurable interval, receiving periodic prompts
 *    that signal "you're awake — decide what to do next".
 *
 * 2. **Cron scheduler** — agents schedule work on standard cron expressions.
 *    Tasks are stored on disk and survive restarts. One-shot or recurring.
 *
 * 3. **Brief output channel** — structured output pathway for the agent
 *    to communicate results without blocking on user input.
 *
 * 4. **Append-only session journal** — daily log files capturing every tick,
 *    cron fire, and brief for debugging and memory.
 *
 * ## Architecture diagram
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                     Vigil                               │
 * │                                                         │
 * │  ┌──────────────┐   ┌────────────┐   ┌──────────────┐  │
 * │  │  Agent loop  │   │  Scheduler │   │   Journal    │  │
 * │  │  (tick/cron) │   │  (cron.ts) │   │  (daily log) │  │
 * │  └──────┬───────┘   └──────┬─────┘   └──────┬───────┘  │
 * │         └─────────────────►│◄────────────────┘          │
 * │                            ▼                            │
 * │              AgentRunner (inherited from Agent)         │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```ts
 * // Minimal: autonomous agent that wakes every minute
 * const agent = new Vigil({
 *   systemPrompt: 'You are a proactive assistant. Check for new work.',
 *   tools: myTools,
 *   tickInterval: 60_000,
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
 *   systemPrompt: 'You monitor GitHub PRs and notify on new reviews.',
 *   tools: [githubTool, notifyTool],
 * });
 *
 * // Check PRs every hour
 * agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');
 *
 * // Run a one-shot wake-up 5 minutes from now
 * const inFive = new Date(Date.now() + 5 * 60_000);
 * agent.scheduleOnce(
 *   `${inFive.getMinutes()} ${inFive.getHours()} * * *`,
 *   'Initial orientation run — summarise open PRs.',
 * );
 *
 * await agent.start();
 * ```
 */

import { randomUUID } from 'crypto'
import * as path from 'path'
import * as fsp from 'fs/promises'

import { Agent, type AgentConfig } from './agent.js'
import { nextCronRunMs, validateCron } from './utils/cron.js'
import { Logger } from './utils/logger.js'

const logger = new Logger('vigil')


// ── Types ────────────────────────────────────────────────────────────────────

export type ScheduledTask = {
  id: string
  /** 5-field cron expression (local time) */
  cron: string
  /** Prompt to run when the task fires */
  prompt: string
  /** Creation timestamp (epoch ms) */
  createdAt: number
  /** Last fire timestamp (epoch ms). Only written for recurring tasks. */
  lastFiredAt?: number
  /** When true, task reschedules after firing (default: one-shot) */
  recurring: boolean
  /** When true, skips recurringMaxAgeMs auto-expiry */
  permanent?: boolean
}

export type VigilEvents = {
  /** Agent processed a tick (proactive wake-up interval) */
  'tick': { count: number; response: string }
  /** Cron task fired and was dispatched to the agent */
  'cron:fire': { task: ScheduledTask; response: string }
  /** Agent produced structured output via the brief channel */
  'brief': { message: string; timestamp: Date }
  /** Tick, cron task, or persistence operation failed */
  'error': { source: 'tick' | 'cron' | 'persist'; error: Error; task?: ScheduledTask }
  /** Vigil started autonomous loop */
  'start': { tickInterval: number; taskCount: number }
  /** Vigil stopped */
  'stop': { ticksRun: number; tasksRun: number }
}

export type VigilEventHandler<K extends keyof VigilEvents> = (
  data: VigilEvents[K],
) => void

export type VigilConfig = AgentConfig & {
  /**
   * Milliseconds between autonomous tick probes.
   * Set to 0 to disable tick-driven mode (cron-only).
   * Default: 60_000 (1 minute)
   */
  tickInterval?: number

  /**
   * The tick prompt injected into the agent on each wake-up.
   * Receives the current ISO timestamp and tick count.
   * Default: `<tick timestamp="...">You're awake — what needs attention now?</tick>`
   */
  tickPrompt?: (timestamp: string, count: number) => string

  /**
   * Maximum number of recurring task auto-expiry in ms.
   * Set to 0 to never expire. Default: 7 days.
   */
  recurringMaxAgeMs?: number

  /**
   * Directory for persisting scheduled tasks and the session journal.
   * Default: `./.vigil` in the current working directory.
   */
  storageDir?: string

  /**
   * Interceptor called when the agent produces output.
   * Use this to route agent messages to a UI, webhook, etc.
   * Also emitted as `brief` events.
   */
  onBrief?: (message: string) => void
}

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
  private readonly tickInterval: number
  private readonly tickPromptFn: (ts: string, count: number) => string
  private readonly recurringMaxAgeMs: number
  private readonly storageDir: string
  private readonly onBrief?: (message: string) => void

  private readonly tasks: Map<string, ScheduledTask & { nextFireAt: number }> = new Map()
  private readonly vigilEventHandlers = new Map<
    keyof VigilEvents,
    Array<VigilEventHandler<keyof VigilEvents>>
  >()

  private tickTimer: ReturnType<typeof setInterval> | null = null
  private schedulerTimer: ReturnType<typeof setInterval> | null = null
  private tickCount = 0
  private tasksRun = 0
  private running = false

  // Session journal (append-only daily log)
  private journalPath: string
  private journalEntries: string[] = []

  constructor(config: VigilConfig) {
    super(config)

    this.tickInterval = config.tickInterval ?? 60_000
    this.tickPromptFn = config.tickPrompt ??
      ((ts, count) =>
        `<tick timestamp="${ts}" count="${count}">You're running autonomously. The current time is ${ts}. What needs your attention right now?</tick>`)
    this.recurringMaxAgeMs = config.recurringMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000
    this.storageDir = config.storageDir ?? path.join(process.cwd(), '.vigil')
    this.onBrief = config.onBrief
    this.journalPath = path.join(
      this.storageDir,
      `journal-${new Date().toISOString().split('T')[0]}.log`,
    )
  }

  // ── Vigil event system ───────────────────────────────────────────────────

  onVigil<K extends keyof VigilEvents>(
    event: K,
    handler: VigilEventHandler<K>,
  ): this {
    if (!this.vigilEventHandlers.has(event)) {
      this.vigilEventHandlers.set(event, [])
    }
    this.vigilEventHandlers.get(event)!.push(
      handler as VigilEventHandler<keyof VigilEvents>,
    )
    return this
  }

  private emitVigil<K extends keyof VigilEvents>(
    event: K,
    data: VigilEvents[K],
  ): void {
    const handlers = this.vigilEventHandlers.get(event)
    if (handlers) for (const h of handlers) h(data)
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
    return this.addTask(cron, prompt, true)
  }

  /**
   * Schedule a one-shot task. Fires once, then auto-removes.
   *
   * @example
   * ```ts
   * // Fire 10 minutes from now
   * const t = new Date(Date.now() + 10 * 60_000);
   * agent.scheduleOnce(
   *   t.getMinutes() + ' ' + t.getHours() + ' ' + t.getDate() + ' ' + (t.getMonth() + 1) + ' *',
   *   'Send the daily summary report.'
   * );
   * ```
   */
  scheduleOnce(cron: string, prompt: string): string {
    return this.addTask(cron, prompt, false)
  }

  /**
   * Cancel a scheduled task by ID.
   */
  cancel(taskId: string): boolean {
    const existed = this.tasks.has(taskId)
    this.tasks.delete(taskId)
    void this.persistTasks()
    return existed
  }

  /**
   * List all active scheduled tasks.
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(({ nextFireAt: _, ...t }) => t)
  }

  /**
   * Get the next scheduled fire time across all tasks (epoch ms), or null.
   */
  getNextFireTime(): number | null {
    let min = Infinity
    for (const t of this.tasks.values()) {
      if (t.nextFireAt < min) min = t.nextFireAt
    }
    return min === Infinity ? null : min
  }

  // ── Brief output channel ──────────────────────────────────────────────────

  /**
   * Emit a structured message from the agent to the world.
   * The primary output pathway for structured agent → world communication.
   */
  brief(message: string): void {
    const timestamp = new Date()
    this.onBrief?.(message)
    this.emitVigil('brief', { message, timestamp })
    this.journalEntry(`[brief] ${message}`)
  }

  // ── Session Journal ───────────────────────────────────────────────────────

  /**
   * Append an entry to the session journal.
   * Journal is append-only; entries are never modified after writing.
   */
  journalEntry(text: string): void {
    const entry = `[${new Date().toISOString()}] ${text}`
    this.journalEntries.push(entry)
    // Non-blocking fire-and-forget append
    void this.appendJournal(entry)
  }

  private async appendJournal(entry: string): Promise<void> {
    try {
      await fsp.mkdir(this.storageDir, { recursive: true })
      await fsp.appendFile(this.journalPath, entry + '\n', 'utf8')
    } catch {
      // Journal writes are best-effort
    }
  }

  /**
   * Read today's journal entries.
   */
  async readJournal(date?: Date): Promise<string[]> {
    const dateStr = (date ?? new Date()).toISOString().split('T')[0]
    const journalFile = path.join(this.storageDir, `journal-${dateStr}.log`)
    try {
      const raw = await fsp.readFile(journalFile, 'utf8')
      return raw.split('\n').filter(Boolean)
    } catch {
      return []
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
    if (this.running) return
    this.running = true

    // Ensure storage dir exists and load persisted tasks
    await fsp.mkdir(this.storageDir, { recursive: true })
    await this.loadTasks()

    this.emitVigil('start', {
      tickInterval: this.tickInterval,
      taskCount: this.tasks.size,
    })

    this.journalEntry(`Vigil started | tickInterval=${this.tickInterval}ms | tasks=${this.tasks.size}`)

    // 1. Cron scheduler — 1s resolution
    this.schedulerTimer = setInterval(() => {
      void this.checkScheduler()
    }, 1_000)
    this.schedulerTimer.unref?.()

    // 2. Tick loop (proactive wake-ups)
    if (this.tickInterval > 0) {
      this.tickTimer = setInterval(() => {
        void this.tick()
      }, this.tickInterval)
      this.tickTimer.unref?.()
    }
  }

  /**
   * Stop the autonomous agent gracefully.
   */
  stop(): void {
    if (!this.running) return
    this.running = false

    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null }
    if (this.schedulerTimer) { clearInterval(this.schedulerTimer); this.schedulerTimer = null }

    this.journalEntry(`Vigil stopped | ticks=${this.tickCount} | tasksRun=${this.tasksRun}`)
    this.emitVigil('stop', { ticksRun: this.tickCount, tasksRun: this.tasksRun })
  }

  /**
   * Run the agent once on-demand (bypass tick interval).
   */
  async tick(): Promise<string> {
    this.tickCount++
    const ts = new Date().toISOString()
    const prompt = this.tickPromptFn(ts, this.tickCount)

    this.journalEntry(`[tick #${this.tickCount}] ${prompt.slice(0, 120)}`)

    try {
      const response = await this.run(prompt)
      this.emitVigil('tick', { count: this.tickCount, response })
      this.journalEntry(`[tick #${this.tickCount} response] ${response.slice(0, 200)}`)
      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.emitVigil('error', { source: 'tick', error })
      throw error
    }
  }

  // ── Internal scheduler ────────────────────────────────────────────────────

  private async checkScheduler(): Promise<void> {
    if (!this.running) return
    const now = Date.now()
    const toFire: Array<ScheduledTask & { nextFireAt: number }> = []

    for (const task of this.tasks.values()) {
      if (task.nextFireAt <= now) toFire.push(task)
    }

    for (const task of toFire) {
      await this.fireTask(task, Date.now())
    }

    if (toFire.length > 0) void this.persistTasks()
  }

  private async fireTask(
    task: ScheduledTask & { nextFireAt: number },
    now: number,
  ): Promise<void> {
    this.tasksRun++
    this.journalEntry(`[cron:fire] task=${task.id} cron="${task.cron}"`)

    try {
      const response = await this.run(task.prompt)

      const { nextFireAt: _nextFire, ...taskSnap } = task

      this.emitVigil('cron:fire', { task: taskSnap, response })
      this.journalEntry(`[cron:result] task=${task.id} ${response.slice(0, 200)}`)

      // Reschedule or remove
      const isAged =
        this.recurringMaxAgeMs > 0 &&
        task.recurring &&
        !task.permanent &&
        now - task.createdAt >= this.recurringMaxAgeMs

      if (task.recurring && !isAged) {
        task.lastFiredAt = now
        const next = nextCronRunMs(task.cron, now)
        task.nextFireAt = next ?? Infinity
      } else {
        this.tasks.delete(task.id)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const taskSnap: ScheduledTask = { ...task }
      this.emitVigil('error', { source: 'cron', error, task: taskSnap })
    }
  }

  // ── Task persistence ──────────────────────────────────────────────────────

  private tasksFilePath(): string {
    return path.join(this.storageDir, 'scheduled_tasks.json')
  }

  private addTask(cron: string, prompt: string, recurring: boolean): string {
    if (!validateCron(cron)) throw new Error(`Invalid cron expression: "${cron}"`)
    const id = randomUUID().slice(0, 8)
    const createdAt = Date.now()
    const nextFireAt = nextCronRunMs(cron, createdAt) ?? Infinity

    this.tasks.set(id, { id, cron, prompt, createdAt, recurring, nextFireAt })
    void this.persistTasks()
    return id
  }

  private async persistTasks(): Promise<void> {
    const filePath = this.tasksFilePath()
    const data = {
      tasks: Array.from(this.tasks.values()).map(
        ({ nextFireAt: _, ...t }) => t,
      ),
    }
    try {
      await fsp.mkdir(this.storageDir, { recursive: true })
      await fsp.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Failed to persist tasks', { error: error.message })
      this.emitVigil('error', { source: 'persist', error })
    }
  }

  private async loadTasks(): Promise<void> {
    const filePath = this.tasksFilePath()
    try {
      const raw = await fsp.readFile(filePath, 'utf8')
      const data = JSON.parse(raw) as { tasks: ScheduledTask[] }
      for (const t of data.tasks ?? []) {
        if (!t.id || !t.cron || !t.prompt) continue
        if (!validateCron(t.cron)) continue
        const anchor = t.lastFiredAt ?? t.createdAt
        const nextFireAt = nextCronRunMs(t.cron, anchor) ?? Infinity
        this.tasks.set(t.id, { ...t, recurring: t.recurring ?? false, nextFireAt })
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
 *   systemPrompt: 'You are a proactive DevOps assistant.',
 *   tools: [checkBuildTool, alertTool],
 *   tickEveryMinutes: 5,
 * });
 * await agent.start();
 * ```
 */
export function vigil(
  config: Omit<VigilConfig, 'tickInterval'> & { tickEveryMinutes?: number },
): Vigil {
  return new Vigil({
    ...config,
    tickInterval: (config.tickEveryMinutes ?? 1) * 60_000,
  })
}
