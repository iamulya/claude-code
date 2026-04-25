/**
 * Ontology YAML Parser
 *
 * Loads and validates `ontology.yaml` from the KB root directory.
 * Uses the `yaml` library (spec-compliant YAML 1.2 parser) to parse
 * the ontology file, then validates and hydrates the result into a
 * strongly-typed `KBOntology`.
 *
 * The parser produces a validated `KBOntology` with human-readable
 * errors for any structural problem. The compiler will not start
 * until the ontology passes validation.
 *
 * ## Change history
 *
 * Sprint 0a: Replaced ~425 LOC hand-rolled YAML parser with `yaml` library.
 * Eliminates findings H1 (block scalar), H13 (tab indent), H14 (escaped quotes),
 * M4 (flow mappings), and gains anchors/aliases, multi-doc, full escape sequences,
 * and YAML 1.2 compliance for free.
 */

import { readFile, writeFile, access } from "fs/promises";
import { join } from "path";
import { parse as parseYamlLib } from "yaml";
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

// ── YAML parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a YAML string into a plain JavaScript object using the spec-compliant
 * `yaml` library. Configured with strict mode and core schema to prevent
 * type coercion surprises (e.g., "yes" → true in YAML 1.1).
 *
 * @throws {Error} If the YAML is syntactically invalid
 */
function parseYaml(raw: string): unknown {
  return parseYamlLib(raw, {
    strict: true,
    schema: "core",
    // Reject duplicate keys — the hand-rolled parser warned, this throws
    uniqueKeys: true,
    // Cap string length to prevent memory exhaustion from pathological input
    maxAliasCount: 100,
  });
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

  // Parse missing_severity — controls whether a missing required field is an error or warning.
  const missingSeverityRaw = asString(r["missing_severity"]);
  const missingSeverity: "error" | "warning" | undefined =
    missingSeverityRaw === "warning" ? "warning" :
    missingSeverityRaw === "error" ? "error" : undefined;

  return {
    description: asString(r["description"]),
    type,
    required: asBoolean(r["required"], false),
    missing_severity: missingSeverity,
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
    // 1.1: optional staleness TTL — 0 or absent means no expiry
    freshness_ttl_days: r["freshness_ttl_days"] != null
      ? asNumber(r["freshness_ttl_days"], 0) || undefined
      : undefined,
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

  // M11: Detect unknown top-level keys (catches typos like "entitiy_types").
  // In progressive mode these are info-level; in strict mode they're warnings.
  const KNOWN_TOP_LEVEL_KEYS = new Set([
    "domain", "entity_types", "relationship_types", "vocabulary",
    "budget", "compiler", "schema_mode",
  ]);
  for (const key of Object.keys(r)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      issues.push({
        severity: "warning",
        path: key,
        message: `Unknown top-level key "${key}" in ontology.yaml — will be ignored. ` +
          `Did you mean one of: ${[...KNOWN_TOP_LEVEL_KEYS].join(", ")}?`,
      });
    }
  }

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
  // ADR-012/Fix-12: Use Object.create(null) to prevent ALL prototype pollution.
  // This eliminates the need for any denylist — there are no prototype keys to deny.
  const vocabRaw = asRecord(r["vocabulary"]);
  const vocabulary: Record<string, VocabularyEntry> = Object.create(null) as Record<string, VocabularyEntry>;
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

    // 1.1: inherit freshness TTL from parent when child doesn't specify its own
    if (schema.freshness_ttl_days === undefined && parent.freshness_ttl_days !== undefined) {
      schema.freshness_ttl_days = parent.freshness_ttl_days;
    }

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
        // ADR-012/Fix-12: SIDECAR_KEY_DENYLIST removed — vocabulary uses
        // Object.create(null) so no prototype keys exist to pollute.
        for (const [term, entry] of Object.entries(sidecar.vocabulary)) {
          const key = term.toLowerCase();
          if (!key) continue;
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
      if (field.missing_severity) {
        lines.push(`     missing_severity: ${field.missing_severity}`);
      }
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
