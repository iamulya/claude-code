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

import { readFile, writeFile, access } from "fs/promises";
import { join } from "path";
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
} from "./types.js";

// ── Constants ────────────────────────────────────────────────────────────────

export const ONTOLOGY_FILENAME = "ontology.yaml";
export const KB_CONFIG_FILENAME = "kb.config.yaml";

const VALID_FIELD_TYPES: FieldType[] = [
  "string",
  "string[]",
  "number",
  "boolean",
  "url",
  "url[]",
  "enum",
  "enum[]",
  "entity_ref",
  "entity_ref[]",
  "date",
];

const DEFAULT_BUDGET: KBBudgetConfig = {
  textDocumentTokens: 4_096,
  imageTokens: 1_200,
  maxImagesPerFetch: 3,
};

// ── Minimal YAML parser (hardened) ─────────────────────────────────────────

/**
 * Pre-pass: collapse block scalar indicators (`|` and `>`) into single-line
 * quoted values so the main tokenizer (which is line-by-line) doesn't need
 * to handle multi-line values.
 *
 * Example input:
 *   description: |
 *     Line one.
 *     Line two.
 * Output:
 *   description: "Line one. Line two."
 */
function collapseBlockScalars(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trimEnd();
    // Detect block scalar: `key: |` or `key: >`
    const blockMatch = trimmed.match(/^([ \t]*\S[^:]*:\s*)(\||>)\s*$/);
    if (blockMatch) {
      // P1-2: baseIndent = leading whitespace of the KEY line (not the full match group).
      // blockMatch[1] includes the key text itself, so its length != key indentation.
      const baseIndent = line.length - line.trimStart().length;
      const isFolded = blockMatch[2] === ">";
      const bodyLines: string[] = [];
      i++;
      // Collect subsequent lines that are more indented than the key
      while (i < lines.length) {
        const bodyLine = lines[i]!;
        const bodyIndent = bodyLine.length - bodyLine.trimStart().length;
        if (bodyLine.trim() === "" || bodyIndent > baseIndent) {
          bodyLines.push(bodyLine.trimStart());
          i++;
        } else {
          break;
        }
      }
      // P2-5: literal scalars (|) preserve internal newlines.
      // We flatten to single-line by joining with space (both folded and literal
      // become single-line YAML values when quoted — newlines are collapsed to spaces).
      const joined = isFolded
        ? bodyLines.join(" ").trim()          // folded (>): lines already joined with space
        : bodyLines.join("\n").trim();        // literal (|): newlines preserved, then flattened below
      // Flatten newlines to space for embedding in a double-quoted single-line YAML value
      const flattened = joined.replace(/\n/g, " ");
      // Rewrite as a double-quoted single-line value (escape inner double-quotes)
      const keyPart = trimmed.slice(0, trimmed.lastIndexOf(blockMatch[2]!));
      out.push(`${keyPart}"${flattened.replace(/"/g, "'")}"`);
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

/**
 * Parses the minimal YAML subset used in ontology.yaml.
 *
 * Handles:
 *  - Block mappings (key: value)
 *  - Block sequences (- item)
 *  - Single-quoted and double-quoted strings (with escape sequences)
 *  - Flow sequences [a, b, c]      (Bug 3 fix)
 *  - Block scalars | and >         (Bug 4 fix, via collapseBlockScalars)
 *  - Strings, numbers, booleans, null
 *  - Inline comments outside quotes (Bug 2 fix)
 *  - Escaped quotes in double-quoted strings (W-5 fix)
 *
 * No longer mis-parses:
 *  - description: "URL: https://foo.com"  (Bug 1 fix: quote-aware colon split)
 *  - description: "hex #ff0000"           (Bug 2 fix: quote-aware comment strip)
 *  - description: "He said \"hello\""     (W-5 fix: escaped quote tracking)
 *  - Tab indentation throws clearly       (Bug 5 fix)
 *
 * Does NOT handle:
 *  - YAML anchors/aliases (&anchor, *alias)
 *  - Multiple documents (---)
 *  - Flow mappings {key: value}
 *  - \xNN and \uNNNN hex escapes
 */
function parseYaml(raw: string): unknown {
  // Bug 4 fix: collapse block scalars before tokenizing
  raw = collapseBlockScalars(raw);

  const lines = raw
    .split("\n")
    .map((line, i) => ({ raw: line, num: i + 1 }))
    .filter((l) => {
      const trimmed = l.raw.trimStart();
      return trimmed !== "" && !trimmed.startsWith("#");
    });

  // ── Quote-aware helpers ────────────────────────────────────────────────────

  /**
   * Find the index of `needle` in `s`, but ONLY when outside of single/double quotes.
   * Returns -1 if not found outside quotes.
   *
   * W-5 fix: properly handles escaped quotes:
   *   - Double-quoted: backslash-escaped quotes (\" ) don't toggle state
   *   - Single-quoted: doubled single quotes ('')  don't toggle state
   */
  function indexOutsideQuotes(s: string, needle: string): number {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i <= s.length - needle.length; i++) {
      const ch = s[i]!;
      // W-5: Skip escaped quotes inside double-quoted strings
      if (inDouble && ch === "\\" && i + 1 < s.length) {
        i++; // skip the escaped character entirely
        continue;
      }
      // W-5: Skip doubled single quotes ('') inside single-quoted strings
      if (inSingle && ch === "'" && s[i + 1] === "'") {
        i++; // skip the second quote
        continue;
      }
      if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
      if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
      if (!inSingle && !inDouble && s.startsWith(needle, i)) return i;
    }
    return -1;
  }

  /** Strip a trailing inline comment that appears outside of quotes. */
  function stripComment(s: string): string {
    const idx = indexOutsideQuotes(s, " #");
    return idx > 0 ? s.slice(0, idx).trim() : s.trim();
  }

  /**
   * Remove surrounding matching single or double quotes from a string.
   *
   * P2-2: Full YAML 1.1 escape sequence support.
   *
   * Double-quoted strings process escape sequences:
   *   \n, \t, \r, \\, \", \0, \a (bell), \b (backspace),
   *   \e (escape), \v, \/, \  (space), \_ (NBSP)
   *
   * Single-quoted strings only escape '' → ' (YAML spec).
   *
   * Deliberately omits \xNN and \uNNNN hex escapes — ontology files
   * don't use them, and supporting them requires a more complex parser.
   * Unknown escape sequences in double-quoted strings are preserved
   * as literal backslash+char (safe fallback).
   */
  function unquote(s: string): string {
    if (s.length >= 2) {
      const open = s[0];
      const close = s[s.length - 1];
      if (open === '"' && close === '"') {
        // Double-quoted: process escape sequences
        return s.slice(1, -1).replace(/\\(.)/g, (_, ch: string) => {
          switch (ch) {
            case 'n': return '\n';
            case 't': return '\t';
            case 'r': return '\r';
            case '\\': return '\\';
            case '"': return '"';
            case '0': return '\0';
            case 'a': return '\x07'; // bell
            case 'b': return '\b';
            case 'e': return '\x1B'; // escape
            case 'v': return '\v';
            case '/': return '/';
            case ' ': return ' ';
            case '_': return '\xA0'; // non-breaking space
            default: return '\\' + ch; // unknown escape: preserve literal
          }
        });
      }
      if (open === "'" && close === "'") {
        // Single-quoted: only escape is '' → ' (YAML spec)
        return s.slice(1, -1).replace(/''/g, "'");
      }
    }
    return s;
  }

  // Parse into an intermediate token stream
  interface YamlLine {
    indent: number;
    key?: string;
    value?: string;
    isSeqItem: boolean;
    num: number;
  }

  const tokens: YamlLine[] = lines.map((l) => {
    const rawLine = l.raw;

    // Bug 5 fix: reject tab-indented lines immediately with a clear error
    const leadingWhitespace = rawLine.match(/^([ \t]*)/)?.[1] ?? "";
    if (leadingWhitespace.includes("\t")) {
      throw new Error(
        `YAML parse error on line ${l.num}: Tab characters are not allowed in YAML indentation. ` +
        `Replace tabs with spaces.`,
      );
    }

    const indent = rawLine.length - rawLine.trimStart().length;
    const trimmed = rawLine.trimStart();
    const isSeqItem = trimmed.startsWith("- ") || trimmed === "-";
    // W-6: Clearer sequence item content extraction
    // Bare "-" (no value) → slice 1 to get empty string
    // "- value" → slice 2 to skip "- " prefix
    const content = isSeqItem ? trimmed.slice(trimmed === "-" ? 1 : 2) : trimmed;

    // Detect quoted key-only: "key": or 'key':
    const quotedKeyOnlyMatch = !isSeqItem
      ? (content.match(/^"([^"]+)":\s*$/) ?? content.match(/^'([^']+)':\s*$/))
      : null;
    const isKeyOnly =
      !quotedKeyOnlyMatch &&
      content.endsWith(":") &&
      !content.startsWith('"') &&
      !content.startsWith("'");

    let key: string | undefined;
    let value: string | undefined;

    if (quotedKeyOnlyMatch) {
      key = quotedKeyOnlyMatch[1]!.trim();
    } else if (isKeyOnly && !isSeqItem) {
      key = unquote(content.slice(0, -1).trim());
    } else {
      // Bug 1 fix: use quote-aware colon search instead of naive indexOf
      const colonIdx = indexOutsideQuotes(content, ": ");
      if (colonIdx > 0) {
        key = unquote(content.slice(0, colonIdx).trim());
        // P3-R1 fix: stripComment MUST run before unquote.
        // For `"URL: https://foo.com # tag"`:
        //   - unquote-first: strips quotes → `URL: https://foo.com # tag`
        //     then stripComment sees ` # tag` as unquoted → corrupts value.
        //   - stripComment-first: the string is still quoted → ` # tag` is
        //     inside a quote → preserved correctly → then unquote strips outer quotes.
        const rawValue = content.slice(colonIdx + 2).trim();
        value = unquote(stripComment(rawValue));
      } else if (isSeqItem) {
        // Bug 2 fix applies here too: strip comment, then unquote
        value = unquote(stripComment(content.trim()));
      } else {
        key = content.trim();
      }
    }

    return { indent, key, value, isSeqItem, num: l.num };
  });

  // W-3: Strict decimal number pattern.
  // Rejects hex (0x1F), octal (0o17), binary (0b101), Infinity, and whitespace-only.
  // Only matches valid JSON-style numbers: integers and decimals with optional exponent.
  const STRICT_NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

  // W-7: Maximum recursion depth to prevent stack overflow from pathological input
  const MAX_DEPTH = 64;

  // Recursive descent builder
  function parseValue(raw: string): unknown {
    if (raw === "true") return true;
    if (raw === "false") return false;
    if (raw === "null" || raw === "~") return null;
    // Bug 3 fix: flow sequences [a, b, c] or ["a", "b"]
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const inner = raw.slice(1, -1).trim();
      if (inner === "") return [];
      // Split on commas outside of quotes, with escape-aware tracking
      const items: string[] = [];
      let current = "";
      let inSingle = false;
      let inDouble = false;
      for (let ci = 0; ci < inner.length; ci++) {
        const ch = inner[ci]!;
        // W-5: Skip escaped characters inside double-quoted strings
        if (inDouble && ch === "\\" && ci + 1 < inner.length) {
          current += ch + inner[ci + 1]!;
          ci++;
          continue;
        }
        if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
        if (ch === "," && !inSingle && !inDouble) {
          // W-2: Use unquote() for proper escape processing instead of naive regex stripping
          items.push(unquote(current.trim()));
          current = "";
        } else {
          current += ch;
        }
      }
      if (current.trim()) items.push(unquote(current.trim()));
      return items.filter((s) => s !== "");
    }
    // W-3: Use strict decimal regex instead of Number() which coerces hex, Infinity, etc.
    if (STRICT_NUMBER_RE.test(raw)) return Number(raw);
    return raw;
  }

  function buildNode(idx: number, baseIndent: number, depth: number = 0): { value: unknown; nextIdx: number } {
    // W-7: Guard against stack overflow from pathological nesting
    if (depth >= MAX_DEPTH) {
      throw new Error(
        `YAML parse error: nesting depth exceeds ${MAX_DEPTH} levels. ` +
        `This likely indicates a malformed or adversarial ontology file.`,
      );
    }
    const token = tokens[idx]!;

    // Peek ahead to determine if this is a mapping or sequence parent
    const nextToken = tokens[idx + 1];
    const childIndent = nextToken?.indent ?? -1;

    if (childIndent > baseIndent && nextToken) {
      if (nextToken.isSeqItem) {
        // Build sequence
        const arr: unknown[] = [];
        let i = idx + 1;
        while (i < tokens.length && tokens[i]!.indent === childIndent && tokens[i]!.isSeqItem) {
          const t = tokens[i]!;
          if (t.value !== undefined && (tokens[i + 1]?.indent ?? -1) <= childIndent) {
            // Scalar sequence item
            arr.push(parseValue(t.value));
            i++;
          } else {
            // Object sequence item
            const obj: Record<string, unknown> = {};
            if (t.key && t.value !== undefined) {
              obj[t.key] = parseValue(t.value);
            } else if (t.key) {
              const result = buildNode(i, t.indent, depth + 1);
              obj[t.key] = result.value;
              i = result.nextIdx;
              continue;
            }
            i++;
            while (i < tokens.length && tokens[i]!.indent > childIndent) {
              const inner = tokens[i]!;
              if (inner.key && inner.value !== undefined) {
                obj[inner.key] = parseValue(inner.value);
                i++;
              } else if (inner.key) {
                const result = buildNode(i, inner.indent, depth + 1);
                obj[inner.key] = result.value;
                i = result.nextIdx;
              } else {
                i++;
              }
            }
            arr.push(obj);
          }
        }
        return { value: arr, nextIdx: i };
      } else {
        // Build mapping
        const obj: Record<string, unknown> = {};
        const seenKeys = new Set<string>();
        let i = idx + 1;
        while (i < tokens.length && tokens[i]!.indent === childIndent) {
          const t = tokens[i]!;
          if (t.key) {
            if (seenKeys.has(t.key)) {
              console.warn(`YAML parse warning: duplicate key "${t.key}" at line ${t.num}; last value wins.`);
            }
            seenKeys.add(t.key);
          }
          if (t.key && t.value !== undefined) {
            obj[t.key] = parseValue(t.value);
            i++;
          } else if (t.key) {
            const result = buildNode(i, t.indent, depth + 1);
            obj[t.key] = result.value;
            i = result.nextIdx;
          } else {
            i++;
          }
        }
        return { value: obj, nextIdx: i };
      }
    }

    // Leaf node — current token has a scalar value
    if (token.value !== undefined) {
      return { value: parseValue(token.value), nextIdx: idx + 1 };
    }

    return { value: null, nextIdx: idx + 1 };
  }

  // Build root mapping
  const root: Record<string, unknown> = {};
  const seenRootKeys = new Set<string>();
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.key) {
      if (seenRootKeys.has(t.key)) {
        console.warn(`YAML parse warning: duplicate key "${t.key}" at line ${t.num}; last value wins.`);
      }
      seenRootKeys.add(t.key);
    }
    if (t.key && t.value !== undefined) {
      root[t.key] = parseValue(t.value);
      i++;
    } else if (t.key) {
      const result = buildNode(i, t.indent);
      root[t.key] = result.value;
      i = result.nextIdx;
    } else {
      i++;
    }
  }

  return root;
}

// ── Type coercers ────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  if (typeof v === "string") return [v];
  return [];
}

function asBoolean(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

// ── Schema hydrators ─────────────────────────────────────────────────────────

function hydrateFrontmatterField(
  raw: unknown,
  path: string,
  issues: OntologyValidationIssue[],
): FrontmatterFieldSchema {
  const r = asRecord(raw);
  const typeRaw = asString(r["type"]);
  const type = VALID_FIELD_TYPES.includes(typeRaw as FieldType) ? (typeRaw as FieldType) : "string";

  if (!VALID_FIELD_TYPES.includes(typeRaw as FieldType)) {
    issues.push({
      severity: "error",
      path,
      message: `Invalid field type "${typeRaw}". Valid types: ${VALID_FIELD_TYPES.join(", ")}`,
    });
  }

  const enumValues = asStringArray(r["enum"]);
  if ((type === "enum" || type === "enum[]") && enumValues.length === 0) {
    issues.push({
      severity: "warning",
      path,
      message: `Field type is "${type}" but no enum values specified`,
    });
  }

  return {
    description: asString(r["description"]),
    type,
    required: asBoolean(r["required"], false),
    enum: enumValues.length > 0 ? enumValues : undefined,
    targetEntityType: asString(r["target_entity_type"]) || undefined,
    default: asString(r["default"]) || undefined,
  };
}

function hydrateFrontmatterSchema(
  raw: unknown,
  path: string,
  issues: OntologyValidationIssue[],
): FrontmatterSchema {
  const r = asRecord(raw);
  const fieldsRaw = asRecord(r["fields"]);
  const fields: Record<string, FrontmatterFieldSchema> = {};

  for (const [fieldName, fieldRaw] of Object.entries(fieldsRaw)) {
    fields[fieldName] = hydrateFrontmatterField(fieldRaw, `${path}.fields.${fieldName}`, issues);
  }

  return { fields };
}

function hydrateArticleSection(raw: unknown): ArticleSection {
  const r = asRecord(raw);
  return {
    heading: asString(r["heading"]),
    description: asString(r["description"]),
    required: asBoolean(r["required"], false),
  };
}

function hydrateEntityType(
  raw: unknown,
  typeName: string,
  issues: OntologyValidationIssue[],
): EntityTypeSchema {
  const r = asRecord(raw);
  const path = `entityTypes.${typeName}`;

  if (!r["description"]) {
    issues.push({
      severity: "warning",
      path,
      message: `Entity type "${typeName}" has no description`,
    });
  }

  const structureRaw = Array.isArray(r["article_structure"]) ? r["article_structure"] : [];
  const articleStructure = structureRaw.map((s) => hydrateArticleSection(s));

  return {
    description: asString(r["description"]),
    extends: asString(r["extends"]) || undefined,
    frontmatter: hydrateFrontmatterSchema(r["frontmatter"] ?? {}, `${path}.frontmatter`, issues),
    articleStructure,
    linkableTo: asStringArray(r["linkable_to"]),
    indexable: asBoolean(r["indexable"], true),
  };
}

function hydrateRelationshipType(
  raw: unknown,
  idx: number,
  knownEntityTypes: Set<string>,
  issues: OntologyValidationIssue[],
): RelationshipType {
  const r = asRecord(raw);
  const path = `relationshipTypes[${idx}]`;
  const name = asString(r["name"]);
  const from = asString(r["from"]);
  const to = asString(r["to"]);

  if (!name) {
    issues.push({
      severity: "error",
      path,
      message: "Relationship type missing required field: name",
    });
  }
  if (!from) {
    issues.push({
      severity: "error",
      path,
      message: `Relationship "${name}" missing required field: from`,
    });
  }
  if (!to) {
    issues.push({
      severity: "error",
      path,
      message: `Relationship "${name}" missing required field: to`,
    });
  }
  if (from && !knownEntityTypes.has(from)) {
    issues.push({
      severity: "error",
      path,
      message: `Relationship "${name}".from references unknown entity type "${from}"`,
    });
  }
  if (to && !knownEntityTypes.has(to)) {
    issues.push({
      severity: "error",
      path,
      message: `Relationship "${name}".to references unknown entity type "${to}"`,
    });
  }

  return {
    name,
    from,
    to,
    description: asString(r["description"]),
    reciprocal: asString(r["reciprocal"]) || undefined,
  };
}

function hydrateVocabularyEntry(raw: unknown): VocabularyEntry {
  const r = asRecord(raw);
  return {
    aliases: asStringArray(r["aliases"]),
    entityType: asString(r["entity_type"]) || undefined,
    docId: asString(r["doc_id"]) || undefined,
  };
}

function hydrateBudget(raw: unknown): KBBudgetConfig {
  const r = asRecord(raw);
  return {
    textDocumentTokens: asNumber(r["text_document_tokens"], DEFAULT_BUDGET.textDocumentTokens),
    imageTokens: asNumber(r["image_tokens"], DEFAULT_BUDGET.imageTokens),
    maxImagesPerFetch: asNumber(r["max_images_per_fetch"], DEFAULT_BUDGET.maxImagesPerFetch),
  };
}

function hydrateCompilerConfig(raw: unknown): KBCompilerModelConfig {
  const r = asRecord(raw);
  return {
    extractionModel: asString(r["extraction_model"]) || undefined,
    synthesisModel: asString(r["synthesis_model"]) || undefined,
    analysisModel: asString(r["analysis_model"]) || undefined,
    visionModel: asString(r["vision_model"]) || undefined,
  };
}

// ── Top-level hydration ──────────────────────────────────────────────────────

function hydrateOntology(raw: unknown): {
  ontology: KBOntology;
  issues: OntologyValidationIssue[];
} {
  const issues: OntologyValidationIssue[] = [];
  const r = asRecord(raw);

  // Domain
  const domain = asString(r["domain"]);
  if (!domain) {
    issues.push({
      severity: "error",
      path: "domain",
      message: 'Required field "domain" is missing or empty',
    });
  }

  // Entity types
  const entityTypesRaw = asRecord(r["entity_types"]);
  const entityTypes: Record<string, EntityTypeSchema> = {};
  const knownEntityTypes = new Set(Object.keys(entityTypesRaw));

  if (knownEntityTypes.size === 0) {
    issues.push({
      severity: "error",
      path: "entity_types",
      message: "At least one entity type must be defined",
    });
  }

  for (const [typeName, typeRaw] of Object.entries(entityTypesRaw)) {
    entityTypes[typeName] = hydrateEntityType(typeRaw, typeName, issues);
  }

  // Validate linkable_to references
  for (const [typeName, schema] of Object.entries(entityTypes)) {
    for (const linkedType of schema.linkableTo) {
      if (!knownEntityTypes.has(linkedType)) {
        issues.push({
          severity: "error",
          path: `entityTypes.${typeName}.linkableTo`,
          message: `References unknown entity type "${linkedType}"`,
        });
      }
    }
  }

  // Relationship types
  const relTypesRaw = Array.isArray(r["relationship_types"]) ? r["relationship_types"] : [];
  const relationshipTypes: RelationshipType[] = relTypesRaw.map((rel, i) =>
    hydrateRelationshipType(rel, i, knownEntityTypes, issues),
  );

  // Validate reciprocal references
  const relNames = new Set(relationshipTypes.map((r) => r.name));
  for (const rel of relationshipTypes) {
    if (rel.reciprocal && !relNames.has(rel.reciprocal)) {
      issues.push({
        severity: "warning",
        path: `relationshipTypes[${rel.name}].reciprocal`,
        message: `Reciprocal relationship "${rel.reciprocal}" is not defined`,
      });
    }
  }

  // Vocabulary
  const vocabRaw = asRecord(r["vocabulary"]);
  const vocabulary: Record<string, VocabularyEntry> = {};
  for (const [term, entryRaw] of Object.entries(vocabRaw)) {
    vocabulary[term.toLowerCase()] = hydrateVocabularyEntry(entryRaw);
  }

  // Budget
  const budget = hydrateBudget(asRecord(r["budget"]));

  // Compiler config
  const compiler = hydrateCompilerConfig(asRecord(r["compiler"]));

  // Schema mode (O6)
  const schemaModeRaw = asString(r["schema_mode"]);
  const schemaMode: "strict" | "progressive" | undefined =
    schemaModeRaw === "progressive" ? "progressive" :
    schemaModeRaw === "strict" ? "strict" : undefined;

  const ontology: KBOntology = {
    domain,
    entityTypes,
    relationshipTypes,
    vocabulary,
    budget,
    compiler,
    schemaMode,
  };

  // Resolve entity type inheritance chains (O5)
  resolveInheritance(ontology, issues);

  return { ontology, issues };
}

// ── Entity Type Inheritance Resolution (O5) ─────────────────────────────────

/**
 * Resolve entity type inheritance chains.
 *
 * After all entity types are hydrated, this function:
 * 1. Validates that `extends` references exist and there are no cycles
 * 2. Merges parent fields into child (child overrides parent on collision)
 * 3. Concatenates article structure (parent sections first, then child)
 * 4. Unions linkableTo from parent + child
 * 5. Marks abstract types (prefixed with `_`) as non-indexable
 */
function resolveInheritance(
  ontology: KBOntology,
  issues: OntologyValidationIssue[],
): void {
  const resolved = new Set<string>();
  const resolving = new Set<string>();

  function resolve(typeName: string): void {
    if (resolved.has(typeName)) return;

    const schema = ontology.entityTypes[typeName];
    if (!schema) return;

    // No parent — nothing to resolve
    if (!schema.extends) {
      // Mark abstract types as non-indexable
      if (typeName.startsWith("_")) {
        schema.indexable = false;
      }
      resolved.add(typeName);
      return;
    }

    // Cycle detection
    if (resolving.has(typeName)) {
      issues.push({
        severity: "error",
        path: `entityTypes.${typeName}.extends`,
        message: `Circular inheritance detected: ${typeName} → ${schema.extends}`,
      });
      resolved.add(typeName);
      return;
    }

    // Validate parent exists
    const parent = ontology.entityTypes[schema.extends];
    if (!parent) {
      issues.push({
        severity: "error",
        path: `entityTypes.${typeName}.extends`,
        message: `Parent entity type "${schema.extends}" does not exist`,
      });
      resolved.add(typeName);
      return;
    }

    // Resolve parent first (recursive)
    resolving.add(typeName);
    resolve(schema.extends);
    resolving.delete(typeName);

    // Merge frontmatter fields: parent fields first, child overrides
    const mergedFields: Record<string, import("./types.js").FrontmatterFieldSchema> = {};
    for (const [fieldName, field] of Object.entries(parent.frontmatter.fields)) {
      mergedFields[fieldName] = field;
    }
    for (const [fieldName, field] of Object.entries(schema.frontmatter.fields)) {
      mergedFields[fieldName] = field; // child overrides parent
    }
    schema.frontmatter = { fields: mergedFields };

    // P3-3: Merge article structure with deterministic ordering.
    // Parent sections come first, child overrides replace in-place,
    // new child sections are appended at the end.
    const childSections = new Map(
      schema.articleStructure.map((s) => [s.heading.toLowerCase(), s] as const)
    );
    const mergedStructure: import("./types.js").ArticleSection[] = [];
    const usedChildHeadings = new Set<string>();

    // Parent sections first — use child override if heading matches
    for (const parentSection of parent.articleStructure) {
      const key = parentSection.heading.toLowerCase();
      const childOverride = childSections.get(key);
      if (childOverride) {
        mergedStructure.push(childOverride);
        usedChildHeadings.add(key);
      } else {
        mergedStructure.push(parentSection);
      }
    }

    // Append remaining child sections (new sections not in parent)
    for (const section of schema.articleStructure) {
      if (!usedChildHeadings.has(section.heading.toLowerCase())) {
        mergedStructure.push(section);
      }
    }
    schema.articleStructure = mergedStructure;

    // Union linkableTo
    const linkSet = new Set([...parent.linkableTo, ...schema.linkableTo]);
    schema.linkableTo = [...linkSet];

    // Mark abstract types as non-indexable
    if (typeName.startsWith("_")) {
      schema.indexable = false;
    }

    resolved.add(typeName);
  }

  // Resolve all types
  for (const typeName of Object.keys(ontology.entityTypes)) {
    resolve(typeName);
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a hydrated ontology for internal consistency.
 * Runs additional cross-field checks beyond what hydration catches.
 */
export function validateOntology(ontology: KBOntology): OntologyValidationResult {
  const issues: OntologyValidationIssue[] = [];

  // Check that entity_ref fields reference valid entity types
  for (const [typeName, schema] of Object.entries(ontology.entityTypes)) {
    for (const [fieldName, field] of Object.entries(schema.frontmatter.fields)) {
      if (
        (field.type === "entity_ref" || field.type === "entity_ref[]") &&
        field.targetEntityType &&
        !ontology.entityTypes[field.targetEntityType]
      ) {
        issues.push({
          severity: "error",
          path: `entityTypes.${typeName}.frontmatter.fields.${fieldName}.targetEntityType`,
          message: `References unknown entity type "${field.targetEntityType}"`,
        });
      }
    }

    // Check article structure has at least one section
    if (schema.articleStructure.length === 0) {
      issues.push({
        severity: "warning",
        path: `entityTypes.${typeName}.articleStructure`,
        message: `Entity type "${typeName}" has no article_structure defined. The synthesizer will use generic defaults.`,
      });
    }
  }

  // Check vocabulary entries that have entity types reference valid types
  for (const [term, entry] of Object.entries(ontology.vocabulary)) {
    if (entry.entityType && !ontology.entityTypes[entry.entityType]) {
      issues.push({
        severity: "error",
        path: `vocabulary.${term}.entityType`,
        message: `Vocabulary entry "${term}" references unknown entity type "${entry.entityType}"`,
      });
    }
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export class OntologyLoader {
  private readonly kbRoot: string;

  constructor(kbRoot: string) {
    this.kbRoot = kbRoot;
  }

  get ontologyPath(): string {
    return join(this.kbRoot, ONTOLOGY_FILENAME);
  }

  /** Check whether an ontology.yaml exists in the KB root */
  async exists(): Promise<boolean> {
    try {
      await access(this.ontologyPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load and validate the ontology from disk.
   *
   * @throws if the file doesn't exist or has fatal parse errors
   * @returns The validated ontology and any non-fatal issues
   */
  async load(): Promise<{ ontology: KBOntology; issues: OntologyValidationIssue[] }> {
    let raw: string;
    try {
      raw = await readFile(this.ontologyPath, "utf-8");
    } catch (err) {
      throw new Error(
        `Cannot load ontology: file not found at ${this.ontologyPath}.\n` +
          `Run "kb init" to create a starter ontology.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      throw new Error(
        `Cannot parse ${ONTOLOGY_FILENAME}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const { ontology, issues: hydrateIssues } = hydrateOntology(parsed);
    const { issues: validateIssues } = validateOntology(ontology);
    const allIssues = [...hydrateIssues, ...validateIssues];

    // P1-3: Merge vocabulary additions from the compile-time sidecar.
    // This file is written by the compiler's vocabulary sync (O8) and contains
    // terms discovered from the registry that aren't in ontology.yaml.
    // Without this read, vocab additions are lost between compiles.
    const vocabSidecarPath = join(this.kbRoot, ".kb-vocab-sync.json");
    try {
      const sidecarRaw = await readFile(vocabSidecarPath, "utf-8");
      const sidecar = JSON.parse(sidecarRaw) as {
        vocabulary?: Record<string, { aliases: string[]; entityType?: string; docId?: string }>;
      };
      if (sidecar.vocabulary) {
        for (const [term, entry] of Object.entries(sidecar.vocabulary)) {
          const key = term.toLowerCase();
          // R-6: Guard against prototype pollution from tampered sidecar
          if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
          // Only add entries not already in ontology.yaml (user edits take precedence)
          if (!ontology.vocabulary[key]) {
            ontology.vocabulary[key] = {
              aliases: entry.aliases ?? [],
              entityType: entry.entityType,
              docId: entry.docId,
            };
          }
        }
      }
    } catch {
      // Sidecar doesn't exist or is malformed — this is fine (first run or manual KB)
    }

    const errors = allIssues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      const lines = errors.map((e) => ` [error] ${e.path}: ${e.message}`);
      throw new Error(
        `${ONTOLOGY_FILENAME} has ${errors.length} error(s) that must be fixed before compilation:\n` +
          lines.join("\n"),
      );
    }

    return { ontology, issues: allIssues };
  }

  /** Serialize an ontology object back to YAML and write it to disk */
  async save(ontology: KBOntology): Promise<void> {
    const yaml = serializeOntology(ontology);
    // I3: atomic write — plain writeFile() on ontology.yaml risks total data loss
    // if the process crashes mid-write. ontology.yaml cannot be auto-rebuilt.
    const { atomicWriteFile } = await import("../compiler/atomicWrite.js");
    await atomicWriteFile(this.ontologyPath, yaml);
  }
}

// ── YAML serializer ──────────────────────────────────────────────────────────

// ── YAML string escaping ─────────────────────────────────────────────────────

/**
 * I2: escape a string for embedding inside a YAML double-quoted scalar.
 * Escapes backslashes first (so they don't double-escape), then double-quotes.
 * Without this, a description like 'Represents a "core" concept' produces
 * invalid YAML: description: "Represents a "core" concept"
 */
function yamlEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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
    `domain: "${yamlEscape(ontology.domain)}"`,
    ``,
    `# ── Entity Types ──────────────────────────────────────────────────────────`,
    `entity_types:`,
  ];

  for (const [typeName, schema] of Object.entries(ontology.entityTypes)) {
    lines.push(` ${typeName}:`);
    lines.push(`  description: "${yamlEscape(schema.description)}"`);
    if (schema.extends) {
      lines.push(`  extends: ${schema.extends}`);
    }
    if (schema.linkableTo.length > 0) {
      lines.push(`  linkable_to:`);
      for (const t of schema.linkableTo) lines.push(`   - ${t}`);
    }
    if (schema.indexable === false) {
      lines.push(`  indexable: false`);
    }
    lines.push(`  frontmatter:`);
    lines.push(`   fields:`);
    for (const [fieldName, field] of Object.entries(schema.frontmatter.fields)) {
      lines.push(`    ${fieldName}:`);
      lines.push(`     description: "${yamlEscape(field.description)}"`);
      lines.push(`     type: ${field.type}`);
      lines.push(`     required: ${field.required}`);
      if (field.enum) {
        lines.push(`     enum:`);
        for (const v of field.enum) lines.push(`      - ${v}`);
      }
      if (field.targetEntityType) {
        lines.push(`     target_entity_type: ${field.targetEntityType}`);
      }
      if (field.default) {
        lines.push(`     default: "${yamlEscape(field.default)}"`);
      }
    }
    lines.push(`  article_structure:`);
    for (const section of schema.articleStructure) {
      lines.push(`   - heading: "${yamlEscape(section.heading)}"`);
      lines.push(`     description: "${yamlEscape(section.description)}"`);
      lines.push(`     required: ${section.required}`);
    }
    lines.push(``);
  }

  lines.push(`# ── Relationship Types ────────────────────────────────────────────────────`);
  lines.push(`relationship_types:`);
  for (const rel of ontology.relationshipTypes) {
    lines.push(` - name: ${rel.name}`);
    lines.push(`   from: ${rel.from}`);
    lines.push(`   to: ${rel.to}`);
    lines.push(`   description: "${yamlEscape(rel.description)}"`);
    if (rel.reciprocal) lines.push(`   reciprocal: ${rel.reciprocal}`);
  }

  lines.push(``);
  lines.push(`# ── Vocabulary ────────────────────────────────────────────────────────────`);
  lines.push(`vocabulary:`);
  for (const [term, entry] of Object.entries(ontology.vocabulary)) {
    lines.push(` "${yamlEscape(term)}":`);
    if (entry.entityType) lines.push(`  entity_type: ${entry.entityType}`);
    if (entry.docId) lines.push(`  doc_id: ${entry.docId}`);
    if (entry.aliases.length > 0) {
      lines.push(`  aliases:`);
      for (const alias of entry.aliases) lines.push(`   - "${yamlEscape(alias)}"`);
    }
  }

  lines.push(``);
  if (ontology.schemaMode) {
    lines.push(`# ── Schema Mode ───────────────────────────────────────────────────────────`);
    lines.push(`schema_mode: ${ontology.schemaMode}`);
    lines.push(``);
  }
  lines.push(`# ── Budget ────────────────────────────────────────────────────────────────`);
  lines.push(`budget:`);
  lines.push(`  text_document_tokens: ${ontology.budget.textDocumentTokens}`);
  lines.push(`  image_tokens: ${ontology.budget.imageTokens}`);
  lines.push(`  max_images_per_fetch: ${ontology.budget.maxImagesPerFetch}`);

  lines.push(``);
  lines.push(`# ── Compiler Model Config ─────────────────────────────────────────────────`);
  lines.push(`compiler:`);
  if (ontology.compiler.extractionModel) {
    lines.push(`  extraction_model: ${ontology.compiler.extractionModel}`);
  }
  if (ontology.compiler.synthesisModel) {
    lines.push(`  synthesis_model: ${ontology.compiler.synthesisModel}`);
  }
  if (ontology.compiler.analysisModel) {
    lines.push(`  analysis_model: ${ontology.compiler.analysisModel}`);
  }
  if (ontology.compiler.visionModel) {
    lines.push(`  vision_model: ${ontology.compiler.visionModel}`);
  }

  return lines.join("\n") + "\n";
}
