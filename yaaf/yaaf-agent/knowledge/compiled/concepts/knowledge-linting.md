---
title: Knowledge Linting
entity_type: concept
summary: The pattern of ensuring consistency and integrity in the YAAF knowledge base through automated checks and repairs.
stub: false
compiled_at: 2026-04-16T14:25:06.950Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
confidence: 0.85
---

---
title: "Knowledge Linting"
entity_type: "concept"
summary: "The pattern of ensuring consistency and integrity in the YAAF knowledge base through automated checks and repairs."
related_subsystems:
  - "Knowledge Compiler"

## What It Is
Knowledge Linting is the process of maintaining the structural and semantic integrity of the YAAF knowledge base. It identifies discrepancies in article metadata, terminology usage, and cross-referencing, providing a mechanism to automatically repair common issues. This ensures that the compiled knowledge base remains a reliable source of truth for LLM-powered agents.

The primary goal of Knowledge Linting is to enforce framework-wide standards without requiring manual intervention for repetitive formatting or linking tasks.

## How It Works in YAAF
Knowledge Linting is implemented via a specialized linter and an associated **Auto-Fixer**. The system analyzes compiled article files and identifies specific categories of `LintIssue`. When an issue is identified as "auto-fixable," the framework can programmatically resolve it.

### Auto-Fixable Issues
The YAAF Knowledge Linting system currently handles three primary types of automated repairs:

*   **NON_CANONICAL_WIKILINK**: Rewrites wikilinks that use an alias to point directly to the canonical title (e.g., converting `[[alias]]` to `[[canonical title]]`).
*   **UNLINKED_MENTION**: Scans for the first occurrence of a known term within an article and wraps it in a `[[wikilink]]` to ensure proper cross-referencing.
*   **MISSING_REQUIRED_FIELD**: Detects missing mandatory fields in an article's YAML frontmatter and injects a default value.

### Fixer Strategy
The implementation, found in `src/knowledge/compiler/linter/fixer.ts`, follows a conservative execution model to prevent data loss or corruption:

1.  **Incremental Application**: Changes are built one issue at a time.
2.  **File Grouping**: To optimize I/O, all changes for a specific file are batched into a single write operation.
3.  **Safety Checks**: The fixer skips issues if the target text is no longer found in the file, which may occur if a previous fix in the same run already modified that section.
4.  **Additive Only**: The system is designed to never remove content; it only adds metadata or rewrites existing wikilinks for accuracy.

The core function driving this process is `applyFixes`, which accepts an array of `LintIssue` objects and the directory of compiled articles.

## Configuration
The Knowledge Linting process can be executed in a "dry run" mode to preview changes before they are committed to the file system.

```typescript
import { applyFixes } from './knowledge/compiler/linter/fixer';

// Example of applying fixes to a compiled directory
const result = await applyFixes(
  detectedIssues, 
  './dist/knowledge', 
  false // dryRun: set to true to preview changes without writing
);
```

## See Also
*   [[Knowledge Compiler]]
*   [[Auto-Fixer]]