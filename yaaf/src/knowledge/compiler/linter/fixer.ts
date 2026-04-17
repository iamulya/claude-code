/**
 * Auto-Fixer
 *
 * Applies auto-fixable lint issues to compiled article files.
 *
 * Auto-fixable issues:
 * - NON_CANONICAL_WIKILINK: rewrites [[alias]] → [[canonical title]]
 * - UNLINKED_MENTION: adds [[wikilink]] to first occurrence of term
 * - MISSING_REQUIRED_FIELD: injects default value into frontmatter
 *
 * The fixer is conservative:
 * - Applies changes to one issue at a time, building the change incrementally
 * - Groups changes by file to do a single write per file
 * - Skips issues where the target text is no longer found (may have been fixed
 * by a previous fix in the same run)
 * - Never removes content — only adds or rewrites wikilinks
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { LintIssue, AutoFixResult, FixedIssue } from "./types.js";

// ── Auto-fixer ────────────────────────────────────────────────────────────────

export async function applyFixes(
  issues: LintIssue[],
  compiledDir: string,
  dryRun: boolean = false,
): Promise<AutoFixResult> {
  const fixableIssues = issues.filter((i) => i.autoFixable && i.fix);
  const fixed: FixedIssue[] = [];
  const skipped: AutoFixResult["skipped"] = [];

  // Group fixable issues by docId to minimize file reads/writes
  const byDocId = new Map<string, LintIssue[]>();
  for (const issue of fixableIssues) {
    const group = byDocId.get(issue.docId) ?? [];
    group.push(issue);
    byDocId.set(issue.docId, group);
  }

  for (const [docId, docIssues] of byDocId) {
    const filePath = join(compiledDir, `${docId}.md`);
    let content: string;

    try {
      content = await readFile(filePath, "utf-8");
    } catch (err) {
      for (const issue of docIssues) {
        skipped.push({ issue, reason: `Could not read file: ${filePath}` });
      }
      continue;
    }

    // Apply all fixes for this file in sequence
    let modified = content;
    for (const issue of docIssues) {
      if (!issue.fix) continue;
      const { findText, replaceWith, firstOccurrenceOnly } = issue.fix;

      if (!modified.includes(findText)) {
        skipped.push({
          issue,
          reason: `Target text "${findText.slice(0, 40)}" not found (may already be fixed)`,
        });
        continue;
      }

      if (firstOccurrenceOnly) {
        modified = modified.replace(findText, replaceWith);
      } else {
        modified = modified.split(findText).join(replaceWith);
      }

      fixed.push({ docId, code: issue.code, description: issue.message });
    }

    // Write the file only if changes were made
    if (!dryRun && modified !== content) {
      await writeFile(filePath, modified, "utf-8");
    }
  }

  // Non-fixable issues just get reported as skipped
  const nonFixable = issues.filter((i) => !i.autoFixable || !i.fix);
  for (const issue of nonFixable) {
    skipped.push({
      issue,
      reason: "Issue is not auto-fixable — requires human review or re-compilation",
    });
  }

  return {
    fixedCount: fixed.length,
    fixed,
    skipped,
  };
}
