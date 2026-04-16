---
summary: A subsystem responsible for processing raw source documents into structured knowledge base entries, including image handling and reference resolution.
primary_files:
  - src/knowledge/compiler/ingester/images.ts
title: Knowledge Ingester
entity_type: subsystem
exports:
  - detectImageMimeType
  - extractMarkdownImageRefs
  - resolveImageRef
  - downloadImage
  - resolveAllMarkdownImages
stub: false
compiled_at: 2026-04-16T14:23:36.181Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/images.ts
confidence: 0.9
---

## Purpose
The Knowledge Ingester is a subsystem within the YAAF knowledge compilation pipeline. Its primary role is to transform raw source documents—specifically Markdown files—into structured entries suitable for the framework's knowledge base. It manages the lifecycle of document assets, ensuring that external and local references (such as images) are correctly resolved, localized, and typed.

## Architecture
The Knowledge Ingester operates as a pipeline that parses raw text to identify and process embedded assets. Internally, it relies on a set of specialized utilities for file system interaction, path resolution, and network operations.

### Image Handling
A significant portion of the subsystem is dedicated to image processing. It distinguishes between standard raster images and vector graphics (SVG), treating the latter as text-based placeholders. The system uses a multi-stage detection strategy for MIME types, prioritizing magic bytes in the file header over file extensions to ensure accuracy.

### Reference Resolution
The ingester implements a specific resolution order for assets found in documents:
1.  **Absolute Paths:** If a source path is absolute and exists on the local file system, it is used directly.
2.  **Relative Paths:** Paths are resolved relative to the directory of the document currently being processed.
3.  **Remote URLs:** External assets are downloaded to a local output directory using the Node.js built-in fetch API.

## Key APIs
The subsystem exposes several functions for document processing:

### `extractMarkdownImageRefs(markdown: string)`
Parses a Markdown string to find all image references. It supports both standard inline syntax `![alt](src)` and reference-style syntax `![alt][id]`. It returns `RawImageRef` objects containing the alt text, source, and character offsets.

### `resolveImageRef(rawRef, documentPath, options)`
Resolves a single `RawImageRef` to a local file path or a downloaded asset. It handles the logic of determining whether a path is local or remote and applies the resolution hierarchy.

### `resolveAllMarkdownImages(markdown, documentPath, options)`
A high-level orchestrator that processes all images within a document. It returns a tuple containing a list of successfully resolved `ImageRef` objects and a list of strings representing sources that could not be resolved. This function is designed to be resilient, skipping failed resolutions with a warning rather than throwing errors.

### `detectImageMimeType(filePath: string)`
Determines the MIME type of a file. It attempts to read the file's magic bytes first and falls back to extension-based detection if necessary.

### `downloadImage(url, altText, imageOutputDir)`
Downloads a remote image and saves it to the specified local directory. The filename is automatically derived from the URL path.

## Configuration
The behavior of the Knowledge Ingester is governed by the `IngesterOptions` object, which includes:
*   `imageOutputDir`: The local directory where downloaded or processed images should be stored.
*   `sourceUrl`: A base URL used when resolving assets relative to a remote source.