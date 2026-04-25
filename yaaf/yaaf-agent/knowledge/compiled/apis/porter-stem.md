---
summary: Implements a minimal Porter stemmer for English words.
export_name: porterStem
source_file: src/knowledge/store/tokenizers.ts
category: function
title: porterStem
entity_type: api
search_terms:
 - English word stemming
 - Porter stemmer algorithm
 - normalize words to root form
 - reduce words to stem
 - how to handle word suffixes
 - running runs ran to run
 - morphological normalization
 - text processing for search
 - information retrieval stemming
 - natural language processing
 - TF-IDF token processing
 - simplify words for indexing
stub: false
compiled_at: 2026-04-24T17:29:06.458Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `porterStem` function is a minimal implementation of Martin Porter's 1980 [Stemming](../concepts/stemming.md) algorithm for the English language [Source 1]. Its purpose is to reduce a word to its morphological root or "stem," which is useful for normalizing text in search and information retrieval systems. By stemming words, variations like "running," "runs," and "runner" can all be treated as the same base term, "run," improving search recall.

This implementation is deliberately simplified and is not a full Porter2 stemmer. It is optimized for search applications where improving recall (finding all relevant documents) is often more important than perfect linguistic precision [Source 1].

The function handles a variety of common English suffixes, including [Source 1]:
- `-ing`, `-ed`
- `-tion`, `-ness`, `-ment`
- `-ous`, `-ive`, `-ful`, `-less`
- `-able`, `-ible`
- `-ize`, `-ise`, `-ify`
- `-ly`, `-er`, `-est`, `-al`, `-s`

It is a core component of the `EnglishTokenizer`.

## Signature

```typescript
export function porterStem(word: string): string;
```

### Parameters

- `word` [string]: The English word to be stemmed.

### Returns

- [string]: The stemmed (root) form of the word.

## Examples

### Basic Stemming

The following example demonstrates how `porterStem` reduces words with common suffixes to their base form.

```typescript
import { porterStem } from 'yaaf';

const words = ["running", "beautiful", "normalization", "computers", "agreed"];

const stemmedWords = words.map(porterStem);

console.log(stemmedWords);
// Expected output might be similar to:
// [ 'run', 'beauti', 'normal', 'comput', 'agre' ]
```

## See Also

- `EnglishTokenizer`: A tokenizer class that uses `porterStem` for morphological normalization.
- `TokenizerStrategy`: The interface that defines the contract for [tokenization](../concepts/tokenization.md) strategies.

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts