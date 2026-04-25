---
summary: A subsystem that provides a file-based cache for ingested content to optimize incremental compilation of the knowledge base.
primary_files:
 - src/knowledge/compiler/ingester/ingestCache.ts
title: Ingestion Disk Cache
entity_type: subsystem
search_terms:
 - knowledge base compilation speed
 - incremental build optimization
 - caching ingested files
 - how to speed up knowledge base ingestion
 - file-based cache
 - sha256 content hashing
 - .kb-ingest-cache directory
 - pruning stale cache entries
 - avoid re-parsing files
 - optimizing PDF extraction
 - HTML to Markdown caching
 - YAAF knowledge compiler performance
stub: false
compiled_at: 2026-04-24T18:13:20.681Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ingestCache.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Ingestion Disk Cache subsystem addresses a performance bottleneck in the YAAF [Knowledge Base Compiler](./knowledge-base-compiler.md). During incremental compilation, the compiler previously re-ingested and re-processed every raw source file on each run, even if the files had not changed. This was necessary to provide the extractor with a complete view for cross-file entity resolution. However, for large knowledge bases or for content requiring intensive I/O operations like HTML-to-Markdown conversion or PDF extraction, this repeated work caused significant delays [Source 1].

This subsystem introduces a file-based cache to store the results of the ingestion process. By checking the cache, the compiler can avoid re-parsing unchanged files, significantly speeding up incremental builds [Source 1].

## Architecture

The cache is implemented as a directory on the local filesystem, located at `{kbDir}/.kb-ingest-cache/`, where `{kbDir}` is the root of the knowledge base being compiled [Source 1].

Each cache entry corresponds to a single source file and is stored as a separate JSON file. The caching mechanism is keyed by a `sha256` hash of the raw source file's byte content. [when](../apis/when.md) the compiler processes a file, it calculates its hash. If a corresponding entry exists in the cache and the stored hash matches, it's a cache hit. If not, it's a cache miss, and a new entry is written after the file is ingested [Source 1].

A cache entry is a JSON object with the following structure [Source 1]:
- `sourceHash`: The `sha256` hexadecimal hash of the original source file's content.
- `cachedAt`: An ISO timestamp indicating when the cache entry was created.
- `content`: The full, serialized `IngestedContent` object resulting from the ingestion process.

The cache is designed to be append-only during a compilation run. Stale entries, such as those corresponding to source files that have been deleted, are not removed immediately. Instead, a pruning process is executed at the end of each compilation to remove any cache files that no longer correspond to an existing source file [Source 1].

### Image Content Caching

The source material presents conflicting information regarding the caching of image data within the `IngestedContent` object.

One part of the source states that the `images` field, an array of `ImageRef` objects containing local file paths, is cached. It notes that these paths are stable on disk, and caching them is "safe and necessary" to preserve references for downstream processes, especially for images extracted from PDFs [Source 1].

However, another part of the same source states that image data is explicitly *not* cached to prevent the cache size from growing excessively large, particularly with base64-encoded image data from vision-extracted PDFs. This section claims that on a cache hit, the `images` array is restored as an empty array because downstream synthesis passes do not use the raw image bytes [Source 1].

## Integration Points

The Ingestion Disk Cache is primarily used by the knowledge base compiler's ingestion phase. It acts as a layer between the file reader and the content parser/extractor.

- **[Knowledge Compiler](./knowledge-compiler.md)**: The compiler invokes the cache logic before attempting to ingest a raw file. On a cache hit, it uses the cached `IngestedContent` directly. On a miss, it proceeds with ingestion and then instructs the cache to store the new result [Source 1].
- **Extractor**: The extractor component relies on receiving the full `IngestedContent[]` array for all source files to perform cross-file entity resolution. The cache ensures that this array can be reconstructed quickly from a combination of cached objects and newly ingested ones [Source 1].

## Key APIs

While the source file is a signature-only extract, the description implies the existence of the following logical operations:

- **Cache Read**: A function to retrieve `IngestedContent` for a given source file path, returning the content on a cache hit or indicating a miss.
- **Cache Write**: A function to write a new `IngestedContent` object to the cache for a specific source file.
- `pruneIngestCache()`: A function that is called at the end of a compile cycle to iterate through the cache directory and delete any entries that no longer have a corresponding source file in the knowledge base [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/[Ingester](../apis/ingester.md)/ingestCache.ts