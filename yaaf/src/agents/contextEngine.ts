/**
 * Context Engine — Dynamic system prompt assembly.
 *
 * Assembles the agent's system prompt from multiple sources at runtime:
 * - SOUL.md personality
 * - Active skills (injected instructions)
 * - Memory context (relevant memories)
 * - User preferences
 * - Standing orders
 *
 * Inspired by OpenClaw's context engine with `/context list` inspection.
 *
 * @example
 * ```ts
 * const ctx = new ContextEngine({ basePrompt: 'Help the user.' });
 * ctx.addSoul(soul);
 * ctx.addSkill('weather', 'You can check the weather using the WeatherAPI tool.');
 * ctx.addMemory('User prefers metric units');
 *
 * const prompt = ctx.build();
 * const inspection = ctx.inspect(); // [{ section, charCount }]
 * ```
 *
 * @module agents/contextEngine
 */

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A function that prepends personality/identity to a system prompt.
 * When using the Soul module (from 'yaaf/gateway'), pass `applySoul.bind(null, soul)`.
 * This keeps the core barrel decoupled from the opt-in soul module.
 */
export type SoulTransform = (basePrompt: string) => string

export type ContextSection = {
  /** Unique identifier for this section */
  id: string
  /** Display name */
  name: string
  /** Content to inject */
  content: string
  /** Priority (higher = earlier in prompt). Default: 50 */
  priority?: number
  /** Whether this section can be omitted under token pressure */
  droppable?: boolean
}

export type ContextEngineConfig = {
  /** Base task instructions (always included) */
  basePrompt: string
  /**
   * Maximum total character budget for the system prompt.
   * If set, droppable sections are removed lowest-priority-first to fit.
   */
  maxChars?: number
}

export type ContextInspection = {
  section: string
  charCount: number
  droppable: boolean
  included: boolean
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class ContextEngine {
  private soulTransform: SoulTransform | null = null
  private sections: Map<string, ContextSection> = new Map()
  private readonly config: ContextEngineConfig

  constructor(config: ContextEngineConfig) {
    this.config = config
  }

  /**
   * Set the agent's personality transform.
   * Use with the Soul module: `engine.setSoul((prompt) => applySoul(prompt, soul))`
   */
  setSoul(transform: SoulTransform): this {
    this.soulTransform = transform
    return this
  }

  /** Remove the personality transform. */
  clearSoul(): this {
    this.soulTransform = null
    return this
  }

  // ── Sections ───────────────────────────────────────────────────────────

  /** Add a context section. */
  addSection(section: ContextSection): this {
    this.sections.set(section.id, section)
    return this
  }

  /** Remove a section. */
  removeSection(id: string): this {
    this.sections.delete(id)
    return this
  }

  /** Convenience: add a skill's instructions. */
  addSkill(name: string, instructions: string): this {
    return this.addSection({
      id: `skill:${name}`,
      name: `Skill: ${name}`,
      content: `## Skill: ${name}\n${instructions}`,
      priority: 60,
      droppable: true,
    })
  }

  /** Convenience: add a memory context block. */
  addMemory(content: string, id = 'memory'): this {
    return this.addSection({
      id,
      name: 'Memory',
      content: `## Relevant Memory\n${content}`,
      priority: 70,
      droppable: true,
    })
  }

  /** Convenience: add standing orders. */
  addStandingOrders(orders: string[]): this {
    if (orders.length === 0) return this
    return this.addSection({
      id: 'standing-orders',
      name: 'Standing Orders',
      content: '## Standing Orders\n' + orders.map(o => `- ${o}`).join('\n'),
      priority: 80,
      droppable: false,
    })
  }

  /** Convenience: add user preferences. */
  addPreferences(prefs: Record<string, string>): this {
    if (Object.keys(prefs).length === 0) return this
    return this.addSection({
      id: 'user-prefs',
      name: 'User Preferences',
      content:
        '## User Preferences\n' +
        Object.entries(prefs).map(([k, v]) => `- ${k}: ${v}`).join('\n'),
      priority: 75,
      droppable: true,
    })
  }

  // ── Build ──────────────────────────────────────────────────────────────

  /**
   * Build the final system prompt from all sections.
   * Applies the soul (if set), then appends sections sorted by priority.
   */
  build(): string {
    // Start with base prompt (possibly with soul applied)
    let basePrompt = this.config.basePrompt
    if (this.soulTransform) {
      basePrompt = this.soulTransform(basePrompt)
    }

    // Sort sections by priority (highest first)
    const sorted = [...this.sections.values()].sort(
      (a, b) => (b.priority ?? 50) - (a.priority ?? 50),
    )

    // Build the full prompt
    const parts: string[] = [basePrompt]

    if (sorted.length > 0) {
      // Determine which sections fit
      const included = this.fitSections(sorted, basePrompt.length)
      for (const section of included) {
        parts.push('\n\n' + section.content)
      }
    }

    return parts.join('')
  }

  /**
   * Inspect what's in the context. Useful for debugging.
   * Equivalent to OpenClaw's `/context list`.
   */
  inspect(): ContextInspection[] {
    const baseLen = this.config.basePrompt.length
    const soulLen = this.soulTransform
      ? this.soulTransform('').length
      : 0

    const result: ContextInspection[] = []

    // Base prompt
    result.push({
      section: 'Base Prompt',
      charCount: baseLen,
      droppable: false,
      included: true,
    })

    // Soul
    if (this.soulTransform) {
      result.push({
        section: 'Soul',
        charCount: soulLen,
        droppable: false,
        included: true,
      })
    }

    // Sections
    const sorted = [...this.sections.values()].sort(
      (a, b) => (b.priority ?? 50) - (a.priority ?? 50),
    )
    const included = new Set(
      this.fitSections(sorted, baseLen + soulLen).map(s => s.id),
    )

    for (const section of sorted) {
      result.push({
        section: section.name,
        charCount: section.content.length,
        droppable: section.droppable ?? false,
        included: included.has(section.id),
      })
    }

    return result
  }

  /** Total character count of the built prompt. */
  totalChars(): number {
    return this.build().length
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private fitSections(sorted: ContextSection[], baseLength: number): ContextSection[] {
    if (!this.config.maxChars) return sorted

    const budget = this.config.maxChars - baseLength
    let used = 0
    const included: ContextSection[] = []

    for (const section of sorted) {
      const sectionLen = section.content.length + 2 // +2 for \n\n
      if (used + sectionLen <= budget) {
        included.push(section)
        used += sectionLen
      } else if (!section.droppable) {
        // Non-droppable sections are always included (may exceed budget)
        included.push(section)
        used += sectionLen
      }
      // Droppable sections that don't fit are silently dropped
    }

    return included
  }
}
