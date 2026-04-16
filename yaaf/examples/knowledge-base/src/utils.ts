/**
 * Shared utilities for the knowledge-base example scripts.
 *
 * Centralises ANSI colours, log helpers, and small data helpers so
 * compile.ts and chat.ts don't each carry their own copy.
 */

// ── ANSI colour tokens ────────────────────────────────────────────────────────

export const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
} as const

// ── Log helpers ───────────────────────────────────────────────────────────────

export const log     = (msg: string): void => { console.log(msg) }
export const logHeader = (msg: string): void => { log(`\n${c.bold}${c.cyan}${msg}${c.reset}`) }
export const logStep   = (msg: string): void => { log(`  ${c.yellow}→${c.reset} ${msg}`) }
export const logOk     = (msg: string): void => { log(`  ${c.green}✓${c.reset} ${msg}`) }
export const logWarn   = (msg: string): void => { log(`  ${c.yellow}⚠${c.reset} ${msg}`) }
export const logErr    = (msg: string): void => { log(`  ${c.red}✗${c.reset} ${msg}`) }

// ── Data helpers ──────────────────────────────────────────────────────────────

/**
 * Group an array of items into a Map keyed by a string discriminant.
 * Preserves insertion order within each group.
 */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = map.get(k) ?? []
    group.push(item)
    map.set(k, group)
  }
  return map
}
