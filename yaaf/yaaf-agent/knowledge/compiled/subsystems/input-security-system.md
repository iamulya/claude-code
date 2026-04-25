---
summary: Provides mechanisms for detecting and mitigating security threats related to LLM inputs, such as prompt injection.
primary_files:
 - src/security/inputAnomalyDetector.ts
title: Input Security System
entity_type: subsystem
exports:
 - InputAnomalyDetector
 - InputAnomalyConfig
 - InputAnomalyResult
 - InputAnomalyEvent
 - AnomalyType
search_terms:
 - prompt injection detection
 - LLM input validation
 - how to prevent prompt injection
 - statistical anomaly detection for prompts
 - Shannon entropy in prompts
 - detecting encoded payloads in LLM input
 - defense-in-depth for agents
 - input sanitization for LLMs
 - invisible character attacks
 - repetition attacks on LLMs
 - language mixing detection
 - input length limits for agents
stub: false
compiled_at: 2026-04-24T18:13:35.089Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Input [Security System](./security-system.md) provides a [Defense-in-depth](../concepts/defense-in-depth.md) layer against security threats embedded in Large Language Model ([LLM](../concepts/llm.md)) inputs [Source 1]. Its primary component, the `InputAnomalyDetector`, is designed to identify unusual input patterns that often correlate with [Prompt Injection](../concepts/prompt-injection.md) attempts but are difficult to catch with simple rule-based or regular expression-based filters [Source 1].

This subsystem focuses on statistical and structural anomalies within the input data, including [Source 1]:
*   **Length Anomalies**: Inputs that are significantly longer than expected.
*   **Entropy Spikes**: Unusually high or low Shannon entropy, which can indicate encoded payloads or repetitive padding attacks.
*   **Language Mixing**: Abrupt changes in language or character scripts within a single message.
*   **Repetition Patterns**: High ratios of repeated character sequences.
*   **Invisible Characters**: A high density of non-printable characters.

It is intended to function as a secondary security layer, complementing other mechanisms like a PromptGuard [Source 1].

## Architecture

The core of the Input Security System is the `InputAnomalyDetector` class. This class analyzes incoming `ChatMessage` objects and performs a series of statistical checks based on its configuration [Source 1].

[when](../apis/when.md) an anomaly is detected, the system generates an `InputAnomalyEvent` which contains details about the finding, including the type of anomaly, its severity (`warning` or `block`), and a descriptive message. The detector aggregates these events into a final `InputAnomalyResult` object. This result summarizes whether any anomalies were detected, whether any were severe enough to warrant blocking the input, and provides a list of all generated events [Source 1].

The system defines several distinct `AnomalyType`s that it can detect [Source 1]:
*   `length_warning` / `length_blocked`
*   `low_entropy` / `high_entropy`
*   `invisible_chars`
*   `repetition`
*   `mixed_scripts`

## Key APIs

*   **`InputAnomalyDetector`**: The primary class responsible for analyzing inputs and detecting anomalies [Source 1].
*   **`InputAnomalyConfig`**: A configuration object used to define the thresholds and behavior of the detector [Source 1].
*   **`InputAnomalyResult`**: The return type from a detection run, indicating if anomalies were found and if the input should be blocked [Source 1].
*   **`InputAnomalyEvent`**: An object describing a single detected anomaly, including its type, severity, and location [Source 1].
*   **`AnomalyType`**: A string literal type that enumerates the different kinds of anomalies the system can detect [Source 1].

## Configuration

The behavior of the `InputAnomalyDetector` is controlled via the `InputAnomalyConfig` object. This allows developers to tune the sensitivity of the various checks [Source 1].

Key configuration parameters include:
*   `maxInputLength`: Flags inputs exceeding this character length as a warning. Default is 50,000.
*   `hardMaxInputLength`: Blocks inputs exceeding this character length. Default is 200,000.
*   `minEntropy`: Flags inputs with Shannon entropy below this value, which can indicate repetitive padding. Default is 1.5.
*   `maxEntropy`: Flags inputs with Shannon entropy above this value, which can indicate encoded or encrypted data. Default is 5.5.
*   `maxInvisibleRatio`: The maximum allowed ratio of non-printable characters. Default is 0.05 (5%).
*   `maxRepetitionRatio`: The maximum allowed ratio of repeated 3-gram subsequences. Default is 0.4 (40%).
*   `onAnomaly`: An optional callback function that is invoked whenever an anomaly is detected.

## Extension Points

The primary extension point for this subsystem is the `onAnomaly` callback function within the `InputAnomalyConfig`. This allows developers to implement custom logic that runs when an anomaly is detected, such as sending alerts to a monitoring system, logging detailed event information, or triggering alternative workflows [Source 1].

## Sources

[Source 1] `src/security/inputAnomalyDetector.ts`