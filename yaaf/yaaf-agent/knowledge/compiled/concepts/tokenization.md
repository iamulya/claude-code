---
summary: The process of breaking down text into smaller units called tokens, which are used for search indexing, content analysis, and managing LLM context windows.
primary_files:
 - src/utils/tokens.js
title: tokenization
entity_type: concept
related_subsystems:
 - TF-IDF Search Engine
 - Knowledge Compiler
see_also:
 - "[TF-IDF](./tf-idf.md)"
 - "[Stemming](./stemming.md)"
 - "[N-gram Tokenization](./n-gram-tokenization.md)"
 - "[Token Estimation](./token-estimation.md)"
 - "[Token Budget](./token-budget.md)"
 - "[TokenizerStrategy](../apis/tokenizer-strategy.md)"
 - "[HybridTokenizer](../apis/hybrid-tokenizer.md)"
 - "[EnglishTokenizer](../apis/english-tokenizer.md)"
 - "[UnicodeTokenizer](../apis/unicode-tokenizer.md)"
 - "[NgramTokenizer](../apis/ngram-tokenizer.md)"
 - "[estimateTokens](../apis/estimate-tokens.md)"
search_terms:
 - text splitting
 - word segmentation
 - how to tokenize text
 - language specific tokenization
 - stop word removal
 - Porter stemmer
 - CJK tokenization
 - n-gram tokenizer
 - what is a tokenizer strategy
 - HybridTokenizer vs EnglishTokenizer
 - token counting
 - search indexing tokens
 - multilingual text processing
stub: false
compiled_at: 2026-04-25T00:25:23.490Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is
Tokenization is the process of breaking down a string of text into a sequence of smaller, discrete units called tokens. These tokens are the fundamental elements for analysis and processing in YAAF. The framework uses tokenization for two primary purposes:

1.  **Search Indexing**: In the [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md), text from knowledge base articles is tokenized to build an inverted index. This allows for efficient and relevant full-text search [Source 1, Source 2].
2.  **Content Management**: The [Knowledge Compiler](../subsystems/knowledge-compiler.md) uses [Token Estimation](./token-estimation.md) to measure the size of synthesized articles. This is crucial for enforcing a [Token Budget](./token-budget.md) and automatically performing [Article Segmentation](./article-segmentation.md) on documents that are too large for an [LLM](./llm.md)'s [Context Window](./context-window.md) [Source 3].

A token can be a word, a part of a word, or a sequence of characters (an n-gram), depending on the language and the tokenization strategy employed. The process often includes normalization steps like converting text to lowercase, removing common "stop words" (e.g., "the", "a", "is"), and applying [Stemming](./stemming.md) to reduce words to their root form [Source 2].

## How It Works in YAAF
Tokenization logic in YAAF is encapsulated within implementations of the [TokenizerStrategy](../apis/tokenizer-strategy.md) interface. This design makes the tokenization process pluggable, allowing developers to choose or create the best strategy for their specific content and language needs [Source 1, Source 2]. The [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md) delegates all text processing to a configured [TokenizerStrategy](../apis/tokenizer-strategy.md) [Source 2].

YAAF provides several built-in tokenizer implementations:

*   **[HybridTokenizer](../apis/hybrid-tokenizer.md)**: This is the default tokenizer for the [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md). It automatically detects the script of the input text and applies an appropriate strategy. For Latin and Cyrillic scripts, it splits text into lowercase word tokens. For languages without clear word boundaries like Chinese, Japanese, and Korean (CJK), it generates character bigrams. For Thai, Lao, and Khmer, it uses trigrams [Source 2].
    ```ts
    // Example from source documentation
    const t = new HybridTokenizer()
    t.tokenize("The attention mechanism (注意力機制) is used in NLP")
    // → ["attention", "mechanism", "used", "nlp", "注意", "意力", "力機", "機制"]
    ```
*   **[EnglishTokenizer](../apis/english-tokenizer.md)**: Optimized for English-only knowledge bases, this tokenizer applies a Porter stemmer to normalize words (e.g., "running," "runs," and "ran" all become "run") and removes a list of common English stop words [Source 2].
*   **[UnicodeTokenizer](../apis/unicode-tokenizer.md)**: A language-agnostic tokenizer that splits text based on whitespace. It is suitable for any script that uses spaces as word separators, such as Latin, Cyrillic, and Arabic. It does not perform [Stemming](./stemming.md) [Source 2].
*   **[NgramTokenizer](../apis/ngram-tokenizer.md)**: This strategy implements [N-gram Tokenization](./n-gram-tokenization.md), breaking text into overlapping sequences of characters. It is effective for languages without word boundaries (e.g., CJK, Thai) and can improve recall in search by matching partial words [Source 2].

For managing content size, the [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s post-processing step uses the [estimateTokens](../apis/estimate-tokens.md) utility function. This function provides a quick count of tokens in an article, which is then compared against the configured [Token Budget](./token-budget.md) to decide if [Article Segmentation](./article-segmentation.md) is necessary [Source 3].

## Configuration
The default tokenization strategy can be overridden when configuring plugins that depend on it, such as the `TfIdfSearchPlugin`. This allows for full control over how the knowledge base content is indexed [Source 1].

The following example shows how to explicitly configure the [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md) to use the [EnglishTokenizer](../apis/english-tokenizer.md) instead of the default [HybridTokenizer](../apis/hybrid-tokenizer.md):

```ts
// Explicitly register the TF-IDF plugin with a custom tokenizer
const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: ontology.vocabulary,
});

await host.register(plugin);
```

## Sources
[Source 1]: src/knowledge/store/tfidfSearch.ts
[Source 2]: src/knowledge/store/tokenizers.ts
[Source 3]: src/knowledge/compiler/postprocess.ts