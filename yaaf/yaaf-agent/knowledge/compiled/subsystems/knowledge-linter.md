---
title: Knowledge Linter
entity_type: subsystem
summary: A subsystem responsible for validating the integrity, structure, and relationships of the compiled knowledge base articles.
primary_files:
  - src/knowledge/compiler/linter/reader.ts
exports:
  - readCompiledArticles
  - parseCompiledArticle
  - ParsedCompiledArticle
stub: false
compiled_at: 2026-04-16T14:25:28.063Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/reader.ts
confidence: 0.9
---

## Purpose
The Knowledge Linter is a quality assurance subsystem within the YAAF knowledge compilation pipeline. Its primary purpose is to validate the integrity, structure, and cross-references of compiled markdown articles. By analyzing the output of the synthesis process, the linter ensures that the knowledge base remains consistent and that all articles adhere to the required schema and ontological constraints.

## Architecture
The Knowledge Linter is designed with a clear separation between I/O operations and validation logic.

### I/O Layer (Reader)
The reader component, implemented in `src/knowledge/compiler/linter/reader.ts`, serves as the entry point for the linting process. It is responsible for:
- Interfacing with the file system to locate compiled markdown files.
- Parsing raw markdown to separate YAML frontmatter from the content body.
- Normalizing article data into a standard `ParsedCompiledArticle` format.

### Validation Logic
While the reader handles I/O, the remaining modules in the subsystem are designed as pure functions. These modules consume the normalized representations provided by the reader to perform various checks, such as link integrity, frontmatter schema validation, and relationship mapping.

### Concept Registry Integration
The linter utilizes a `ConceptRegistry` to determine the scope of the validation. It uses the registry to identify which articles are expected to exist and to verify that the compiled output matches the intended ontology.

## Key APIs

### readCompiledArticles
This asynchronous function serves as the primary data gatherer for the linter. It iterates through the articles referenced in a `ConceptRegistry`, reads them from the specified directory, and returns an array of parsed articles.
```typescript
export async function readCompiledArticles(
  registry: ConceptRegistry,
  compiledDir: string,
  onSkip?: (docId: string, reason: string) => void,
): Promise<ParsedCompiledArticle[]>
```

### parseCompiledArticle
A utility function used to decompose a raw markdown string into its constituent parts. It utilizes a minimal YAML parser to extract frontmatter metadata.
```typescript
export function parseCompiledArticle(
  docId: string,
  filePath: string,
  raw: string,
): ParsedCompiledArticle
```

### ParsedCompiledArticle
The standard data structure used throughout the linting process to represent an article's state.
- `docId`: The relative identifier for the document (e.g., `concepts/attention-mechanism`).
- `filePath`: The absolute path to the source file on disk.
- `frontmatter`: A key-value record of the metadata defined at the top of the article.
- `body`: The markdown content following the frontmatter block.

## Sources
- `src/knowledge/compiler/linter/reader.ts`