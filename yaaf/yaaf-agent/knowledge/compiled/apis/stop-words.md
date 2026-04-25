---
summary: A constant record containing multilingual stop word sets for various languages.
export_name: STOP_WORDS
source_file: src/knowledge/store/tokenizers.ts
category: constant
title: STOP_WORDS
entity_type: api
search_terms:
 - common words to ignore
 - filter function words
 - search index exclusion list
 - multilingual stop words
 - English stop words
 - French stop words
 - German stop words
 - Spanish stop words
 - how to remove common words
 - TF-IDF stop words
 - tokenizer word list
 - semantic noise reduction
 - language-specific word filters
stub: false
compiled_at: 2026-04-24T17:40:33.956Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `STOP_WORDS` constant is a record containing sets of common "stop words" for multiple languages. Stop words are function words (such as articles, prepositions, and pronouns) that carry little semantic meaning on their own. In the context of search and information retrieval, these words are often removed from text to reduce the size of the search index and improve the relevance of search results [Source 1].

This constant provides pre-built sets for common languages, which can be used by custom tokenizer strategies or other text processing logic to filter out noise before indexing or analysis.

The following languages are included [Source 1]:
- `en`: English
- `fr`: French
- `de`: German
- `es`: Spanish
- `pt`: Portuguese
- `it`: Italian
- `nl`: Dutch
- `ru`: Russian

## Signature

The `STOP_WORDS` constant is a record where keys are two-letter ISO 639-1 language codes and values are `Set<string>` objects containing the stop words for that language [Source 1].

```typescript
export const STOP_WORDS: Record<string, Set<string>>;
```

## Examples

### Accessing a Language's Stop Word Set

To access the stop words for a specific language, use the language code as a key.

```typescript
import { STOP_WORDS } from 'yaaf';

// Get the set of English stop words
const englishStopWords = STOP_WORDS.en;

// Check if a word is a stop word
console.log(englishStopWords.has('the')); // true
console.log(englishStopWords.has('agent')); // false
```

### Filtering a Sentence

This example demonstrates how to remove stop words from a tokenized sentence.

```typescript
import { STOP_WORDS } from 'yaaf';

const sentence = "this is a test of the stop word filter";
const tokens = sentence.split(' ');

const englishStopWords = STOP_WORDS.en;

const filteredTokens = tokens.filter(token => !englishStopWords.has(token));

console.log(filteredTokens);
// Output: ['test', 'stop', 'word', 'filter']
```

## See Also

- `TokenizerStrategy`: The interface for implementing custom [tokenization](../concepts/tokenization.md) logic, which might use `STOP_WORDS`.
- `EnglishTokenizer`: A tokenizer for English that uses the `en` stop word set.

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts