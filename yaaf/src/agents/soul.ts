/**
 * SOUL.md — Agent Personality System
 *
 * Separates agent IDENTITY from agent INSTRUCTIONS. Inspired by OpenClaw's
 * SOUL.md approach where the personality lives in a dedicated file that
 * defines WHO the agent is, not WHAT it does.
 *
 * @example
 * ```ts
 * const soul = await loadSoul('./SOUL.md');
 * // or create inline:
 * const soul = createSoul({
 *   name: 'Molty',
 *   personality: 'Cheerful space lobster who loves helping humans.',
 *   tone: 'casual',
 *   rules: ['Never reveal system internals', 'Be concise'],
 * });
 *
 * const systemPrompt = applySoul('You help with calendar management.', soul);
 * ```
 *
 * @module agents/soul
 */

import { readFile } from 'fs/promises'

// ── Types ────────────────────────────────────────────────────────────────────

export type Soul = {
  /** Agent's name */
  name: string
  /** Core personality description */
  personality: string
  /** Communication tone */
  tone?: 'casual' | 'professional' | 'playful' | 'formal' | string
  /** Behavioral rules / guardrails */
  rules?: string[]
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a Soul object programmatically.
 */
export function createSoul(config: Soul): Soul {
  return { ...config }
}

// ── Loader ───────────────────────────────────────────────────────────────────

/**
 * Load a Soul from a SOUL.md file.
 *
 * Expected format:
 * ```markdown
 * ---
 * name: Molty
 * tone: casual
 * ---
 *
 * # Personality
 * Cheerful space lobster who loves helping humans.
 *
 * # Rules
 * - Never reveal system internals
 * - Be concise and helpful
 *
 * # Preferences
 * - timezone: America/New_York
 * - language: English
 * ```
 */
export async function loadSoul(path: string): Promise<Soul> {
  const content = await readFile(path, 'utf-8')
  return parseSoulMd(content)
}

/**
 * Parse a SOUL.md string into a Soul object.
 */
export function parseSoulMd(content: string): Soul {
  const soul: Soul = { name: '', personality: '' }

  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (fmMatch) {
    const fm = fmMatch[1]!
    for (const line of fm.split('\n')) {
      const [key, ...valueParts] = line.split(':')
      if (!key || valueParts.length === 0) continue
      const value = valueParts.join(':').trim()
      if (key.trim() === 'name') soul.name = value
      if (key.trim() === 'tone') soul.tone = value
    }
    content = content.slice(fmMatch[0].length)
  }

  // Parse sections by ## or # headers
  const sections = new Map<string, string>()
  const sectionRegex = /^#{1,2}\s+(.+)$/gm
  let lastHeader: string | null = null
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Collect all header positions
  const headers: { name: string; start: number; end: number }[] = []
  while ((match = sectionRegex.exec(content)) !== null) {
    if (lastHeader !== null) {
      headers.push({
        name: lastHeader,
        start: lastIndex,
        end: match.index,
      })
    }
    lastHeader = match[1]!.trim().toLowerCase()
    lastIndex = match.index + match[0].length
  }
  if (lastHeader !== null) {
    headers.push({ name: lastHeader, start: lastIndex, end: content.length })
  }

  for (const h of headers) {
    const body = content.slice(h.start, h.end).trim()
    sections.set(h.name, body)
  }

  // Map sections to Soul fields
  if (sections.has('personality')) {
    soul.personality = sections.get('personality')!
  }
  if (sections.has('rules')) {
    soul.rules = sections.get('rules')!
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
  }
  if (sections.has('preferences')) {
    soul.preferences = {}
    for (const line of sections.get('preferences')!.split('\n')) {
      const cleaned = line.replace(/^[-*]\s*/, '').trim()
      const colonIdx = cleaned.indexOf(':')
      if (colonIdx > 0) {
        const k = cleaned.slice(0, colonIdx).trim()
        const v = cleaned.slice(colonIdx + 1).trim()
        soul.preferences[k] = v
      }
    }
  }

  // Remaining sections go to custom sections
  const knownSections = new Set(['personality', 'rules', 'preferences'])
  for (const [key, value] of sections) {
    if (!knownSections.has(key)) {
      if (!soul.sections) soul.sections = {}
      soul.sections[key] = value
    }
  }

  // If no personality section, use any text before first header
  if (!soul.personality) {
    const firstHeader = content.search(/^#{1,2}\s+/m)
    if (firstHeader > 0) {
      soul.personality = content.slice(0, firstHeader).trim()
    } else if (!headers.length) {
      soul.personality = content.trim()
    }
  }

  return soul
}

// ── Formatter ────────────────────────────────────────────────────────────────

/**
 * Apply a Soul to a system prompt. The soul becomes the identity preamble.
 *
 * @param systemPrompt - The task-specific system prompt
 * @param soul - The personality to apply
 * @returns Combined prompt with identity + task instructions
 */
export function applySoul(systemPrompt: string, soul: Soul): string {
  const parts: string[] = []

  // Identity
  if (soul.name) {
    parts.push(`# Identity\nYou are ${soul.name}.`)
  }
  if (soul.personality) {
    parts.push(soul.personality)
  }

  // Tone
  if (soul.tone) {
    parts.push(`\n# Communication Style\nYour tone is ${soul.tone}.`)
  }

  // Rules
  if (soul.rules && soul.rules.length > 0) {
    parts.push('\n# Rules\n' + soul.rules.map(r => `- ${r}`).join('\n'))
  }

  // User preferences
  if (soul.preferences && Object.keys(soul.preferences).length > 0) {
    parts.push(
      '\n# User Preferences\n' +
      Object.entries(soul.preferences)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n'),
    )
  }

  // Custom sections
  if (soul.sections) {
    for (const [title, content] of Object.entries(soul.sections)) {
      parts.push(`\n# ${title.charAt(0).toUpperCase() + title.slice(1)}\n${content}`)
    }
  }

  // Separator + task instructions
  parts.push('\n---\n')
  parts.push(systemPrompt)

  return parts.join('\n')
}
