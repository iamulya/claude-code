---
summary: An interface for plugins to provide custom linting rules to the KBLinter.
export_name: LinterRuleAdapter
source_file: src/plugin/types.js
category: type
title: LinterRuleAdapter
entity_type: api
search_terms:
 - custom linting rules
 - plugin linter integration
 - KBLinter extension
 - how to add new lint checks
 - static analysis plugin
 - knowledge base validation
 - adapter for linting
 - plugin adapter interface
 - extending the linter
 - YAAF linter plugins
 - custom static checks
stub: false
compiled_at: 2026-04-25T00:08:39.528Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `LinterRuleAdapter` is an [adapter interface](../concepts/adapter-interfaces.md) that allows plugins to define and provide custom linting rules to the YAAF Knowledge Base Linter (KBLinter). Plugins that implement this interface can be registered with the [PluginHost](./plugin-host.md), which then makes the custom rules available to the linter during its analysis of the knowledge base [Source 1]. This provides an extension point for developers to enforce project-specific conventions and quality checks on their knowledge base articles.

## Signature

The specific signature for the `LinterRuleAdapter` interface is not available in the provided source materials. It is defined in `src/plugin/types.js`, but its contents were not included for analysis. It is imported and used by the `KBLinter` class [Source 1].

## Examples

No usage examples for implementing or using `LinterRuleAdapter` are available in the provided source materials.

## See Also

- [PluginHost](./plugin-host.md): The system that loads and manages plugins, including those that provide linter rules.
- [Adapter Interfaces](../concepts/adapter-interfaces.md): A concept article explaining the role of adapters in YAAF's plugin architecture.
- KBLinter: The main linter orchestrator that consumes rules provided by this adapter.

## Sources

[Source 1]: src/knowledge/compiler/linter/linter.ts