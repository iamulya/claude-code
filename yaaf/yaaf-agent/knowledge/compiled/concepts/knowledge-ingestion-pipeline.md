---
summary: The end-to-end process within YAAF for extracting, normalizing, and preparing raw source content for knowledge synthesis and concept extraction.
title: Knowledge Ingestion Pipeline
entity_type: concept
related_subsystems:
 - Knowledge Compiler
search_terms:
 - data ingestion process
 - source content normalization
 - IngestedContent type
 - Ingester interface
 - source trust level
 - C4/A1 classification
 - extracting text from files
 - handling images in documents
 - lossy vs lossless extraction
 - how to add new knowledge to yaaf
 - PDF ingestion
 - HTML ingestion
 - markdown ingestion
stub: false
compiled_at: 2026-04-24T17:57:11.985Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

The Knowledge Ingestion Pipeline is the process within YAAF's [Knowledge Compiler](../subsystems/knowledge-compiler.md) subsystem responsible for taking raw source documents in various formats and transforming them into a standardized, normalized structure. This process is the first step in populating the agent's knowledge base. It solves the problem of handling heterogeneous source materials (such as PDFs, web pages, and markdown files) by creating a consistent data representation that downstream components, like the [Concept Extractor](../subsystems/concept-extractor.md) and [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md), can consume [Source 1].

## How It Works in YAAF

The pipeline relies on a set of format-specific "[Ingester](../apis/ingester.md)s" that conform to the `Ingester` interface. Each Ingester is responsible for one or more file formats, identified by MIME types or file extensions [Source 1].

The core of the pipeline is the `ingest` method on an `Ingester`, which takes a file path and produces a standardized `IngestedContent` object. This object serves as the common interchange format for all subsequent knowledge processing steps [Source 1].

The `IngestedContent` object contains the following key fields [Source 1]:
- `text`: The main textual content extracted from the source. This may be plain text or markdown.
- `images`: An array of `ImageRef` objects. During ingestion, all images found in the source document are downloaded, resolved to local absolute paths, and cataloged. Each `ImageRef` includes the original source URL, the new local path, alt text, MIME type, and file size.
- `sourceFile`: The absolute path to the original source file.
- `title`: The document title, extracted from sources like an HTML `<title>` tag, PDF metadata, or the first H1 heading.
- `metadata`: A record of format-specific metadata, such as a PDF's author.
- `lossy`: A boolean flag indicating whether the extraction process may have discarded information. For example, removing boilerplate from an HTML file is a lossy operation, whereas ingesting a plain text or markdown file is lossless.
- `sourceUrl`: The original URL of the content, if it was clipped from the web, used for citation.
- `sourceTrust`: A classification of the source's credibility, known as the `SourceTrustLevel`.

### Source Trust Level

A key feature of the ingestion pipeline is the assignment of a `SourceTrustLevel` to each document. This classification, also referred to as C4/A1, influences how the content is weighted during knowledge synthesis and grounding [Source 1]. The levels are defined as follows:

| Level         | Description                                      |
|---------------|--------------------------------------------------|
| `academic`      | Peer-reviewed paper, ArXiv preprint, conference proceedings.  |
| `documentation` | Official library/product docs, RFCs, specifications.       |
| `web`           | Blog post, news article, general web-clipped content.     |
| `unknown`       | Default level [when](../apis/when.md) provenance cannot be determined.              |

The ingester makes an initial determination of the trust level based on heuristics, such as file path conventions (e.g., files in a `docs/` directory are marked as `documentation`). This value can be manually overridden by a user in the source file's [Frontmatter](./frontmatter.md) [Source 1].

The trust level is used to apply a weight to the [Grounding Score](./grounding-score.md) of a compiled article. For example, content sourced exclusively from `web` sources has its grounding score multiplied by 0.75, preventing a single confident but untrustworthy source from being accepted as grounded knowledge [Source 1]. The weights are:

- `academic`: 1.00
- `documentation`: 0.90
- `unknown`: 0.80
- `web`: 0.75

## Configuration

The behavior of an `Ingester` can be modified via an `IngesterOptions` object passed to its `ingest` method. This allows for customization of the ingestion process [Source 1].

Key configuration options include:
- `imageOutputDir`: Specifies a custom directory for saving downloaded images.
- `maxImageDimension`: Sets a maximum width or height in pixels for images, which will be resized if they exceed this limit.
- `sourceUrl`: Provides the original URL for citation when ingesting local files that were saved from the web.

```typescript
// Conceptual example of using IngesterOptions
import { someIngester } from 'yaaf/knowledge/ingesters';

const options: IngesterOptions = {
  imageOutputDir: '/path/to/project/assets',
  maxImageDimension: 800,
  sourceUrl: 'https://example.com/original-article.html'
};

const ingestedContent = await someIngester.ingest('/path/to/local/file.html', options);
```

## Sources
[Source 1] src/knowledge/compiler/ingester/types.ts