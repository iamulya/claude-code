---
title: Negation Contradiction
entity_type: concept
summary: A type of factual contradiction where two claims have high token overlap but one contains negation markers.
related_subsystems:
 - knowledge-compiler
search_terms:
 - contradiction detection
 - factual consistency check
 - negated statements
 - finding conflicting facts
 - heuristic contradiction detection
 - knowledge base validation
 - cross-article consistency
 - detecting opposite claims
 - YAAF knowledge compiler
 - negation markers in text
stub: false
compiled_at: 2026-04-24T17:59:05.196Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Negation Contradiction is a type of potential factual inconsistency identified between two claims within the YAAF knowledge base. It is characterized by two sentences that have a high degree of token overlap, but one sentence contains negation markers (e.g., "not," "isn't") while the other does not [Source 1].

This concept is part of a broader heuristic-based, post-synthesis scan called Cross-Article Contradiction Detection. This scan is designed to identify potential contradictions without the use of an [LLM](./llm.md). The system detects and reports these contradictions but does not attempt to resolve them; resolution is delegated to a human operator or a subsequent LLM-powered healing process [Source 1].

Negation Contradiction is one of three types of contradictions detected by this system, alongside numeric disagreements and temporal conflicts [Source 1].

## How It Works in YAAF

The detection of Negation Contradictions is implemented within the `knowledge/compiler/contradictions` module as part of the `detectContradictions` function [Source 1]. The process operates on compiled knowledge base articles.

The mechanism involves these steps:
1.  The system scans a set of compiled articles.
2.  Each article is broken down into individual sentences.
3.  The system performs pairwise comparisons of sentences from different articles.
4.  For each pair of sentences, it calculates the token overlap.
5.  If the overlap exceeds a configured threshold (`minOverlap`), the system checks for the presence of negation markers in one sentence but not the other.
6.  If these conditions are met, the pair is flagged as a `ContradictionPair` with the `type` field set to `"negation"` [Source 1].

The findings are compiled into a `ContradictionReport`, which lists all identified pairs for review [Source 1].

## Configuration

The behavior of the contradiction detection scan, including the identification of Negation Contradictions, can be configured through the `ContradictionOptions` interface. Key parameters include:

*   `minOverlap`: Sets the minimum token overlap required for two sentences to be considered related and thus candidates for a negation contradiction check. The default value is `0.5` [Source 1].
*   `maxArticles`: The maximum number of articles to include in the scan. Defaults to `200` [Source 1].
*   `maxSentencesPerArticle`: Limits the number of sentences extracted from the beginning of each article to prevent performance issues with very long articles. Defaults to `30` [Source 1].
*   `maxComparisons`: A hard budget on the total number of pairwise sentence comparisons to prevent stalls on large knowledge bases. Defaults to `50,000` [Source 1].

## Sources

[Source 1] src/knowledge/compiler/contradictions.ts