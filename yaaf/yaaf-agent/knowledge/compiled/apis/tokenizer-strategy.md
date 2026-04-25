---
title: TokenizerStrategy
entity_type: api
summary: Defines the interface for splitting text into normalized, searchable tokens.
export_name: TokenizerStrategy
source_file: src/knowledge/store/tokenizers.ts
category: interface
search_terms:
 - text tokenization
 - how to split text into words
 - custom tokenizer
 - language-specific tokenization
 - Japanese word segmentation
 - Chinese word segmentation
 - MeCab tokenizer
 - jieba tokenizer
 - TF-IDF text processing
 - searchable terms
 - text normalization
 - implementing a tokenizer
 - pluggable tokenizer
stub: false
compiled_at: 2026-04-24T17:44:27.237Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TokenizerStrategy` interface defines a contract for how text is processed and split into a sequence of searchable tokens [Source 1]. It serves as a pluggable component for the built-in [TF-IDF](../concepts/tf-idf.md) search engine, which delegates all text processing tasks to an implementation of this strategy [Source 1, Source 2].

This abstraction allows developers to customize text processing logic, which is particularly useful for handling different languages. For example, one could implement this interface to integrate specialized tokenizers like MeCab for Japanese word segmentation or jieba for Chinese, which do not use whitespace as a word separator [Source 1].

## Signature

```typescript
export interface TokenizerStrategy {
  /** Split text into normalized, searchable tokens */
  tokenize(text: string): string[];
  
  /** Language identifier (for display and stop word selection) */
  readonly language: string;
}
```
[Source 1]

## Methods & Properties

### Properties

- **`language`**: `readonly string`
  A string identifier for the language the tokenizer is designed for (e.g., "en", "ja"). This property can be used for display purposes or for selecting an appropriate set of stop words to filter from the tokens [Source 1].

### Methods

- **`tokenize(text: string): string[]`**
  This is the core method of the strategy. It accepts a string of raw text and returns an array of normalized, searchable tokens. The implementation is responsible for all processing steps, such as splitting the text into words, converting to lowercase, removing punctuation, applying [Stemming](../concepts/stemming.md), and filtering out stop words [Source 1].

## Examples

### Implementing a Custom Tokenizer

The following example shows a simple custom tokenizer that splits text on whitespace, converts it to lowercase, and removes any non-alphanumeric characters.

```typescript
import { TokenizerStrategy } from 'yaaf';

class SimpleAlphaNumTokenizer implements TokenizerStrategy {
  public readonly language = 'en-simple';

  tokenize(text: string): string[] {
    if (!text) {
      return [];
    }
    // Convert to lowercase, split by whitespace, and remove non-alphanumeric chars
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(token => token.replace(/[^a-z0-9]/g, ''))
      .filter(token => token.length > 0);
  }
}

const tokenizer = new SimpleAlphaNumTokenizer();
const tokens = tokenizer.tokenize("Hello, World! This is a test-123.");
// tokens -> ["hello", "world", "this", "is", "a", "test123"]
```

### Using a Tokenizer with [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md)

A `TokenizerStrategy` implementation can be provided to the `TfIdfSearchPlugin` to customize the search engine's behavior.

```typescript
import { TfIdfSearchPlugin, EnglishTokenizer } from 'yaaf';
import { PluginHost } from 'yaaf'; // Assuming PluginHost is available

// Explicitly configure the TF-IDF search plugin to use the
// English-specific tokenizer, which includes Porter stemming.
const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
});

const host = new PluginHost();
await host.register(plugin);

// The knowledge base will now use EnglishTokenizer for all indexing and searching.
```
[Source 2]

## See Also

YAAF provides several built-in implementations of `TokenizerStrategy`:
- `EnglishTokenizer`: For English text, includes Porter stemming and stop word removal.
- `UnicodeTokenizer`: A language-agnostic tokenizer that splits on whitespace.
- `NgramTokenizer`: For languages without clear word boundaries (e.g., Chinese, Japanese), splits text into character n-grams.
- `HybridTokenizer`: The default tokenizer, which automatically detects the script and applies an appropriate strategy.

The primary consumer of this interface is the `TfIdfSearchPlugin`, which uses it for indexing and querying documents.

## Sources

[Source 1] src/knowledge/store/tokenizers.ts
[Source 2] src/knowledge/store/tfidfSearch.ts