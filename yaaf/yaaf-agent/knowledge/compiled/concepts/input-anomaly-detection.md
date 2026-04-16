---
summary: A security pattern that uses statistical heuristics rather than static signatures to identify potentially malicious LLM interactions.
title: Input Anomaly Detection
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:34:39.783Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/inputAnomalyDetector.ts
confidence: 0.9
---

---
title: Input Anomaly Detection
entity_type: concept
summary: A security pattern that uses statistical heuristics rather than static signatures to identify potentially malicious LLM interactions.
related_subsystems:
  - security

## What It Is
Input Anomaly Detection is a defense-in-depth security pattern in YAAF designed to identify potentially malicious LLM inputs that bypass traditional signature-based filters. Unlike standard regex-based tools, which look for specific known attack strings, Input Anomaly Detection uses statistical heuristics to identify structural irregularities in messages.

This approach is particularly effective against prompt injection attempts, obfuscated payloads, and denial-of-service (DoS) attacks that utilize unusual character distributions or extreme input lengths. It serves as a secondary layer of protection, typically operating alongside or after signature-based guards.

## How It Works in YAAF
The framework implements this concept through the `InputAnomalyDetector` class. It analyzes `ChatMessage` objects against several statistical benchmarks to determine if an input deviates from normal human-readable text.

### Detection Heuristics
The detector evaluates inputs based on five primary metrics:

*   **Token Entropy Spikes**: Uses Shannon entropy (bits per character) to measure the randomness of the input. Very high entropy often indicates encoded or encrypted payloads, while very low entropy suggests repetitive padding attacks.
*   **Length Anomalies**: Monitors input size against configurable thresholds. It distinguishes between a "warning" length (suspiciously long) and a "hard-block" length (potential DoS or context-window exhaustion attempt).
*   **Language and Script Mixing**: Detects sudden switches between different scripts or languages within a single message, which can be a sign of bypass techniques.
*   **Repetition Patterns**: Analyzes the ratio of repeated 3-gram subsequences. High repetition ratios are characteristic of certain types of "jailbreak" padding.
*   **Invisible Character Density**: Calculates the ratio of non-printable or invisible characters. A high ratio often indicates attempts to hide malicious instructions from human reviewers while remaining visible to the LLM.

### Result Handling
When the detector processes an input, it returns an `InputAnomalyResult`. This object contains:
*   A boolean `detected` flag.
*   A `blocked` flag if the anomaly severity exceeds safety thresholds.
*   An array of `InputAnomalyEvent` objects detailing the specific type of anomaly (e.g., `low_entropy`, `invisible_chars`).
*   A `blockReason` for logging and auditing.

## Configuration
Developers can fine-tune the sensitivity of the detector via the `InputAnomalyConfig` object. This allows for adjusting thresholds based on the specific requirements of the application's domain.

```typescript
const config: InputAnomalyConfig = {
  // Flag inputs exceeding 50k chars, block at 200k
  maxInputLength: 50000,
  hardMaxInputLength: 200000,

  // Adjust Shannon entropy bounds (bits per character)
  minEntropy: 1.5,
  maxEntropy: 5.5,

  // Limit non-printable characters to 5%
  maxInvisibleRatio: 0.05,

  // Limit repeated sequences to 40%
  maxRepetitionRatio: 0.4,

  // Custom callback for logging or alerting
  onAnomaly: (event) => {
    console.warn(`Security Alert: ${event.type} detected with severity ${event.severity}`);
  }
}
```

## Sources
* `src/security/inputAnomalyDetector.ts`