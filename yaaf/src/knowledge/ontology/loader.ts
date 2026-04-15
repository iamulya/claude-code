/**
 * Ontology YAML Parser
 *
 * Loads and validates `ontology.yaml` from the KB root directory.
 * Uses a zero-dependency minimal YAML parser that handles the specific
 * subset of YAML used in ontology files (no anchors, no multi-document,
 * no complex types — just nested mappings, sequences, and scalars).
 *
 * The parser produces a validated `KBOntology` with human-readable
 * errors for any structural problem. The compiler will not start
 * until the ontology passes validation.
 */

import { readFile, writeFile, access } from 'fs/promises'
import { join } from 'path'
import type {
  KBOntology,
  EntityTypeSchema,
  RelationshipType,
  VocabularyEntry,
  FrontmatterSchema,
  FrontmatterFieldSchema,
  ArticleSection,
  FieldType,
  KBBudgetConfig,
  KBCompilerModelConfig,
  OntologyValidationResult,
  OntologyValidationIssue,
} from './types.js'

// ── Constants ────────────────────────────────────────────────────────────────

export const ONTOLOGY_FILENAME = 'ontology.yaml'
export const KB_CONFIG_FILENAME = 'kb.config.yaml'

const VALID_FIELD_TYPES: FieldType[] = [
  'string', 'string[]', 'number', 'boolean',
  'url', 'url[]', 'enum', 'enum[]',
  'entity_ref', 'entity_ref[]', 'date',
]

const DEFAULT_BUDGET: KBBudgetConfig = {
  textDocumentTokens: 4_096,
  imageTokens: 1_200,
  maxImagesPerFetch: 3,
}

// ── Minimal YAML parser ──────────────────────────────────────────────────────

/**
 * Parses the minimal YAML subset used in ontology.yaml.
 * Handles: mappings, sequences (- item), strings, numbers, booleans, null.
 * Does NOT handle: anchors, aliases, multi-document, flow style {}, [].
 *
 * Line-by-line parser that tracks indentation to build a nested object.
 * Returns a plain JS object/array tree.
 */
function parseYaml(raw: string): unknown {
  const lines = raw
    .split('\n')
    .map((line, i) => ({ raw: line, num: i + 1 }))
    .filter(l => {
      const trimmed = l.raw.trimStart()
      return trimmed !== '' && !trimmed.startsWith('#')
    })

  // Parse into an intermediate token stream
  interface YamlLine {
    indent: number
    key?: string
    value?: string
    isSeqItem: boolean
    num: number
  }

  const tokens: YamlLine[] = lines.map(l => {
    const indent = l.raw.length - l.raw.trimStart().length
    const trimmed = l.raw.trimStart()
    const isSeqItem = trimmed.startsWith('- ')
    const content = isSeqItem ? trimmed.slice(2) : trimmed

    const colonIdx = content.indexOf(': ')
    // Detect quoted key-only: "key": (ends with ": or ':)
    const quotedKeyOnlyMatch = !isSeqItem
      ? (content.match(/^"([^"]+)":$/) ?? content.match(/^'([^']+)':$/))
      : null
    const isKeyOnly = !quotedKeyOnlyMatch && content.endsWith(':') && !content.startsWith('"') && !content.startsWith("'")

    let key: string | undefined
    let value: string | undefined

    if (quotedKeyOnlyMatch) {
      // Quoted mapping key with no value: "attention mechanism":
      key = quotedKeyOnlyMatch[1]!.trim()
    } else if (isKeyOnly && !isSeqItem) {
      key = content.slice(0, -1).trim()
      // Strip quotes from the key
      if ((key.startsWith('"') && key.endsWith('"')) ||
          (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
      }
    } else if (colonIdx > 0) {
      key = content.slice(0, colonIdx).trim()
      // Strip quotes from the key
      if ((key.startsWith('"') && key.endsWith('"')) ||
          (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
      }
      value = content.slice(colonIdx + 2).trim()
    } else if (isSeqItem) {
      // Sequence item with no colon — plain scalar
      value = content.trim()
    } else {
      // Scalar continuation or bare key
      key = content.trim()
    }

    // Strip inline comments from value
    if (value) {
      const commentIdx = value.indexOf(' #')
      if (commentIdx > 0) {
        value = value.slice(0, commentIdx).trim()
      }
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
    }

    return { indent, key, value, isSeqItem, num: l.num }
  })

  // Recursive descent builder
  function parseValue(raw: string): unknown {
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (raw === 'null' || raw === '~') return null
    const n = Number(raw)
    if (!Number.isNaN(n) && raw !== '') return n
    return raw
  }

  function buildNode(idx: number, baseIndent: number): { value: unknown; nextIdx: number } {
    const token = tokens[idx]!

    // Peek ahead to determine if this is a mapping or sequence parent
    const nextToken = tokens[idx + 1]
    const childIndent = nextToken?.indent ?? -1

    if (childIndent > baseIndent && nextToken) {
      if (nextToken.isSeqItem) {
        // Build sequence
        const arr: unknown[] = []
        let i = idx + 1
        while (i < tokens.length && tokens[i]!.indent === childIndent && tokens[i]!.isSeqItem) {
          const t = tokens[i]!
          if (t.value !== undefined && (tokens[i + 1]?.indent ?? -1) <= childIndent) {
            // Scalar sequence item
            arr.push(parseValue(t.value))
            i++
          } else {
            // Object sequence item
            const obj: Record<string, unknown> = {}
            if (t.key && t.value !== undefined) {
              obj[t.key] = parseValue(t.value)
            } else if (t.key) {
              const result = buildNode(i, t.indent)
              obj[t.key] = result.value
              i = result.nextIdx
              continue
            }
            i++
            while (i < tokens.length && tokens[i]!.indent > childIndent) {
              const inner = tokens[i]!
              if (inner.key && inner.value !== undefined) {
                obj[inner.key] = parseValue(inner.value)
                i++
              } else if (inner.key) {
                const result = buildNode(i, inner.indent)
                obj[inner.key] = result.value
                i = result.nextIdx
              } else {
                i++
              }
            }
            arr.push(obj)
          }
        }
        return { value: arr, nextIdx: i }
      } else {
        // Build mapping
        const obj: Record<string, unknown> = {}
        let i = idx + 1
        while (i < tokens.length && tokens[i]!.indent === childIndent) {
          const t = tokens[i]!
          if (t.key && t.value !== undefined) {
            obj[t.key] = parseValue(t.value)
            i++
          } else if (t.key) {
            const result = buildNode(i, t.indent)
            obj[t.key] = result.value
            i = result.nextIdx
          } else {
            i++
          }
        }
        return { value: obj, nextIdx: i }
      }
    }

    // Leaf node — current token has a scalar value
    if (token.value !== undefined) {
      return { value: parseValue(token.value), nextIdx: idx + 1 }
    }

    return { value: null, nextIdx: idx + 1 }
  }

  // Build root mapping
  const root: Record<string, unknown> = {}
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]!
    if (t.key && t.value !== undefined) {
      root[t.key] = parseValue(t.value)
      i++
    } else if (t.key) {
      const result = buildNode(i, t.indent)
      root[t.key] = result.value
      i = result.nextIdx
    } else {
      i++
    }
  }

  return root
}

// ── Type coercers ────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string') as string[]
  if (typeof v === 'string') return [v]
  return []
}

function asBoolean(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isNaN(n) ? fallback : n
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return {}
}

// ── Schema hydrators ─────────────────────────────────────────────────────────

function hydrateFrontmatterField(
  raw: unknown,
  path: string,
  issues: OntologyValidationIssue[],
): FrontmatterFieldSchema {
  const r = asRecord(raw)
  const typeRaw = asString(r['type'])
  const type = VALID_FIELD_TYPES.includes(typeRaw as FieldType)
    ? (typeRaw as FieldType)
    : 'string'

  if (!VALID_FIELD_TYPES.includes(typeRaw as FieldType)) {
    issues.push({
      severity: 'error',
      path,
      message: `Invalid field type "${typeRaw}". Valid types: ${VALID_FIELD_TYPES.join(', ')}`,
    })
  }

  const enumValues = asStringArray(r['enum'])
  if ((type === 'enum' || type === 'enum[]') && enumValues.length === 0) {
    issues.push({
      severity: 'warning',
      path,
      message: `Field type is "${type}" but no enum values specified`,
    })
  }

  return {
    description: asString(r['description']),
    type,
    required: asBoolean(r['required'], false),
    enum: enumValues.length > 0 ? enumValues : undefined,
    targetEntityType: asString(r['target_entity_type']) || undefined,
    default: asString(r['default']) || undefined,
  }
}

function hydrateFrontmatterSchema(
  raw: unknown,
  path: string,
  issues: OntologyValidationIssue[],
): FrontmatterSchema {
  const r = asRecord(raw)
  const fieldsRaw = asRecord(r['fields'])
  const fields: Record<string, FrontmatterFieldSchema> = {}

  for (const [fieldName, fieldRaw] of Object.entries(fieldsRaw)) {
    fields[fieldName] = hydrateFrontmatterField(
      fieldRaw,
      `${path}.fields.${fieldName}`,
      issues,
    )
  }

  return { fields }
}

function hydrateArticleSection(raw: unknown): ArticleSection {
  const r = asRecord(raw)
  return {
    heading: asString(r['heading']),
    description: asString(r['description']),
    required: asBoolean(r['required'], false),
  }
}

function hydrateEntityType(
  raw: unknown,
  typeName: string,
  issues: OntologyValidationIssue[],
): EntityTypeSchema {
  const r = asRecord(raw)
  const path = `entityTypes.${typeName}`

  if (!r['description']) {
    issues.push({
      severity: 'warning',
      path,
      message: `Entity type "${typeName}" has no description`,
    })
  }

  const structureRaw = Array.isArray(r['article_structure']) ? r['article_structure'] : []
  const articleStructure = structureRaw.map(s => hydrateArticleSection(s))

  return {
    description: asString(r['description']),
    frontmatter: hydrateFrontmatterSchema(
      r['frontmatter'] ?? {},
      `${path}.frontmatter`,
      issues,
    ),
    articleStructure,
    linkableTo: asStringArray(r['linkable_to']),
    indexable: asBoolean(r['indexable'], true),
  }
}

function hydrateRelationshipType(
  raw: unknown,
  idx: number,
  knownEntityTypes: Set<string>,
  issues: OntologyValidationIssue[],
): RelationshipType {
  const r = asRecord(raw)
  const path = `relationshipTypes[${idx}]`
  const name = asString(r['name'])
  const from = asString(r['from'])
  const to = asString(r['to'])

  if (!name) {
    issues.push({ severity: 'error', path, message: 'Relationship type missing required field: name' })
  }
  if (!from) {
    issues.push({ severity: 'error', path, message: `Relationship "${name}" missing required field: from` })
  }
  if (!to) {
    issues.push({ severity: 'error', path, message: `Relationship "${name}" missing required field: to` })
  }
  if (from && !knownEntityTypes.has(from)) {
    issues.push({ severity: 'error', path, message: `Relationship "${name}".from references unknown entity type "${from}"` })
  }
  if (to && !knownEntityTypes.has(to)) {
    issues.push({ severity: 'error', path, message: `Relationship "${name}".to references unknown entity type "${to}"` })
  }

  return {
    name,
    from,
    to,
    description: asString(r['description']),
    reciprocal: asString(r['reciprocal']) || undefined,
  }
}

function hydrateVocabularyEntry(raw: unknown): VocabularyEntry {
  const r = asRecord(raw)
  return {
    aliases: asStringArray(r['aliases']),
    entityType: asString(r['entity_type']) || undefined,
    docId: asString(r['doc_id']) || undefined,
  }
}

function hydrateBudget(raw: unknown): KBBudgetConfig {
  const r = asRecord(raw)
  return {
    textDocumentTokens: asNumber(r['text_document_tokens'], DEFAULT_BUDGET.textDocumentTokens),
    imageTokens: asNumber(r['image_tokens'], DEFAULT_BUDGET.imageTokens),
    maxImagesPerFetch: asNumber(r['max_images_per_fetch'], DEFAULT_BUDGET.maxImagesPerFetch),
  }
}

function hydrateCompilerConfig(raw: unknown): KBCompilerModelConfig {
  const r = asRecord(raw)
  return {
    extractionModel: asString(r['extraction_model']) || undefined,
    synthesisModel: asString(r['synthesis_model']) || undefined,
    analysisModel: asString(r['analysis_model']) || undefined,
    visionModel: asString(r['vision_model']) || undefined,
  }
}

// ── Top-level hydration ──────────────────────────────────────────────────────

function hydrateOntology(raw: unknown): { ontology: KBOntology; issues: OntologyValidationIssue[] } {
  const issues: OntologyValidationIssue[] = []
  const r = asRecord(raw)

  // Domain
  const domain = asString(r['domain'])
  if (!domain) {
    issues.push({
      severity: 'error',
      path: 'domain',
      message: 'Required field "domain" is missing or empty',
    })
  }

  // Entity types
  const entityTypesRaw = asRecord(r['entity_types'])
  const entityTypes: Record<string, EntityTypeSchema> = {}
  const knownEntityTypes = new Set(Object.keys(entityTypesRaw))

  if (knownEntityTypes.size === 0) {
    issues.push({
      severity: 'error',
      path: 'entity_types',
      message: 'At least one entity type must be defined',
    })
  }

  for (const [typeName, typeRaw] of Object.entries(entityTypesRaw)) {
    entityTypes[typeName] = hydrateEntityType(typeRaw, typeName, issues)
  }

  // Validate linkable_to references
  for (const [typeName, schema] of Object.entries(entityTypes)) {
    for (const linkedType of schema.linkableTo) {
      if (!knownEntityTypes.has(linkedType)) {
        issues.push({
          severity: 'error',
          path: `entityTypes.${typeName}.linkableTo`,
          message: `References unknown entity type "${linkedType}"`,
        })
      }
    }
  }

  // Relationship types
  const relTypesRaw = Array.isArray(r['relationship_types']) ? r['relationship_types'] : []
  const relationshipTypes: RelationshipType[] = relTypesRaw.map((rel, i) =>
    hydrateRelationshipType(rel, i, knownEntityTypes, issues),
  )

  // Validate reciprocal references
  const relNames = new Set(relationshipTypes.map(r => r.name))
  for (const rel of relationshipTypes) {
    if (rel.reciprocal && !relNames.has(rel.reciprocal)) {
      issues.push({
        severity: 'warning',
        path: `relationshipTypes[${rel.name}].reciprocal`,
        message: `Reciprocal relationship "${rel.reciprocal}" is not defined`,
      })
    }
  }

  // Vocabulary
  const vocabRaw = asRecord(r['vocabulary'])
  const vocabulary: Record<string, VocabularyEntry> = {}
  for (const [term, entryRaw] of Object.entries(vocabRaw)) {
    vocabulary[term.toLowerCase()] = hydrateVocabularyEntry(entryRaw)
  }

  // Budget
  const budget = hydrateBudget(asRecord(r['budget']))

  // Compiler config
  const compiler = hydrateCompilerConfig(asRecord(r['compiler']))

  const ontology: KBOntology = {
    domain,
    entityTypes,
    relationshipTypes,
    vocabulary,
    budget,
    compiler,
  }

  return { ontology, issues }
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a hydrated ontology for internal consistency.
 * Runs additional cross-field checks beyond what hydration catches.
 */
export function validateOntology(ontology: KBOntology): OntologyValidationResult {
  const issues: OntologyValidationIssue[] = []

  // Check that entity_ref fields reference valid entity types
  for (const [typeName, schema] of Object.entries(ontology.entityTypes)) {
    for (const [fieldName, field] of Object.entries(schema.frontmatter.fields)) {
      if (
        (field.type === 'entity_ref' || field.type === 'entity_ref[]') &&
        field.targetEntityType &&
        !ontology.entityTypes[field.targetEntityType]
      ) {
        issues.push({
          severity: 'error',
          path: `entityTypes.${typeName}.frontmatter.fields.${fieldName}.targetEntityType`,
          message: `References unknown entity type "${field.targetEntityType}"`,
        })
      }
    }

    // Check article structure has at least one section
    if (schema.articleStructure.length === 0) {
      issues.push({
        severity: 'warning',
        path: `entityTypes.${typeName}.articleStructure`,
        message: `Entity type "${typeName}" has no article_structure defined. The synthesizer will use generic defaults.`,
      })
    }
  }

  // Check vocabulary entries that have entity types reference valid types
  for (const [term, entry] of Object.entries(ontology.vocabulary)) {
    if (entry.entityType && !ontology.entityTypes[entry.entityType]) {
      issues.push({
        severity: 'error',
        path: `vocabulary.${term}.entityType`,
        message: `Vocabulary entry "${term}" references unknown entity type "${entry.entityType}"`,
      })
    }
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export class OntologyLoader {
  private readonly kbRoot: string

  constructor(kbRoot: string) {
    this.kbRoot = kbRoot
  }

  get ontologyPath(): string {
    return join(this.kbRoot, ONTOLOGY_FILENAME)
  }

  /** Check whether an ontology.yaml exists in the KB root */
  async exists(): Promise<boolean> {
    try {
      await access(this.ontologyPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Load and validate the ontology from disk.
   *
   * @throws if the file doesn't exist or has fatal parse errors
   * @returns The validated ontology and any non-fatal issues
   */
  async load(): Promise<{ ontology: KBOntology; issues: OntologyValidationIssue[] }> {
    let raw: string
    try {
      raw = await readFile(this.ontologyPath, 'utf-8')
    } catch (err) {
      throw new Error(
        `Cannot load ontology: file not found at ${this.ontologyPath}.\n` +
        `Run "kb init" to create a starter ontology.`,
      )
    }

    let parsed: unknown
    try {
      parsed = parseYaml(raw)
    } catch (err) {
      throw new Error(
        `Cannot parse ${ONTOLOGY_FILENAME}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    const { ontology, issues: hydrateIssues } = hydrateOntology(parsed)
    const { issues: validateIssues } = validateOntology(ontology)
    const allIssues = [...hydrateIssues, ...validateIssues]

    const errors = allIssues.filter(i => i.severity === 'error')
    if (errors.length > 0) {
      const lines = errors.map(e => `  [error] ${e.path}: ${e.message}`)
      throw new Error(
        `${ONTOLOGY_FILENAME} has ${errors.length} error(s) that must be fixed before compilation:\n` +
        lines.join('\n'),
      )
    }

    return { ontology, issues: allIssues }
  }

  /** Serialize an ontology object back to YAML and write it to disk */
  async save(ontology: KBOntology): Promise<void> {
    const yaml = serializeOntology(ontology)
    await writeFile(this.ontologyPath, yaml, 'utf-8')
  }
}

// ── YAML serializer ──────────────────────────────────────────────────────────

/**
 * Serialize a KBOntology back to YAML format.
 * Used by `kb init --infer` to write the proposed ontology.
 */
export function serializeOntology(ontology: KBOntology): string {
  const lines: string[] = [
    `# YAAF Knowledge Base Ontology`,
    `# Domain model for: ${ontology.domain}`,
    `# Reviewed and committed by: [your name]`,
    `# Last updated: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `domain: "${ontology.domain}"`,
    ``,
    `# ── Entity Types ──────────────────────────────────────────────────────────`,
    `entity_types:`,
  ]

  for (const [typeName, schema] of Object.entries(ontology.entityTypes)) {
    lines.push(`  ${typeName}:`)
    lines.push(`    description: "${schema.description}"`)
    if (schema.linkableTo.length > 0) {
      lines.push(`    linkable_to:`)
      for (const t of schema.linkableTo) lines.push(`      - ${t}`)
    }
    if (schema.indexable === false) {
      lines.push(`    indexable: false`)
    }
    lines.push(`    frontmatter:`)
    lines.push(`      fields:`)
    for (const [fieldName, field] of Object.entries(schema.frontmatter.fields)) {
      lines.push(`        ${fieldName}:`)
      lines.push(`          description: "${field.description}"`)
      lines.push(`          type: ${field.type}`)
      lines.push(`          required: ${field.required}`)
      if (field.enum) {
        lines.push(`          enum:`)
        for (const v of field.enum) lines.push(`            - ${v}`)
      }
      if (field.targetEntityType) {
        lines.push(`          target_entity_type: ${field.targetEntityType}`)
      }
      if (field.default) {
        lines.push(`          default: "${field.default}"`)
      }
    }
    lines.push(`    article_structure:`)
    for (const section of schema.articleStructure) {
      lines.push(`      - heading: "${section.heading}"`)
      lines.push(`        description: "${section.description}"`)
      lines.push(`        required: ${section.required}`)
    }
    lines.push(``)
  }

  lines.push(`# ── Relationship Types ────────────────────────────────────────────────────`)
  lines.push(`relationship_types:`)
  for (const rel of ontology.relationshipTypes) {
    lines.push(`  - name: ${rel.name}`)
    lines.push(`    from: ${rel.from}`)
    lines.push(`    to: ${rel.to}`)
    lines.push(`    description: "${rel.description}"`)
    if (rel.reciprocal) lines.push(`    reciprocal: ${rel.reciprocal}`)
  }

  lines.push(``)
  lines.push(`# ── Vocabulary ────────────────────────────────────────────────────────────`)
  lines.push(`vocabulary:`)
  for (const [term, entry] of Object.entries(ontology.vocabulary)) {
    lines.push(`  "${term}":`)
    if (entry.entityType) lines.push(`    entity_type: ${entry.entityType}`)
    if (entry.docId) lines.push(`    doc_id: ${entry.docId}`)
    if (entry.aliases.length > 0) {
      lines.push(`    aliases:`)
      for (const alias of entry.aliases) lines.push(`      - "${alias}"`)
    }
  }

  lines.push(``)
  lines.push(`# ── Budget ────────────────────────────────────────────────────────────────`)
  lines.push(`budget:`)
  lines.push(`  text_document_tokens: ${ontology.budget.textDocumentTokens}`)
  lines.push(`  image_tokens: ${ontology.budget.imageTokens}`)
  lines.push(`  max_images_per_fetch: ${ontology.budget.maxImagesPerFetch}`)

  lines.push(``)
  lines.push(`# ── Compiler Model Config ─────────────────────────────────────────────────`)
  lines.push(`compiler:`)
  if (ontology.compiler.extractionModel) {
    lines.push(`  extraction_model: ${ontology.compiler.extractionModel}`)
  }
  if (ontology.compiler.synthesisModel) {
    lines.push(`  synthesis_model: ${ontology.compiler.synthesisModel}`)
  }
  if (ontology.compiler.analysisModel) {
    lines.push(`  analysis_model: ${ontology.compiler.analysisModel}`)
  }
  if (ontology.compiler.visionModel) {
    lines.push(`  vision_model: ${ontology.compiler.visionModel}`)
  }

  return lines.join('\n') + '\n'
}
