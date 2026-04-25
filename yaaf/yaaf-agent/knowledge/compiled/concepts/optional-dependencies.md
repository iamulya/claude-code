---
summary: A mechanism in YAAF allowing certain features to require external libraries that are not bundled by default, providing flexibility and reducing core package size.
title: Optional Dependencies
entity_type: concept
related_subsystems:
 - Knowledge Ingestion
search_terms:
 - peer dependencies
 - how to install extra features
 - reduce bundle size
 - optional features
 - plugin dependencies
 - module not found error
 - dynamic import
 - conditional feature loading
 - jsdom dependency
 - readability dependency
 - turndown dependency
 - what are optional deps
 - opt-in features
stub: false
compiled_at: 2026-04-24T18:00:11.686Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Optional Dependencies is a design pattern in YAAF where certain features rely on external libraries that are not included in the core framework installation. This approach keeps the core YAAF package lightweight and avoids bundling large or specialized dependencies that may not be needed by all users [Source 1].

The primary goal of this pattern is to provide a better developer experience. [when](../apis/when.md) a feature requiring an optional dependency is used without the necessary libraries installed, YAAF is designed to throw a clear, informative error. This error message explicitly states which packages the developer needs to install, preventing cryptic module resolution failures [Source 1]. This allows developers to opt-in to specific functionalities as needed, such as advanced content processing, by installing the corresponding packages.

## How It Works in YAAF

The mechanism is implemented by components declaring their reliance on external packages. A concrete example is the `html[[[[[[[[Ingester]]]]]]]]`, a component within the knowledge ingestion subsystem responsible for processing HTML files and web content [Source 1].

The `htmlIngester` object explicitly declares its requirements through metadata properties:
*   `requiresOptionalDeps: true`
*   `optionalDeps: ["@mozilla/readability", "jsdom", "turndown"]`

When the `htmlIngester`'s `ingest` method is called, it first attempts to dynamically load these dependencies. The source code shows a call to a `loadHtmlDeps()` function for this purpose [Source 1]. If these packages are not found in the project's environment, the framework intercepts the failure and provides a user-friendly error message, as described in the component's documentation [Source 1].

This pattern enables YAAF to offer powerful features like production-grade HTML-to-Markdown conversion, which leverages Mozilla's Readability algorithm, without forcing every user to install the associated dependencies (`jsdom`, `@mozilla/readability`, `turndown`) by default [Source 1].

## Configuration

To enable a feature that uses optional dependencies, a developer must install the required libraries into their own project. There is no framework-level configuration to toggle; the presence of the packages in the `node_modules` directory is the configuration itself.

For example, to use the `htmlIngester`, a developer would need to add `@mozilla/readability`, `jsdom`, and `turndown` to their project's dependencies. Once installed, the `htmlIngester` will be able to load them at runtime and function correctly [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/Ingester/html.ts