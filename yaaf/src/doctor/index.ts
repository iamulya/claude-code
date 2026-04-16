/**
 * YAAF Doctor — Embeddable Expert Agent & Daemon
 *
 * A developer-facing expert agent that understands YAAF deeply and can
 * read, search, compile, test, and diagnose the developer's project.
 *
 * ## Two usage patterns
 *
 * ### 1. Interactive — ask questions, get grounded answers
 * ```ts
 * import { YaafDoctor } from 'yaaf'
 *
 * const doctor = new YaafDoctor()          // uses process.cwd()
 * const answer = await doctor.ask('Why is my tool not being called?')
 * console.log(answer)
 * ```
 *
 * ### 2. Daemon — proactive error watcher running alongside your agent
 * ```ts
 * import { YaafDoctor } from 'yaaf'
 *
 * const doctor = new YaafDoctor({ daemon: true })
 * doctor.onIssue((issue) => {
 *   console.log(`🔴 ${issue.summary}\n${issue.details}`)
 * })
 * await doctor.startDaemon()
 * // ... later
 * doctor.stopDaemon()
 * ```
 *
 * ### 3. CLI — `npx yaaf doctor`
 * ```bash
 * npx yaaf doctor                 # interactive REPL
 * npx yaaf doctor --daemon        # background watcher
 * npx yaaf doctor --watch         # lightweight tsc watcher (no LLM)
 * ```
 */

import * as path from 'path'
import { execSync } from 'child_process'
import { Agent, type AgentConfig } from '../agent.js'
import { Vigil } from '../vigil.js'
import { ContextManager } from '../context/contextManager.js'
import { resolveModelSpecs } from '../models/specs.js'
import { createDoctorTools } from './tools.js'
import { DOCTOR_SYSTEM_PROMPT, DOCTOR_TICK_PROMPT } from './prompt.js'
import { Logger } from '../utils/logger.js'
import type { ModelProvider } from '../models/resolver.js'
import type { Tool } from '../tools/tool.js'
import type { ChatModel, RunnerEvents, RunnerEventHandler } from '../agents/runner.js'

const logger = new Logger('doctor')

// ── Types ────────────────────────────────────────────────────────────────────

export type DoctorIssue = {
  type: 'compile_error' | 'test_failure' | 'pattern_warning' | 'runtime_error'
  summary: string
  details: string
  timestamp: Date
}

export type YaafDoctorConfig = {
  /** Project root to inspect (default: process.cwd()) */
  projectRoot?: string

  /** LLM model to use (default: auto-detect from env) */
  model?: string

  /** LLM provider (default: auto-detect from env) */
  provider?: ModelProvider

  /** API key override (default: from environment) */
  apiKey?: string

  /** Pre-configured ChatModel instance (bypasses provider/apiKey resolution) */
  chatModel?: ChatModel

  /** Additional tools to give the doctor */
  extraTools?: Tool[]

  /** Extra instructions appended to the system prompt */
  extraInstructions?: string

  /** Daemon check interval in seconds (default: 30) */
  daemonIntervalSec?: number

  /** Max LLM iterations per question (default: 20) */
  maxIterations?: number
}

export type WatchOptions = {
  /**
   * How long to wait (ms) after the last error before flushing the
   * buffer and triggering diagnosis. Prevents flooding on cascading errors.
   * Default: 2000ms
   */
  debounceMs?: number

  /**
   * Maximum errors to accumulate before force-flushing regardless of debounce.
   * Default: 5
   */
  maxBufferSize?: number

  /**
   * Whether to use the Doctor's LLM to diagnose accumulated errors.
   * If false, raw DoctorIssue events are still emitted via onIssue().
   * Default: true
   */
  autoDiagnose?: boolean
}

// ── Error Tracker ────────────────────────────────────────────────────────────

class ErrorTracker {
  private lastCompileErrors = new Set<string>()
  private lastTestFailures = new Set<string>()

  diffCompileErrors(current: string[]): string[] {
    const set = new Set(current)
    const newOnes = current.filter((e) => !this.lastCompileErrors.has(e))
    this.lastCompileErrors = set
    return newOnes
  }

  diffTestFailures(current: string[]): string[] {
    const set = new Set(current)
    const newOnes = current.filter((f) => !this.lastTestFailures.has(f))
    this.lastTestFailures = set
    return newOnes
  }

  get compileErrorCount(): number { return this.lastCompileErrors.size }
  get testFailureCount(): number { return this.lastTestFailures.size }
  get healthy(): boolean { return this.compileErrorCount === 0 && this.testFailureCount === 0 }
}

// ── RuntimeErrorBuffer ───────────────────────────────────────────────────────

/**
 * Debounced error accumulator. Collects runtime errors and flushes them
 * as a batch after a quiet period or when the buffer fills. This prevents
 * flooding the LLM with diagnosis requests on cascading failures — e.g.,
 * when a permission misconfiguration causes 20 tool:blocked events in
 * rapid succession, they're batched into one diagnosis call.
 */
class RuntimeErrorBuffer {
  private buffer: DoctorIssue[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly debounceMs: number,
    private readonly maxSize: number,
    private readonly onFlush: (errors: DoctorIssue[]) => Promise<void>,
  ) {}

  push(issue: DoctorIssue): void {
    this.buffer.push(issue)

    // Force-flush if buffer is full
    if (this.buffer.length >= this.maxSize) {
      this.flush()
      return
    }

    // Otherwise, debounce
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.debounceMs)
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.buffer.length === 0) return

    const errors = [...this.buffer]
    this.buffer = []
    this.onFlush(errors).catch(() => {})
  }
}

// ── WatchEntry (internal bookkeeping) ────────────────────────────────────────

type WatchEntry = {
  handlers: Record<string, (...args: any[]) => void>
  buffer: RuntimeErrorBuffer
}

// ── YaafDoctor ───────────────────────────────────────────────────────────────

export class YaafDoctor {
  readonly projectRoot: string
  private agent: Agent
  private daemon?: Vigil
  private errorTracker = new ErrorTracker()
  private issueHandlers: Array<(issue: DoctorIssue) => void> = []
  private watchedAgents = new Map<Agent, WatchEntry>()
  private readonly daemonIntervalSec: number
  private readonly config: YaafDoctorConfig

  constructor(config: YaafDoctorConfig = {}) {
    this.projectRoot = path.resolve(config.projectRoot ?? process.cwd())
    this.daemonIntervalSec = config.daemonIntervalSec ?? 30
    this.config = config

    const tools = [
      ...createDoctorTools(this.projectRoot),
      ...(config.extraTools ?? []),
    ]

    const systemPrompt = config.extraInstructions
      ? `${DOCTOR_SYSTEM_PROMPT}\n\n## Project-Specific Instructions\n\n${config.extraInstructions}`
      : DOCTOR_SYSTEM_PROMPT

    const agentConfig: AgentConfig = {
      name: 'YAAF Doctor',
      systemPrompt,
      tools,
      ...(config.chatModel
        ? { chatModel: config.chatModel }
        : { model: config.model, provider: config.provider, apiKey: config.apiKey }),
      maxIterations: config.maxIterations ?? 20,
      contextManager: new ContextManager({
        contextWindowTokens: resolveModelSpecs(config.model).contextWindowTokens,
        maxOutputTokens: resolveModelSpecs(config.model).maxOutputTokens,
        compactionStrategy: 'truncate',
      }),
    }

    this.agent = new Agent(agentConfig)
  }

  // ── Interactive API ──────────────────────────────────────────────────────

  /**
   * Ask the doctor a question about your YAAF project.
   * The doctor will use its tools to read your code, run the compiler,
   * and give a grounded answer.
   *
   * @example
   * ```ts
   * const answer = await doctor.ask('Why am I getting a TS2322 error in agent.ts?')
   * ```
   */
  async ask(question: string, signal?: AbortSignal): Promise<string> {
    return this.agent.run(question, signal)
  }

  /**
   * Stream the doctor's response for real-time display.
   *
   * @example
   * ```ts
   * for await (const event of doctor.askStream('Run the tests')) {
   *   if (event.type === 'text_delta') process.stdout.write(event.content)
   * }
   * ```
   */
  async *askStream(question: string, signal?: AbortSignal) {
    yield* this.agent.runStream(question, signal)
  }

  /** Reset the conversation history */
  reset(): void {
    this.agent.reset()
  }

  // ── Live Agent Watching ─────────────────────────────────────────────────

  /**
   * Watch a running agent's event stream for errors and proactively
   * diagnose them. The Doctor subscribes to the target agent's events:
   *
   * - `tool:error` — tool threw an exception
   * - `tool:blocked` — permission denied a tool call
   * - `tool:sandbox-violation` — tool escaped sandbox boundaries
   * - `tool:validation-failed` — tool input failed schema validation
   * - `llm:retry` — LLM API call failed, retrying
   * - `iteration` — approaching maxIterations limit
   *
   * Errors are accumulated in a debounced buffer. When the buffer fills
   * (or a critical error occurs), the Doctor uses its own LLM to diagnose
   * the problem and emits a `DoctorIssue` via `onIssue()` handlers.
   *
   * @example
   * ```ts
   * import { Agent, YaafDoctor } from 'yaaf';
   *
   * const agent = new Agent({
   *   model: 'gpt-4o',
   *   systemPrompt: 'You are a coding assistant.',
   *   tools: [readFileTool, writeFileTool],
   * });
   *
   * const doctor = new YaafDoctor();
   * doctor.onIssue((issue) => {
   *   console.log(`🩺 ${issue.summary}\n${issue.details}`);
   * });
   *
   * // Start watching — taps into agent events
   * doctor.watch(agent);
   *
   * // Agent runs normally — Doctor watches silently
   * await agent.run('Refactor the auth module');
   *
   * // Stop watching
   * doctor.unwatch(agent);
   * ```
   *
   * @param targetAgent The developer's agent to watch
   * @param options Configuration for the watcher
   */
  watch(
    targetAgent: Agent,
    options: WatchOptions = {},
  ): this {
    const debounceMs = options.debounceMs ?? 2000
    const maxBufferSize = options.maxBufferSize ?? 5
    const autoDiagnose = options.autoDiagnose ?? true

    // Check if we're already watching this agent
    if (this.watchedAgents.has(targetAgent)) {
      logger.warn('Already watching this agent')
      return this
    }

    const buffer = new RuntimeErrorBuffer(debounceMs, maxBufferSize, async (errors) => {
      // Emit raw issues immediately
      for (const err of errors) {
        this.emitIssue(err)
      }

      // If auto-diagnose is on, use the Doctor's LLM to analyze
      if (autoDiagnose && errors.length > 0) {
        await this.diagnoseRuntimeErrors(errors)
      }
    })

    // Subscribe to all diagnostic events on the target agent.
    // Organized by subsystem — the Doctor watches everything.
    const handlers = {
      // ── Tool errors ──────────────────────────────────────────────────
      'tool:error': (data: { name: string; error: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Tool "${data.name}" threw an error`,
          details: `Tool: ${data.name}\nError: ${data.error}`,
          timestamp: new Date(),
        })
      },
      'tool:blocked': (data: { name: string; reason: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Tool "${data.name}" was blocked by permissions`,
          details: `Tool: ${data.name}\nReason: ${data.reason}\nFix: Check your PermissionPolicy — ensure this tool is allowed or has an approval handler.`,
          timestamp: new Date(),
        })
      },
      'tool:sandbox-violation': (data: { name: string; violationType: string; detail: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Sandbox violation in tool "${data.name}"`,
          details: `Tool: ${data.name}\nViolation: ${data.violationType}\nDetail: ${data.detail}\nFix: Check your Sandbox config — allowedPaths, blockNetwork, timeout.`,
          timestamp: new Date(),
        })
      },
      'tool:validation-failed': (data: { name: string; message: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Schema validation failed for tool "${data.name}"`,
          details: `Tool: ${data.name}\nMessage: ${data.message}\nFix: Check the tool's inputSchema — the LLM is sending arguments that don't match.`,
          timestamp: new Date(),
        })
      },
      'tool:loop-detected': (data: { name: string; repetitions: number; hash: string }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Tool loop detected: "${data.name}" called ${data.repetitions}x with same output`,
          details: `Tool: ${data.name}\nRepetitions: ${data.repetitions}\nThe agent may be stuck in a loop calling the same tool with the same arguments.\nConsider adding a ToolLoopDetector or increasing the loop threshold.`,
          timestamp: new Date(),
        })
      },

      // ── LLM errors ───────────────────────────────────────────────────
      'llm:retry': (data: { attempt: number; maxRetries: number; error: unknown; delayMs: number }) => {
        // Surface on first retry (visibility) and last retry (imminent failure)
        if (data.attempt === 1 || data.attempt >= data.maxRetries) {
          const type: DoctorIssue['type'] = data.attempt >= data.maxRetries ? 'runtime_error' : 'pattern_warning'
          buffer.push({
            type,
            summary: `LLM call ${data.attempt >= data.maxRetries ? 'failing' : 'retrying'} — attempt ${data.attempt}/${data.maxRetries}`,
            details: `Attempt: ${data.attempt}/${data.maxRetries}\nDelay: ${data.delayMs}ms\nError: ${data.error instanceof Error ? data.error.message : String(data.error)}\n${data.attempt >= data.maxRetries ? 'This may indicate an API key issue, rate limit, or model availability problem.' : 'Will retry automatically.'}`,
            timestamp: new Date(),
          })
        }
      },
      'llm:empty-response': (data: { iteration: number }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `LLM returned empty response (iteration ${data.iteration})`,
          details: `The LLM returned an empty or whitespace-only response with no tool calls.\nThis may indicate:\n- The prompt is confusing the model\n- The system prompt is too restrictive\n- The model has nothing useful to say\nConsider adjusting the system prompt or increasing temperature.`,
          timestamp: new Date(),
        })
      },

      // ── Context & Recovery ───────────────────────────────────────────
      'iteration': (data: { count: number; maxIterations: number }) => {
        if (data.count >= data.maxIterations - 1) {
          buffer.push({
            type: 'pattern_warning' as const,
            summary: `Agent approaching iteration limit (${data.count}/${data.maxIterations})`,
            details: `The agent has used ${data.count} of ${data.maxIterations} iterations.\nIt may not complete the task. Consider increasing maxIterations or simplifying the task.`,
            timestamp: new Date(),
          })
        }
      },
      'context:overflow-recovery': (data: { error: string; compactionTriggered: boolean }) => {
        if (data.compactionTriggered) {
          buffer.push({
            type: 'pattern_warning' as const,
            summary: 'Context overflow — emergency compaction triggered',
            details: `Error: ${data.error}\nCompaction: succeeded — agent will retry\nThe conversation history was too long for the model. YAAF auto-compacted and will retry.`,
            timestamp: new Date(),
          })
        } else {
          buffer.push({
            type: 'runtime_error' as const,
            summary: 'Context overflow — compaction FAILED',
            details: `Error: ${data.error}\nCompaction: FAILED — request will throw\nFix: Increase the context window model, add a ContextManager, or reduce tool output size.`,
            timestamp: new Date(),
          })
        }
      },
      'context:output-continuation': (data: { iteration: number; contentLength: number }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Output token limit hit — continuation injected (iteration ${data.iteration})`,
          details: `Content length: ${data.contentLength} chars\nThe LLM ran out of output tokens mid-response. YAAF injected a continuation prompt.\nThis is expected for long outputs, but if it happens frequently, consider:\n- Using a model with larger maxOutputTokens\n- Breaking tasks into smaller steps\n- Setting maxTokens explicitly in your Agent config`,
          timestamp: new Date(),
        })
      },
      'context:compaction-triggered': (data: { tokensBefore: number; tokensAfter: number; strategy: string }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Context compaction triggered (${data.tokensBefore.toLocaleString()} → ${data.tokensAfter.toLocaleString()} tokens)`,
          details: `Strategy: ${data.strategy}\nTokens before: ${data.tokensBefore.toLocaleString()}\nTokens after: ${data.tokensAfter.toLocaleString()}\nReduction: ${Math.round((1 - data.tokensAfter / data.tokensBefore) * 100)}%\nThis is normal for long conversations but frequent compaction degrades quality.`,
          timestamp: new Date(),
        })
      },
      'context:budget-warning': (data: { usedTokens: number; budgetTokens: number; pctUsed: number }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Context nearing capacity (${data.pctUsed.toFixed(0)}% used)`,
          details: `Used: ${data.usedTokens.toLocaleString()} tokens\nBudget: ${data.budgetTokens.toLocaleString()} tokens\nCompaction will trigger soon. This is informational.`,
          timestamp: new Date(),
        })
      },

      // ── Hook errors ──────────────────────────────────────────────────
      'hook:error': (data: { hookName: string; error: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Hook "${data.hookName}" threw an error`,
          details: `Hook: ${data.hookName}\nError: ${data.error}\nThe error was swallowed to prevent agent crash, but the hook is broken.\nFix: Add error handling inside your ${data.hookName} hook.`,
          timestamp: new Date(),
        })
      },
      'hook:blocked': (data: { hookName: string; toolName: string; reason: string }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Hook "${data.hookName}" blocked tool "${data.toolName}"`,
          details: `Hook: ${data.hookName}\nTool: ${data.toolName}\nReason: ${data.reason}\nThis may be intentional (approval gate) or a bug in your hook logic.`,
          timestamp: new Date(),
        })
      },

      // ── Guardrail events ─────────────────────────────────────────────
      'guardrail:warning': (data: { resource: string; current: number; limit: number; pctUsed: number }) => {
        buffer.push({
          type: 'pattern_warning' as const,
          summary: `Budget warning: ${data.resource} at ${data.pctUsed.toFixed(0)}%`,
          details: `Resource: ${data.resource}\nCurrent: ${data.current}\nLimit: ${data.limit}\nUsage: ${data.pctUsed.toFixed(1)}%\nThe agent is approaching its ${data.resource} budget limit.`,
          timestamp: new Date(),
        })
      },
      'guardrail:blocked': (data: { resource: string; current: number; limit: number; reason: string }) => {
        buffer.push({
          type: 'runtime_error' as const,
          summary: `Budget exceeded: ${data.resource} (${data.current}/${data.limit})`,
          details: `Resource: ${data.resource}\nCurrent: ${data.current}\nLimit: ${data.limit}\nReason: ${data.reason}\nThe agent was stopped because it exceeded the ${data.resource} guardrail.\nFix: Increase the limit in your Guardrails config or optimize the agent's behavior.`,
          timestamp: new Date(),
        })
      },
    }

    // Register all handlers
    // Object.keys() loses generic key specificity; the cast is unavoidable but safe:
    // every key in `handlers` is a keyof RunnerEvents and the handler signatures match.
    const typedHandlers = handlers as Partial<Record<keyof RunnerEvents, (data: unknown) => void>>
    const eventKeys = Object.keys(handlers) as Array<keyof RunnerEvents>
    for (const event of eventKeys) {
      targetAgent.on(event, typedHandlers[event] as RunnerEventHandler<typeof event>)
    }

    // Store references for cleanup
    this.watchedAgents.set(targetAgent, { handlers, buffer })
    logger.info('Watching agent for runtime errors')

    return this
  }

  /**
   * Stop watching a previously watched agent.
   */
  unwatch(targetAgent: Agent): this {
    const entry = this.watchedAgents.get(targetAgent)
    if (!entry) return this

    // Flush any pending errors
    entry.buffer.flush()

    // Unsubscribe all handlers from the agent
    // Object.keys() loses generic key specificity; cast is unavoidable but safe.
    const typedHandlers = entry.handlers as Partial<Record<keyof RunnerEvents, (data: unknown) => void>>
    const eventKeys = Object.keys(entry.handlers) as Array<keyof RunnerEvents>
    for (const event of eventKeys) {
      targetAgent.off(event, typedHandlers[event] as RunnerEventHandler<typeof event>)
    }

    this.watchedAgents.delete(targetAgent)
    logger.info('Stopped watching agent')

    return this
  }

  /**
   * Stop watching all agents.
   */
  unwatchAll(): this {
    for (const agent of this.watchedAgents.keys()) {
      this.unwatch(agent)
    }
    return this
  }

  /**
   * Use the Doctor's LLM to analyze accumulated runtime errors and
   * produce an actionable diagnosis.
   */
  private async diagnoseRuntimeErrors(errors: DoctorIssue[]): Promise<void> {
    const errorSummary = errors
      .map((e, i) => `[${i + 1}] ${e.type}: ${e.summary}\n    ${e.details}`)
      .join('\n\n')

    const prompt = `The developer's YAAF agent just produced these runtime errors:\n\n${errorSummary}\n\nAnalyze these errors. For each one:\n1. Explain the root cause\n2. Suggest a specific fix (with code if applicable)\n3. Note if they're related to each other\n\nBe concise — the developer needs actionable guidance, not a lecture.`

    try {
      const diagnosis = await this.agent.run(prompt)
      this.emitIssue({
        type: 'pattern_warning',
        summary: `Doctor diagnosis: ${errors.length} runtime error(s) analyzed`,
        details: diagnosis,
        timestamp: new Date(),
      })
    } catch (err) {
      // If the Doctor's own LLM fails, just emit the raw errors
      logger.error('Doctor diagnosis failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Daemon API ───────────────────────────────────────────────────────────

  /**
   * Register a handler for when the daemon detects a new issue.
   *
   * @example
   * ```ts
   * doctor.onIssue((issue) => {
   *   slack.send(`🔴 YAAF Doctor: ${issue.summary}`)
   * })
   * ```
   */
  onIssue(handler: (issue: DoctorIssue) => void): this {
    this.issueHandlers.push(handler)
    return this
  }

  private emitIssue(issue: DoctorIssue): void {
    for (const handler of this.issueHandlers) handler(issue)
  }

  /**
   * Run a one-shot health check — compile + test.
   * Returns any issues found. Does NOT require daemon mode.
   */
  async healthCheck(): Promise<DoctorIssue[]> {
    const issues: DoctorIssue[] = []
    const now = new Date()

    // 1. TypeScript compilation
    try {
      const { stdout, stderr, exitCode } = this.runProjectCmd('npx tsc --noEmit 2>&1')
      const output = (stdout + stderr).trim()
      const tscErrors = output
        .split('\n')
        .filter((l: string) => l.match(/error\s+TS\d+/))
        .map((l: string) => l.trim())

      const newErrors = this.errorTracker.diffCompileErrors(tscErrors)
      if (newErrors.length > 0) {
        const issue: DoctorIssue = {
          type: 'compile_error',
          summary: `${newErrors.length} new TypeScript error(s)`,
          details: newErrors.join('\n'),
          timestamp: now,
        }
        issues.push(issue)
        this.emitIssue(issue)
      }

      // 2. Tests (only if compilation passes)
      if (tscErrors.length === 0) {
        const test = this.runProjectCmd('npm test 2>&1')
        const testOutput = (test.stdout + test.stderr).trim()
        const testFailures = testOutput
          .split('\n')
          .filter(
            (l: string) =>
              l.includes('FAIL') ||
              l.includes('✗') ||
              l.includes('× ') ||
              (l.includes('Error:') && !l.includes('node_modules')),
          )
          .map((l: string) => l.trim())
          .filter(Boolean)

        const newFailures = this.errorTracker.diffTestFailures(testFailures)
        if (newFailures.length > 0) {
          const issue: DoctorIssue = {
            type: 'test_failure',
            summary: `${newFailures.length} new test failure(s)`,
            details: newFailures.join('\n'),
            timestamp: now,
          }
          issues.push(issue)
          this.emitIssue(issue)
        }
      }
    } catch (err) {
      logger.error('Health check failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return issues
  }

  /**
   * Start the daemon — periodically checks for tsc/test errors
   * and emits issues via onIssue handlers.
   *
   * The daemon also has LLM access: when it finds errors, it can
   * use the agent to diagnose them and suggest fixes.
   */
  async startDaemon(): Promise<void> {
    if (this.daemon) return

    // Create a Vigil for the daemon loop
    this.daemon = new Vigil({
      name: 'YAAF Doctor Daemon',
      systemPrompt: DOCTOR_SYSTEM_PROMPT,
      tools: createDoctorTools(this.projectRoot),
      model: this.config.model,
      provider: this.config.provider,
      apiKey: this.config.apiKey,
      maxIterations: 10,
      tickInterval: this.daemonIntervalSec * 1000,
      tickPrompt: DOCTOR_TICK_PROMPT,
      storageDir: path.join(this.projectRoot, '.yaaf-doctor'),
      contextManager: new ContextManager({
        contextWindowTokens: resolveModelSpecs(this.config.model).contextWindowTokens,
        maxOutputTokens: resolveModelSpecs(this.config.model).maxOutputTokens,
        compactionStrategy: 'truncate',
      }),
    })

    // Wire issue detection into Vigil's brief channel
    this.daemon.onVigil('brief', ({ message }) => {
      this.emitIssue({
        type: 'pattern_warning',
        summary: 'Doctor diagnosis',
        details: message,
        timestamp: new Date(),
      })
    })

    // Run initial health check
    await this.healthCheck()

    // Start the autonomous loop
    await this.daemon.start()
    logger.info(`Doctor daemon started (interval: ${this.daemonIntervalSec}s)`)
  }

  /** Stop the daemon */
  stopDaemon(): void {
    if (this.daemon) {
      this.daemon.stop()
      this.daemon = undefined
      logger.info('Doctor daemon stopped')
    }
  }

  /** Current health status */
  getHealthStatus() {
    return {
      compileErrors: this.errorTracker.compileErrorCount,
      testFailures: this.errorTracker.testFailureCount,
      healthy: this.errorTracker.healthy,
    }
  }

  // ── Watch Mode (no LLM) ─────────────────────────────────────────────────

  /**
   * Start a lightweight file watcher — just tsc --noEmit on a timer.
   * No LLM calls. Zero API cost. Returns a stop function.
   *
   * @example
   * ```ts
   * const stop = doctor.startWatch({
   *   intervalSec: 10,
   *   onError: (errors) => console.log(errors),
   *   onClear: () => console.log('All clear!'),
   * })
   * // ... later
   * stop()
   * ```
   */
  startWatch(options: {
    intervalSec?: number
    onError?: (newErrors: string[]) => void
    onClear?: () => void
  } = {}): () => void {
    const interval = (options.intervalSec ?? 10) * 1000
    let lastErrors = new Set<string>()

    const check = () => {
      const { stdout, stderr, exitCode } = this.runProjectCmd('npx tsc --noEmit 2>&1')
      const output = (stdout + stderr).trim()
      const errors = output
        .split('\n')
        .filter((l: string) => l.match(/error\s+TS\d+/))
        .map((l: string) => l.trim())
      const newErrors = errors.filter((e: string) => !lastErrors.has(e))

      if (newErrors.length > 0) options.onError?.(newErrors)
      if (errors.length === 0 && lastErrors.size > 0) options.onClear?.()

      lastErrors = new Set(errors)
    }

    check()
    const timer = setInterval(check, interval)

    return () => clearInterval(timer)
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private runProjectCmd(cmd: string) {
    try {
      const stdout = execSync(cmd, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      })
      return { stdout, stderr: '', exitCode: 0 }
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; status?: number }
      return {
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? '',
        exitCode: e.status ?? 1,
      }
    }
  }
}
