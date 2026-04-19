/**
 * C1 — Linter Heal Mode
 *
 * LLM-powered repair of lint issues that can't be fixed with simple
 * text replacement. Opt-in — requires explicit `--heal` flag.
 *
 * What heal mode fixes:
 * - BROKEN_WIKILINK: Finds the best matching article or removes the link
 * - STUB_WITH_SOURCES: Triggers re-synthesis of the stub into a full article
 * - LOW_ARTICLE_QUALITY: Asks LLM to expand thin sections with more detail
 * - ORPHANED_ARTICLE: Identifies related articles and suggests crosslinks
 *
 * What it does NOT fix (deferred to C2 Discovery):
 * - Missing articles (no source material)
 * - Contradictory claims (needs human review)
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { atomicWriteFile } from "./atomicWrite.js";
import type { LLMCallFn } from "./llmClient.js";
import type { LintReport, LintIssue } from "./linter/index.js";
import type { ConceptRegistry } from "../ontology/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HealOptions = {
  /** Maximum LLM calls per heal run. Default: 20 */
  maxCalls?: number;
  /** Only report what would be healed — don't write changes. Default: false */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: (event: HealProgressEvent) => void;
};

export type HealProgressEvent =
  | { type: "heal:start"; totalIssues: number; healable: number }
  | { type: "heal:fixing"; docId: string; code: string; attempt: number; total: number }
  | { type: "heal:fixed"; docId: string; code: string }
  | { type: "heal:skipped"; docId: string; code: string; reason: string }
  | { type: "heal:complete"; result: HealResult };

export type HealResult = {
  /** Number of issues successfully healed */
  healed: number;
  /** Number of issues skipped (no action possible) */
  skipped: number;
  /** Number of LLM calls made */
  llmCalls: number;
  /** Per-issue details */
  details: HealDetail[];
  /** Total elapsed time (ms) */
  durationMs: number;
};

export type HealDetail = {
  docId: string;
  code: string;
  action: "healed" | "skipped" | "failed";
  message: string;
};

// ── Healable lint codes ───────────────────────────────────────────────────────

const HEALABLE_CODES = new Set(["BROKEN_WIKILINK", "LOW_ARTICLE_QUALITY", "ORPHANED_ARTICLE"]);

// ── Heal Engine ───────────────────────────────────────────────────────────────

/**
 * Run LLM-powered heal on a lint report.
 *
 * @example
 * ```ts
 * const llm = makeKBLLMClient()
 * const lintReport = await compiler.lint()
 * const healResult = await healLintIssues(llm, lintReport, compiledDir, registry)
 * ```
 */
export async function healLintIssues(
  llm: LLMCallFn,
  report: LintReport,
  compiledDir: string,
  registry: ConceptRegistry,
  options: HealOptions = {},
): Promise<HealResult> {
  const startMs = Date.now();
  const maxCalls = options.maxCalls ?? 20;
  const emit = options.onProgress ?? (() => {});

  const healable = report.issues.filter((i) => HEALABLE_CODES.has(i.code));

  emit({ type: "heal:start", totalIssues: report.issues.length, healable: healable.length });

  const details: HealDetail[] = [];
  let llmCalls = 0;
  let attempt = 0;

  // Group issues by docId to batch file reads
  const byDocId = new Map<string, LintIssue[]>();
  for (const issue of healable) {
    const group = byDocId.get(issue.docId) ?? [];
    group.push(issue);
    byDocId.set(issue.docId, group);
  }

  for (const [docId, issues] of byDocId) {
    if (llmCalls >= maxCalls) {
      for (const issue of issues) {
        details.push({
          docId,
          code: issue.code,
          action: "skipped",
          message: "Max LLM call budget reached",
        });
      }
      continue;
    }

    const filePath = join(compiledDir, `${docId}.md`);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      for (const issue of issues) {
        details.push({
          docId,
          code: issue.code,
          action: "skipped",
          message: "File not found on disk",
        });
      }
      continue;
    }

    let modified = content;
    let fileChanged = false;

    for (const issue of issues) {
      attempt++;
      emit({ type: "heal:fixing", docId, code: issue.code, attempt, total: healable.length });

      try {
        const result = await healSingleIssue(llm, issue, modified, registry);
        llmCalls++;

        if (result.healed && result.newContent) {
          modified = result.newContent;
          fileChanged = true;
          details.push({ docId, code: issue.code, action: "healed", message: result.message });
          emit({ type: "heal:fixed", docId, code: issue.code });
        } else {
          details.push({ docId, code: issue.code, action: "skipped", message: result.message });
          emit({ type: "heal:skipped", docId, code: issue.code, reason: result.message });
        }
      } catch (err) {
        details.push({
          docId,
          code: issue.code,
          action: "failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (fileChanged && !options.dryRun) {
      // N3: plain writeFile() risks a half-written healed article on crash.
      // atomicWriteFile uses tmp-rename for crash safety.
      await atomicWriteFile(filePath, modified);
    }
  }

  const result: HealResult = {
    healed: details.filter((d) => d.action === "healed").length,
    skipped: details.filter((d) => d.action === "skipped").length,
    llmCalls,
    details,
    durationMs: Date.now() - startMs,
  };

  emit({ type: "heal:complete", result });
  return result;
}

// ── Per-issue heal logic ──────────────────────────────────────────────────────

async function healSingleIssue(
  llm: LLMCallFn,
  issue: LintIssue,
  articleContent: string,
  registry: ConceptRegistry,
): Promise<{ healed: boolean; newContent?: string; message: string }> {
  switch (issue.code) {
    case "BROKEN_WIKILINK":
      return healBrokenWikilink(llm, issue, articleContent, registry);
    case "LOW_ARTICLE_QUALITY":
      return healLowQuality(llm, issue, articleContent);
    case "ORPHANED_ARTICLE":
      return healOrphanedArticle(llm, issue, articleContent, registry);
    default:
      return { healed: false, message: `No heal strategy for ${issue.code}` };
  }
}

// ── BROKEN_WIKILINK ───────────────────────────────────────────────────────────

async function healBrokenWikilink(
  llm: LLMCallFn,
  issue: LintIssue,
  content: string,
  registry: ConceptRegistry,
): Promise<{ healed: boolean; newContent?: string; message: string }> {
  const brokenTarget = issue.relatedTarget;
  if (!brokenTarget) return { healed: false, message: "No target info in lint issue" };

  // Build list of available articles
  const available = Array.from(registry.values())
    .map((e) => `- "${e.canonicalTitle}" (${e.docId})`)
    .join("\n");

  const response = await llm({
    system: `You are a knowledge base editor. Given a broken wikilink target and a list of existing articles, decide the best action.`,
    user: `Broken wikilink: [[${brokenTarget}]]

Available articles in the KB:
${available}

What should we do? Respond with EXACTLY one line in one of these formats:
- REPLACE: [[Correct Title]] — if there's a matching article (use the exact title from the list)
- REMOVE — if the link target doesn't match anything and should be unlinked (keep the text, remove [[]])
- KEEP — if you're unsure and want to leave it for human review`,
    temperature: 0.1,
    maxTokens: 256,
  });

  const trimmed = response.trim().split("\n")[0] ?? "";

    const searchStr = `[[${brokenTarget}]]`;
    if (trimmed.startsWith("REPLACE:")) {
      const newTarget = trimmed.match(/\[\[(.+?)\]\]/)?.[1];
      if (newTarget) {
        // Q3: String.replace(str, str) interprets $ sequences in the replacement
        // ($&, $1, $', $`). KB article titles may contain $ (e.g. "$100 Strategy").
        // Use index-based splice to suppress all $ interpolation.
        const replaceStr = `[[${newTarget}]]`;
        const idx = content.indexOf(searchStr);
        const newContent = idx >= 0
          ? content.slice(0, idx) + replaceStr + content.slice(idx + searchStr.length)
          : content;
        return {
          healed: true,
          newContent,
          message: `Replaced [[${brokenTarget}]] → [[${newTarget}]]`,
        };
      }
    }

    if (trimmed.startsWith("REMOVE")) {
      const idx = content.indexOf(searchStr);
      const newContent = idx >= 0
        ? content.slice(0, idx) + brokenTarget + content.slice(idx + searchStr.length)
        : content;
      return { healed: true, newContent, message: `Unlinked [[${brokenTarget}]] → plain text` };
    }

  return { healed: false, message: `LLM chose KEEP for [[${brokenTarget}]]` };
}

// ── LOW_ARTICLE_QUALITY ───────────────────────────────────────────────────────

async function healLowQuality(
  llm: LLMCallFn,
  issue: LintIssue,
  content: string,
): Promise<{ healed: boolean; newContent?: string; message: string }> {
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Only heal if moderately short — very short articles need fresh synthesis
  if (wordCount < 50) {
    return { healed: false, message: "Article too short for heal — needs full re-synthesis" };
  }

  const response = await llm({
    system: `You are a knowledge base editor. Expand the following article to improve its quality.

Rules:
- Add 1-2 paragraphs of relevant technical detail
- Maintain the existing structure (frontmatter, headings)
- Do NOT hallucinate facts — only add information that can be reasonably inferred from the existing content
- Use the same writing style as the existing text
- Keep [[wikilinks]] if present
- Return the COMPLETE article with your additions integrated naturally`,
    user: `This article was flagged as low quality. Please expand it:\n\n${content}`,
    temperature: 0.3,
    maxTokens: 4096,
  });

  if (!response.trim()) {
    return { healed: false, message: "LLM returned empty response" };
  }

  // Sanity check: new content should be longer
  const newWordCount = response.split(/\s+/).filter(Boolean).length;
  if (newWordCount <= wordCount) {
    return { healed: false, message: "LLM response was not longer than original" };
  }

  // N4: verify frontmatter block survived — LLM may return body-only expansion,
  // stripping entity_type/title etc. An article without frontmatter triggers
  // MISSING_ENTITY_TYPE on next lint, re-queuing this article for heal → infinite loop.
  const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---/.test(response);
  if (!hasFrontmatter) {
    return {
      healed: false,
      message: "LLM response is missing frontmatter block — rejecting to prevent structure corruption",
    };
  }

  return {
    healed: true,
    newContent: response,
    message: `Expanded from ${wordCount} to ${newWordCount} words`,
  };
}

// ── ORPHANED_ARTICLE ──────────────────────────────────────────────────────────

async function healOrphanedArticle(
  llm: LLMCallFn,
  issue: LintIssue,
  content: string,
  registry: ConceptRegistry,
): Promise<{ healed: boolean; newContent?: string; message: string }> {
  // Extract the title
  const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  const title = titleMatch?.[1] ?? issue.docId;

  // Build list of other articles that could link here
  const otherArticles = Array.from(registry.values())
    .filter((e) => e.docId !== issue.docId)
    .map((e) => `- "${e.canonicalTitle}" (${e.entityType})`)
    .join("\n");

  const response = await llm({
    system: `You are a knowledge base editor. An article is orphaned (no other articles link to it). Suggest which section of this article should mention related articles to improve connectivity.

Respond with a SINGLE paragraph (2-3 sentences) that could be added as a "Related Topics" section at the end of the article body (before any ---). Use [[wikilinks]] to reference related articles. Only reference articles from the provided list.`,
    user: `Orphaned article: "${title}" (${issue.docId})

Article content:
${content.slice(0, 2000)}

Other articles in the KB:
${otherArticles}`,
    temperature: 0.3,
    maxTokens: 512,
  });

  if (!response.trim()) {
    return { healed: false, message: "LLM returned empty response" };
  }

  // Append a "Related Topics" section before the last --- or at the end
  const section = `\n\n## Related Topics\n\n${response.trim()}\n`;
  const newContent = content.trimEnd() + section;

  return {
    healed: true,
    newContent,
    message: `Added "Related Topics" section with cross-links`,
  };
}
