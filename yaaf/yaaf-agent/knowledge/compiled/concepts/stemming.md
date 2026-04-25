---
summary: The process of reducing inflected (or sometimes derived) words to their word stem, base or root form.
title: Stemming
entity_type: concept
search_terms:
 - word stemming
 - reduce words to root form
 - morphological normalization
 - Porter stemmer
 - what is stemming in search
 - running vs run
 - normalize text for search
 - EnglishTokenizer
 - TF-IDF text processing
 - linguistic accuracy vs recall
 - handle word variations
 - suffix stripping
stub: false
compiled_at: 2026-04-24T18:02:22.617Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Stemming is a text normalization technique that reduces words to their root or base form, known as the "stem." The primary goal of stemming is to treat different variations of a word as a single concept for purposes like information retrieval [Source 1]. For example, the words "running," "runs," and "ran" can all be reduced to the stem "run."

In YAAF, stemming is used within the [[]] Search Engine]] to improve search recall. By normalizing different word forms to a common stem, the search index can match queries to documents more effectively, even if the exact word forms do not match. This approach prioritizes finding all relevant documents (recall) over perfect linguistic precision [Source 1].

## How It Works in YAAF

YAAF's implementation of stemming is based on a minimal version of the Porter stemming algorithm, developed by Martin Porter in 1980. This is exposed through the `porterStem` utility function [Source 1].

The `porterStem` function is a simplified implementation designed specifically for search. It handles common English suffixes such as `-ing`, `-ed`, `-tion`, `-ness`, `-ment`, `-s`, and others. It is not a complete implementation of the more modern Porter2 algorithm, as its focus is on practical search performance rather than strict linguistic correctness [Source 1].

Stemming is applied as part of a `TokenizerStrategy`. Specifically:
*   The `EnglishTokenizer` class combines the `porterStem` function with a list of English stop words. It is the recommended tokenizer for English-only knowledge bases [Source 1].
*   The `HybridTokenizer`, which is the default tokenizer for the [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md), can optionally apply Porter stemming to text it identifies as being in a Latin or Cyrillic script (like English) [Source 1].
*   Other tokenizers, such as `UnicodeTokenizer` and `NgramTokenizer`, do not perform stemming [Source 1].

A developer enables stemming by selecting a tokenizer that incorporates it, thereby ensuring that terms in the search index are stored in their stemmed form.

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts