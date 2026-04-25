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

import { readFile } from "fs/promises";
import { join } from "path";
import { atomicWriteFile } from "../atomicWrite.js";
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

    // Apply all fixes for this file in sequence.
    // CRITICAL: Separate frontmatter from body. Text replacements (especially
    // UNLINKED_MENTION → adds [[wikilinks]]) must only apply to the BODY,
    // never to frontmatter YAML. Inserting wikilinks into summary/search_terms
    // fields corrupts the YAML structure.
    const fmEndMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    const fmPart = fmEndMatch ? fmEndMatch[0] : "";
    let bodyPart = fmEndMatch ? content.slice(fmPart.length) : content;

    for (const issue of docIssues) {
      if (!issue.fix) continue;
      const { findText, replaceWith, firstOccurrenceOnly } = issue.fix;

      // For MISSING_REQUIRED_FIELD fixes that target "\n---" (frontmatter insertion),
      // we need to apply to the full content including frontmatter
      const isFrontmatterFix = issue.code === "MISSING_REQUIRED_FIELD";
      const targetText = isFrontmatterFix ? (fmPart + bodyPart) : bodyPart;

      if (!targetText.includes(findText)) {
        skipped.push({
          issue,
          reason: `Target text "${findText.slice(0, 40)}" not found (may already be fixed)`,
        });
        continue;
      }

      if (isFrontmatterFix) {
        // Apply to the full content (frontmatter fix)
        const full = fmPart + bodyPart;
        if (firstOccurrenceOnly) {
          const idx = full.indexOf(findText);
          if (idx !== -1) {
            const updated = full.slice(0, idx) + replaceWith + full.slice(idx + findText.length);
            const newFmEnd = updated.match(/^---\n[\s\S]*?\n---\n/);
            if (newFmEnd) {
              // Re-split so future body fixes apply correctly
              bodyPart = updated.slice(newFmEnd[0].length);
            }
          }
        }
      } else {
        // Apply to body only — this prevents wikilinks from being inserted
        // into frontmatter fields like summary, search_terms, etc.
        if (firstOccurrenceOnly) {
          // Use bodyOffset when available — this is the exact position in the
          // body that the check verified is NOT inside a wikilink/code/link.
          // Without this, indexOf finds the first occurrence which may be
          // inside a protected zone (e.g. [Linter](../...) → [[[Linter]]])
          const offset = issue.fix.bodyOffset;
          let idx: number;
          if (offset !== undefined && bodyPart.slice(offset, offset + findText.length) === findText) {
            idx = offset;
          } else {
            idx = bodyPart.indexOf(findText);
          }
          if (idx !== -1) {
            bodyPart = bodyPart.slice(0, idx) + replaceWith + bodyPart.slice(idx + findText.length);
          }
        } else {
          bodyPart = bodyPart.split(findText).join(replaceWith);
        }
      }

      fixed.push({ docId, code: issue.code, description: issue.message });
    }

    // Reassemble the full file
    const modified = fmPart + bodyPart;

    // Write the file only if changes were made
    // M1: plain writeFile() risks a half-written compiled article on crash.
    // Use atomicWriteFile (tmp→rename) for crash-safe updates.
    if (!dryRun && modified !== content) {
      await atomicWriteFile(filePath, modified);
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
