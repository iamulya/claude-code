---
summary: Union type defining the different categories of input anomalies detected by the InputAnomalyDetector.
export_name: AnomalyType
source_file: src/security/inputAnomalyDetector.ts
category: type
title: AnomalyType
entity_type: api
search_terms:
 - input anomaly categories
 - types of prompt injection attacks
 - security event types
 - InputAnomalyDetector event types
 - length_warning anomaly
 - length_blocked anomaly
 - low_entropy anomaly
 - high_entropy anomaly
 - invisible_chars anomaly
 - repetition anomaly
 - mixed_scripts anomaly
 - detecting unusual LLM inputs
 - prompt security flags
stub: false
compiled_at: 2026-04-24T16:48:21.117Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AnomalyType` is a string literal union type that enumerates the specific categories of statistical anomalies that can be detected in [LLM](../concepts/llm.md) inputs by the `InputAnomalyDetector` [Source 1].

Each value in this type corresponds to a particular heuristic used to identify potentially malicious or malformed inputs, such as those associated with [Prompt Injection](../concepts/prompt-injection.md), denial-of-service, or obfuscation attacks. This type is a key field in the `InputAnomalyEvent` object, allowing consumers to identify and handle different kinds of detected anomalies [Source 1].

## Signature

The `AnomalyType` is defined as a union of the following string literals [Source 1]:

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

### Values

- **`length_warning`**: The input length has exceeded the configured warning threshold (`maxInputLength`).
- **`length_blocked`**: The input length has exceeded the configured hard limit (`hardMaxInputLength`), resulting in a block.
- **`low_entropy`**: The input's Shannon entropy is below the configured minimum (`minEntropy`), suggesting highly repetitive content like padding attacks.
- **`high_entropy`**: The input's Shannon entropy is above the configured maximum (`maxEntropy`), which may indicate encoded or encrypted payloads.
- **`invisible_chars`**: The ratio of non-printable or invisible characters in the input exceeds the configured threshold (`maxInvisibleRatio`).
- **`repetition`**: The ratio of repeated character sequences (n-grams) is higher than the configured limit (`maxRepetitionRatio`).
- **`mixed_scripts`**: The input contains a mixture of characters from different languages or scripts, which can be a tactic for obfuscation.

## Examples

The primary use of `AnomalyType` is to differentiate between detected anomalies within an event handler, such as the `onAnomaly` callback in the `InputAnomalyDetector` configuration.

```typescript
import {
  InputAnomalyDetector,
  InputAnomalyEvent,
  AnomalyType,
} from "yaaf";

const detector = new InputAnomalyDetector({
  onAnomaly: (event: InputAnomalyEvent) => {
    // Log the specific type of anomaly detected
    console.log(`Anomaly detected: ${event.type}`);

    // Use a switch statement to handle different anomaly types
    switch (event.type) {
      case "length_blocked":
        console.error("CRITICAL: Input blocked due to excessive length.");
        // Trigger an alert for a potential DoS attempt
        break;
      case "high_entropy":
        console.warn("Suspicious input with high entropy detected.");
        // Flag this interaction for manual security review
        break;
      case "repetition":
        console.log("Detected repetitive patterns in input.");
        break;
      default:
        console.log(`Unhandled anomaly type: ${event.type}`);
    }
  },
});

// This will trigger the 'onAnomaly' callback with an event
// where event.type is 'high_entropy' if the input is sufficiently random.
const result = detector.detect([
  { role: "user", content: "qZ8x#vP$@!aG... (very random string)" },
]);
```

## See Also

- `InputAnomalyDetector`: The class that detects anomalies and uses this type.
- `InputAnomalyEvent`: The event object that contains the `AnomalyType`.
- `InputAnomalyConfig`: The configuration object for the detector.
- `InputAnomalyResult`: The return type from the detector's `detect` method.

## Sources

[Source 1]: src/security/inputAnomalyDetector.ts