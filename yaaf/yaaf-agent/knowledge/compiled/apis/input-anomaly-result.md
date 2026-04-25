---
summary: Interface representing the overall result of an input anomaly detection scan, indicating if anomalies were detected or blocked.
export_name: InputAnomalyResult
source_file: src/security/inputAnomalyDetector.ts
category: type
title: InputAnomalyResult
entity_type: api
search_terms:
 - input security scan result
 - anomaly detection output
 - prompt injection detection result
 - was input blocked
 - list of detected anomalies
 - security event details
 - InputAnomalyDetector return type
 - blocked input reason
 - how to check for input anomalies
 - security scan summary
 - YAAF input validation
 - check if prompt is safe
stub: false
compiled_at: 2026-04-24T17:14:26.712Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `InputAnomalyResult` type represents the complete output of a security scan performed by the `InputAnomalyDetector` [Source 1]. It provides a summary of whether any potential anomalies were found in the input, whether those anomalies were severe enough to warrant blocking the request, and a detailed list of all detected events [Source 1].

This object is the primary mechanism for an application to react to the findings of an input anomaly scan. By inspecting its properties, developers can decide whether to proceed with processing the input, log a warning, or reject the input entirely [Source 1].

## Signature

`InputAnomalyResult` is a TypeScript type with the following structure [Source 1]:

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

### Properties

*   **`detected: boolean`**
    If `true`, at least one anomaly of any severity was found in the input [Source 1].

*   **`blocked: boolean`**
    If `true`, at least one anomaly was severe enough to be considered a "block" action. This typically happens for egregious violations like exceeding the `hardMaxInputLength` [Source 1].

*   **`events: InputAnomalyEvent[]`**
    An array containing detailed information about each anomaly that was detected. If `detected` is `false`, this array will be empty [Source 1]. Each event in the array conforms to the `InputAnomalyEvent` type:

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

*   **`blockReason?: string`**
    An optional string that provides a human-readable reason why the input was blocked. This property is only present [when](./when.md) `blocked` is `true` [Source 1].

## Examples

The following example demonstrates how to process the result from an `InputAnomalyDetector` scan.

```typescript
import { InputAnomalyDetector, InputAnomalyResult } from 'yaaf';

// Assume 'detector' is an instance of InputAnomalyDetector
// and 'messages' is an array of ChatMessage objects.
const scanResult: InputAnomalyResult = detector.scan(messages);

if (scanResult.blocked) {
  console.error(`Input blocked: ${scanResult.blockReason}`);
  // Reject the request or return an error to the user
  throw new Error('Invalid input detected.');
}

if (scanResult.detected) {
  console.warn('Potential input anomalies detected:');
  for (const event of scanResult.events) {
    console.warn(
      `- [${event.severity.toUpperCase()}] ${event.type}: ${event.detail}`
    );
  }
  // Proceed with caution, perhaps with extra logging
}

// If neither blocked nor detected, proceed normally
console.log('Input scan passed.');
```

## See Also

*   `InputAnomalyDetector`: The class that performs the scan and returns an `InputAnomalyResult`.
*   `InputAnomalyEvent`: The type describing a single detected anomaly within the `events` array.

## Sources

[Source 1]: src/security/inputAnomalyDetector.ts