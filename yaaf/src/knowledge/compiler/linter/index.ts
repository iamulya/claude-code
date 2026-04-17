/**
 * KB Linter barrel — public API
 */

export type {
  LintCode,
  LintSeverity,
  LintIssue,
  LinkGraph,
  LintReport,
  LintOptions,
  AutoFixResult,
  FixedIssue,
} from "./types.js";

export { KBLinter } from "./linter.js";

export {
  extractWikilinks,
  buildLinkGraph,
  checkMissingEntityType,
  checkUnknownEntityType,
  checkMissingRequiredFields,
  checkInvalidFieldValues,
  checkBrokenWikilinks,
  checkNonCanonicalWikilinks,
  checkUnlinkedMentions,
  checkOrphanedArticle,
  checkLowArticleQuality,
  checkBrokenSourceRefs,
  checkDuplicateCandidates,
  checkStubWithSources,
  checkContradictoryClaims,
} from "./checks.js";

export { readCompiledArticles, parseCompiledArticle } from "./reader.js";

export type { ParsedCompiledArticle } from "./reader.js";

export { applyFixes } from "./fixer.js";
