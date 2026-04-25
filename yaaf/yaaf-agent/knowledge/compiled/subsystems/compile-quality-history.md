---
summary: Provides an append-only log and analysis tools for knowledge base compilation quality metrics over time.
primary_files:
 - src/knowledge/compiler/qualityHistory.ts
title: Compile Quality History
entity_type: subsystem
exports:
 - CompileQualityRecord
 - QualityDelta
 - buildQualityRecord
 - appendQualityRecord
 - loadQualityHistory
 - compareCompiles
search_terms:
 - knowledge base quality
 - compilation metrics
 - track grounding score
 - lint error trends
 - CI gate for KB quality
 - compile regression detection
 - JSONL log file
 - .kb-quality-history.jsonl
 - how to measure KB improvement
 - analyze compile results
 - historical compile data
 - knowledge base performance over time
stub: false
compiled_at: 2026-04-24T18:10:52.985Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Compile Quality History subsystem provides a mechanism for tracking the quality and performance of the knowledge base compilation process over time [Source 1]. After each compilation, it appends a single-line JSON record to a history file, `.kb-quality-history.jsonl`. This historical data enables developers to analyze trends, diagnose regressions, and enforce quality standards [Source 1].

Key use cases for this subsystem include:
- Analyzing the impact of changes, such as determining if adding new embeddings improved [Grounding Score](../concepts/grounding-score.md)s [Source 1].
- Monitoring trends in code quality, like tracking whether the number of [Linting](../concepts/linting.md) errors is increasing [Source 1].
- Implementing continuous integration (CI) gates that can automatically reject a compile if a key [Metric](../concepts/metric.md), such as Grounding Score, drops by a significant margin [Source 1].

The subsystem is designed to have zero runtime cost for the agent, as it only executes at the end of the compile process [Source 1].

## Architecture

The core of the subsystem is an append-only log file named `.kb-quality-history.jsonl`, located in the knowledge base directory [Source 1]. The file uses the JSON Lines (JSONL) format, where each line is a self-contained JSON object representing a single compilation's metrics [Source 1].

This design choice offers two main advantages:
1.  **Append-Only Writes**: The JSONL format is well-suited for simple, append-only operations, which is the primary interaction with the history file [Source 1].
2.  **Schema Flexibility**: New fields can be added to the JSON records in future versions without breaking older parsers or requiring complex schema migrations [Source 1].

The central data structure is the `CompileQualityRecord`, which captures a snapshot of metrics from a single compile. This record includes data on duration, the number of articles compiled or skipped, grounding results (mean score, pass/fail counts), linting issues (errors, warnings, top issue codes), and the overall size of the knowledge base [Source 1].

## Integration Points

The Compile Quality History subsystem is primarily integrated with the main [Knowledge Base Compiler](./knowledge-base-compiler.md). The compiler is responsible for invoking this subsystem at the conclusion of a compilation run. It passes a `CompileResult` object to the `buildQualityRecord` function, which then transforms the raw results into the standardized `CompileQualityRecord` format for persistence [Source 1].

## Key APIs

The subsystem exposes several types and functions for creating, storing, and analyzing compile quality data [Source 1].

-   **`CompileQualityRecord` (type)**: A comprehensive record of a single compilation's metrics, including duration, article counts, grounding statistics, linting summaries, and knowledge base size.
-   **`QualityDelta` (type)**: Represents the difference between two `CompileQualityRecord` instances, highlighting changes in grounding scores, lint errors, and total articles. It also includes human-readable lists of detected regressions and improvements.
-   **`buildQualityRecord(result: CompileResult)`**: A function that takes the final result object from a compilation and transforms it into a `CompileQualityRecord`.
-   **`appendQualityRecord(kbDir: string, record: CompileQualityRecord)`**: An asynchronous function that appends a given `CompileQualityRecord` to the `.kb-quality-history.jsonl` file in the specified knowledge base directory. It creates the file if it does not exist.
-   **`loadQualityHistory(kbDir: string)`**: An asynchronous function that reads and parses the entire `.kb-quality-history.jsonl` file, returning an array of `CompileQualityRecord` objects. It returns an empty array if the file is not found.
-   **`compareCompiles(prev: CompileQualityRecord, curr: CompileQualityRecord)`**: A function that compares two compilation records (typically a previous and current one) and returns a `QualityDelta` object detailing the changes and any detected regressions or improvements.

## Sources

[Source 1]: src/knowledge/compiler/qualityHistory.ts