/**
 * Permission System — policy-based tool call authorization.
 *
 * Intercepts every tool call and decides: allow, deny, or escalate to the
 * user for manual approval. Rules use glob-style pattern matching against
 * tool names and serialized argument strings.
 *
  *
 * Rule format:
 *   "tool_name"           — matches any call to that tool
 *   "tool_name(*)"        — same as above
 *   "tool_name(pattern)"  — matches if args JSON includes pattern
 *   "read_*"              — glob: any tool starting with read_
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   permissions: new PermissionPolicy()
 *     .allow('search_*')
 *     .allow('check_weather')
 *     .requireApproval('book_trip', 'Booking requires your confirmation')
 *     .deny('delete_*', 'Deletion is not permitted')
 *     .onRequest(async (toolName, args, reason) => {
 *       const answer = await readline.question(`Allow ${toolName}? [y/N] `);
 *       return answer.toLowerCase() === 'y';
 *     }),
 * });
 * ```
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type PermissionOutcome =
  | { action: 'allow' }
  | { action: 'deny'; reason: string }
  | { action: 'escalate'; question: string }

/**
 * Called when a tool requires approval. Return true to allow, false to deny.
 */
export type ApprovalHandler = (
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean> | boolean

// Default: always deny unhandled escalations (fail-closed)
const DENY_BY_DEFAULT: ApprovalHandler = async () => false

/** Permission mode — determines how unmatched tool calls are handled */
export type PermissionMode = 'interactive' | 'plan' | 'auto' | 'deny_all'

type Rule = {
  toolGlob: RegExp
  argsPattern?: RegExp
  /**
   * Content-aware predicate — receives the tool name and parsed arguments.
   * Return true to match (apply this rule's action), false to skip.
   * Runs AFTER glob + argsPattern matching.
   */
  when?: (toolName: string, args: Record<string, unknown>) => boolean | Promise<boolean>
  action: 'allow' | 'deny' | 'escalate'
  reason: string
}

// ── Glob → RegExp conversion ──────────────────────────────────────────────────

/**
 * Convert a tool permission pattern to a pair of (tool, args) regexes.
 *
 * Format: "tool_name(arg_pattern)" or just "tool_name"
 * Glob chars: * matches any string, ? matches one char.
 */
function parsePattern(pattern: string): { toolRx: RegExp; argsRx?: RegExp } {
  // Split tool name from optional arg pattern: "Bash(git *)" → ["Bash", "git *"]
  const match = pattern.match(/^([^(]+?)(?:\((.+)\))?$/)
  if (!match) throw new Error(`Invalid permission pattern: "${pattern}"`)

  const toolPart = match[1]!.trim()
  const argsPart = match[2]?.trim()

  const toolRx = new RegExp(
    '^' + toolPart.replace(/[.+^${}|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  )

  const argsRx = argsPart
    ? new RegExp(argsPart.replace(/[.+^${}|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'))
    : undefined

  return { toolRx, argsRx }
}

// ── PermissionPolicy ──────────────────────────────────────────────────────────

export class PermissionPolicy {
  private readonly rules: Rule[] = []
  private handler: ApprovalHandler = DENY_BY_DEFAULT
  private _defaultAction: 'allow' | 'deny' = 'deny'
  private _mode: PermissionMode = 'interactive'
  /** Rules remembered with "always allow" — persisted across evaluations */
  private readonly rememberedRules = new Map<string, 'allow' | 'deny'>()

  /**
   * Allow all tool calls matching `pattern`.
   * Optional `when` predicate for content-aware matching.
   *
   * @example
   * ```ts
   * // Simple glob
   * policy.allow('search_*');
   *
   * // Content-aware: allow exec only for safe commands
   * policy.allow('exec_command', {
   *   when: (_, args) => !String(args.command).includes('rm -rf'),
   * });
   * ```
   */
  allow(
    pattern: string,
    opts?: { when?: (toolName: string, args: Record<string, unknown>) => boolean | Promise<boolean> },
  ): this {
    const { toolRx, argsRx } = parsePattern(pattern)
    this.rules.push({ toolGlob: toolRx, argsPattern: argsRx, when: opts?.when, action: 'allow', reason: '' })
    return this
  }

  /**
   * Deny all tool calls matching `pattern`.
   * Optional `when` predicate for content-aware matching.
   */
  deny(
    pattern: string,
    reason = 'Denied by permission policy',
    opts?: { when?: (toolName: string, args: Record<string, unknown>) => boolean | Promise<boolean> },
  ): this {
    const { toolRx, argsRx } = parsePattern(pattern)
    this.rules.push({ toolGlob: toolRx, argsPattern: argsRx, when: opts?.when, action: 'deny', reason })
    return this
  }

  /**
   * Escalate to the user for approval.
   * Optional `when` predicate for content-aware matching.
   */
  requireApproval(
    pattern: string,
    reason = 'This action requires your approval',
    opts?: { when?: (toolName: string, args: Record<string, unknown>) => boolean | Promise<boolean> },
  ): this {
    const { toolRx, argsRx } = parsePattern(pattern)
    this.rules.push({ toolGlob: toolRx, argsPattern: argsRx, when: opts?.when, action: 'escalate', reason })
    return this
  }

  /**
   * Register the callback invoked when a tool requires user approval.
   * Default: always deny (fail-closed).
   */
  onRequest(handler: ApprovalHandler): this {
    this.handler = handler
    return this
  }

  /**
   * Set the policy for tools that match no rule.
   * Default: 'deny' (safe). Set to 'allow' for permissive mode.
   */
  defaultAction(action: 'allow' | 'deny'): this {
    this._defaultAction = action
    return this
  }

  /**
   * Set the permission mode.
   * - 'interactive': prompt user for escalated actions (default)
   * - 'plan': deny all tool calls (read-only planning)
   * - 'auto': allow tool calls that pass content-aware checks
   * - 'deny_all': deny everything (useful for sandboxed testing)
   */
  mode(mode: PermissionMode): this {
    this._mode = mode
    return this
  }

  /** Get the current permission mode */
  getMode(): PermissionMode {
    return this._mode
  }

  /**
   * Remember a decision for a specific tool ("always allow" / "always deny").
   * Remembered rules take priority over all other rules.
   */
  remember(toolName: string, action: 'allow' | 'deny'): this {
    this.rememberedRules.set(toolName, action)
    return this
  }

  /** Clear a remembered decision */
  forget(toolName: string): this {
    this.rememberedRules.delete(toolName)
    return this
  }

  /** Get all remembered decisions */
  getRememberedRules(): ReadonlyMap<string, 'allow' | 'deny'> {
    return this.rememberedRules
  }

  /**
   * Evaluate all rules for a tool call. Fully async — escalation
   * awaits the approval handler.
   */
  async evaluate(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<PermissionOutcome> {
    // Mode-based short circuits
    if (this._mode === 'deny_all') {
      return { action: 'deny', reason: 'Permission mode is deny_all' }
    }
    if (this._mode === 'plan') {
      return { action: 'deny', reason: 'Permission mode is plan (read-only)' }
    }

    // Check remembered rules (highest priority for deny; allow is gated below)
    const remembered = this.rememberedRules.get(toolName)
    if (remembered === 'deny') return { action: 'deny', reason: `Previously denied (remembered rule for "${toolName}")` }

    // C7 FIX: Even for "always allow" remembered rules, run content-aware
    // deny rules with `when` predicates. This ensures safety checks like
    // isDangerousCommand() cannot be bypassed by "always allow".
    if (remembered === 'allow') {
      const argsStr = JSON.stringify(args)
      for (const rule of this.rules) {
        if (rule.action !== 'deny') continue
        if (!rule.when) continue  // Only content-aware deny rules override remembered-allow
        if (!rule.toolGlob.test(toolName)) continue
        if (rule.argsPattern && !rule.argsPattern.test(argsStr)) continue
        const matches = await rule.when(toolName, args)
        if (matches) {
          return { action: 'deny', reason: rule.reason }
        }
      }
      return { action: 'allow' }
    }

    const argsStr = JSON.stringify(args)

    // CRITIQUE #9 FIX: Deny-before-allow evaluation order.
    // Deny rules are always evaluated first, regardless of insertion order.
    // This prevents the security footgun where `allow('*').deny('delete_*')`
    // silently makes the deny rule unreachable.
    //
    // Evaluation order:
    //   1. All deny rules (first match denies)
    //   2. All escalate rules (first match escalates)
    //   3. All allow rules (first match allows)
    //   4. Default action

    // Phase 1: Check deny rules first (most restrictive wins)
    for (const rule of this.rules) {
      if (rule.action !== 'deny') continue
      if (!rule.toolGlob.test(toolName)) continue
      if (rule.argsPattern && !rule.argsPattern.test(argsStr)) continue
      if (rule.when) {
        const matches = await rule.when(toolName, args)
        if (!matches) continue
      }
      return { action: 'deny', reason: rule.reason }
    }

    // Phase 2: Check escalate rules
    for (const rule of this.rules) {
      if (rule.action !== 'escalate') continue
      if (!rule.toolGlob.test(toolName)) continue
      if (rule.argsPattern && !rule.argsPattern.test(argsStr)) continue
      if (rule.when) {
        const matches = await rule.when(toolName, args)
        if (!matches) continue
      }
      // In auto mode, deny instead of prompting
      if (this._mode === 'auto') {
        return { action: 'deny', reason: `Auto mode denied: ${rule.reason}` }
      }
      // Interactive: ask the handler
      const approved = await this.handler(toolName, args, rule.reason)
      return approved
        ? { action: 'allow' }
        : { action: 'deny', reason: `User denied: ${rule.reason}` }
    }

    // Phase 3: Check allow rules
    for (const rule of this.rules) {
      if (rule.action !== 'allow') continue
      if (!rule.toolGlob.test(toolName)) continue
      if (rule.argsPattern && !rule.argsPattern.test(argsStr)) continue
      if (rule.when) {
        const matches = await rule.when(toolName, args)
        if (!matches) continue
      }
      return { action: 'allow' }
    }

    // No rule matched
    if (this._defaultAction === 'allow') return { action: 'allow' }
    return { action: 'deny', reason: `No permission rule matched "${toolName}"` }
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Permissive policy — allows everything. Useful for development/testing. */
export function allowAll(): PermissionPolicy {
  return new PermissionPolicy().defaultAction('allow')
}

/** Strict policy — denies everything by default. Add allow() rules explicitly. */
export function denyAll(): PermissionPolicy {
  return new PermissionPolicy().defaultAction('deny')
}

/**
 * Interactive CLI approval — prompts the user in the terminal for every
 * escalated tool call. Suitable for development and direct CLI usage.
 *
 * W-14 fix: when a policy is provided, "a" (always allow) and "d" (always deny)
 * responses are automatically remembered, removing the need for callers to
 * manually call `policy.remember()`.
 */
export function cliApproval(policy?: PermissionPolicy): ApprovalHandler {
  return async (toolName, args, reason) => {
    const readline = await import('readline')
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise<boolean>(resolve => {
      rl.question(
        `\n⚠️  Tool requires approval: ${toolName}\n   ${reason}\n   Args: ${JSON.stringify(args)}\n   Allow? [y/N/a(lways)/d(always deny)] `,
        answer => {
          rl.close()
          const a = answer.trim().toLowerCase()
          if (a === 'a' || a === 'always') {
            policy?.remember(toolName, 'allow')
            resolve(true)
          } else if (a === 'd') {
            policy?.remember(toolName, 'deny')
            resolve(false)
          } else {
            resolve(a === 'y')
          }
        },
      )
    })
  }
}

// ── Dangerous Pattern Detection ──────────────────────────────────────────────

/**
 * Patterns that indicate potentially destructive operations.
 * Used with content-aware `when` predicates.
 */
export const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+[\/~]/,     // rm -rf /
  /chmod\s+777/,                          // world-writable permissions
  /chmod\s+a\+[rwx]/,                     // broad chmod
  /sudo\s+/,                              // privilege escalation
  /curl\s+.*\|\s*(bash|sh|zsh)/,          // download-and-execute
  /wget\s+.*\|\s*(bash|sh|zsh)/,          // download-and-execute
  /> *\/dev\/sd[a-z]/,                     // raw disk writes
  /mkfs\./,                               // format filesystem
  /dd\s+.*of=\/dev\//,                    // raw disk writes
  /:\(\)\s*\{\s*:\|:\s*&\s*\};\s*:/,     // fork bomb
  /\beval\b.*\$\(/,                        // eval with command substitution
] as const

/**
 * Create a "when" predicate that checks for dangerous shell patterns.
 * Use with `policy.deny()` for content-aware command blocking.
 *
 * @example
 * ```ts
 * policy.deny('exec_command', 'Dangerous command detected', {
 *   when: isDangerousCommand(),
 * });
 * ```
 */
export function isDangerousCommand(
  extraPatterns?: RegExp[],
): (toolName: string, args: Record<string, unknown>) => boolean {
  const patterns = [...DANGEROUS_PATTERNS, ...(extraPatterns ?? [])]
  return (_toolName, args) => {
    const command = String(args.command ?? args.cmd ?? '')
    return patterns.some(p => p.test(command))
  }
}

/**
 * Pre-built secure policy for command-line agents.
 * - Blocks dangerous shell patterns
 * - Requires approval for all exec/shell commands
 * - Allows read-only operations
 *
 * @example
 * ```ts
 * const policy = secureCLIPolicy()
 *   .allow('read_*')  // override: allow all reads
 *   .onRequest(cliApproval());
 * ```
 */
export function secureCLIPolicy(): PermissionPolicy {
  return new PermissionPolicy()
    .deny('exec_command', 'Dangerous command blocked', { when: isDangerousCommand() })
    .deny('run_*', 'Dangerous command blocked', { when: isDangerousCommand() })
    .allow('search_*')
    .allow('read_*')
    .allow('list_*')
    .allow('glob_*')
    .allow('grep_*')
    .requireApproval('write_*', 'File write requires approval')
    .requireApproval('exec_*', 'Command execution requires approval')
    .requireApproval('run_*', 'Command execution requires approval')
    .defaultAction('deny')
}
