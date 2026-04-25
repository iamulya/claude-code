---
summary: Interface representing a detected input anomaly event, including its type, severity, and details.
export_name: InputAnomalyEvent
source_file: src/security/inputAnomalyDetector.ts
category: type
title: InputAnomalyEvent
entity_type: api
search_terms:
 - input security event
 - anomaly detection payload
 - prompt injection event data
 - what is in an anomaly event
 - InputAnomalyDetector event
 - security warning details
 - blocked input reason
 - malicious input detection
 - LLM input validation event
 - security event structure
 - threat detection event
 - onAnomaly callback data
stub: false
compiled_at: 2026-04-24T17:14:31.843Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `InputAnomalyEvent` is a TypeScript type that defines the data structure for a single anomaly detected in an [LLM](../concepts/llm.md) input by the `InputAnomalyDetector` [Source 1].

Each time the detector identifies a potential security risk—such as unusually high entropy, excessive length, or repetition patterns—it generates an `InputAnomalyEvent` object. This object contains detailed information about the nature of the anomaly, its severity, and where it occurred in the input messages [Source 1].

These events are collected in the `events` array of an `InputAnomalyResult` object and are passed to the optional `onAnomaly` callback function defined in the `InputAnomalyConfig` [Source 1]. This allows for logging, monitoring, or custom handling of detected security events.

## Signature

The `InputAnomalyEvent` is a type alias for an object with the following properties [Source 1]:

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

### Properties

*   **`type: AnomalyType`**
    The specific type of anomaly detected. `AnomalyType` is a string literal union that can be one of the following values [Source 1]:
    *   `"length_warning"`: The input length exceeds a configured warning threshold.
    *   `"length_blocked"`: The input length exceeds a configured hard limit, blocking processing.
    *   `"low_entropy"`: The input has suspiciously low Shannon entropy, often indicating repetitive padding attacks.
    *   `"high_entropy"`: The input has suspiciously high Shannon entropy, which can indicate encoded or encrypted payloads.
    *   `"invisible_chars"`: The input contains a high ratio of non-printable or invisible characters.
    *   `"repetition"`: The input contains a high ratio of repeated character sequences.
    *   `"mixed_scripts"`: The input contains a mix of different character scripts (e.g., Latin and Cyrillic) in a suspicious manner.

*   **`messageIndex: number`**
    The zero-based index of the `ChatMessage` in the input array where the anomaly was found [Source 1].

*   **`messageRole: string`**
    The role of the message containing the anomaly (e.g., `"user"`, `"system"`) [Source 1].

*   **`detail: string`**
    A human-readable string providing specific details about the anomaly, such as the measured value and the threshold that was crossed [Source 1].

*   **`severity: "warning" | "block"`**
    Indicates the severity of the event. A `"warning"` suggests the input is suspicious but may be allowed, while a `"block"` indicates the input is considered malicious and should be rejected [Source 1].

*   **`timestamp: Date`**
    A `Date` object representing [when](./when.md) the event was generated [Source 1].

## Examples

### Example: High Entropy Warning

This is an example of an `InputAnomalyEvent` that might be generated if a user message contains what appears to be a base64-encoded string.

```typescript
const highEntropyEvent: InputAnomalyEvent = {
  type: "high_entropy",
  messageIndex: 0,
  messageRole: "user",
  detail: "High Shannon entropy detected: 5.98. Threshold is 5.5.",
  severity: "warning",
  timestamp: new Date("2023-10-27T10:00:00Z"),
};
```

### Example: Length Block

This event would be generated if an input message exceeds the hard length limit, resulting in a "block" severity.

```typescript
const lengthBlockEvent: InputAnomalyEvent = {
  type: "length_blocked",
  messageIndex: 2,
  messageRole: "user",
  detail: "Input length (250,112 chars) exceeds hard maximum of 200,000.",
  severity: "block",
  timestamp: new Date("2023-10-27T10:05:00Z"),
};
```

### Example: Usage in `onAnomaly` Callback

The `InputAnomalyEvent` is the payload for the `onAnomaly` callback, allowing for real-time logging or alerting.

```typescript
import { InputAnomalyDetector, InputAnomalyEvent } from "yaaf";

const detector = new InputAnomalyDetector({
  hardMaxInputLength: 1000,
  onAnomaly: (event: InputAnomalyEvent) => {
    console.log(`[${event.severity.toUpperCase()}] Anomaly Detected: ${event.detail}`);
    // Potentially send this event to a security monitoring service
  },
});

// This call would trigger the onAnomaly callback with a 'length_blocked' event.
detector.detect([
  { role: 'user', content: 'a'.repeat(1500) }
]);
```

## See Also

*   `InputAnomalyDetector`: The class that generates `InputAnomalyEvent` objects.
*   `InputAnomalyResult`: The object returned by the detector, which contains an array of `InputAnomalyEvent`s.
*   `InputAnomalyConfig`: The configuration for the detector, where the `onAnomaly` handler for these events is defined.
*   `AnomalyType`: The type definition for the different kinds of anomalies that can be detected.

## Sources

[Source 1] src/security/inputAnomalyDetector.ts