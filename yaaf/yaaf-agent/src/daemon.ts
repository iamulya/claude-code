/**
 * YAAF Expert Daemon
 *
 * Extends Vigil to create a proactive code health monitor that:
 * - Periodically compiles the YAAF project (tsc --noEmit)
 * - Runs the test suite when compilation passes
 * - Detects NEW errors by diffing against the last known state
 * - Proactively briefs the developer with diagnoses and suggested fixes
 *
 * The daemon maintains a "last known errors" state so it only surfaces
 * new problems — it never repeatedly reports the same issue.
 */

import { execSync } from 'child_process'
import * as path from 'path'
import { Vigil, type VigilConfig } from 'yaaf'
import { DAEMON_TICK_PROMPT } from './prompt.js'

const YAAF_ROOT = path.resolve(import.meta.dirname, '..', '..')

export type DaemonConfig = Omit<VigilConfig, 'tickPrompt'> & {
  /** Check interval in seconds (default: 30) */
  checkIntervalSec?: number
  /** Also run tests on each tick, not just tsc (default: false — tests on compile-clean only) */
  alwaysRunTests?: boolean
  /** Callback for when the daemon detects a new issue */
  onIssue?: (issue: DaemonIssue) => void
}

export type DaemonIssue = {
  type: 'compile_error' | 'test_failure'
  summary: string
  details: string
  timestamp: Date
}

/**
 * Error state tracker — only surfaces NEW problems.
 */
class ErrorTracker {
  private lastCompileErrors: Set<string> = new Set()
  private lastTestFailures: Set<string> = new Set()

  /**
   * Returns only the new compile errors (not seen in the last check).
   */
  diffCompileErrors(currentErrors: string[]): string[] {
    const current = new Set(currentErrors)
    const newErrors = currentErrors.filter(e => !this.lastCompileErrors.has(e))
    this.lastCompileErrors = current
    return newErrors
  }

  /**
   * Returns only the new test failures (not seen in the last check).
   */
  diffTestFailures(currentFailures: string[]): string[] {
    const current = new Set(currentFailures)
    const newFailures = currentFailures.filter(f => !this.lastTestFailures.has(f))
    this.lastTestFailures = current
    return newFailures
  }

  get compileErrorCount(): number {
    return this.lastCompileErrors.size
  }

  get testFailureCount(): number {
    return this.lastTestFailures.size
  }
}

/**
 * Run a command and capture output.
 */
function runCmd(cmd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, {
      cwd: YAAF_ROOT,
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

/**
 * Parse tsc output into individual error strings.
 */
function parseTscErrors(output: string): string[] {
  return output
    .split('\n')
    .filter(line => line.match(/\.ts\(\d+,\d+\):\s+error\s+TS\d+/) || line.match(/\.ts:\d+:\d+\s+-\s+error\s+TS\d+/))
    .map(line => line.trim())
}

/**
 * Parse test output for failure lines.
 */
function parseTestFailures(output: string): string[] {
  return output
    .split('\n')
    .filter(line =>
      line.includes('FAIL') ||
      line.includes('✗') ||
      line.includes('× ') ||
      (line.includes('Error:') && !line.includes('node_modules')),
    )
    .map(line => line.trim())
    .filter(Boolean)
}

// ── YaafDaemon ──────────────────────────────────────────────────────────────

export class YaafDaemon extends Vigil {
  private readonly errorTracker = new ErrorTracker()
  private readonly onIssue?: (issue: DaemonIssue) => void

  constructor(config: DaemonConfig) {
    const intervalMs = (config.checkIntervalSec ?? 30) * 1000

    super({
      ...config,
      tickInterval: intervalMs,
      tickPrompt: DAEMON_TICK_PROMPT,
      storageDir: config.storageDir ?? path.join(YAAF_ROOT, '.yaaf-agent'),
    })

    this.onIssue = config.onIssue
  }

  /**
   * Proactive health check — called on each Vigil tick.
   * Runs tsc, optionally runs tests, diffs against last known state,
   * and only surfaces NEW issues.
   */
  async healthCheck(): Promise<DaemonIssue[]> {
    const issues: DaemonIssue[] = []
    const now = new Date()

    // 1. TypeScript compilation check
    const tsc = runCmd('npx tsc --noEmit 2>&1')
    const tscErrors = parseTscErrors(tsc.stdout + tsc.stderr)
    const newCompileErrors = this.errorTracker.diffCompileErrors(tscErrors)

    if (newCompileErrors.length > 0) {
      const issue: DaemonIssue = {
        type: 'compile_error',
        summary: `${newCompileErrors.length} new TypeScript error(s) detected`,
        details: newCompileErrors.join('\n'),
        timestamp: now,
      }
      issues.push(issue)
      this.onIssue?.(issue)
      this.brief(`🔴 ${issue.summary}:\n${issue.details}`)
    }

    // 2. Test suite (only if compilation is clean)
    if (tscErrors.length === 0) {
      const test = runCmd('npm test 2>&1')
      const testFailures = parseTestFailures(test.stdout + test.stderr)
      const newTestFailures = this.errorTracker.diffTestFailures(testFailures)

      if (newTestFailures.length > 0) {
        const issue: DaemonIssue = {
          type: 'test_failure',
          summary: `${newTestFailures.length} new test failure(s) detected`,
          details: newTestFailures.join('\n'),
          timestamp: now,
        }
        issues.push(issue)
        this.onIssue?.(issue)
        this.brief(`🟡 ${issue.summary}:\n${issue.details}`)
      }
    }

    return issues
  }

  /**
   * Get current health status.
   */
  getHealthStatus(): {
    compileErrors: number
    testFailures: number
    healthy: boolean
  } {
    return {
      compileErrors: this.errorTracker.compileErrorCount,
      testFailures: this.errorTracker.testFailureCount,
      healthy: this.errorTracker.compileErrorCount === 0 && this.errorTracker.testFailureCount === 0,
    }
  }
}
