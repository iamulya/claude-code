/**
 * YAAF Knowledge Base — top-level public API
 *
 * The KB module implements a Karpathy-style "compile your knowledge" pipeline:
 *
 *   raw/ (messy sources) → [LLM compilation] → compiled/ (structured wiki)
 *
 * Quick start:
 * ```ts
 * import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
 *
 * const compiler = await KBCompiler.create({
 *   kbDir: './my-kb',
 *   extractionModel: makeGenerateFn(myFastModel),
 *   synthesisModel:  makeGenerateFn(myCapableModel),
 * })
 *
 * const result = await compiler.compile()
 * ```
 */

// ── Primary API ───────────────────────────────────────────────────────────────

export {
  // Pipeline coordinator
  KBCompiler,
  // Model helpers
  makeGenerateFn,
  // PDF extraction
  makeGeminiPdfExtractor,
  makeClaudePdfExtractor,
  makeOpenAIPdfExtractor,
  autoDetectPdfExtractor,
  // Web clipper (programmatic Obsidian Web Clipper equivalent)
  KBClipper,
} from './compiler/index.js'

export type {
  KBCompilerOptions,
  CompileOptions,
  CompileResult,
  CompileProgressEvent,
  ModelLike,
  GenerateFn,
  PdfExtractFn,
  PdfIngesterOptions,
  GeminiPdfExtractorOptions,
  ClaudePdfExtractorOptions,
  OpenAIPdfExtractorOptions,
} from './compiler/index.js'

// ── Ontology types ─────────────────────────────────────────────────────────────

export type {
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
  ConceptRegistry,
  ConceptRegistryEntry,
  OntologyValidationResult,
} from './ontology/index.js'

export {
  OntologyLoader,
  validateOntology,
  buildConceptRegistry,
  buildAliasIndex,
  scanForEntityMentions,
  upsertRegistryEntry,
  removeRegistryEntry,
  serializeRegistry,
  deserializeRegistry,
  findByWikilink,
  findByEntityType,
  ONTOLOGY_FILENAME,
  // LLM-powered ontology generator
  OntologyGenerator,
} from './ontology/index.js'

export type {
  OntologyGeneratorOptions,
  GenerateOntologyOptions,
  GenerateOntologyResult,
} from './ontology/index.js'

// ── Ingester types and utilities ───────────────────────────────────────────────

export type { IngestedContent, ImageRef, IngesterOptions } from './compiler/index.js'

export {
  ingestFile,
  canIngest,
  requiredOptionalDeps,
  detectMimeType,
  extractMarkdownImageRefs,
  downloadImage,
} from './compiler/index.js'

// ── Compilation plan types ─────────────────────────────────────────────────────

export type {
  CompilationPlan,
  ArticlePlan,
  ArticleAction,
  CandidateConcept,
} from './compiler/index.js'

export { ConceptExtractor } from './compiler/index.js'

// ── Synthesis types ─────────────────────────────────────────────────────────────

export type {
  SynthesisResult,
  SynthesisOptions,
  SynthesisProgressEvent,
  FrontmatterValidationResult,
} from './compiler/index.js'

export { KnowledgeSynthesizer, serializeFrontmatter, validateFrontmatter } from './compiler/index.js'

// ── Linter types ───────────────────────────────────────────────────────────────

export type {
  LintReport,
  LintIssue,
  LintCode,
  LintOptions,
  AutoFixResult,
} from './compiler/index.js'

export { KBLinter, extractWikilinks, buildLinkGraph } from './compiler/index.js'

// ── Runtime (Store + Tools + KnowledgeBase) ────────────────────────────────────

export { KnowledgeBase, KBStore, createKBTools } from './store/index.js'

export type {
  KnowledgeBaseOptions,
  CompiledDocument,
  KBIndex,
  KBIndexEntry,
  SearchResult,
  KBToolOptions,
} from './store/index.js'

// ── Federation ────────────────────────────────────────────────────────────────

export { FederatedKnowledgeBase } from './store/index.js'

export type {
  FederatedKBConfig,
  FederatedKBEntry,
  FederatedKBOptions,
  FederatedIndex,
  NamespacedDocument,
  NamespacedSearchResult,
  NamespacedIndexEntry,
} from './store/index.js'

