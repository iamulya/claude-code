/**
 * Shared Frontmatter Parser
 *
 * Replaces 4 hand-rolled YAML frontmatter parsers with the spec-compliant
 * `yaml` library. This eliminates:
 *   - Block scalar parsing bugs (H1)
 *   - Escape sequence handling gaps (S-1)
 *   - Quote-aware colon splitting complexity (P2-5)
 *   - Copy-pasted parsers drifting out of sync (reader.ts:107)
 *
 * All 4 consumers (ingester/markdown.ts, synthesizer/frontmatter.ts,
 * linter/reader.ts, store/store.ts) now call this single implementation.
 *
 * @module knowledge/utils/frontmatter
 */

import { parse as parseYamlLib } from "yaml";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedFrontmatter {
  /** Parsed key-value pairs (may contain nested objects, arrays, etc.) */
  frontmatter: Record<string, unknown>;
  /** Markdown body after the closing `---` */
  body: string;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Split a markdown document into frontmatter + body, parsing the YAML
 * frontmatter block with the spec-compliant `yaml` library.
 *
 * Handles:
 * - CRLF normalization (Windows Obsidian exports)
 * - Block scalars (`|`, `>`)
 * - All YAML 1.2 escape sequences (`\"`, `\n`, `\xNN`, `\uNNNN`)
 * - Flow mappings, anchors/aliases, nested objects
 * - Inline and block sequences
 * - Prototype pollution prevention (Object.create(null))
 *
 * @param markdown - Raw markdown string, possibly with YAML frontmatter
 * @returns Parsed frontmatter and body. If no frontmatter block is found,
 *   returns `{ frontmatter: {}, body: markdown }`.
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  // CRLF normalization — Windows Obsidian Web Clipper and some LLMs use \r\n
  const normalized = markdown.replace(/\r\n/g, "\n");

  // Match the `---\n...\n---` frontmatter block
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: markdown.trim() };
  }

  const yamlBlock = match[1]!;
  const body = match[2]?.trim() ?? "";

  // Parse with the yaml library (same config as ontology loader)
  let parsed: unknown;
  try {
    parsed = parseYamlLib(yamlBlock, {
      schema: "core",       // YAML 1.2 core schema — no "yes"→true coercion
      maxAliasCount: 100,   // Prevent alias bomb DoS
    });
  } catch {
    // If YAML is malformed, treat it as plain text body (fail-open for ingestion)
    return { frontmatter: {}, body: markdown.trim() };
  }

  // Ensure we got an object (not a scalar or array)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { frontmatter: {}, body: markdown.trim() };
  }

  // Prototype pollution prevention — copy into a null-prototype object
  const safe = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    // Belt-and-suspenders: reject dangerous keys even though Object.create(null)
    // prevents prototype access
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    safe[key] = value;
  }

  return { frontmatter: safe, body };
}

/**
 * Parse a raw YAML string into a Record (for use when the frontmatter
 * block has already been extracted from the markdown).
 *
 * This is the shared replacement for:
 * - `parseFrontmatterYaml()` in synthesizer/frontmatter.ts
 * - `parseSimpleYaml()` in linter/reader.ts
 * - The inline parser in store.ts:700-779
 */
export function parseYamlFrontmatter(yamlBlock: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = parseYamlLib(yamlBlock, {
      schema: "core",
      maxAliasCount: 100,
    });
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const safe = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    safe[key] = value;
  }

  return safe;
}
