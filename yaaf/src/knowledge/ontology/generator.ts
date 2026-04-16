/**
 * OntologyGenerator — LLM-powered bootstrap for ontology.yaml
 *
 * Scans a project directory to build context (file tree, README, package.json),
 * then uses an LLM to draft a complete, valid ontology.yaml tailored to the
 * specific knowledge domain.
 *
 * Usage (from a build script):
 * ```ts
 * import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge'
 *
 * const gen = new OntologyGenerator({
 *   generateFn: makeGenerateFn(myModel),
 *   outputPath: './knowledge/ontology.yaml',
 * })
 *
 * await gen.generate({
 *   domain: 'Acme SDK — a TypeScript library for ...',
 *   srcDirs: ['./src'],
 * })
 * ```
 *
 * @module knowledge/ontology/generator
 */

import * as fs    from 'node:fs/promises'
import * as path  from 'node:path'
import { OntologyLoader, ONTOLOGY_FILENAME } from './loader.js'
import type { GenerateFn } from '../compiler/extractor/extractor.js'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OntologyGeneratorOptions {
  /** LLM generate function (system, user) → text */
  generateFn: GenerateFn
  /**
   * Path where ontology.yaml will be written.
   * Defaults to `<cwd>/knowledge/ontology.yaml`.
   */
  outputPath?: string
  /** Max tokens to allow in the project context sent to the LLM. Default 6000. */
  maxContextTokens?: number
}

export interface GenerateOntologyOptions {
  /**
   * 1–3 sentence description of the knowledge domain.
   * Example: "FastAPI — a Python web framework for building REST APIs at speed.
   *           Covers routing, dependency injection, validation, and deployment."
   */
  domain: string
  /**
   * Directories to scan for file-tree context.
   * The generator reads top-level structure + README + package.json/pyproject.toml.
   * Defaults to `['./src']`.
   */
  srcDirs?: string[]
  /**
   * Optional hints about entity types to include.
   * Example: ['function', 'decorator', 'middleware', 'guide']
   * If omitted the LLM infers appropriate types from the domain + file tree.
   */
  entityTypeHints?: string[]
  /** Overwrite an existing ontology.yaml. Default false. */
  overwrite?: boolean
}

export interface GenerateOntologyResult {
  /** Absolute path of the written file */
  outputPath: string
  /** The raw YAML string that was written */
  yaml: string
  /** Warnings from validation (non-fatal) */
  warnings: string[]
}

// ── Example ontology (condensed) — used as a format reference in the prompt ───

const FORMAT_EXAMPLE = `\
domain: "Example SDK — a TypeScript library for building widgets. Covers API, concepts, and guides."

entity_types:

  concept:
    description: "A core abstraction or design pattern."
    linkable_to: [concept, guide, api]
    frontmatter:
      fields:
        title:        { description: "Article title", type: string, required: true }
        entity_type:  { description: "Entity type", type: enum, required: true, enum: [concept, api, guide] }
        summary:      { description: "One-sentence description", type: string, required: true }
    article_structure:
      - heading: "What It Is"
        description: "Define the concept clearly."
        required: true
      - heading: "How It Works"
        description: "Explain the mechanism with code examples."
        required: true

  api:
    description: "A specific exported class, function, or type."
    linkable_to: [api, concept, guide]
    frontmatter:
      fields:
        title:       { description: "Article title", type: string, required: true }
        entity_type: { description: "Entity type", type: enum, required: true, enum: [concept, api, guide] }
        summary:     { description: "One-sentence description", type: string, required: true }
        source_file: { description: "Relative path to source", type: string, required: true }
    article_structure:
      - heading: "Overview"
        description: "What this API does and when to use it."
        required: true
      - heading: "Signature"
        description: "Full TypeScript signature with parameter descriptions."
        required: true
      - heading: "Examples"
        description: "Minimal, realistic code examples."
        required: true

  guide:
    description: "A task-oriented how-to article."
    linkable_to: [api, concept, guide]
    frontmatter:
      fields:
        title:       { description: "Article title", type: string, required: true }
        entity_type: { description: "Entity type", type: enum, required: true, enum: [concept, api, guide] }
        summary:     { description: "One-sentence description", type: string, required: true }
    article_structure:
      - heading: "Overview"
        description: "What the reader will achieve."
        required: true
      - heading: "Step-by-Step"
        description: "Implementation steps with code."
        required: true

vocabulary:
  "widget":
    entity_type: api
    aliases: ["Widget class", "widget instance"]

budget:
  text_document_tokens: 6000
  image_tokens: 1200
  max_images_per_fetch: 3
`

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are an expert at designing knowledge base ontologies for software documentation.

Your task is to write a complete \`ontology.yaml\` file for a YAAF Knowledge Base.
The ontology defines the taxonomy of the KB: what kinds of articles exist, what
frontmatter fields they require, and how they should be structured.

## Rules
1. Output ONLY valid YAML — no code fences, no markdown, no explanation.
2. Start with the \`domain:\` key.
3. Include 3–6 \`entity_types\` appropriate for the domain.
4. Every entity type must have:
   - \`description\` (string)
   - \`linkable_to\` (list of entity type names)
   - \`frontmatter.fields\` with at minimum: \`title\`, \`entity_type\` (enum of ALL your type names), \`summary\`
   - \`article_structure\` (list of headings with description + required)
5. Include a \`vocabulary\` section with the 5–15 most important canonical terms.
6. Include a \`budget\` section (see example).
7. Make entity types specific to the domain — don't copy the example blindly.
8. The \`entity_type\` field's enum must list ALL entity type keys you define.

## Format reference (adapt this structure, don't copy it)
${FORMAT_EXAMPLE}
`

// ── File-tree scanner ──────────────────────────────────────────────────────────

/** Walk a directory tree up to maxDepth, skipping noise directories. */
async function scanDirTree(
  dir: string,
  maxDepth = 3,
  depth    = 0,
): Promise<string[]> {
  const SKIP = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', '__pycache__',
    '.cache', 'coverage', '.next', '.turbo', 'vendor', 'target',
  ])
  const lines: string[] = []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return lines
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue
    const indent = '  '.repeat(depth)
    if (e.isDirectory()) {
      lines.push(`${indent}${e.name}/`)
      if (depth < maxDepth - 1) {
        const sub = await scanDirTree(path.join(dir, e.name), maxDepth, depth + 1)
        lines.push(...sub)
      }
    } else {
      lines.push(`${indent}${e.name}`)
    }
  }
  return lines
}

/** Read a file safely, return empty string on error. */
async function tryRead(filePath: string, maxChars = 3000): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.length > maxChars ? content.slice(0, maxChars) + '\n...(truncated)' : content
  } catch {
    return ''
  }
}

// ── OntologyGenerator ─────────────────────────────────────────────────────────

export class OntologyGenerator {
  private readonly generateFn: GenerateFn
  private readonly outputPath: string
  private readonly maxContextTokens: number

  constructor(opts: OntologyGeneratorOptions) {
    this.generateFn       = opts.generateFn
    this.outputPath       = path.resolve(
      opts.outputPath ?? path.join(process.cwd(), 'knowledge', ONTOLOGY_FILENAME),
    )
    this.maxContextTokens = opts.maxContextTokens ?? 6000
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  async generate(opts: GenerateOntologyOptions): Promise<GenerateOntologyResult> {
    const outputPath = this.outputPath

    // Guard: don't overwrite unless asked
    if (!opts.overwrite) {
      const loader = new OntologyLoader(path.dirname(outputPath))
      if (await loader.exists()) {
        throw new Error(
          `ontology.yaml already exists at ${outputPath}. ` +
          `Pass overwrite: true to regenerate it.`,
        )
      }
    }

    // Build project context
    const context = await this._buildContext(opts)

    // Call LLM
    const yaml = await this._callLLM(opts.domain, context, opts.entityTypeHints)

    // Write first (OntologyLoader.load() reads from disk)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, yaml, 'utf-8')

    // Validate
    const warnings = await this._validate(outputPath)

    return { outputPath, yaml, warnings }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async _buildContext(opts: GenerateOntologyOptions): Promise<string> {
    const srcDirs = opts.srcDirs ?? ['./src']
    const parts: string[] = []

    // File trees
    for (const dir of srcDirs) {
      const absDir = path.resolve(dir)
      const tree   = await scanDirTree(absDir)
      if (tree.length > 0) {
        parts.push(`## Directory: ${dir}\n\`\`\`\n${tree.slice(0, 120).join('\n')}\n\`\`\``)
      }
    }

    // README
    for (const name of ['README.md', 'readme.md', 'README.mdx']) {
      const readme = await tryRead(path.resolve(name), 2000)
      if (readme) {
        parts.push(`## README\n${readme}`)
        break
      }
    }

    // Package manifest
    for (const name of ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod']) {
      const manifest = await tryRead(path.resolve(name), 1000)
      if (manifest) {
        parts.push(`## ${name}\n\`\`\`\n${manifest}\n\`\`\``)
        break
      }
    }

    return parts.join('\n\n')
  }

  private async _callLLM(
    domain: string,
    context: string,
    entityTypeHints?: string[],
  ): Promise<string> {
    const hintsSection = entityTypeHints?.length
      ? `\n## Entity type hints from the user\n${entityTypeHints.map(h => `- ${h}`).join('\n')}\n`
      : ''

    const userPrompt = `\
## Domain
${domain}
${hintsSection}
## Project context
${context}

Generate the complete ontology.yaml for this knowledge domain.
Output ONLY valid YAML — no code fences, no explanation.`

    const raw = await this.generateFn(SYSTEM_PROMPT, userPrompt)

    // Strip accidental markdown fences the LLM sometimes adds
    return raw
      .replace(/^```ya?ml\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim() + '\n'
  }

  private async _validate(outputPath: string): Promise<string[]> {
    const warnings: string[] = []
    try {
      const loader = new OntologyLoader(path.dirname(outputPath))
      const { issues } = await loader.load()
      for (const issue of issues) {
        warnings.push(`[${issue.severity}] ${issue.path}: ${issue.message}`)
      }
    } catch (err) {
      warnings.push(`Validation failed: ${(err as Error).message}`)
    }
    return warnings
  }
}
