/**
 * Frontmatter Generator and Validator
 *
 * Validates LLM-generated frontmatter against the ontology schema and
 * serializes the final frontmatter to YAML for writing to compiled articles.
 *
 * The validation is strict for required fields and lenient for optional ones —
 * the goal is to catch structural problems (wrong enum value, missing required
 * field) while not blocking compilation over minor inconsistencies.
 *
 * Compiler-injected metadata fields are always appended after user/LLM fields:
 * - entity_type: from the ArticlePlan
 * - stub: true if this is a stub article
 * - compiled_at: ISO timestamp
 * - compiled_from: list of source file paths
 * - confidence: from the ArticlePlan
 */

import type { KBOntology, ConceptRegistry } from "../../ontology/index.js";
import type { FrontmatterValidationResult } from "./types.js";
import type { FrontmatterSchema, FrontmatterFieldSchema, FieldType } from "../../ontology/types.js";

// ── YAML frontmatter serializer ───────────────────────────────────────────────

/**
 * Serialize a frontmatter object to YAML block (between `---` delimiters).
 * Handles strings, numbers, booleans, arrays, null, and simple objects.
 * Does NOT handle deeply nested objects or anchors — not needed for frontmatter.
 */
export function serializeFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    lines.push(serializeField(key, value, 0));
  }

  lines.push("---");
  return lines.join("\n");
}

function serializeField(key: string, value: unknown, indent: number): string {
  const pad = " ".repeat(indent);
  const k = key;

  if (typeof value === "boolean") return `${pad}${k}: ${value}`;
  if (typeof value === "number") return `${pad}${k}: ${value}`;
  if (value === null) return `${pad}${k}: null`;

  if (typeof value === "string") {
    // Multi-line strings → block scalar
    if (value.includes("\n")) {
      const indented = value
        .split("\n")
        .map((l) => ` ${pad}${l}`)
        .join("\n");
      return `${pad}${k}: |\n${indented}`;
    }
    // Strings that need quoting
    if (shouldQuote(value)) return `${pad}${k}: "${value.replace(/"/g, '\\"')}"`;
    return `${pad}${k}: ${value}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}${k}: []`;
    const items = value.map((item) => {
      if (typeof item === "string") {
        return ` ${pad}- ${shouldQuote(item) ? `"${item.replace(/"/g, '\\"')}"` : item}`;
      }
      return ` ${pad}- ${String(item)}`;
    });
    return [`${pad}${k}:`, ...items].join("\n");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}${k}: {}`;
    const subLines = entries.map(([sk, sv]) => serializeField(sk, sv, indent + 2));
    return [`${pad}${k}:`, ...subLines].join("\n");
  }

  return `${pad}${k}: ${String(value)}`;
}

function shouldQuote(s: string): boolean {
  // Quote if it starts with special YAML chars, looks like a number,
  // is a boolean literal, contains problematic chars, or is empty
  if (s === "") return true;
  if (/^[-:#{}&*!,[\]|>'"%@`]/.test(s)) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(s)) return true;
  if (/^\d/.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (s.includes(": ") || s.includes(" #")) return true;
  return false;
}

// ── Frontmatter validator ─────────────────────────────────────────────────────

/**
 * Validate LLM-generated frontmatter values against the ontology schema
 * for a given entity type.
 *
 * Validation rules per field type:
 * - string / url: coerce to string
 * - string[] / url[]: coerce to string array
 * - number: coerce from string if parseable
 * - boolean: coerce from 'true'/'false' string
 * - date: accept as string, warn if not ISO format
 * - enum / enum[]: validate value(s) against allowed list
 * - entity_ref: validate docId exists in registry
 * - entity_ref[]: validate each docId
 */
export function validateFrontmatter(
  rawValues: Record<string, unknown>,
  schema: FrontmatterSchema,
  entityType: string,
  registry: ConceptRegistry,
  ontology: KBOntology,
): FrontmatterValidationResult {
  const errors: FrontmatterValidationResult["errors"] = [];
  const warnings: FrontmatterValidationResult["warnings"] = [];
  const coerced: Record<string, unknown> = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
    const rawValue = rawValues[fieldName];
    const path = `${entityType}.${fieldName}`;

    // Check required fields
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      if (fieldSchema.required) {
        // Check for default
        if (fieldSchema.default !== undefined) {
          coerced[fieldName] = fieldSchema.default;
          warnings.push({
            field: path,
            message: `Missing required field — using default: "${fieldSchema.default}"`,
          });
        } else {
          errors.push({ field: path, message: `Required field "${fieldName}" is missing` });
        }
      }
      continue;
    }

    // Coerce and validate by type
    const result = coerceFieldValue(
      rawValue,
      fieldSchema,
      fieldName,
      path,
      registry,
      errors,
      warnings,
    );
    if (result !== undefined) {
      coerced[fieldName] = result;
    }
  }

  // Include extra fields from rawValues that aren't in the schema (pass through)
  for (const [key, value] of Object.entries(rawValues)) {
    if (!(key in coerced) && !(key in schema.fields)) {
      coerced[key] = value;
    }
  }

  return {
    valid: errors.length === 0,
    values: coerced,
    errors,
    warnings,
  };
}

function coerceFieldValue(
  raw: unknown,
  schema: FrontmatterFieldSchema,
  fieldName: string,
  path: string,
  registry: ConceptRegistry,
  errors: FrontmatterValidationResult["errors"],
  warnings: FrontmatterValidationResult["warnings"],
): unknown {
  switch (schema.type as FieldType) {
    case "string":
    case "url":
      return String(raw);

    case "string[]":
    case "url[]":
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === "string") {
        // Handle comma-separated or JSON array strings
        if (raw.startsWith("[")) {
          try {
            return JSON.parse(raw);
          } catch {
            /* fall through */
          }
        }
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [String(raw)];

    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
      if (Number.isNaN(n)) {
        errors.push({ field: path, message: `Expected number, got "${raw}"` });
        return undefined;
      }
      return n;
    }

    case "boolean": {
      if (typeof raw === "boolean") return raw;
      const s = String(raw).toLowerCase();
      if (s === "true" || s === "yes") return true;
      if (s === "false" || s === "no") return false;
      errors.push({ field: path, message: `Expected boolean, got "${raw}"` });
      return undefined;
    }

    case "date":
      // Accept as-is, warn if not ISO format
      if (typeof raw === "string" && !/^\d{4}/.test(raw)) {
        warnings.push({
          field: path,
          message: `Date field "${fieldName}" may not be in ISO format: "${raw}"`,
        });
      }
      return String(raw);

    case "enum": {
      const allowed = schema.enum ?? [];
      const val = String(raw);
      if (allowed.length > 0 && !allowed.includes(val)) {
        errors.push({
          field: path,
          message: `Value "${val}" not in allowed enum: [${allowed.join(", ")}]`,
        });
        return undefined;
      }
      return val;
    }

    case "enum[]": {
      const allowed = schema.enum ?? [];
      const vals = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      const invalid = allowed.length > 0 ? vals.filter((v) => !allowed.includes(v)) : [];
      if (invalid.length > 0) {
        errors.push({
          field: path,
          message: `Values [${invalid.join(", ")}] not in allowed enum: [${allowed.join(", ")}]`,
        });
        return vals.filter((v) => allowed.includes(v)); // Keep valid ones
      }
      return vals;
    }

    case "entity_ref": {
      const docId = String(raw);
      if (!registry.has(docId)) {
        warnings.push({
          field: path,
          message: `entity_ref "${docId}" not found in registry — may be a new article`,
        });
      }
      return docId;
    }

    case "entity_ref[]": {
      const docIds = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      for (const id of docIds) {
        if (!registry.has(id)) {
          warnings.push({
            field: path,
            message: `entity_ref "${id}" not found in registry`,
          });
        }
      }
      return docIds;
    }

    default:
      return raw;
  }
}

// ── Compiler metadata injection ────────────────────────────────────────────────

/**
 * Build the complete frontmatter for a compiled article.
 *
 * Merges (in priority order):
 * 1. LLM-generated + validated values
 * 2. Compiler-suggested frontmatter from the ExtractorPlan
 * 3. Compiler-injected metadata (entity_type, compiled_at, etc.)
 *
 * Compiler-injected metadata always wins for its own keys to
 * ensure structural consistency.
 */
export function buildCompleteFrontmatter(
  validatedValues: Record<string, unknown>,
  suggestedFrontmatter: Record<string, unknown>,
  compilerMeta: {
    entityType: string;
    canonicalTitle: string;
    docId: string;
    sourcePaths: string[];
    confidence: number;
    isStub: boolean;
    compiledAt?: string;
  },
): Record<string, unknown> {
  const now = compilerMeta.compiledAt ?? new Date().toISOString();

  return {
    // User/LLM fields first (can be overridden by compiler meta for key fields)
    ...suggestedFrontmatter,
    ...validatedValues,
    // Compiler-injected fields always present (enforce structure)
    title: compilerMeta.canonicalTitle,
    entity_type: compilerMeta.entityType,
    stub: compilerMeta.isStub,
    compiled_at: now,
    compiled_from: compilerMeta.sourcePaths.map((p) => {
      // Store relative-style paths for portability
      return p.replace(/\\/g, "/");
    }),
    confidence: Math.round(compilerMeta.confidence * 100) / 100,
  };
}

// ── Article parser ────────────────────────────────────────────────────────────

import type { ParsedArticle } from "./types.js";

/**
 * Parse a raw markdown string from the LLM into frontmatter + body.
 * The LLM is prompted to produce `---\nfrontmatter\n---\nbody` format.
 *
 * If the LLM omits frontmatter (despite being asked), we produce an empty
 * frontmatter block rather than throwing.
 */
export function parseArticleOutput(raw: string): ParsedArticle {
  // Strip any markdown code fences the LLM may have wrapped the output in
  let cleaned = raw.trim();
  if (cleaned.startsWith("```markdown")) {
    cleaned = cleaned.slice("```markdown".length);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
  }

  // Check for YAML frontmatter block
  // G1: use \r?\n throughout to handle both LF and CRLF responses from LLMs.
  // The original /^---\n/ did not match Windows-style \r\n line endings, causing
  // the entire frontmatter to be silently discarded on every CRLF LLM response.
  const fmMatch = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!fmMatch) {
    // No frontmatter — return empty frontmatter + whole text as body
    return { frontmatter: {}, body: cleaned, raw: cleaned };
  }

  const frontmatter = parseFrontmatterYaml(fmMatch[1]!);
  const body = fmMatch[2]?.trim() ?? "";

  return {
    frontmatter,
    body,
    raw: cleaned,
  };
}

/**
 * Minimal YAML frontmatter key-value parser.
 * Handles the flat key: value pairs typical in article frontmatter.
 * Does not handle anchors, multi-document, or complex nested structures.
 */
function parseFrontmatterYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (!key) {
      i++;
      continue;
    }

    // Empty value — check if next lines define a block scalar or list
    if (rest === "" || rest === "|") {
      i++;
      // G3: handle block scalar (|) — multi-line indented text.
      // The original code treated block scalars the same as empty values: it only
      // looked for list-item lines (dash-prefixed) and returned null if none were found.
      // Any multi-line `description: |\n  text` field was silently dropped → null.
      if (rest === "|") {
        const blockLines: string[] = [];
        // Determine the indent level of the block from the first non-empty line
        const firstBlockLine = lines[i];
        const blockIndent = firstBlockLine ? firstBlockLine.match(/^(\s*)/)?.[1]?.length ?? 0 : 0;
        while (i < lines.length) {
          const bl = lines[i]!;
          // Stop when indentation is less than the block's indent (back to parent level)
          if (bl.trim() !== "" && (bl.match(/^(\s*)/)?.[1]?.length ?? 0) < blockIndent) break;
          blockLines.push(bl.slice(blockIndent)); // strip leading indent
          i++;
        }
        // Join preserving newlines (strip trailing newline per YAML block scalar semantics)
        result[key] = blockLines.join("\n").replace(/\n+$/, "");
        continue;
      }
      // Empty value — check if next lines define a list
      const listItems: string[] = [];
      while (i < lines.length && lines[i]!.match(/^\s+-\s+/)) {
        const item = lines[i]!.replace(/^\s+-\s+/, "").trim();
        listItems.push(stripStringQuotes(item));
        i++;
      }
      result[key] = listItems.length > 0 ? listItems : null;
      continue;
    }

    // Inline list: [a, b, c]
    if (rest.startsWith("[") && rest.endsWith("]")) {
      try {
        result[key] = JSON.parse(rest.replace(/'/g, '"'));
      } catch {
        const items = rest
          .slice(1, -1)
          .split(",")
          .map((s) => stripStringQuotes(s.trim()));
        result[key] = items;
      }
      i++;
      continue;
    }

    // Scalar value
    result[key] = parseScalarValue(rest);
    i++;
  }

  return result;
}

function parseScalarValue(raw: string): unknown {
  const stripped = stripStringQuotes(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~" || raw === "") return null;
  const n = Number(raw);
  if (!Number.isNaN(n) && raw !== "") return n;
  return stripped;
}

function stripStringQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
