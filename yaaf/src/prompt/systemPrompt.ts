/**
 * SystemPromptBuilder — composable, section-based system prompt assembly.
 *
  * pipeline (`src/constants/prompts.ts` + `src/constants/systemPromptSections.ts`)
 * and makes it available as a first-class YAAF primitive:
 *
 *   1. **Static sections** — computed once, cached for the session lifetime.
 *      Cheap to render; safe to recompute on /clear but not every turn.
 *
 *   2. **Dynamic sections** — computed on every turn (the "uncached" variant).
 *      Use sparingly — they prevent prompt-cache hits. You must supply a reason.
 *
 *   3. **Boundary marker** — separates static (cross-session cacheable) content
 *      from dynamic (per-user/per-session) content. Mirrors the
 *      `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` constant in the main repo.
 *
 *   4. **Priority ordering** — sections are rendered in insertion order by
 *      default, but each section can carry an optional `order` weight for
 *      precise placement (lower = earlier).
 *
 * @example
 * ```ts
 * const builder = new SystemPromptBuilder()
 *   .addStatic('identity', () => 'You are a helpful coding assistant.')
 *   .addStatic('rules', () => '## Rules\n- Never make up code\n- Always ask before deleting files')
 *   .addStatic('tools', () => buildToolsSection(myTools))
 *   .addDynamic('env', () => `CWD: ${process.cwd()}\nDate: ${new Date().toISOString()}`,
 *     'cwd and date change per session')
 *   .addDynamic('memory', () => memoryStore.buildPrompt(), 'memory is updated per turn');
 *
 * // In your agent loop:
 * const systemPrompt = await builder.build();
 * ```
 *
 * @example
 * ```ts
 * // Inject into AgentConfig directly:
 * const agent = new Agent({
 *   systemPrompt: await promptBuilder.build(),
 *   ...
 * });
 *
 * // Or as a lazy provider (re-evaluated each run):
 * const agent = new Agent({
 *   systemPromptProvider: () => promptBuilder.build(),
 *   ...
 * });
 * ```
 */

import * as os from 'os'

// ── Types ─────────────────────────────────────────────────────────────────────

/** A function that computes a section's string content. May be async. */
export type SectionFn = () => string | null | Promise<string | null>

/** How a section is cached. */
export type CacheBehavior = 'session' | 'turn' | 'never'

export type SystemPromptSection = {
  /** Unique name for diagnostics and cache keying. */
  name: string
  /** Content factory. Return null to omit this section. */
  compute: SectionFn
  /**
   * Cache lifetime:
   *  - `session` (default): computed once per session, cached until `reset()`.
   *  - `turn`: recomputed on every `build()` call. BREAKS prompt-cache — justify!
   *  - `never`: same as `turn`, but the intent is explicit refusal to cache.
   */
  cache: CacheBehavior
  /**
   * Optional human-readable justification for `turn` or `never` cache.
   * Required when `cache !== 'session'` to make cache-busting intentional.
   */
  reason?: string
  /**
   * Rendering weight. Sections are sorted ascending by order, then by
   * insertion index for ties. Default: 100. Use 0 for "preamble" sections,
   * 200 for "footer/dynamic" sections.
   */
  order: number
}

/** Separator inserted between static and dynamic sections. */
export const DYNAMIC_BOUNDARY_MARKER = '__DYNAMIC_BOUNDARY__'

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * SystemPromptBuilder — fluent, section-registry-based system prompt composer.
 *
  * Section-based prompt architecture:
 * static sections go before the boundary marker (cache-safe), dynamic
 * sections go after (turn-specific content like memory, env info, etc.)
 */
export class SystemPromptBuilder {
  private sections: SystemPromptSection[] = []
  private insertionIndex = 0
  private cache = new Map<string, string | null>()
  private boundaryEnabled = true

  // ── Adding sections ─────────────────────────────────────────────────────

  /**
   * Add a static (session-cached) section.
   * The compute function runs once and is memoized until `reset()`.
   *
   * @param name  Unique section identifier.
   * @param fn    Content factory — return `null` to skip this section.
   * @param order Render weight (default 100, lower = earlier).
   */
  addStatic(name: string, fn: SectionFn, order = 100): this {
    return this.addSection({ name, compute: fn, cache: 'session', order })
  }

  /**
   * Add a dynamic (per-turn, uncached) section.
   *
   * Use sparingly — dynamic sections prevent prompt-cache hits and add
   * latency on every LLM call. You MUST supply a `reason` explaining why
   * caching this section is not possible.
   *
   * @param name   Unique section identifier.
   * @param fn     Content factory — return `null` to skip this section.
   * @param reason Why this section must recompute every turn (required).
   * @param order  Render weight (default 200, after static boundary).
   */
  addDynamic(name: string, fn: SectionFn, reason: string, order = 200): this {
    return this.addSection({ name, compute: fn, cache: 'turn', reason, order })
  }

  /**
   * Add a raw section definition with full control over all options.
   */
  addSection(section: Omit<SystemPromptSection, 'order'> & { order?: number }): this {
    const finalOrder = (section.order ?? 100) + (this.insertionIndex++) * 0.001
    this.sections.push({ ...section, order: finalOrder } as SystemPromptSection)
    return this
  }

  /**
   * Add a raw string literal as a static section (no compute function).
   * Useful for constant boilerplate.
   */
  addText(name: string, text: string, order = 100): this {
    return this.addStatic(name, () => text, order)
  }

  /**
   * Add a conditional section — only included when `condition()` returns true.
   */
  addWhen(
    condition: () => boolean | Promise<boolean>,
    name: string,
    fn: SectionFn,
    options?: { cache?: CacheBehavior; reason?: string; order?: number },
  ): this {
    const wrapped: SectionFn = async () => {
      if (!(await condition())) return null
      return fn()
    }
    return this.addSection({
      name,
      compute: wrapped,
      cache: options?.cache ?? 'session',
      reason: options?.reason,
      order: options?.order ?? 100,
    })
  }

  // ── Configuration ────────────────────────────────────────────────────────

  /**
   * Control whether the `DYNAMIC_BOUNDARY_MARKER` is inserted between static
   * and dynamic sections. Default: true (mirrors the main repo's behavior).
   *
   * Disable if your LLM provider doesn't support prompt caching or you don't
   * need to split the prompt into cacheable/non-cacheable halves.
   */
  withBoundary(enabled: boolean): this {
    this.boundaryEnabled = enabled
    return this
  }

  // ── Building ─────────────────────────────────────────────────────────────

  /**
   * Resolve a single section, respecting the cache policy.
   * Returns null if the section is omitted (compute returned null/empty).
   */
  private async resolveSection(section: SystemPromptSection): Promise<string | null> {
    if (section.cache === 'session' && this.cache.has(section.name)) {
      return this.cache.get(section.name) ?? null
    }
    const value = await section.compute()
    if (section.cache === 'session') {
      this.cache.set(section.name, value)
    }
    return value
  }

  /**
   * Resolve all sections and return the assembled system prompt.
   *
   * - Static sections are memoized (computed once, returned from cache on
   *   subsequent calls until `reset()` is called).
   * - Dynamic sections are recomputed on every call.
   * - `null` values from compute functions are filtered out.
   * - Sections are sorted by their `order` weight.
   */
  async build(separator = '\n\n'): Promise<string> {
    const sorted = [...this.sections].sort((a, b) => a.order - b.order)

    const staticParts: string[] = []
    const dynamicParts: string[] = []

    for (const section of sorted) {
      const value = await this.resolveSection(section)

      if (value !== null && value.trim() !== '') {
        if (section.cache === 'session') {
          staticParts.push(value)
        } else {
          dynamicParts.push(value)
        }
      }
    }

    if (dynamicParts.length === 0) {
      return staticParts.join(separator)
    }

    const parts = [
      ...staticParts,
      ...(this.boundaryEnabled ? [DYNAMIC_BOUNDARY_MARKER] : []),
      ...dynamicParts,
    ]

    return parts.join(separator)
  }

  /**
   * Like `build()` but returns an array of section strings rather than a
   * concatenated string. Useful when your LLM API accepts multiple system
   * prompt blocks (e.g. multi-block system prompt APIs).
   */
  async buildArray(includeNulls = false): Promise<(string | null)[]> {
    const sorted = [...this.sections].sort((a, b) => a.order - b.order)
    const results: (string | null)[] = []

    for (const section of sorted) {
      const value = await this.resolveSection(section)
      if (includeNulls || value !== null) results.push(value)
    }

    return results
  }

  /**
   * Clear session-cached section values. Call this on conversation reset
   * or `/clear` to force static sections to recompute on the next build.
   *
   * Does NOT remove the sections themselves — only their cached results.
   */
  reset(): this {
    this.cache.clear()
    return this
  }

  /**
   * Remove a section by name. Useful for filtering sections conditionally
   * after initial setup (e.g. plugin removal).
   */
  remove(name: string): this {
    this.sections = this.sections.filter(s => s.name !== name)
    this.cache.delete(name)
    return this
  }

  /** List all registered section names (in order). */
  sectionNames(): string[] {
    return [...this.sections]
      .sort((a, b) => a.order - b.order)
      .map(s => s.name)
  }

  /** Count of registered sections. */
  get size(): number {
    return this.sections.length
  }
}

// ── Built-in section factories ─────────────────────────────────────────────

/**
 * Standard environment section — injects current working directory, platform,
 * shell, OS version, and current date. Mirrors `computeSimpleEnvInfo` in the
 * main repo.
 *
 * Marked as `turn` cache since `cwd` can change across sessions, though in
 * practice most agents fix their cwd. If your cwd is stable, use `session`.
 */
export function envSection(options: { cache?: CacheBehavior } = {}): {
  name: string
  compute: SectionFn
  cache: CacheBehavior
  reason: string
  order: number
} {
  const cacheMode = options.cache ?? 'turn'
  return {
    name: 'env',
    compute: () => {
      const shell = process.env.SHELL ?? 'unknown'
      const shellName = shell.includes('zsh') ? 'zsh'
        : shell.includes('bash') ? 'bash' : shell

      const osInfo = `${os.type()} ${os.release()}`

      return [
        '# Environment',
        `- Working directory: ${process.cwd()}`,
        `- Platform: ${process.platform}`,
        `- Shell: ${shellName}`,
        `- OS: ${osInfo}`,
        `- Date: ${new Date().toISOString().split('T')[0]}`,
      ].join('\n')
    },
    cache: cacheMode,
    reason: 'cwd and date are session-specific',
    order: 200,
  }
}

/**
 * Rules / safety section. Static — cached for the session.
 */
export function rulesSection(rules: string[]): {
  name: string
  compute: SectionFn
  cache: CacheBehavior
  order: number
} {
  const text = `## Rules\n${rules.map(r => `- ${r}`).join('\n')}`
  return { name: 'rules', compute: () => text, cache: 'session', order: 50 }
}

/**
 * Identity / persona section. Static — rarely changes within a session.
 */
export function identitySection(prompt: string): {
  name: string
  compute: SectionFn
  cache: CacheBehavior
  order: number
} {
  return { name: 'identity', compute: () => prompt, cache: 'session', order: 0 }
}

/**
 * Date/time section — always recomputed (dynamic).
 * Mirrors the session-start date feature from `getSessionStartDate()`.
 */
export function dateSection(): {
  name: string
  compute: SectionFn
  cache: CacheBehavior
  reason: string
  order: number
} {
  return {
    name: 'date',
    compute: () => `Current date: ${new Date().toISOString()}`,
    cache: 'turn',
    reason: 'date/time changes every turn',
    order: 210,
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a `SystemPromptBuilder` pre-loaded with sensible defaults:
 *  - identity section from `basePrompt`
 *  - environment section (cwd, platform, shell, date)
 *
 * You can override or extend any section using the fluent API.
 *
 * @example
 * ```ts
 * const builder = defaultPromptBuilder('You are a helpful coding assistant.')
 *   .addStatic('rules', () => '## Rules\n- Always verify before deleting');
 *
 * const agent = new Agent({ systemPrompt: await builder.build() });
 * ```
 */
export function defaultPromptBuilder(basePrompt: string): SystemPromptBuilder {
  return new SystemPromptBuilder()
    .addSection(identitySection(basePrompt))
    .addSection(envSection())
    .addSection(dateSection())
}

/**
 * Create a builder from an array of `[name, fn]` pairs for quick assembly.
 * All sections are static (session-cached).
 */
export function fromSections(
  entries: Array<[name: string, fn: SectionFn | string]>,
): SystemPromptBuilder {
  const builder = new SystemPromptBuilder()
  entries.forEach(([name, fnOrStr], i) => {
    const fn: SectionFn = typeof fnOrStr === 'string' ? () => fnOrStr : fnOrStr
    builder.addStatic(name, fn, i * 10)
  })
  return builder
}
