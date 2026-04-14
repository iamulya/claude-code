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
import type { Tool } from '../tools/tool.js'

const logger = new Logger('doctor')

// ── Types ────────────────────────────────────────────────────────────────────

export type DoctorIssue = {
  type: 'compile_error' | 'test_failure' | 'pattern_warning'
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
  provider?: 'openai' | 'gemini' | 'groq' | 'ollama'

  /** API key override (default: from environment) */
  apiKey?: string

  /** Additional tools to give the doctor */
  extraTools?: Tool[]

  /** Extra instructions appended to the system prompt */
  extraInstructions?: string

  /** Daemon check interval in seconds (default: 30) */
  daemonIntervalSec?: number

  /** Max LLM iterations per question (default: 20) */
  maxIterations?: number
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

// ── YaafDoctor ───────────────────────────────────────────────────────────────

export class YaafDoctor {
  readonly projectRoot: string
  private agent: Agent
  private daemon?: Vigil
  private errorTracker = new ErrorTracker()
  private issueHandlers: Array<(issue: DoctorIssue) => void> = []
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
      model: config.model,
      provider: config.provider as any,
      apiKey: config.apiKey,
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
      provider: this.config.provider as any,
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
    } catch (err: any) {
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? err.message ?? '',
        exitCode: err.status ?? 1,
      }
    }
  }
}
