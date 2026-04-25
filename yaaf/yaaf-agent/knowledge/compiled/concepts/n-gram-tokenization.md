---
summary: A tokenization method that breaks text into contiguous, overlapping sequences of N items, typically characters.
title: N-gram Tokenization
entity_type: concept
related_subsystems:
 - TF-IDF Search Engine
search_terms:
 - character n-grams
 - tokenizing CJK text
 - tokenizing text without spaces
 - how to search Japanese text
 - bigram tokenization
 - trigram tokenization
 - language-agnostic tokenization
 - sliding window tokenization
 - what is an n-gram
 - YAAF tokenizer for Chinese
 - text segmentation for Thai
 - overlapping character sequences
 - word boundary detection
stub: false
compiled_at: 2026-04-24T17:59:06.007Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

N-gram [tokenization](./tokenization.md) is a strategy for splitting text into smaller, searchable units, or tokens, by creating overlapping sequences of a fixed length, N. In YAAF, this is applied at the character level [Source 1]. For example, a 2-gram (or "bigram") tokenizer would split the word "text" into `["te", "ex", "xt"]`.

This method is essential for processing text in languages that do not use explicit word separators like spaces, such as Chinese, Japanese, Korean (CJK), and Thai. Standard tokenizers that split text by whitespace would fail to properly segment such languages. N-gram tokenization provides a robust, language-agnostic way to index this text for search, ensuring that substrings and compound words can be effectively matched [Source 1].

## How It Works in YAAF

YAAF implements this concept through the `NgramTokenizer` class, which conforms to the `TokenizerStrategy` interface. This class is designed to work for any language and is particularly effective for those without clear word boundaries [Source 1].

While `NgramTokenizer` can be used directly, its primary application within the framework is as a component of the `HybridTokenizer`. The `HybridTokenizer` is the default tokenizer for YAAF's internal [[]] Search Engine]]. It automatically detects the script of the input text and applies an appropriate tokenization strategy [Source 1].

For certain scripts, `HybridTokenizer` uses character n-grams:
- **CJK (Chinese, Japanese, Korean):** Character bigrams (N=2) are used.
- **Thai, Lao, Khmer:** Character trigrams (N=3) are used.

This hybrid approach allows YAAF to handle mixed-language content seamlessly. For example, [when](../apis/when.md) tokenizing a sentence containing both English and Chinese, the `HybridTokenizer` will split the English part into words and the Chinese part into character bigrams [Source 1].

```typescript
// Example from HybridTokenizer documentation [Source 1]
const t = new HybridTokenizer()
t.tokenize("The attention mechanism (注意力機制) is used in NLP")
// → ["attention", "mechanism", "used", "nlp", "注意", "意力", "力機", "機制"]
```
In this output, the Chinese phrase "注意力機制" has been tokenized into four overlapping bigrams: `注意`, `意力`, `力機`, and `機制`.

## Configuration

The standalone `NgramTokenizer` class produces bigrams by default. However, the n-gram size is configurable, allowing developers to specify a different sequence length (e.g., N=3 for trigrams) when creating an instance of the tokenizer [Source 1].

## Sources
[Source 1] `src/knowledge/store/tokenizers.ts`