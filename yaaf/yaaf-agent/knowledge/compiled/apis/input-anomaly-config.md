---
summary: Configuration interface for the InputAnomalyDetector, defining thresholds for various anomaly detection parameters.
export_name: InputAnomalyConfig
source_file: src/security/inputAnomalyDetector.ts
category: type
title: InputAnomalyConfig
entity_type: api
search_terms:
 - input validation settings
 - prompt injection detection config
 - anomaly detector parameters
 - configure input security
 - set max input length
 - Shannon entropy threshold
 - invisible character detection
 - repetition attack settings
 - InputAnomalyDetector options
 - how to configure security checks
 - LLM input sanitization
 - security module configuration
 - onAnomaly callback
stub: false
compiled_at: 2026-04-24T17:14:07.788Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/inputAnomalyDetector.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `InputAnomalyConfig` type defines the configuration options for an `InputAnomalyDetector` instance [Source 1]. It allows developers to customize the thresholds and behavior for various statistical anomaly checks performed on [LLM](../concepts/llm.md) inputs. These checks serve as a [Defense-in-depth](../concepts/defense-in-depth.md) layer against [Prompt Injection](../concepts/prompt-injection.md) attempts by identifying unusual patterns that may not be caught by signature-based rules alone [Source 1].

This configuration object is used to set limits for input length, Shannon entropy, the ratio of invisible characters, and repetition patterns. It also provides an optional callback function, `onAnomaly`, to handle events [when](./when.md) an anomaly is detected [Source 1].

## Signature

`InputAnomalyConfig` is a TypeScript type alias. All properties are optional.

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

### Properties

| Property             | Type                                  | Default  | Description                                                                                                                            |
| -------------------- | ------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `maxInputLength`     | `number`                              | `50_000` | The character length at which an input is flagged with a "warning" severity [Source 1].                                                |
| `hardMaxInputLength` | `number`                              | `200_000`| The character length at which an input is hard-blocked [Source 1].                                                                     |
| `minEntropy`         | `number`                              | `1.5`    | The minimum Shannon entropy (bits per character) before an input is flagged. Low entropy can indicate repetitive padding attacks [Source 1]. |
| `maxEntropy`         | `number`                              | `5.5`    | The maximum Shannon entropy before an input is flagged. High entropy can indicate encoded or encrypted payloads [Source 1].            |
| `maxInvisibleRatio`  | `number`                              | `0.05`   | The maximum allowed ratio of non-printable or invisible characters in an input [Source 1].                                             |
| `maxRepetitionRatio` | `number`                              | `0.4`    | The maximum allowed ratio of repeated 3-gram subsequences [Source 1].                                                                  |
| `onAnomaly`          | `(event: InputAnomalyEvent) => void`  | `undefined` | An optional callback function that is invoked whenever an anomaly is detected [Source 1].                                              |

## Examples

### Basic Configuration

This example demonstrates creating a configuration object with custom thresholds and an `onAnomaly` callback for logging. This configuration is then used to instantiate an `InputAnomalyDetector`.

```typescript
import { InputAnomalyDetector, InputAnomalyConfig, InputAnomalyEvent } from 'yaaf';

// Define a custom configuration with stricter length limits
const customConfig: InputAnomalyConfig = {
  maxInputLength: 10000,
  hardMaxInputLength: 25000,
  maxEntropy: 5.0,
  onAnomaly: (event: InputAnomalyEvent) => {
    console.warn(`Input Anomaly Detected:`, {
      type: event.type,
      severity: event.severity,
      detail: event.detail,
      messageIndex: event.messageIndex,
    });
  },
};

// Use the configuration to create a detector instance
const detector = new InputAnomalyDetector(customConfig);

// Now, the 'detector' instance will use the custom thresholds.
```

## See Also

*   `InputAnomalyDetector`: The class that consumes this configuration object to perform security checks.
*   `InputAnomalyEvent`: The type of the event object passed to the `onAnomaly` callback.

## Sources

[Source 1]: src/security/inputAnomalyDetector.ts