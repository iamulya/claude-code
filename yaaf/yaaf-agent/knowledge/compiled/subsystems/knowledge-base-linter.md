---
title: Knowledge Base Linter
entity_type: subsystem
summary: A subsystem responsible for linting, validating, and reporting issues in compiled knowledge base articles and their interconnections.
primary_files:
 - src/knowledge/compiler/linter/index.ts
 - src/knowledge/compiler/linter/types.ts
 - src/knowledge/compiler/linter/reader.ts
exports:
 - KBLinter
 - LintIssue
 - LintReport
 - AutoFixResult
 - LintCode
 - LintSeverity
search_terms:
 - knowledge base validation
 - wiki linting
 - find broken links in KB
 - how to check for orphaned articles
 - auto-fix knowledge base errors
 - static analysis for markdown
 - KB self-healing
 - linting rules for YAAF KB
 - detect contradictory claims
 - non-canonical wikilink
 - unlinked mention detection
 - KBLinter usage
 - check for missing frontmatter fields
stub: false
compiled_at: 2026-04-24T18:14:29.271Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Knowledge Base [Linter](../concepts/linter.md) is a subsystem designed to perform static analysis on a compiled YAAF knowledge base. Its primary purpose is to scan all compiled articles, identify a wide range of structural, linking, and quality issues, and produce a structured report. This process ensures the integrity, consistency, and overall health of the knowledge base [Source 2].

The linter implements what has been described as a "self-healing" pass, which involves three steps [Source 2]:
1. Scan the compiled knowledge base for a predefined set of issues.
2. Automatically fix issues that can be resolved without human intervention.
3. Output a human-readable report of the remaining issues that require manual attention.

## Architecture

The central component of this subsystem is the `KBLinter` class, which acts as the orchestrator for the entire [Linting](../concepts/linting.md) process. It is initialized with the knowledge base [Ontology](../concepts/ontology.md), the [Concept Registry](./concept-registry.md), and the directory containing the compiled articles [Source 2].

The linting process follows these steps:
1.  **Reading**: The linter first reads and parses all compiled articles from the specified directory using a dedicated reader module [Source 2].
2.  **Checking**: It then runs a series of static checks in parallel against the loaded articles [Source 2]. These checks are designed to find specific types of problems.
3.  **Reporting**: The results are aggregated into a `LintReport` object, which contains a list of `LintIssue` objects. Each `LintIssue` describes a single problem, including its severity, location, and a human-readable message [Source 2, Source 3].
4.  **Fixing (Optional)**: The linter can also consume a `LintReport` to apply automated fixes. A dedicated `fixer` module handles the logic for modifying article files on disk for issues marked as `autoFixable` [Source 2, Source 3]. The result of this operation is an `AutoFixResult` object, detailing which issues were fixed and which were skipped [Source 3].

Issues are classified by a `LintCode`, which is a string enum that categorizes problems into several groups [Source 3]:
*   **Structural Issues**: Critical problems like `BROKEN_WIKILINK`, `MISSING_REQUIRED_FIELD`, and `UNKNOWN_ENTITY_TYPE`. These are typically assigned an `error` severity.
*   **Linking Issues**: Problems related to the hyperlink graph, such as `ORPHANED_ARTICLE`, `NON_CANONICAL_WIKILINK`, and `UNLINKED_MENTION`. These usually have a `warning` severity.
*   **Quality Issues**: Less critical problems that suggest areas for improvement, like `LOW_ARTICLE_QUALITY` or `DUPLICATE_CANDIDATE`. These are often `info` or `warning` severity.
*   **Plugin-defined Issues**: Custom rules contributed by plugins, identified by the prefix `PLUGIN_`.

## Integration Points

The Knowledge Base Linter integrates with several other parts of the YAAF framework:
*   **Ontology Subsystem**: The `KBLinter` requires an instance of `KBOntology` and `ConceptRegistry` to validate entity types, resolve [Wikilinks](../concepts/wikilinks.md), and check for canonical terms [Source 2].
*   **Plugin Host**: The linter is extensible via plugins. It can load custom linting rules that conform to the `LinterRuleAdapter` interface provided by the Plugin Host [Source 2].
*   **[Knowledge Base Compiler](./knowledge-base-compiler.md)**: The linter operates on the output of the compiler. It reads the compiled article files from disk as its primary input [Source 2].

## Key APIs

*   **`KBLinter`**: The main class that orchestrates the linting and fixing process. Its primary methods are `lint()` to generate a report and `fix()` to apply auto-fixes [Source 2].
    ```typescript
    const linter = new KBLinter(ontology, registry, compiledDir);
    const report = await linter.lint();
    const fixes = await linter.fix(report);
    ```
*   **`LintIssue`**: A data structure representing a single detected issue. It contains the `LintCode`, `message`, `severity`, `docId`, and other metadata, including whether the issue is `autoFixable` [Source 3].
*   **`LintReport`**: The top-level object returned by the `lint()` method, containing an array of all `LintIssue`s found [Source 1].
*   **`AutoFixResult`**: The object returned by the `fix()` method, which summarizes the outcome of the [Auto-Fixing](../concepts/auto-fixing.md) process, listing fixed and skipped issues [Source 3].
*   **`LintCode`**: A string literal type that enumerates all possible issue identifiers, from `BROKEN_WIKILINK` to `CONTRADICTORY_CLAIMS` [Source 3].

## Extension Points

The primary mechanism for extending the linter's capabilities is through plugins. Developers can create custom linting rules by implementing the `LinterRuleAdapter` interface and registering it with the `PluginHost`. The linter will automatically discover and execute these rules. Plugin-defined rules must use a `LintCode` with the `PLUGIN_` prefix to avoid conflicts with built-in rules [Source 2, Source 3].

## Sources
[Source 1]: src/knowledge/compiler/linter/index.ts
[Source 2]: src/knowledge/compiler/linter/linter.ts
[Source 3]: src/knowledge/compiler/linter/types.ts