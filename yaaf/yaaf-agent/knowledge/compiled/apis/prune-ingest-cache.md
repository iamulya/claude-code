---
summary: A function responsible for removing stale or deleted entries from the ingestion disk cache at the end of a compilation process.
export_name: pruneIngestCache
source_file: src/knowledge/compiler/ingester/ingestCache.ts
category: function
title: pruneIngestCache
entity_type: api
search_terms:
 - ingestion cache cleanup
 - remove stale cache files
 - knowledge base cache pruning
 - incremental compilation cache
 - delete old ingest entries
 - how to clean .kb-ingest-cache
 - manage cache size
 - garbage collection for cache
 - stale data removal
 - disk cache maintenance
 - incremental build optimization
stub: false
compiled_at: 2026-04-24T17:30:55.285Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ingestCache.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Overview

The `pruneIngestCache` function is a maintenance utility that cleans up the [Ingestion Disk Cache](../subsystems/ingestion-disk-cache.md) after a knowledge base compilation is complete. During compilation, the cache is append-only, meaning new entries are added for new or modified files, but entries for deleted source files are not removed immediately [Source 1].

This function is called at the end of each compile to identify and remove these stale entries, ensuring the cache does not grow indefinitely with data corresponding to source files that no longer exist. This is a crucial part of the incremental compilation strategy, which uses the cache to avoid costly re-ingestion of unchanged files [Source 1].

## Signature

The provided source material is a high-level overview of the caching mechanism and does not include the specific TypeScript signature for the `pruneIngestCache` function [Source 1].

## Examples

The provided source material does not contain any code examples for this function [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/[Ingester](./ingester.md)/ingestCache.ts