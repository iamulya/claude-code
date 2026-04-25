---
summary: A language-agnostic TokenizerStrategy that splits words by whitespace.
export_name: UnicodeTokenizer
source_file: src/knowledge/store/tokenizers.ts
category: class
title: UnicodeTokenizer
entity_type: api
search_terms:
 - whitespace tokenizer
 - language-agnostic text splitting
 - simple word splitter
 - how to tokenize text
 - TokenizerStrategy implementation
 - Latin script tokenization
 - Cyrillic script tokenization
 - Arabic script tokenization
 - Devanagari script tokenization
 - text processing for search
 - no stemming tokenizer
 - basic tokenization
 - split string into words
stub: false
compiled_at: 2026-04-24T17:46:34.096Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `UnicodeTokenizer` is a class that implements the `TokenizerStrategy` interface, providing a simple, language-agnostic method for splitting text into tokens [Source 1]. Its primary function is to divide a string into an array of words based on whitespace separators.

This tokenizer is suitable for any script that uses whitespace to delimit words, such as Latin, Cyrillic, Arabic, and Devanagari. Unlike more specialized tokenizers like `EnglishTokenizer`, `UnicodeTokenizer` does not perform any morphological normalization, such as [Stemming](../concepts/stemming.md) [Source 1]. It is a straightforward implementation for use cases where simple word splitting is sufficient and language-specific processing is not required.

## Signature / Constructor

`UnicodeTokenizer` implements the `TokenizerStrategy` interface [Source 1].

```typescript
export class UnicodeTokenizer implements TokenizerStrategy {
  // Constructor and methods are implemented here
}
```

The `TokenizerStrategy` interface it conforms to is defined as:

```typescript
export interface TokenizerStrategy {
  /** Split text into normalized, searchable tokens */
  tokenize(text: string): string[];
  /** Language identifier (for display and stop word selection) */
  readonly language: string;
}
```

## Methods & Properties

Based on the `TokenizerStrategy` interface.

### tokenize()

Splits an input string into an array of tokens. The splitting is performed based on whitespace characters.

**Signature:**
```typescript
tokenize(text: string): string[];
```
**Parameters:**
- `text`: The input string to tokenize.

**Returns:**
- `string[]`: An array of word tokens.

### language

A read-only property that holds a language identifier for the tokenizer.

**Signature:**
```typescript
readonly language: string;
```

## Examples

The following example demonstrates how to use `UnicodeTokenizer` to split a multilingual string into words.

```typescript
import { UnicodeTokenizer } from 'yaaf'; // Assuming 'yaaf' is the package name

const tokenizer = new UnicodeTokenizer();

const mixedLanguageText = "YAAF agents work with Cyrillic (агенты) and Latin scripts.";

const tokens = tokenizer.tokenize(mixedLanguageText);

console.log(tokens);
// Expected output:
// [
//   "YAAF",
//   "agents",
//   "work",
//   "with",
//   "Cyrillic",
//   "(агенты)",
//   "and",
//   "Latin",
//   "scripts."
// ]
```
*Note: The exact handling of punctuation may vary based on the implementation's definition of "whitespace". In this example, punctuation attached to words remains part of the token.*

## See Also

- `TokenizerStrategy`: The interface implemented by all tokenizers.
- `EnglishTokenizer`: A tokenizer optimized for English, including stop words and Porter stemming.
- `NgramTokenizer`: A tokenizer for languages without clear word boundaries, like Chinese or Japanese.
- `HybridTokenizer`: The default, more advanced tokenizer that automatically selects the best strategy based on the script.

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts