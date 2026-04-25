---
title: EnglishTokenizer
entity_type: api
summary: A TokenizerStrategy implementation combining Porter stemming and English stop words.
export_name: EnglishTokenizer
source_file: src/knowledge/store/tokenizers.ts
category: class
search_terms:
 - English text processing
 - Porter stemmer
 - stop word removal
 - morphological normalization
 - how to tokenize English
 - TokenizerStrategy for English
 - TF-IDF English tokenizer
 - stemming and stop words
 - normalize English words
 - running runs ran
 - search indexing for English
 - language-specific tokenization
stub: false
compiled_at: 2026-04-24T17:04:26.564Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `EnglishTokenizer` is a class that implements the `TokenizerStrategy` interface, designed specifically for processing English-language text within the YAAF framework [Source 2]. It is intended for use with English-only knowledge bases [Source 2].

This tokenizer performs two main functions to improve search recall:
1.  **Stop Word Removal**: It filters out common English function words (e.g., "the", "a", "is") that carry little semantic meaning and are not useful for indexing [Source 2].
2.  **Porter [Stemming](../concepts/stemming.md)**: It applies a minimal implementation of the Porter stemming algorithm to reduce words to their root form. This process, known as morphological normalization, allows different forms of a word, such as "running," "runs," and "ran," to be treated as the same token ("run") during a search [Source 2].

It is a pluggable component for the [TF-IDF](../concepts/tf-idf.md) search engine, allowing developers to optimize text processing for English content [Source 1].

## Signature / Constructor

`EnglishTokenizer` is a class that implements the `TokenizerStrategy` interface.

```typescript
export class EnglishTokenizer implements TokenizerStrategy {
  // constructor is not shown in source, but is a standard class constructor
  constructor();

  // ... methods and properties
}
```

It conforms to the following interface:

```typescript
export interface TokenizerStrategy {
  /** Split text into normalized, searchable tokens */
  tokenize(text: string): string[];
  /** Language identifier (for display and stop word selection) */
  readonly language: string;
}
```

## Methods & Properties

### tokenize()

Splits a string of text into an array of normalized, searchable tokens. The process involves splitting the text into words, removing English stop words, and applying the Porter stemmer to each remaining word.

**Signature:**
```typescript
tokenize(text: string): string[];
```
**Parameters:**
*   `text: string` - The input text to tokenize.

**Returns:** `string[]` - An array of stemmed, lowercased tokens with stop words removed.

### language

A read-only property that identifies the language handled by the tokenizer.

**Signature:**
```typescript
readonly language: string; // Returns 'en'
```

## Examples

### Basic Usage

The following example demonstrates how `EnglishTokenizer` processes a sentence.

```typescript
import { EnglishTokenizer } from 'yaaf';

const tokenizer = new EnglishTokenizer();
const text = "The quick brown foxes are running over the lazy dogs.";

const tokens = tokenizer.tokenize(text);

console.log(tokens);
// Expected output (stemming may vary slightly):
// [ 'quick', 'brown', 'fox', 'run', 'over', 'lazi', 'dog' ]
```

### [Configuring TF-IDF Search](../guides/configuring-tf-idf-search.md)

`EnglishTokenizer` can be provided to the `TfIdfSearchPlugin` to replace the default `HybridTokenizer`, optimizing the search for English-only knowledge bases.

```typescript
import { TfIdfSearchPlugin, EnglishTokenizer } from 'yaaf';
import { PluginHost } from 'yaaf/plugin'; // Assuming PluginHost is available

// Assume 'host' is an instance of PluginHost
const host = new PluginHost();

const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  // vocabulary can also be provided
});

await host.register(plugin);

// Now, any knowledge base search using this host will use the EnglishTokenizer.
```

## See Also

*   `TokenizerStrategy`: The interface implemented by `EnglishTokenizer`.
*   `TfIdfSearchPlugin`: The search engine that consumes tokenizer strategies.
*   `HybridTokenizer`: The default, multilingual tokenizer used by the framework.
*   `UnicodeTokenizer`: An alternative language-agnostic tokenizer that does not perform stemming.
*   `NgramTokenizer`: An alternative tokenizer for languages without clear word boundaries.

## Sources

[Source 1] src/knowledge/store/tfidfSearch.ts
[Source 2] src/knowledge/store/tokenizers.ts