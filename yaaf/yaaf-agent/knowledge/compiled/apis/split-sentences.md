---
summary: Splits text into sentences using an abbreviation-aware algorithm.
export_name: splitSentences
source_file: src/knowledge/utils/sentences.ts
category: function
title: splitSentences
entity_type: api
search_terms:
 - text splitting
 - sentence boundary detection
 - how to split text into sentences
 - abbreviation-aware sentence splitting
 - natural language processing
 - NLP text segmentation
 - sentence tokenizer
 - split by punctuation
 - handle abbreviations in text
 - parse paragraphs into sentences
 - text chunking
 - sentence segmentation
stub: false
compiled_at: 2026-04-24T17:39:32.529Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/sentences.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `splitSentences` function is a utility that divides a string of text into an array of individual sentences. It employs an algorithm designed to correctly handle common cases like abbreviations (e.g., "Dr.") and decimal numbers (e.g., "3.14") that would otherwise cause incorrect sentence breaks [Source 1].

The process involves several steps [Source 1]:
1.  It first protects known abbreviations and decimal numbers by temporarily replacing their periods with a special Unicode character (U+2024, one-dot leader).
2.  It then splits the text based on standard sentence-ending punctuation (`.`, `!`, `?`) that is followed by whitespace.
3.  After splitting, it restores the original periods in the protected abbreviations and numbers.
4.  Finally, it cleans up the resulting array by trimming whitespace from each sentence and removing any empty strings.

This function returns all non-empty fragments resulting from the split. Any further filtering, such as removing sentences below a minimum length, is the responsibility of the caller [Source 1].

## Signature

```typescript
export function splitSentences(text: string): string[];
```

### Parameters

-   `text` (string): The input text to be split into sentences.

### Returns

-   `string[]`: An array of strings, where each string is a sentence from the input text.

## Examples

### Basic Usage

Splitting a simple paragraph with standard punctuation.

```typescript
import { splitSentences } from 'yaaf';

const text = "This is the first sentence. This is the second one! And a third?";
const sentences = splitSentences(text);

console.log(sentences);
// Output:
// [
//   "This is the first sentence.",
//   "This is the second one!",
//   "And a third?"
// ]
```

### Handling Abbreviations and Numbers

Demonstrating the function's ability to avoid splitting on periods within abbreviations or numbers.

```typescript
import { splitSentences } from 'yaaf';

const textWithAbbr = "Dr. Smith lives on Main St. His appointment is at 2:30 p.m. The cost is $99.95.";
const sentences = splitSentences(textWithAbbr);

console.log(sentences);
// Output:
// [
//   "Dr. Smith lives on Main St.",
//   "His appointment is at 2:30 p.m.",
//   "The cost is $99.95."
// ]
```

## Sources

[Source 1]: src/knowledge/utils/sentences.ts