/**
 * Concept Registry
 *
 * A live, in-memory index of every entity that has a compiled KB article.
 * Built by scanning the compiled/ directory at startup and updated on every
 * compilation run.
 *
 * The registry is the "known universe" that the compiler operates against.
 * Without it:
 * - The Concept Extractor can't know which entities already have articles
 * - The Knowledge Synthesizer can't avoid creating duplicates
 * - The Backlink Resolver can't resolve [[wikilinks]] to actual docIds
 * - The Linter can't detect orphaned or missing articles
 */

import { readFile, readdir, stat } from 'fs/promises'
import { join, relative, extname } from 'path'
import type { ConceptRegistry, ConceptRegistryEntry, KBOntology } from './types.js'
import type { AliasIndex } from './vocabulary.js'
import { buildAliasIndex } from './vocabulary.js'

// ── Frontmatter parsing (minimal, local) ─────────────────────────────────────

function extractFrontmatterField(raw: string, field: string): string | undefined {
  const pattern = new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?$`, 'm')
  const match = raw.match(pattern)
  return match?.[1]?.trim()
}

function extractFrontmatterBool(raw: string, field: string): boolean {
  const val = extractFrontmatterField(raw, field)
  return val === 'true'
}

// ── Registry builder ─────────────────────────────────────────────────────────

/**
 * Scan a compiled/ directory recursively and build the concept registry.
 *
 * Each `.md` file in compiled/ is expected to have YAML frontmatter with at least:
 *   - `title:` — canonical article title
 *   - `entity_type:` — must match a type in the ontology
 *
 * Files missing these fields are skipped with a warning.
 *
 * @param compiledDir - Absolute path to the compiled/ directory
 * @param ontology - The loaded ontology (used to validate entity types)
 * @returns The populated registry and any issues found during scanning
 */
export async function buildConceptRegistry(
  compiledDir: string,
  ontology: KBOntology,
): Promise<{ registry: ConceptRegistry; warnings: string[] }> {
  const registry: ConceptRegistry = new Map()
  const warnings: string[] = []
  const aliasIndex = buildAliasIndex(ontology)

  async function scanDir(dir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return // Directory doesn't exist yet — OK on first run
    }

    await Promise.all(
      entries.map(async (entryName: string) => {
        const fullPath = join(dir, entryName)
        let entryStats: Awaited<ReturnType<typeof stat>>
        try {
          entryStats = await stat(fullPath)
        } catch {
          return
        }

        if (entryStats.isDirectory()) {
          await scanDir(fullPath)
        } else if (entryStats.isFile() && extname(entryName) === '.md') {
          const filePath = fullPath
          const docId = relative(compiledDir, filePath)
            .replace(/\\/g, '/')  // normalize to forward slashes on Windows
            .replace(/\.md$/, '')

          try {
            const [raw] = await Promise.all([
              readFile(filePath, 'utf-8'),
            ])
            const fileStats = entryStats

            const title = extractFrontmatterField(raw, 'title')
            const entityType = extractFrontmatterField(raw, 'entity_type')
            const isStub = extractFrontmatterBool(raw, 'stub')

            if (!title) {
              warnings.push(`${docId}: missing frontmatter field "title" — skipped`)
              return
            }
            if (!entityType) {
              warnings.push(`${docId}: missing frontmatter field "entity_type" — skipped`)
              return
            }
            if (!ontology.entityTypes[entityType]) {
              warnings.push(
                `${docId}: entity_type "${entityType}" not in ontology — skipped`,
              )
              return
            }

            // Build alias list: canonical title + vocabulary aliases for this doc
            const aliases: string[] = [title.toLowerCase()]
            for (const [canonical, entry] of Object.entries(ontology.vocabulary)) {
              if (entry.docId === docId) {
                aliases.push(canonical)
                for (const alias of entry.aliases) {
                  aliases.push(alias.toLowerCase())
                }
              }
            }
            // Deduplicate
            const uniqueAliases = [...new Set(aliases)]

            registry.set(docId, {
              docId,
              canonicalTitle: title,
              entityType,
              aliases: uniqueAliases,
              compiledAt: fileStats.mtimeMs,
              isStub,
            })
          } catch (err) {
            warnings.push(`${docId}: failed to read — ${err instanceof Error ? err.message : String(err)}`)
          }
        }
      }),
    )
  }


  await scanDir(compiledDir)
  return { registry, warnings }
}

// ── Registry lookup ───────────────────────────────────────────────────────────

/**
 * Find a concept registry entry by wikilink target text.
 * Matching priority:
 * 1. Exact docId match (e.g., "concepts/attention-mechanism")
 * 2. Canonical title match (case-insensitive)
 * 3. Alias match (case-insensitive)
 *
 * Returns the first matching entry, or undefined if not found.
 */
export function findByWikilink(
  target: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry | undefined {
  const lower = target.toLowerCase().trim()

  // 1. Exact docId
  if (registry.has(lower)) return registry.get(lower)

  // 2. Canonical title + alias scan
  for (const entry of registry.values()) {
    if (entry.canonicalTitle.toLowerCase() === lower) return entry
    if (entry.aliases.some(a => a.toLowerCase() === lower)) return entry
  }

  return undefined
}

/**
 * Find all registry entries of a given entity type.
 */
export function findByEntityType(
  entityType: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry[] {
  return Array.from(registry.values()).filter(e => e.entityType === entityType)
}

/**
 * Build a reverse alias lookup: lowercase alias → docId.
 * Used by the Backlink Resolver for fast wikilink → docId mapping.
 */
export function buildDocIdAliasMap(registry: ConceptRegistry): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of registry.values()) {
    for (const alias of entry.aliases) {
      const lower = alias.toLowerCase()
      if (!map.has(lower)) {
        map.set(lower, entry.docId)
      }
    }
    // Also index by canonical title
    map.set(entry.canonicalTitle.toLowerCase(), entry.docId)
  }
  return map
}

// ── Registry mutation ────────────────────────────────────────────────────────

/**
 * Add or update a single entry in the registry.
 * Called after each compilation run to keep the registry current.
 */
export function upsertRegistryEntry(
  registry: ConceptRegistry,
  entry: ConceptRegistryEntry,
): void {
  registry.set(entry.docId, entry)
}

/**
 * Remove an entry from the registry.
 * Called when a compiled article is deleted.
 */
export function removeRegistryEntry(
  registry: ConceptRegistry,
  docId: string,
): boolean {
  return registry.delete(docId)
}

/**
 * Serialize the registry to a compact JSON string for caching.
 * Stored as `.kb-registry.json` in the KB root to avoid full rescan on startup.
 */
export function serializeRegistry(registry: ConceptRegistry): string {
  return JSON.stringify(
    Array.from(registry.entries()),
    null,
    2,
  )
}

/**
 * Deserialize a cached registry from JSON.
 */
export function deserializeRegistry(json: string): ConceptRegistry {
  const entries: [string, ConceptRegistryEntry][] = JSON.parse(json)
  return new Map(entries)
}
