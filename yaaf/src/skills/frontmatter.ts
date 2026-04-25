/**
 * Skills — YAML Frontmatter Parser.
 *
 * Parses YAML frontmatter from SKILL.md files. Supports:
 * - Standard YAML key-value pairs
 * - Arrays (both flow `[a, b]` and block `- item` syntax)
 * - Booleans, numbers, and strings (with optional quotes)
 * - Auto-quoting fallback for problematic values
 * - Graceful degradation on parse errors
 *
 * Zero external dependencies — implements a subset of YAML sufficient
 * for skill frontmatter. Does NOT support nested objects, anchors,
 * multi-document streams, or other advanced YAML features.
 *
 * @module skills/frontmatter
 */

import type { SkillFrontmatter, Skill, SkillSource } from "./types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Maximum individual skill file size (bytes).
 * Files exceeding this limit are silently truncated at the
 * instructions level. A 256 KB skill is already an absurdly large
 * system-prompt injection; anything larger is almost certainly a
 * mistake or attack.
 */
export const MAX_SKILL_BYTES = 256 * 1024;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Coerce a YAML value to a string array, handling all YAML scalar types.
 *
 * YAML can parse fields like `allowed-tools: true` as boolean,
 * `allowed-tools: 42` as number, `allowed-tools: "Bash(*)"` as string,
 * or `allowed-tools: ["Bash(*)"]` as an array. All must produce a string[].
 *
 * Returns undefined if the value is null/undefined (field not set).
 */
function coerceToStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  // boolean, number, or other YAML scalar → coerce to string
  return [String(value)];
}

// ── Frontmatter extraction ───────────────────────────────────────────────────

/**
 * Result of parsing a skill file.
 */
export type ParsedSkill = {
  /** Parsed frontmatter fields. */
  meta: Partial<SkillFrontmatter>;
  /** Instruction content after the frontmatter block. */
  body: string;
};

/**
 * Extract frontmatter block from markdown content.
 * Returns the raw YAML string and the remaining body.
 */
function extractFrontmatterBlock(content: string): { yaml: string; body: string } | null {
  // Must start with --- (optionally preceded by whitespace/BOM)
  const trimmed = content.replace(/^\uFEFF/, ""); // strip BOM
  const match = trimmed.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!match) {
    // Also try empty frontmatter: ---\n---
    const emptyMatch = trimmed.match(/^---[ \t]*\n---[ \t]*(?:\n|$)([\s\S]*)$/);
    if (!emptyMatch) return null;
    return { yaml: "", body: emptyMatch[1]!.trim() };
  }
  return { yaml: match[1]!, body: match[2]!.trim() };
}

// ── YAML subset parser ───────────────────────────────────────────────────────

/**
 * Parse a YAML-subset string into a key-value map.
 *
 * Supports:
 * - `key: value`
 * - `key: "quoted value"` / `key: 'quoted value'`
 * - `key: true` / `key: false` (booleans)
 * - `key: 42` (numbers)
 * - `key: [a, b, c]` (flow arrays)
 * - Block arrays:
 *   ```
 *   key:
 *     - item1
 *     - item2
 *   ```
 */
function parseYamlSubset(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    i++;

    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    // Key-value line: `key: value` or `key:`
    const kvMatch = line.match(/^(\S[\w-]*):\s*(.*?)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1]!;
    const rawValue = kvMatch[2]!.trim();

    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      // Check for block array (indented `- item` lines)
      const items: string[] = [];
      while (i < lines.length) {
        const nextLine = lines[i]!;
        const itemMatch = nextLine.match(/^\s+-\s+(.+)$/);
        if (itemMatch) {
          items.push(unquote(itemMatch[1]!.trim()));
          i++;
        } else if (nextLine.trim() === "") {
          i++; // skip blank lines within block
        } else {
          break; // end of block
        }
      }
      if (items.length > 0) {
        result[key] = items;
      }
    } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      // Flow array: [a, b, c]
      const inner = rawValue.slice(1, -1);
      result[key] = inner
        .split(",")
        .map((s) => unquote(s.trim()))
        .filter((s) => s.length > 0);
    } else {
      // Scalar value
      result[key] = parseScalar(rawValue);
    }
  }

  return result;
}

/** Remove surrounding quotes from a string. */
function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Parse a scalar YAML value. */
function parseScalar(raw: string): string | boolean | number {
  const s = unquote(raw);

  // Booleans
  if (s === "true" || s === "True" || s === "TRUE") return true;
  if (s === "false" || s === "False" || s === "FALSE") return false;

  // Numbers (only if the entire value is numeric)
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }

  return s;
}

// ── Auto-quoting fallback ─────────────────────────────────────────────────────

/**
 * When a YAML value contains special characters (`:`, `{`, `}`, `[`, `]`, etc.)
 * that cause parsing to fail, wrap the value in quotes and retry.
 *
 * This handles common user mistakes like:
 * ```yaml
 * description: Fix issues with: colons
 * when_to_use: Use when user says "help"
 * ```
 */
function quoteProblematicValues(yaml: string): string {
  return yaml
    .split("\n")
    .map((line) => {
      const kvMatch = line.match(/^(\S[\w-]*):\s+(.+)$/);
      if (!kvMatch) return line;

      const [, key, value] = kvMatch;
      const trimmed = value!.trim();

      // Already quoted or an array — leave alone
      if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith("["))
        return line;

      // Contains YAML-special characters that would break parsing
      if (/[:{}\[\]#|>&*!%@`]/.test(trimmed)) {
        const escaped = trimmed.replace(/"/g, '\\"');
        return `${key}: "${escaped}"`;
      }

      return line;
    })
    .join("\n");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a skill file's content into frontmatter metadata and instruction body.
 *
 * Strategy:
 * 1. Try parsing frontmatter as-is
 * 2. On failure, auto-quote problematic values and retry
 * 3. On second failure, return empty frontmatter and use entire content as body
 *
 * @param content - Raw markdown content of the skill file
 * @param sourcePath - Optional file path for error reporting
 */
export function parseFrontmatter(content: string, sourcePath?: string): ParsedSkill {
  const block = extractFrontmatterBlock(content);
  if (!block) {
    return { meta: {}, body: content.trim() };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseYamlSubset(block.yaml);
  } catch {
    // Retry with auto-quoting
    try {
      parsed = parseYamlSubset(quoteProblematicValues(block.yaml));
    } catch {
      // Give up — return empty frontmatter
      if (sourcePath) {
        console.warn(`[yaaf/skills] Failed to parse frontmatter in ${sourcePath}`);
      }
      return { meta: {}, body: block.body };
    }
  }

  return {
    meta: mapToFrontmatter(parsed),
    body: block.body,
  };
}

/**
 * Map a raw parsed YAML object to a typed SkillFrontmatter.
 * Handles type coercion, field name normalization, and validation.
 */
function mapToFrontmatter(raw: Record<string, unknown>): Partial<SkillFrontmatter> {
  const meta: Partial<SkillFrontmatter> = {};

  // String fields
  if (typeof raw.name === "string") meta.name = raw.name;
  if (typeof raw.description === "string") meta.description = raw.description;
  if (typeof raw.version === "string") meta.version = raw.version;
  else if (typeof raw.version === "number") meta.version = String(raw.version);
  if (typeof raw.when_to_use === "string") meta.when_to_use = raw.when_to_use;
  if (typeof raw["argument-hint"] === "string") meta["argument-hint"] = raw["argument-hint"];
  if (typeof raw.model === "string") meta.model = raw.model;
  if (typeof raw.agent === "string") meta.agent = raw.agent;

  // Boolean fields
  if (raw.always != null) meta.always = raw.always !== false && raw.always !== "false" && raw.always !== 0;
  if (raw["user-invocable"] != null)
    meta["user-invocable"] =
      raw["user-invocable"] !== false && raw["user-invocable"] !== "false";
  if (raw["disable-model-invocation"] != null)
    meta["disable-model-invocation"] =
      raw["disable-model-invocation"] === true || raw["disable-model-invocation"] === "true";

  // Enum fields
  if (raw.effort === "low" || raw.effort === "medium" || raw.effort === "high" || raw.effort === "max")
    meta.effort = raw.effort;
  if (raw.context === "inline" || raw.context === "fork") meta.context = raw.context;
  if (raw.shell === "bash" || raw.shell === "powershell") meta.shell = raw.shell;

  // Array fields (with robust type coercion)
  // SECURITY: allowed-tools as a bare string, boolean, or number MUST be coerced to an array,
  // otherwise it silently drops → fail-open → unrestricted tool access.
  // YAML parses `allowed-tools: true` as boolean, `allowed-tools: 42` as number.
  if (Array.isArray(raw.tags)) meta.tags = raw.tags.map(String);

  // SECURITY: These use conditional assignment to avoid creating
  // spurious keys — `"allowed-tools" in skill` should be false when unset.
  const allowedTools = coerceToStringArray(raw["allowed-tools"]);
  if (allowedTools) meta["allowed-tools"] = allowedTools;
  const args = coerceToStringArray(raw.arguments);
  if (args) meta.arguments = args;
  const paths = coerceToStringArray(raw.paths);
  if (paths) meta.paths = paths;

  // Comma-separated string fallback for tags
  if (typeof raw.tags === "string") {
    meta.tags = (raw.tags as string).split(",").map((t) => t.trim());
  }

  return meta;
}

/**
 * Build a complete Skill from parsed frontmatter, body, and metadata.
 *
 * - Caps instructions at MAX_SKILL_BYTES
 * - Derives name from filename if not in frontmatter
 * - Sets `always: true` if not specified
 */
export function buildSkillFromParsed(
  parsed: ParsedSkill,
  opts: {
    filePath?: string;
    skillDir?: string;
    source: SkillSource;
    defaultName?: string;
  },
): Skill {
  const { meta, body } = parsed;

  // Cap oversized instructions
  const instructions =
    Buffer.byteLength(body, "utf8") > MAX_SKILL_BYTES
      ? Buffer.from(body, "utf8").subarray(0, MAX_SKILL_BYTES).toString("utf8") +
        "\n\n[...skill truncated: exceeded 256 KB limit]"
      : body;

  return {
    name: meta.name ?? opts.defaultName ?? `skill-${Date.now()}`,
    description: meta.description,
    version: meta.version,
    always: meta.always ?? true,
    tags: meta.tags ?? [],
    // Spread remaining frontmatter fields
    ...meta,
    // Override with computed values
    instructions,
    filePath: opts.filePath,
    skillDir: opts.skillDir,
    source: opts.source,
  };
}
