/**
 * Knowledge Synthesizer barrel — public API
 */

export type {
  SynthesisOptions,
  SynthesisResult,
  ArticleSynthesisResult,
  SynthesisProgressEvent,
  FrontmatterValidationResult,
  ParsedArticle,
} from "./types.js";

export { KnowledgeSynthesizer } from "./synthesizer.js";

export {
  serializeFrontmatter,
  validateFrontmatter,
  buildCompleteFrontmatter,
  parseArticleOutput,
} from "./frontmatter.js";

export {
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
  generateStubArticle,
} from "./prompt.js";
