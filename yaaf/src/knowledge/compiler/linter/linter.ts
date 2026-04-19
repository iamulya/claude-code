/**
 * KB Linter — orchestrator
 *
 * The KBLinter scans the compiled KB, runs all static checks in parallel,
 * and produces a structured LintReport. It can also apply auto-fixes.
 *
 * Usage:
 * ```ts
 * const linter = new KBLinter(ontology, registry, compiledDir)
 * const report = await linter.lint()
 * // → LintReport with all issues
 *
 * const fixes = await linter.fix(report)
 * // → AutoFixResult with what was changed
 * ```
 *
 * This is the "self-healing" pass Karpathy describes:
 * 1. Scan compiled wiki for issues
 * 2. Auto-fix what can be fixed automatically
 * 3. Output a human-readable report of remaining issues
 */

import type { KBOntology, ConceptRegistry } from "../../ontology/index.js";
import { buildAliasIndex } from "../../ontology/index.js";
import type { LintIssue, LintOptions, LintReport, AutoFixResult } from "./types.js";
import { readCompiledArticles } from "./reader.js";
import { applyFixes } from "./fixer.js";
import {
  buildLinkGraph,
  checkMissingEntityType,
  checkUnknownEntityType,
  checkMissingRequiredFields,
  checkInvalidFieldValues,
  checkBrokenWikilinks,
  checkNonCanonicalWikilinks,
  checkUnlinkedMentions,
  checkOrphanedArticle,
  checkMissingReciprocalLinks,
  checkLowArticleQuality,
  checkBrokenSourceRefs,
  checkStubWithSources,
  checkDuplicateCandidates,
  checkContradictoryClaims,
} from "./checks.js";

import type { PluginHost, LinterRuleAdapter } from "../../../plugin/types.js";

export class KBLinter {
  private readonly aliasIndex: ReturnType<typeof buildAliasIndex>;

  constructor(
    private readonly ontology: KBOntology,
    private readonly registry: ConceptRegistry,
    private readonly compiledDir: string,
    private readonly rawDir?: string,
    private readonly pluginHost?: PluginHost,
  ) {
    this.aliasIndex = buildAliasIndex(ontology);
  }

  // ── Public: lint ──────────────────────────────────────────────────────────────

  async lint(options: LintOptions = {}): Promise<LintReport> {
    const minWordCount = options.minArticleWordCount ?? 50;
    const dupThreshold = options.duplicateSimilarityThreshold ?? 0.15;
    const skipDocIds = new Set(options.skipDocIds ?? []);

    // Read all compiled articles
    const articles = await readCompiledArticles(
      this.registry,
      this.compiledDir,
      (docId, reason) => {
        // Articles that can't be read are implicitly skipped
      },
    );

    const filteredArticles = articles.filter((a) => !skipDocIds.has(a.docId));
    const allIssues: LintIssue[] = [];

    // Build link graph (needed for orphan/reciprocal checks)
    const graph = buildLinkGraph(filteredArticles, this.registry);

    // ── Per-article checks ──────────────────────────────────────────────────────

    // Q1: Correct bounded concurrency via coroutine-worker pattern.
    // The previous Promise.race pool always removed inFlight[0] regardless of
    // which promise won the race, silently losing results from other articles.
    //
    // This pattern is safe: nextIdx++ is a synchronous operation between
    // await points, so no two workers ever claim the same article index.
    let nextIdx = 0;
    const perArticleResults: LintIssue[][] = new Array(filteredArticles.length);

    const runWorker = async (): Promise<void> => {
      while (nextIdx < filteredArticles.length) {
        const idx = nextIdx++;
        const article = filteredArticles[idx]!;
        try {
          const issues: LintIssue[] = [];

          // Structural
          const missingET = checkMissingEntityType(article);
          if (missingET) issues.push(missingET);

          const unknownET = checkUnknownEntityType(article, this.ontology);
          if (unknownET) issues.push(unknownET);

          issues.push(...checkMissingRequiredFields(article, this.ontology));
          issues.push(...checkInvalidFieldValues(article, this.ontology));

          // Linking
          issues.push(...checkBrokenWikilinks(article, this.registry));
          issues.push(...checkNonCanonicalWikilinks(article, this.registry, this.aliasIndex));
          issues.push(
            ...checkUnlinkedMentions(article, this.ontology, this.registry, this.aliasIndex),
          );

          const orphan = checkOrphanedArticle(article, graph);
          if (orphan) issues.push(orphan);

          issues.push(...checkMissingReciprocalLinks(article, graph, this.ontology));

          // Quality
          const quality = checkLowArticleQuality(article, minWordCount);
          if (quality) issues.push(quality);

          const sourceRefIssues = await checkBrokenSourceRefs(article);
          issues.push(...sourceRefIssues);

          const stubIssue = await checkStubWithSources(article, this.rawDir, this.registry);
          if (stubIssue) issues.push(stubIssue);

          perArticleResults[idx] = issues;
        } catch {
          perArticleResults[idx] = []; // Don't let one article's failure abort the whole lint
        }
      }
    };

    const LINT_CONCURRENCY = 8; // Higher than LLM ops since these are local FS calls
    await Promise.all(
      Array.from({ length: Math.min(LINT_CONCURRENCY, filteredArticles.length) }, runWorker),
    );

    for (const issues of perArticleResults) {
      if (issues) allIssues.push(...issues);
    }

    // ── Cross-article checks ────────────────────────────────────────────────────

    allIssues.push(...checkDuplicateCandidates(filteredArticles, dupThreshold));

    // Phase 5D: Cross-article semantic consistency check
    allIssues.push(...checkContradictoryClaims(filteredArticles, this.registry));

    // ── Plugin lint rules ────────────────────────────────────────────────────────
    // Discovered via PluginHost.getLinterRules() — run per-article, best-effort.

    const pluginRules: LinterRuleAdapter[] = this.pluginHost?.getLinterRules() ?? [];
    if (pluginRules.length > 0) {
      for (const article of filteredArticles) {
        if (skipDocIds.has(article.docId)) continue;
        for (const rule of pluginRules) {
          try {
            const ruleIssues = await rule.check(article.docId, article.body);
            for (const ri of ruleIssues) {
              allIssues.push({
                code: `PLUGIN_${rule.ruleId}`,
                severity: rule.severity ?? "warning",
                docId: article.docId,
                message: ri.message,
                suggestion: ri.fix,
                autoFixable: false,
              });
            }
          } catch {
            /* skip failing plugin rules */
          }
        }
      }
    }

    // ── Compile report ──────────────────────────────────────────────────────────

    return this.buildReport(filteredArticles.length, allIssues);
  }

  // ── Public: fix ───────────────────────────────────────────────────────────────

  /**
   * Apply all auto-fixable issues from a lint report.
   *
   * @param report - LintReport from `lint()`
   * @param dryRun - If true, compute fixes but don't write to disk
   */
  async fix(report: LintReport, dryRun: boolean = false): Promise<AutoFixResult> {
    return applyFixes(report.issues, this.compiledDir, dryRun);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private buildReport(articlesChecked: number, issues: LintIssue[]): LintReport {
    const summary = {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
      autoFixable: issues.filter((i) => i.autoFixable).length,
      byCode: {} as Partial<Record<import("./types.js").LintCode, number>>,
    };

    for (const issue of issues) {
      summary.byCode[issue.code] = (summary.byCode[issue.code] ?? 0) + 1;
    }

    return {
      generatedAt: Date.now(),
      articlesChecked,
      issues,
      summary,
    };
  }
}
