/**
 * Concept Extractor barrel — public API
 */

export type {
  CompilationPlan,
  ArticlePlan,
  ArticleAction,
  StaticAnalysisResult,
  CandidateConcept,
} from './types.js'

export { ConceptExtractor, makeGenerateFn } from './extractor.js'
export type { GenerateFn } from './extractor.js'

export {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from './prompt.js'
