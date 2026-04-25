---
summary: A TokenizerStrategy that performs character n-gram tokenization, suitable for languages without clear word boundaries.
export_name: NgramTokenizer
source_file: src/knowledge/store/tokenizers.ts
category: class
title: NgramTokenizer
entity_type: api
search_terms:
 - character n-gram tokenization
 - CJK tokenization
 - Japanese text search
 - Chinese text search
 - Korean text search
 - Thai text search
 - tokenizer for no word boundaries
 - sliding window tokenizer
 - bigram tokenizer
 - trigram tokenizer
 - how to index CJK text
 - TokenizerStrategy implementation
 - text splitting without spaces
stub: false
compiled_at: 2026-04-24T17:22:49.023Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `NgramTokenizer` class is an implementation of the `TokenizerStrategy` interface that splits text into overlapping sequences of characters, known as n-grams [Source 1]. This method is particularly effective for languages that do not use spaces or other explicit delimiters to separate words, such as Chinese, Japanese, Korean (CJK), and Thai [Source 1].

By creating a sliding window of characters, `NgramTokenizer` allows for effective indexing and searching of text without requiring complex, language-specific word segmentation libraries. It produces bigrams (sequences of two characters) by default, but the n-gram size is configurable [Source 1].

## Signature / Constructor

`NgramTokenizer` implements the `TokenizerStrategy` interface.

```typescript
import type { TokenizerStrategy } from './tokenizers';

export class NgramTokenizer implements TokenizerStrategy {
  // Constructor is not fully detailed in the source,
  // but it is configurable for n-gram size.
  constructor(n?: number);

  public tokenize(text: string): string[];
  public readonly language: string;
}
```

## Methods & Properties

### tokenize()

Splits the input text into an array of overlapping n-gram strings.

- **Signature:** `tokenize(text: string): string[]`
- **Parameters:**
    - `text`: The input string to tokenize.
- **Returns:** An array of n-gram tokens.

### language

A read-only property that identifies the tokenizer's language. For `NgramTokenizer`, this is generally language-agnostic.

- **Signature:** `readonly language: string;`

## Examples

### Basic Bigram [tokenization](../concepts/tokenization.md)

The default behavior is to create bigrams (n=2), which is suitable for CJK text.

```typescript
import { NgramTokenizer } from 'yaaf';

// Assuming default n-gram size is 2
const tokenizer = new NgramTokenizer();

const text = "注意力機制";
const tokens = tokenizer.tokenize(text);

console.log(tokens);
// Expected output: ["注意", "意力", "力機", "機制"]
```

### Configurable N-gram Size

The n-gram size can be configured, for example, to create trigrams (n=3).

```typescript
import { NgramTokenizer } from 'yaaf';

// Assuming the constructor accepts the n-gram size
const trigramTokenizer = new NgramTokenizer(3);

const text = "注意力機制";
const tokens = trigramTokenizer.tokenize(text);

console.log(tokens);
// Expected output: ["注意力", "意力機", "力機制"]
```

## See Also

- `TokenizerStrategy`: The interface that `NgramTokenizer` implements.
- `HybridTokenizer`: A tokenizer that internally uses an n-gram strategy for CJK and other scripts.
- `UnicodeTokenizer`: An alternative language-agnostic tokenizer for scripts that use whitespace separators.

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts