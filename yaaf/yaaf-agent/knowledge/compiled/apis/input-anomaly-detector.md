---
summary: Detects unusual input patterns in LLM inputs using statistical anomaly detection to prevent prompt injection attempts.
export_name: InputAnomalyDetector
source_file: src/security/inputAnomalyDetector.ts
category: class
title: InputAnomalyDetector
entity_type: api
search_terms:
 - prompt injection defense
 - statistical input analysis
 - LLM input security
 - Shannon entropy check
 - input length validation
 - repetition attack detection
 - invisible character detection
 - defense in depth for prompts
 - how to detect encoded payloads
 - prevent padding attacks
 - language mixing detection
 - unusual input patterns
 - non-printable character filter
stub: false
compiled_at: 2026-04-24T17:14:26.990Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `InputAnomalyDetector` is a security class designed to identify unusual patterns in [LLM](../concepts/llm.md) inputs that may indicate a [Prompt Injection](../concepts/prompt-injection.md) attack [Source 1]. It operates by performing statistical analysis on input text, serving as a secondary defense layer to complement pattern-matching [Tools](../subsystems/tools.md) like `PromptGuard` for a [Defense-in-depth](../concepts/defense-in-depth.md) strategy [Source 1].

This detector is particularly effective against attacks that are difficult to catch with regular expressions alone. It flags anomalies such as [Source 1]:

*   **Length Anomalies**: Inputs that are significantly longer than a typical distribution.
*   **Entropy Spikes**: Unusually high or low Shannon entropy, which can suggest encoded payloads or repetitive padding attacks.
*   **Language Mixing**: Abrupt changes in language or character scripts within a single message.
*   **Repetition Patterns**: High frequency of repeated character sequences.
*   **Invisible Characters**: A high density of non-printable or invisible characters.

## Signature / Constructor

The `InputAnomalyDetector` class is instantiated with an optional configuration object of type `InputAnomalyConfig` [Source 1].

### `InputAnomalyConfig`

The configuration object allows customization of the detection thresholds.

```typescript
export type InputAnomalyConfig = {
  /**
   * Maximum input length in characters before flagging.
   * Default: 50_000.
   */
  maxInputLength?: number;

  /**
   * Maximum input length in characters before hard-blocking.
   * Default: 200_000.
   */
  hardMaxInputLength?: number;

  /**
   * Minimum Shannon entropy (bits per character) to flag as suspiciously low.
   * Very low entropy = repetitive padding attacks.
   * Default: 1.5.
   */
  minEntropy?: number;

  /**
   * Maximum Shannon entropy (bits per character) to flag as suspiciously high.
   * Very high entropy = encoded/encrypted payloads.
   * Default: 5.5.
   */
  maxEntropy?: number;

  /**
   * Maximum ratio of invisible/non-printable characters.
   * Default: 0.05 (5%).
   */
  maxInvisibleRatio?: number;

  /**
   * Maximum ratio of repeated 3-grams (subsequences).
   * Default: 0.4 (40%).
   */
  maxRepetitionRatio?: number;

  /**
   * Called on anomaly detection.
   */
  onAnomaly?: (event: InputAnomalyEvent) => void;
};
```

### Related Types

The detector uses the following types to report its findings [Source 1].

#### `InputAnomalyResult`

This is the return type for an analysis operation, summarizing all findings.

```typescript
export type InputAnomalyResult = {
  /** Whether any anomalies were detected */
  detected: boolean;
  /** Whether any anomalies are severe enough to block */
  blocked: boolean;
  /** Anomaly events */
  events: InputAnomalyEvent[];
  /** Block reason if blocked */
  blockReason?: string;
};
```

#### `InputAnomalyEvent`

This object describes a single detected anomaly.

```typescript
export type InputAnomalyEvent = {
  type: AnomalyType;
  messageIndex: number;
  messageRole: string;
  detail: string;
  /** Severity: warning or block */
  severity: "warning" | "block";
  timestamp: Date;
};
```

#### `AnomalyType`

A string literal type representing the specific category of anomaly detected.

```typescript
export type AnomalyType =
  | "length_warning"
  | "length_blocked"
  | "low_entropy"
  | "high_entropy"
  | "invisible_chars"
  | "repetition"
  | "mixed_scripts";
```

## Events

The `InputAnomalyDetector` can be configured with an `onAnomaly` callback function. This function is invoked each time an anomaly is detected, receiving an `InputAnomalyEvent` object as its argument. This allows for real-time logging or monitoring of security events [Source 1].

```typescript
// Example configuration with an onAnomaly callback
const config: InputAnomalyConfig = {
  onAnomaly: (event) => {
    console.warn(`Anomaly Detected: ${event.type}`, event);
  },
};

const detector = new InputAnomalyDetector(config);
```

## Examples

The following example demonstrates how to instantiate and use the `InputAnomalyDetector` to check a series of chat messages.

*Note: The source material does not specify the exact method name for performing the check. The method `.check()` is used here for illustrative purposes.*

```typescript
import {
  InputAnomalyDetector,
  InputAnomalyConfig,
  InputAnomalyResult,
} from "yaaf";
import type { ChatMessage } from "yaaf";

// 1. Configure the detector with custom thresholds
const config: InputAnomalyConfig = {
  maxInputLength: 10000,
  hardMaxInputLength: 25000,
  maxEntropy: 5.0,
  onAnomaly: (event) => {
    console.log(`[SECURITY_EVENT] Anomaly of type "${event.type}" detected.`);
  },
};

const detector = new InputAnomalyDetector(config);

// 2. Define some messages to check
const messages: ChatMessage[] = [
  { role: "user", content: "Hello, how are you?" },
  {
    role: "user",
    content: "a".repeat(15000), // This will trigger a length_warning
  },
  {
    role: "user",
    content:
      "BASE64_ENCODED_PAYLOAD_SIMULATION_q843tq984hfq9384hfqo...", // May trigger high_entropy
  },
];

// 3. Perform the check (illustrative method name)
// const result: InputAnomalyResult = detector.check(messages);
const result: InputAnomalyResult = {
  /* Assume this is the result from a detector.check(messages) call */
  detected: true,
  blocked: false,
  events: [
    {
      type: "length_warning",
      messageIndex: 1,
      messageRole: "user",
      detail: "Input length 15000 exceeds warning threshold 10000",
      severity: "warning",
      timestamp: new Date(),
    },
  ],
};

// 4. Handle the result
if (result.blocked) {
  console.error(`Input blocked: ${result.blockReason}`);
  // Reject the request
} else if (result.detected) {
  console.warn("Anomalous input detected, proceeding with caution.");
  // Add extra logging or monitoring
} else {
  console.log("Input is clean.");
  // Proceed normally
}
```

## Sources

[Source 1]: src/security/inputAnomalyDetector.ts