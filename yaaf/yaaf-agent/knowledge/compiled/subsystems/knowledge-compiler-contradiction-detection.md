---
title: Knowledge Compiler Contradiction Detection
entity_type: subsystem
summary: The YAAF Knowledge Compiler's subsystem responsible for heuristically detecting potential factual contradictions across compiled articles.
primary_files:
 - src/knowledge/compiler/contradictions.ts
exports:
 - detectContradictions
 - ContradictionPair
 - ContradictionReport
 - ContradictionOptions
search_terms:
 - fact checking in knowledge base
 - detecting conflicting information
 - knowledge base consistency
 - heuristic contradiction detection
 - negation contradiction
 - numeric disagreement detection
 - temporal conflict resolution
 - how to find errors in compiled knowledge
 - cross-article validation
 - YAAF knowledge compiler scan
 - preventing factual errors in agents
 - knowledge base integrity
stub: false
compiled_at: 2026-04-24T18:15:22.443Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Knowledge Compiler](./knowledge-compiler.md) Contradiction Detection subsystem is a post-synthesis utility that scans compiled knowledge base articles to identify potential factual contradictions [Source 1]. It operates without requiring an [LLM](../concepts/llm.md), using a set of heuristic methods to find inconsistencies across different articles. The primary goal of this subsystem is detection, not resolution. It reports potential conflicts, leaving the task of resolving them to a human operator or a subsequent, potentially LLM-powered, "[Heal](../concepts/heal.md) pass" [Source 1].

## Architecture

This subsystem functions as a standalone scan that operates on a directory of compiled articles. Its core logic involves pairwise comparison of sentences extracted from different articles to identify three specific types of contradictions [Source 1]:

1.  **Negation Contradictions**: This heuristic identifies pairs of sentences with high token overlap, where one sentence contains negation markers (e.g., "not", "isn't") and the other does not.
2.  **[Numeric Disagreement](../concepts/numeric-disagreement.md)s**: It detects [when](../apis/when.md) two articles make claims about the same entity but use different numeric values (e.g., "Project X started in 2017" vs. "Project X started in 2019").
3.  **Temporal Conflicts**: This is a specific form of Numeric Disagreement focused on conflicting dates or years associated with the same concept across articles.

To manage performance and prevent computational stalls on large knowledge bases, the architecture includes several safeguards. The scan can be limited by the number of articles, the number of sentences extracted per article, and a hard budget on the total number of pairwise sentence comparisons. When extracting sentences, it prioritizes those at the beginning of an article, assuming the most salient facts are stated early [Source 1].

The output of a scan is a `ContradictionReport`, which lists all detected `ContradictionPair` instances and indicates whether the scan was truncated due to exceeding its comparison budget [Source 1].

## Integration Points

The Contradiction Detection subsystem is designed to be a step in the broader Knowledge Compiler pipeline. It runs after the initial synthesis of individual articles is complete. The `ContradictionReport` it generates serves as an input for subsequent quality assurance processes, which may include manual review by a knowledge base curator or automated correction by another system component [Source 1].

## Key APIs

The primary public API for this subsystem is the `detectContradictions` function and its associated data structures [Source 1].

*   **`detectContradictions(compiledDir: string, options?: ContradictionOptions): Promise<ContradictionReport>`**
    This asynchronous function initiates the scan. It takes the path to the directory containing compiled articles and an optional configuration object. It returns a promise that resolves to a `ContradictionReport`.

*   **`ContradictionReport`**
    An interface representing the final output of a scan. It contains an array of `ContradictionPair` objects, statistics on the number of articles and claims scanned, and a boolean `truncated` flag that is true if the scan was stopped early due to budget limits.

*   **`ContradictionPair`**
    An interface describing a single detected contradiction. It includes the names of the two articles, the conflicting claims from each, a similarity score, and the type of contradiction (`negation`, `numeric_disagreement`, or `temporal_conflict`).

## Configuration

The behavior of the contradiction scan can be customized via the `ContradictionOptions` object passed to the `detectContradictions` function. The available options are [Source 1]:

*   `maxArticles`: The maximum number of articles to scan. Defaults to 200.
*   `minOverlap`: The minimum token overlap required to consider two sentences related for comparison. Defaults to 0.5.
*   `maxSentencesPerArticle`: The maximum number of sentences to extract from the beginning of each article for comparison. This prevents performance degradation from very long articles. Defaults to 30.
*   `maxComparisons`: A hard budget on the total number of pairwise sentence comparisons. If this limit is exceeded, the scan terminates early. Defaults to 50,000.

## Sources

[Source 1]: src/knowledge/compiler/contradictions.ts