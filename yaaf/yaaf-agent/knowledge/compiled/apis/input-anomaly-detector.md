---
export_name: InputAnomalyDetector
source_file: src/security/inputAnomalyDetector.ts
category: class
summary: A statistical analysis tool for detecting unusual patterns in LLM inputs such as entropy spikes, repetition, and language mixing.
title: InputAnomalyDetector
entity_type: api
stub: false
compiled_at: 2026-04-16T14:34:35.206Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/inputAnomalyDetector.ts
confidence: 1
---

## Overview
`InputAnomalyDetector` is a security utility designed to perform statistical analysis on LLM inputs. It identifies unusual patterns that often correlate with prompt injection attempts or malicious payloads which cannot be easily identified by signature-based or regex-based filters. 

The detector serves as a secondary defense-in-depth layer, typically used alongside other security measures like `PromptGuard`. It monitors for:
*   **Token entropy spikes**: High Shannon entropy often indicates encoded or encrypted payloads, while very low entropy suggests repetitive padding attacks.
*   **Length anomalies**: Inputs that exceed normal distribution thresholds.
*   **Language mixing**: Sudden switches between different scripts or languages within a single message.
*   **Repetition patterns**: High density of repeated character sequences (n-grams).
*   **Invisible character density**: Excessive use of non-printable or invisible characters.

## Signature / Constructor

```typescript
export class InputAnomalyDetector {
  constructor(config?: InputAnomalyConfig)
}
```

### InputAnomalyConfig
The configuration object allows for fine-tuning the sensitivity of the statistical checks:

| Property | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `maxInputLength` | `number` | Input length in characters before triggering a warning flag. | `50_000` |
| `hardMaxInputLength` | `number` | Input length in characters before a hard block is triggered. | `200_000` |
| `minEntropy` | `number` | Minimum Shannon entropy (bits per character) to flag as suspiciously low. | `1.5` |
| `maxEntropy` | `number` | Maximum Shannon entropy (bits per character) to flag as suspiciously high. | `5.5` |
| `maxInvisibleRatio` | `number` | Maximum allowed ratio of non-printable characters. | `0.05` |
| `maxRepetitionRatio` | `number` | Maximum allowed ratio of repeated 3-gram subsequences. | `0.4` |
| `onAnomaly` | `function` | Callback function triggered when an anomaly is detected. | `undefined` |

## Methods & Properties
The `InputAnomalyDetector` processes arrays of `ChatMessage` objects to produce an `InputAnomalyResult`.

### InputAnomalyResult
The result of an analysis contains the following fields:
*   **detected** (`boolean`): Indicates if any statistical anomalies were found.
*   **blocked** (`boolean`): Indicates if any detected anomalies were severe enough to warrant blocking the input (e.g., exceeding `hardMaxInputLength`).
*   **events** (`InputAnomalyEvent[]`): A list of specific anomaly events found during analysis.
*   **blockReason** (`string`, optional): A description of why the input was blocked, if applicable.

### InputAnomalyEvent
Each event detected contains:
*   **type** (`AnomalyType`): The category of anomaly (e.g., `low_entropy`, `invisible_chars`).
*   **messageIndex** (`number`): The index of the message in the input array where the anomaly was found.
*   **messageRole** (`string`): The role associated with the message (e.g., "user").
*   **detail** (`string`): A human-readable description of the specific anomaly.
*   **severity** (`'warning' | 'block'`): The impact level of the detection.
*   **timestamp** (`Date`): When the detection occurred.

## Examples

### Basic Configuration and Usage
```typescript
import { InputAnomalyDetector } from 'yaaf/security';

const detector = new InputAnomalyDetector({
  maxEntropy: 5.0,
  maxInvisibleRatio: 0.02,
  onAnomaly: (event) => {
    console.warn(`Security Warning: ${event.type} detected in ${event.messageRole} message.`);
  }
});

// Usage within an agent pipeline would typically involve 
// passing ChatMessage arrays to the detector's analysis method.
```

### Handling Anomaly Events
```typescript
const config = {
  minEntropy: 1.2,
  onAnomaly: (event) => {
    if (event.severity === 'block') {
      throw new Error(`Input rejected: ${event.detail}`);
    }
  }
};

const detector = new InputAnomalyDetector(config);
```

## See Also
* `ChatMessage` (type)
* `PromptGuard` (concept)