/**
 * Skills — markdown-based capability packs for agents.
 *
 * A Skill is a markdown file that extends an agent's instructions at runtime
 * without code changes. Skills can:
 *  - Add domain knowledge and constraints to the system prompt
 *  - Define reusable workflows and procedures
 *  - Provide examples and few-shot demonstrations
 *
  * skills like /dream, /review, /commit) and the SKILL.md format.
 *
 * @example
 * ```ts
 * // Load all skills from a directory
 * const skills = await loadSkills('./skills');
 *
 * const agent = new Agent({
 *   systemPrompt: 'You are a coding assistant.',
 *   skills,
 * });
 *
 * // The agent's effective system prompt = base + all skill injections
 * ```
 *
 * @example
 * ```ts
 * // Inline skill definition
 * const securitySkill = defineSkill({
 *   name: 'security-review',
 *   description: 'OWASP security review checklist',
 *   instructions: `
 * ## Security Review Protocol
 * When reviewing code, always check for:
 * 1. SQL injection vulnerabilities
 * 2. XSS vulnerabilities
 * ...`,
 * });
 * ```
 */

import * as fsp from 'fs/promises'
import * as path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillFrontmatter = {
  /** Display name for the skill */
  name: string
  /** Short description shown in skill listings */
  description?: string
  /** Version string */
  version?: string
  /** Whether this skill is always injected (default: true) */
  always?: boolean
  /** List of tags for filtering/search */
  tags?: string[]
}

export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter) */
  instructions: string
  /** Source file path, if loaded from disk */
  filePath?: string
}

// ── Frontmatter parser ────────────────────────────────────────────────────────

/**
 * Parse YAML-lite frontmatter from a markdown file.
 * Format:
 * ```
 * ---
 * name: My Skill
 * description: Does something useful
 * ---
 * # Skill content here
 * ```
 */
function parseFrontmatter(content: string): { meta: Partial<SkillFrontmatter>; body: string } {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!fm) return { meta: {}, body: content }

  const meta: Partial<SkillFrontmatter> = {}
  const yamlBlock = fm[1]!

  for (const line of yamlBlock.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (!match) continue
    const [, key, value] = match
    switch (key) {
      case 'name': meta.name = value!.trim().replace(/^['"]|['"]$/g, ''); break
      case 'description': meta.description = value!.trim().replace(/^['"]|['"]$/g, ''); break
      case 'version': meta.version = value!.trim().replace(/^['"]|['"]$/g, ''); break
      case 'always': meta.always = value!.trim() !== 'false'; break
      case 'tags': meta.tags = value!.split(',').map(t => t.trim()); break
    }
  }

  return { meta, body: fm[2]!.trim() }
}

// ── Skill loader ──────────────────────────────────────────────────────────────

/**
 * Load all `.md` skill files from a directory (non-recursive).
 * Files without a `name` frontmatter field use the filename as name.
 */
export async function loadSkills(dir: string): Promise<Skill[]> {
  let files: string[]
  try {
    files = await fsp.readdir(dir)
  } catch {
    return []
  }

  const skills: Skill[] = []
  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue
    if (file.startsWith('_') || file.startsWith('.')) continue

    const filePath = path.join(dir, file)
    try {
      const raw = await fsp.readFile(filePath, 'utf8')
      const { meta, body } = parseFrontmatter(raw)

      skills.push({
        name: meta.name ?? file.replace(/\.(md|mdx)$/, ''),
        description: meta.description,
        version: meta.version,
        always: meta.always ?? true,
        tags: meta.tags ?? [],
        instructions: body,
        filePath,
      })
    } catch {
      // Skip unreadable files
    }
  }

  return skills
}

/**
 * Load a single skill from a file path.
 */
export async function loadSkill(filePath: string): Promise<Skill> {
  const raw = await fsp.readFile(filePath, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  return {
    name: meta.name ?? path.basename(filePath, path.extname(filePath)),
    description: meta.description,
    version: meta.version,
    always: meta.always ?? true,
    tags: meta.tags ?? [],
    instructions: body,
    filePath,
  }
}

/**
 * Define a skill inline (no file required).
 */
export function defineSkill(skill: Skill): Skill {
  return { always: true, ...skill }
}

// ── Skill injection ───────────────────────────────────────────────────────────

/**
 * Build the skill injection block to append to a system prompt.
 * Only includes skills where `always === true` unless `forcedNames` is provided.
 */
export function buildSkillSection(skills: Skill[], forcedNames?: string[]): string {
  const active = skills.filter(s => {
    if (s.always) return true
    if (forcedNames?.includes(s.name)) return true
    return false
  })

  if (active.length === 0) return ''

  const blocks = active.map(s => {
    const header = `## Skill: ${s.name}${s.description ? ` — ${s.description}` : ''}`
    return `${header}\n\n${s.instructions}`
  })

  return `\n\n---\n# Active Skills\n\n${blocks.join('\n\n---\n\n')}`
}

// ── Skill registry (in-memory, for dynamic loading) ──────────────────────────

export class SkillRegistry {
  private skills = new Map<string, Skill>()

  register(skill: Skill): this {
    this.skills.set(skill.name, skill)
    return this
  }

  unregister(name: string): boolean {
    return this.skills.delete(name)
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name)
  }

  list(): Skill[] {
    return Array.from(this.skills.values())
  }

  async loadDir(dir: string): Promise<this> {
    const loaded = await loadSkills(dir)
    for (const skill of loaded) this.register(skill)
    return this
  }

  buildSection(forcedNames?: string[]): string {
    return buildSkillSection(this.list(), forcedNames)
  }
}
