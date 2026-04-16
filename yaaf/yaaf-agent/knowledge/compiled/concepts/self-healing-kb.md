---
tags:
  - maintenance
  - automation
  - quality-assurance
title: Self-healing Knowledge Base
entity_type: concept
summary: A maintenance pattern in YAAF that uses static analysis and automated remediation to ensure the integrity and quality of the knowledge base.
related_subsystems:
  - knowledge
  - compiler
stub: false
compiled_at: 2026-04-16T14:25:28.348Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/linter.ts
confidence: 0.85
---

## What It Is
The Self-healing Knowledge Base is a quality assurance and maintenance pattern in YAAF designed to ensure the structural integrity and factual consistency of an agent's internal documentation. As knowledge bases scale, manual verification of cross-references, metadata, and ontological alignment becomes error-prone. This concept introduces an automated "self-healing" pass that identifies discrepancies and applies programmatic corrections to maintain a production-grade knowledge repository.

The primary goal of this pattern is to reduce the manual overhead of knowledge management by automating the detection of broken links, missing metadata, and violations of the defined ontology.

## How It Works in YAAF
The self-healing mechanism is orchestrated by the `KBLinter` class within the knowledge compiler subsystem. It operates as a post-compilation step that analyzes the compiled wiki articles.

The process follows a three-stage lifecycle:
1.  **Scanning**: The `KBLinter` performs a parallel scan of the compiled knowledge base. It utilizes a `ConceptRegistry` and `KBOntology` to build an index of valid entities and aliases.
2.  **Auto-fixing**: The system identifies issues that have deterministic resolutions. For example, if a reference points to an alias that has a clear primary target, the linter can automatically update the reference.
3.  **Reporting**: For issues that cannot be resolved automatically (e.g., ambiguous references or missing required sections), the system produces a structured `LintReport`.

The implementation relies on `LinterRuleAdapter` plugins, allowing the framework to extend the types of static checks performed during the healing pass.

## Configuration
Developers trigger the self-healing process through the `KBLinter` API. The linter requires the current ontology, the concept registry, and the path to the compiled articles.

```typescript
const linter = new KBLinter(ontology, registry, compiledDir);

// Scan the compiled KB for issues
const report = await linter.lint();

// Apply automated fixes to the knowledge base
const fixes = await linter.fix(report);

// The 'fixes' object contains details on what was changed, 
// while the 'report' identifies remaining manual tasks.
```

## Sources
* `src/knowledge/compiler/linter/linter.ts`