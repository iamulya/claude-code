---
title: LintOptions
entity_type: api
summary: Configuration options for customizing the behavior of the knowledge base linter.
export_name: LintOptions
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - linter configuration
 - knowledge base validation options
 - customize lint rules
 - ignore lint errors
 - set lint severity
 - KB linting settings
 - YAAF knowledge linter
 - how to configure linter
 - linting autofix options
 - knowledge base quality control
 - linter settings type
stub: false
compiled_at: 2026-04-24T17:17:29.101Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `LintOptions` type defines the structure for a configuration object that customizes the behavior of the YAAF Knowledge Base (KB) [Linter](../concepts/linter.md). [when](./when.md) running the linter, an object of this type can be provided to control aspects such as which [Linting](../concepts/linting.md) rules to enable or disable, the severity level for different issues, and other linter-specific settings.

## Signature

`LintOptions` is exported as a TypeScript type. The source material re-exports this type from a barrel file but does not provide its detailed property definitions [Source 1].

```typescript
// Re-exported from src/knowledge/compiler/linter/index.ts
export type { LintOptions } from "./types.js";
```

The specific fields within the `LintOptions` object are not defined in the provided source material. Conceptually, it is a key-value object for linter settings.

## Examples

The following example demonstrates the conceptual usage of `LintOptions` when invoking a hypothetical linter function.

```typescript
import { runLinter, LintOptions } from 'yaaf/knowledge'; // Note: Hypothetical import path

// Define custom linting options.
// The specific properties available in LintOptions are not detailed in the source material.
const customLintOptions: LintOptions = {
  // Example of conceptual properties:
  // severity: {
  //   'broken-link': 'error',
  //   'unused-entity': 'warn',
  // },
  // rules: {
  //   'frontmatter-check': false,
  // },
};

// Pass the options object to a function that runs the linter.
async function lintMyKnowledgeBase() {
  console.log('Running linter with custom options...');
  const report = await runLinter({ options: customLintOptions });
  console.log('Linting complete:', report);
}

lintMyKnowledgeBase();
```

## Sources

[Source 1]: src/knowledge/compiler/linter/index.ts