---
title: HybridTokenizer
entity_type: api
summary: The default TokenizerStrategy for the TF-IDF search engine, automatically detecting script and applying appropriate tokenization.
export_name: HybridTokenizer
source_file: src/knowledge/store/tokenizers.ts
category: class
search_terms:
 - multilingual tokenization
 - CJK tokenizer
 - Chinese tokenization
 - Japanese tokenization
 - Korean tokenization
 - Thai tokenization
 - mixed language search
 - default tokenizer
 - TF-IDF tokenizer
 - script detection tokenizer
 - how to handle different languages in search
 - TokenizerStrategy implementation
 - Latin Cyrillic tokenization
stub: false
compiled_at: 2026-04-24T17:12:52.258Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `HybridTokenizer` is a class that implements the `[[[[[[[[TokenizerStrategy]]]]]]]]` interface. It serves as the default tokenizer for the built-in `[[[[[[[[TfIdfSearchPlugin]]]]]]]]` [Source 1, Source 2].

Its primary purpose is to handle mixed-language content by automatically detecting the script of the text and applying an appropriate [tokenization](../concepts/tokenization.md) strategy. This makes it a robust, general-purpose choice for knowledge bases that may contain content in multiple languages [Source 2].

The tokenizer applies the following rules based on detected script [Source 2]:
- **Latin/Cyrillic:** Splits text into lowercase word tokens. It may also apply Porter [Stemming](../concepts/stemming.md) for English text.
- **CJK (Chinese, Japanese, Korean):** Uses character bigrams, as these languages often lack explicit word boundaries.
- **Thai, Lao, Khmer:** Uses character trigrams.
- **Other scripts:** Performs a simple whitespace split and converts tokens to lowercase.

## Signature / Constructor

`HybridTokenizer` implements the `TokenizerStrategy` interface.

```typescript
export class HybridTokenizer implements TokenizerStrategy {
  /**
   * Creates an instance of HybridTokenizer.
   */
  constructor();

  /**
   * Splits text into normalized, searchable tokens based on detected script.
   */
  tokenize(text: string): string[];

  /**
   * Language identifier (for display and stop word selection).
   */
  readonly language: string;
}
```

It is part of the `TokenizerStrategy` API, which is defined as:

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

- **Signature:** `tokenize(text: string): string[]`
- **Description:** Takes a string of text and returns an array of normalized token strings. It internally detects the script of different parts of the input string and applies the most suitable tokenization method (e.g., word splitting for Latin scripts, n-grams for CJK scripts) [Source 2].

### language

- **Signature:** `readonly language: string`
- **Description:** A property that identifies the language or strategy. As a multilingual tokenizer, this will represent its hybrid nature [Source 2].

## Examples

The following example demonstrates how `HybridTokenizer` processes a string containing both English (Latin script) and Chinese characters.

```typescript
import { HybridTokenizer } from 'yaaf';

const tokenizer = new HybridTokenizer();
const tokens = tokenizer.tokenize("The attention mechanism (注意力機制) is used in NLP");

console.log(tokens);
// Expected output:
// [ "attention", "mechanism", "used", "nlp", "注意", "意力", "力機", "機制" ]
```
[Source 2]

## See Also

- **TfIdfSearchPlugin**: The default search adapter that uses `HybridTokenizer` for text processing.
- **TokenizerStrategy**: The interface that `HybridTokenizer` and other tokenizers implement.
- Other Tokenizers: `EnglishTokenizer`, `UnicodeTokenizer`, `NgramTokenizer`.

## Sources

[Source 1]: src/knowledge/store/tfidfSearch.ts
[Source 2]: src/knowledge/store/tokenizers.ts