/**
 * Knowledge Compiler barrel — public API for all compiler stages and the
 * top-level KBCompiler pipeline coordinator.
 */

// ── Pipeline coordinator (primary API) ───────────────────────────────────────

export { KBCompiler } from "./compiler.js";
export type {
  KBCompilerOptions,
  CompileOptions,
  CompileResult,
  CompileProgressEvent,
  ModelLike,
} from "./compiler.js";

// ── Pipeline utilities ────────────────────────────────────────────────────────

export { writeWithVersioning, listVersions, rollbackToVersion } from "./versioning.js";
export type { ArticleVersion, WriteResult } from "./versioning.js";

export { withRetry } from "./retry.js";
export type { RetryOptions } from "./retry.js";

export { pluralizeEntityType, generateDocId } from "./utils.js";

export { validateGrounding } from "./validator.js";
export type { GroundingResult } from "./validator.js";

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
  pdfIngester,
  makeGeminiPdfExtractor,
  makeClaudePdfExtractor,
  makeOpenAIPdfExtractor,
  autoDetectPdfExtractor,
  KBClipper,
  detectMimeType,
  isImageMimeType,
  extractMarkdownImageRefs,
  resolveAllMarkdownImages,
  downloadImage,
} from "./ingester/index.js";

export type {
  Ingester,
  IngestedContent,
  ImageRef,
  IngesterOptions,
  PdfExtractFn,
  PdfIngesterOptions,
  GeminiPdfExtractorOptions,
  ClaudePdfExtractorOptions,
  OpenAIPdfExtractorOptions,
} from "./ingester/index.js";

// ── Extractor ─────────────────────────────────────────────────────────────────

export { ConceptExtractor, makeGenerateFn } from "./extractor/index.js";
export type { GenerateFn } from "./extractor/index.js";

export type {
  CompilationPlan,
  ArticlePlan,
  ArticleAction,
  StaticAnalysisResult,
  CandidateConcept,
} from "./extractor/index.js";

// ── Synthesizer ────────────────────────────────────────────────────────────────

export { KnowledgeSynthesizer } from "./synthesizer/index.js";
export {
  serializeFrontmatter,
  validateFrontmatter,
  buildCompleteFrontmatter,
  parseArticleOutput,
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
  generateStubArticle,
} from "./synthesizer/index.js";

export type {
  SynthesisOptions,
  SynthesisResult,
  ArticleSynthesisResult,
  SynthesisProgressEvent,
  FrontmatterValidationResult,
  ParsedArticle,
} from "./synthesizer/index.js";

// ── Linter ─────────────────────────────────────────────────────────────────────

export { KBLinter, applyFixes } from "./linter/index.js";
export { extractWikilinks, buildLinkGraph, checkContradictoryClaims } from "./linter/index.js";

export type {
  LintCode,
  LintSeverity,
  LintIssue,
  LinkGraph,
  LintReport,
  LintOptions,
  AutoFixResult,
  FixedIssue,
} from "./linter/index.js";

// ── Post-processing ───────────────────────────────────────────────────────────

export {
  resolveWikilinks,
  segmentOversizedArticles,
  postProcessCompiledArticles,
  DEFAULT_ARTICLE_TOKEN_BUDGET,
} from "./postprocess.js";

export type { PostProcessOptions, PostProcessResult } from "./postprocess.js";

// ── LLM Client (shared by Phase C features) ───────────────────────────────────

export { makeKBLLMClient, makeKBVisionClient, autoDetectKBClients } from "./llmClient.js";
export type { LLMCallFn, VisionCallFn, LLMClientOptions } from "./llmClient.js";

// ── Heal Mode (C1) ────────────────────────────────────────────────────────────

export { healLintIssues } from "./heal.js";
export type { HealOptions, HealResult, HealDetail, HealProgressEvent } from "./heal.js";

// ── Discovery Mode (C2) ───────────────────────────────────────────────────────

export { discoverGaps } from "./discovery.js";
export type {
  DiscoveryOptions,
  DiscoveryResult,
  DiscoverySuggestion,
  DiscoveryConnection,
  DepthImbalance,
  DiscoveryProgressEvent,
} from "./discovery.js";

// ── Vision Pass (C3) ──────────────────────────────────────────────────────────

export { runVisionPass } from "./vision.js";
export type {
  VisionPassOptions,
  VisionPassResult,
  VisionDetail,
  VisionProgressEvent,
} from "./vision.js";
// ── Differential Compilation Engine ──────────────────────────────────────────

export { DifferentialEngine } from "./differential.js";
export type { SourceHashManifest, DifferentialPlan } from "./differential.js";
