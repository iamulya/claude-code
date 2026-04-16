/**
 * Knowledge Synthesizer Prompt Builder
 *
 * Builds the system and user prompts for the LLM authoring step.
 * The synthesis model (capable/expensive — gemini-2.5-pro or equivalent) reads:
 *
 * System:
 * - Domain context
 * - Entity type schema (frontmatter fields + article structure)
 * - Authoring rules (encyclopedic style, wikilinks, no hallucination)
 *
 * User:
 * - The article plan (what to write, what links to weave in)
 * - Existing article content (if updating)
 * - Source texts (budget-limited)
 * - Valid wikilink targets
 * - Suggested frontmatter values from the Extractor
 *
 * Output contract: a complete markdown document with YAML frontmatter,
 * structured per the article_structure, with [[wikilinks]] for all related concepts.
 */

import type { KBOntology, ConceptRegistry } from '../../ontology/index.js'
import type { IngestedContent } from '../ingester/index.js'
import type { ArticlePlan } from '../extractor/index.js'

// ── Token budget ──────────────────────────────────────────────────────────────

/** Max chars from each source to include in the synthesis prompt */
const SOURCE_TEXT_MAX_CHARS = 12_000

/** Max chars of the existing article to include when updating */
const EXISTING_ARTICLE_MAX_CHARS = 6_000

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildSynthesisSystemPrompt(
  ontology: KBOntology,
  entityType: string,
): string {
  const schema = ontology.entityTypes[entityType]
  if (!schema) throw new Error(`Unknown entity type: ${entityType}`)

  // Build frontmatter field descriptions
  const frontmatterLines = Object.entries(schema.frontmatter.fields)
    .map(([name, field]) => {
      const required = field.required ? ' (REQUIRED)' : ' (optional)'
      const enumHint = field.enum ? ` Allowed values: [${field.enum.join(', ')}]` : ''
      const refHint = field.targetEntityType ? ` References entity type: ${field.targetEntityType}` : ''
      return `  - ${name} [${field.type}]${required}: ${field.description}${enumHint}${refHint}`
    })
    .join('\n')

  // Build article structure
  const structureLines = schema.articleStructure
    .map(s => {
      const req = s.required ? ' (required section)' : ' (optional section)'
      return `  ## ${s.heading}${req}\n  ${s.description}`
    })
    .join('\n\n')

  // Linkable entity types
  const linkableTypes = schema.linkableTo.length > 0
    ? `This ${entityType} article can link to: ${schema.linkableTo.join(', ')}`
    : ''

  return [
    `You are an expert knowledge base author writing encyclopedic articles for a specialized domain.`,
    ``,
    `Domain: "${ontology.domain}"`,
    ``,
    `# Your Role`,
    `You synthesize raw source material into clean, well-structured wiki articles.`,
    `Your articles are factual, encyclopedic, and written in third person.`,
    `You never invent facts not present in the source material.`,
    `When sources conflict, note the discrepancy rather than choosing one.`,
    ``,
    `# Article Type: ${entityType}`,
    `${schema.description}`,
    ``,
    `## Frontmatter Fields`,
    `Your article MUST begin with a YAML frontmatter block between --- delimiters.`,
    `Include these fields:`,
    frontmatterLines,
    ``,
    `## Article Structure`,
    `Your article body MUST include these sections in order:`,
    ``,
    structureLines,
    ``,
    linkableTypes,
    ``,
    `# Wikilink Rules`,
    `- Use [[wikilink]] syntax for ALL references to known KB entities`,
    `- Only use wikilinks for entities you are explicitly told exist in the KB`,
    `- Format: [[canonical title]] or [[canonical title|display text]]`,
    `- Do NOT invent wikilink targets — only use the list provided to you`,
    ``,
    `# Authoring Rules`,
    `1. Write ONLY from the provided source material — never hallucinate facts`,
    `2. Use clear, encyclopedic language — not conversational, not marketing`,
    `3. If a source is a web-clipped article, cite it in a Sources section`,
    `4. If updating an existing article, merge new info without losing existing accurate content`,
    `5. If sources are conflicting, note the discrepancy explicitly`,
    `6. Code examples from sources should be preserved in fenced code blocks`,
    `7. Mathematical notation from sources should be preserved in LaTeX if possible`,
    `8. When writing claims from sources, add inline citations using [Source N] notation`,
    `   Example: "Attention mechanisms were first described in 2014 [Source 1]."`,
    `9. At the end, include a ## Sources section mapping [Source N] to source file paths`,
    ``,
    `# Output Format`,
    `Output ONLY the complete markdown article — no explanation, no preamble, no trailing comments.`,
    `Start with --- (frontmatter delimiter), end with your last content line.`,
  ].join('\n')
}

// ── User prompt ───────────────────────────────────────────────────────────────

export function buildSynthesisUserPrompt(params: {
  plan: ArticlePlan
  sources: IngestedContent[]
  existingArticle?: string
  registry: ConceptRegistry
  ontology: KBOntology
}): string {
  const { plan, sources, existingArticle, registry, ontology } = params
  const schema = ontology.entityTypes[plan.entityType]!

  // Build the wikilink reference list
  const wikilinkTargets = buildWikilinkTargets(plan.knownLinkDocIds, registry)

  // Build suggested frontmatter as a YAML snippet for the LLM to start from
  const suggestedFmBlock = buildSuggestedFrontmatterBlock(plan, ontology)

  // Build source text blocks
  const sourceBlocks = sources.map((source, i) => {
    const text = smartTruncate(source.text, SOURCE_TEXT_MAX_CHARS)

    const imageNote = source.images.length > 0
      ? `\nImages in this source: ${source.images.map(img => `![${img.altText}](${img.localPath})`).join(', ')}`
      : ''

    return [
      `### Source ${i + 1}: ${source.title ?? 'Untitled'}`,
      `File: ${source.sourceFile}`,
      source.sourceUrl ? `URL: ${source.sourceUrl}` : '',
      imageNote,
      ``,
      source.text.startsWith('---')
        ? text  // Already markdown with frontmatter
        : `\`\`\`\n${text}\n\`\`\``,
    ].filter(Boolean).join('\n')
  }).join('\n\n---\n\n')

  // Existing article block (for updates)
  const existingBlock = existingArticle
    ? [
        `## Existing Article (UPDATE MODE — preserve accurate content, merge new info)`,
        ``,
        existingArticle.length > EXISTING_ARTICLE_MAX_CHARS
          ? existingArticle.slice(0, EXISTING_ARTICLE_MAX_CHARS) + `\n[... truncated ...]`
          : existingArticle,
      ].join('\n')
    : ''

  return [
    `# Task: ${plan.action === 'update' ? 'UPDATE' : 'CREATE'} article for "${plan.canonicalTitle}"`,
    `Entity type: ${plan.entityType}`,
    ``,
    suggestedFmBlock,
    ``,
    wikilinkTargets.length > 0
      ? [`## Valid Wikilink Targets`, `Use [[title]] syntax for these entities:`, ...wikilinkTargets].join('\n')
      : '## Valid Wikilink Targets\n(none — this is the first article in the KB)',
    ``,
    existingBlock,
    existingBlock ? '' : undefined,
    `## Source Material (${sources.length} source${sources.length !== 1 ? 's' : ''})`,
    ``,
    sourceBlocks,
    ``,
    `---`,
    ``,
    `Now write the complete ${plan.entityType} article about "${plan.canonicalTitle}".`,
    plan.action === 'update' ? `IMPORTANT: This is an UPDATE. Preserve all existing accurate content and merge new information.` : '',
    `Start with --- (YAML frontmatter) and include all required sections.`,
  ].filter(l => l !== undefined).join('\n')
}

// ── Helper builders ───────────────────────────────────────────────────────────

function buildWikilinkTargets(docIds: string[], registry: ConceptRegistry): string[] {
  const lines: string[] = []
  for (const docId of docIds) {
    const entry = registry.get(docId)
    if (entry) {
      lines.push(`  - [[${entry.canonicalTitle}]] → ${docId} [${entry.entityType}]`)
    }
  }
  return lines
}

function buildSuggestedFrontmatterBlock(plan: ArticlePlan, ontology: KBOntology): string {
  if (Object.keys(plan.suggestedFrontmatter).length === 0) {
    return `## Suggested Frontmatter\n(no suggestions — fill all required fields from sources)`
  }

  const lines = Object.entries(plan.suggestedFrontmatter)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join('\n')

  return [
    `## Suggested Frontmatter (compiler-inferred, verify from sources)`,
    lines,
  ].join('\n')
}

// ── Stub article generator ────────────────────────────────────────────────────

/**
 * Generate a stub article for a candidate new concept.
 * Stubs are minimal placeholder articles that get fleshed out in a
 * future compilation pass when more source material is available.
 */
export function generateStubArticle(params: {
  docId: string
  canonicalTitle: string
  entityType: string
  description: string
  knownLinkDocIds: string[]
  registry: ConceptRegistry
  compiledAt: string
}): string {
  const { canonicalTitle, entityType, description, knownLinkDocIds, registry, compiledAt, docId } = params

  const relatedLinks = knownLinkDocIds
    .slice(0, 5)
    .map(id => {
      const entry = registry.get(id)
      return entry ? `- [[${entry.canonicalTitle}]]` : null
    })
    .filter(Boolean)
    .join('\n')

  const frontmatter = [
    `---`,
    `title: "${canonicalTitle.replace(/"/g, '\\"')}"`,
    `entity_type: ${entityType}`,
    `stub: true`,
    `compiled_at: "${compiledAt}"`,
    `compiled_from: []`,
    `confidence: 0.5`,
    `---`,
  ].join('\n')

  const body = [
    `# ${canonicalTitle}`,
    ``,
    `> **Stub article** — This article was auto-generated from mentions in source material.`,
    `> Expand it by adding source documents that cover this topic.`,
    ``,
    `## Overview`,
    ``,
    description,
    ``,
    relatedLinks ? [`## Related`, relatedLinks].join('\n') : '',
  ].filter(Boolean).join('\n')

  return [frontmatter, '', body].join('\n')
}

// ── Smart truncation (Phase 2D) ───────────────────────────────────────────────

/**
 * Intelligently truncate source text to fit token budget.
 * Instead of cutting at an arbitrary character position (which can break
 * mid-sentence, mid-code-block, or mid-table), this splits at paragraph
 * boundaries and prioritizes:
 *
 * 1. Head (introduction/abstract) — 40% of budget
 * 2. Tail (conclusion/summary)   — 25% of budget
 * 3. Middle sections             — remaining budget
 */
function smartTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  if (paragraphs.length <= 2) {
    // Very few paragraphs — fall back to simple split
    return text.slice(0, maxChars) +
      `\n\n[... ${text.length - maxChars} chars omitted ...]`
  }

  const headBudget = Math.floor(maxChars * 0.4)
  const tailBudget = Math.floor(maxChars * 0.25)
  const midBudget = maxChars - headBudget - tailBudget - 100

  // Build head (from start)
  let head = ''
  let headParaCount = 0
  for (const p of paragraphs) {
    if ((head + '\n\n' + p).length > headBudget) break
    head += (head ? '\n\n' : '') + p
    headParaCount++
  }

  // Build tail (from end)
  let tail = ''
  let tailParaCount = 0
  for (let i = paragraphs.length - 1; i >= headParaCount; i--) {
    const p = paragraphs[i]!
    if ((p + '\n\n' + tail).length > tailBudget) break
    tail = p + (tail ? '\n\n' : '') + tail
    tailParaCount++
  }

  // Fill middle from remaining paragraphs
  let mid = ''
  const midStart = headParaCount
  const midEnd = paragraphs.length - tailParaCount
  for (let i = midStart; i < midEnd; i++) {
    const p = paragraphs[i]!
    if ((mid + '\n\n' + p).length > midBudget) break
    mid += (mid ? '\n\n' : '') + p
  }

  const omitted = text.length - head.length - mid.length - tail.length
  const parts: string[] = [head]

  if (mid) {
    parts.push(`\n\n[... ${omitted} chars from middle sections omitted for token budget ...]\n\n${mid}`)
  }

  if (tail) {
    parts.push(`\n\n[...]\n\n${tail}`)
  }

  return parts.join('')
}
