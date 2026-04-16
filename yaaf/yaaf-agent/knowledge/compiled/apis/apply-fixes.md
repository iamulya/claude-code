---
title: applyFixes
entity_type: api
summary: Applies auto-fixable lint issues to compiled article files in the YAAF knowledge base.
export_name: applyFixes
source_file: src/knowledge/compiler/linter/fixer.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:02.333Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
confidence: 1
---

## Overview
`applyFixes` is a utility function within the YAAF knowledge base compiler's linting subsystem. It automates the correction of specific linting violations found in compiled article files. 

The function is designed to be conservative in its operations. It groups changes by file to minimize disk I/O, applying a single write per file. It also performs safety checks, skipping issues where the target text is no longer found (which may occur if a previous fix in the same run already modified the line). The fixer never removes content; it only adds or rewrites wikilinks and frontmatter fields.

### Supported Auto-fixes
The function can resolve the following issue types:
*   **NON_CANONICAL_WIKILINK**: Rewrites a wikilink using an alias to its canonical title (e.g., `[[alias]]` becomes `[[canonical title]]`).
*   **UNLINKED_MENTION**: Automatically wraps the first occurrence of a known term in wikilink syntax.
*   **MISSING_REQUIRED_FIELD**: Injects a default value into the article's YAML frontmatter if a required field is absent.

## Signature / Constructor

```typescript
export async function applyFixes(
  issues: LintIssue[],
  compiledDir: string,
  dryRun: boolean = false,
): Promise<AutoFixResult>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `issues` | `LintIssue[]` | An array of linting issues identified by the compiler. |
| `compiledDir` | `string` | The filesystem path to the directory containing the compiled articles. |
| `dryRun` | `boolean` | Optional. If `true`, the function calculates the fixes without writing changes to the disk. Defaults to `false`. |

### Return Value
Returns a `Promise<AutoFixResult>`, which contains details about the modifications made, including a list of `FixedIssue` objects and the total count of successful applications.

## Examples

### Applying Fixes to a Knowledge Base
This example demonstrates how to pass issues discovered during a linting pass to the fixer.

```typescript
import { applyFixes } from 'yaaf/knowledge/compiler/linter/fixer';

async function runFixer(lintIssues) {
  const compiledPath = './dist/knowledge';
  
  const result = await applyFixes(
    lintIssues, 
    compiledPath, 
    false // Apply changes to disk
  );

  console.log(`Successfully applied ${result.fixedCount} fixes.`);
}
```

### Performing a Dry Run
You can use the `dryRun` parameter to preview changes without modifying the source files.

```typescript
import { applyFixes } from 'yaaf/knowledge/compiler/linter/fixer';

const result = await applyFixes(issues, './dist/knowledge', true);

result.fixedIssues.forEach(issue => {
  console.log(`Would fix ${issue.type} in ${issue.file}`);
});
```