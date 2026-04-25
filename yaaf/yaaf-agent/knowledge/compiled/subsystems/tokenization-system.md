---
summary: Manages the process of splitting text into normalized, searchable tokens for the YAAF knowledge store's search engine.
primary_files:
 - src/knowledge/store/tokenizers.ts
title: Tokenization System
entity_type: subsystem
exports:
 - TokenizerStrategy
 - EnglishTokenizer
 - UnicodeTokenizer
 - NgramTokenizer
 - HybridTokenizer
 - STOP_WORDS
 - porterStem
search_terms:
 - text splitting for search
 - knowledge base indexing
 - stop word removal
 - stemming algorithm
 - Porter stemmer
 - multilingual text processing
 - CJK tokenization
 - n-gram tokenizer
 - language-specific tokenization
 - TF-IDF text processing
 - how to tokenize text
 - searchable terms
 - word segmentation
stub: false
compiled_at: 2026-04-24T18:20:32.349Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The [tokenization](../concepts/tokenization.md) System is responsible for processing raw text and breaking it down into a list of searchable units, or "tokens" [Source 1]. This process is a fundamental step for the internal [[]] Search Engine]], which relies on these tokens to build its search index. The system's responsibilities include splitting text into words or characters, normalizing tokens (e.g., converting to lowercase), removing common "stop words" that carry little semantic meaning, and reducing words to their root form through a process called [Stemming](../concepts/stemming.md) [Source 1].

## Architecture

The system is designed around a strategy pattern, with a central interface defining the contract for tokenization and multiple concrete implementations providing different approaches for various languages and use cases [Source 1].

### Core Components

*   **`TokenizerStrategy`**: An interface that defines the core contract for any tokenizer. It requires a `tokenize(text: string)` method to perform the text splitting and a `language` property to identify the target language. The [TF-IDF](../concepts/tf-idf.md) Search Engine]] delegates all text processing to a class that implements this strategy [Source 1].
*   **`STOP_WORDS`**: A collection of common, semantically empty function words for multiple languages, including English, French, German, Spanish, Portuguese, Italian, Dutch, and Russian. These words are typically excluded from the search index to improve relevance and reduce index size [Source 1].
*   **`porterStem()`**: A utility function that implements a simplified version of the Porter stemming algorithm for English. It normalizes words by removing common suffixes (e.g., `-ing`, `-ed`, `-s`), so that variations like "running", "runs", and "ran" can all be matched by the root "run". The implementation is deliberately simplified for search purposes, prioritizing recall over perfect linguistic accuracy [Source 1].

### Tokenizer Implementations

YAAF provides several concrete tokenizer implementations:

*   **`EnglishTokenizer`**: A specialized tokenizer for English-only content. It combines the `porterStem` function for morphological normalization with the English stop word list [Source 1].
*   **`UnicodeTokenizer`**: A language-agnostic tokenizer that splits text based on whitespace. It is suitable for any script that uses spaces as word separators (e.g., Latin, Cyrillic, Arabic) but does not perform any stemming [Source 1].
*   **`NgramTokenizer`**: A tokenizer that breaks text into overlapping sequences of characters, known as n-grams (bigrams, or 2-character sequences, by default). This method is effective for languages that do not have clear word boundaries, such as Chinese, Japanese, and Korean (CJK) [Source 1].
*   **`HybridTokenizer`**: The default tokenizer used by the [TF-IDF Search Engine](./tf-idf-search-engine.md). It automatically detects the script of the input text and applies the most appropriate strategy. For example, it uses word-based tokenization for Latin scripts, character bigrams for CJK scripts, and character trigrams for scripts like Thai. This allows it to handle mixed-language content effectively [Source 1].

## Integration Points

The Tokenization System is a critical dependency of the framework's internal TF-IDF search engine. The search engine delegates all text processing tasks to an active `TokenizerStrategy` implementation to prepare content for indexing and querying [Source 1].

## Key APIs

*   **`TokenizerStrategy`**: The primary interface for implementing custom tokenization logic. Developers can create their own tokenizers for specific languages or needs by implementing this interface [Source 1].
*   **`HybridTokenizer`**: The default, general-purpose tokenizer. It provides robust, out-of-the-box support for multilingual content by automatically selecting the best tokenization method based on the text's script [Source 1].
*   **`EnglishTokenizer`**: A specialized tokenizer that provides stemming for English text, improving search recall for English-language knowledge bases [Source 1].
*   **`NgramTokenizer`**: A tokenizer for languages without whitespace separators, configurable for different n-gram sizes [Source 1].
*   **`UnicodeTokenizer`**: A simple, whitespace-based tokenizer for scripts where stemming or complex word segmentation is not required [Source 1].

## Extension Points

The primary extension point for this subsystem is the `TokenizerStrategy` interface. Developers can implement this interface to integrate specialized, third-party tokenization libraries. The source material suggests this approach for adding support for language-specific [Tools](./tools.md) like MeCab for Japanese word segmentation or jieba for Chinese [Source 1].

## Sources

*   [Source 1] `src/knowledge/store/tokenizers.ts`