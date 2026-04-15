/**
 * Knowledge Compiler barrel — public API for all compiler stages and the
 * top-level KBCompiler pipeline coordinator.
 */

// ── Pipeline coordinator (primary API) ───────────────────────────────────────

export { KBCompiler } from './compiler.js'
export type {
  KBCompilerOptions,
  CompileOptions,
  CompileResult,
  CompileProgressEvent,
  ModelLike,
} from './compiler.js'

// ── Ingester ──────────────────────────────────────────────────────────────────

export {
  ingestFile,
  canIngest,
  requiresOptionalDeps,
  requiredOptionalDeps,
  markdownIngester,
  htmlIngester,
  plainTextIngester,
  jsonIngester,
  codeIngester,
  KBClipper,
  detectMimeType,
  isImageMimeType,
  extractMarkdownImageRefs,
  resolveAllMarkdownImages,
  downloadImage,
} from './ingester/index.js'

export type {
  Ingester,
  IngestedContent,
  ImageRef,
  IngesterOptions,
} from './ingester/index.js'

// ── Extractor ─────────────────────────────────────────────────────────────────

export { ConceptExtractor, makeGenerateFn } from './extractor/index.js'
export type { GenerateFn } from './extractor/index.js'

export type {
  CompilationPlan,
  ArticlePlan,
  ArticleAction,
  StaticAnalysisResult,
  CandidateConcept,
} from './extractor/index.js'

// ── Synthesizer ────────────────────────────────────────────────────────────────

export { KnowledgeSynthesizer } from './synthesizer/index.js'
export {
  serializeFrontmatter,
  validateFrontmatter,
  buildCompleteFrontmatter,
  parseArticleOutput,
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
  generateStubArticle,
} from './synthesizer/index.js'

export type {
  SynthesisOptions,
  SynthesisResult,
  ArticleSynthesisResult,
  SynthesisProgressEvent,
  FrontmatterValidationResult,
  ParsedArticle,
} from './synthesizer/index.js'

// ── Linter ─────────────────────────────────────────────────────────────────────

export { KBLinter, applyFixes } from './linter/index.js'
export {
  extractWikilinks,
  buildLinkGraph,
} from './linter/index.js'

export type {
  LintCode,
  LintSeverity,
  LintIssue,
  LinkGraph,
  LintReport,
  LintOptions,
  AutoFixResult,
  FixedIssue,
} from './linter/index.js'
