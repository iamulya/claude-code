---
title: PromptGuardPattern
entity_type: api
summary: Defines the structure for a custom prompt injection detection pattern, including name, regex, and severity.
export_name: PromptGuardPattern
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - custom prompt injection rules
 - define new security pattern
 - add regex to PromptGuard
 - promptguard custom patterns
 - security pattern object
 - how to extend promptguard
 - injection detection regex
 - user-defined security checks
 - PromptGuardConfig customPatterns
 - security rule structure
 - name, pattern, severity
stub: false
compiled_at: 2026-04-24T17:30:10.757Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `PromptGuardPattern` type defines the structure for a custom detection rule used by the `PromptGuard` security middleware. It allows developers to extend the built-in [Prompt Injection Detection](../concepts/prompt-injection-detection.md) capabilities with their own regular expression-based patterns.

An array of `PromptGuardPattern` objects can be provided to the `PromptGuard` constructor via the `customPatterns` property of the `PromptGuardConfig` object. This is useful for detecting domain-specific threats, internal keywords that should not appear in user input, or emerging attack vectors not yet covered by the default rule sets.

## Signature

`PromptGuardPattern` is a TypeScript type alias with the following structure:

```typescript
export type PromptGuardPattern = {
  /** Human-readable name for the pattern */
  name: string;
  /** Regex pattern to match against message content */
  pattern: RegExp;
  /** Severity: how likely this is to be an actual attack */
  severity: "low" | "medium" | "high";
  /** Optional description for audit logs */
  description?: string;
};
```

### Properties

- **`name`**: `string`
  A human-readable identifier for the custom pattern. This name is used in `PromptGuardEvent` objects for logging and auditing purposes.

- **`pattern`**: `RegExp`
  The regular expression used to scan message content for a potential threat.

- **`severity`**: `"low" | "medium" | "high"`
  The severity level assigned to a match of this pattern. This helps in prioritizing alerts and can be used for filtering in `onDetection` callbacks.

- **`description`**: `string` (optional)
  A more detailed description of what the pattern detects. This can be useful for providing context in audit logs or security dashboards.

## Examples

The following example demonstrates how to define custom patterns and pass them to a `PromptGuard` instance. One pattern looks for a fictional internal command `INTERNAL_API_CALL`, and the other looks for common SQL injection keywords.

```typescript
import { PromptGuard, PromptGuardPattern } from 'yaaf';

// Define custom detection patterns
const customPatterns: PromptGuardPattern[] = [
  {
    name: 'InternalCommandLeak',
    pattern: /INTERNAL_API_CALL/i,
    severity: 'high',
    description: 'Detects attempts to invoke internal-only commands.',
  },
  {
    name: 'SQLiKeywords',
    pattern: /SELECT\s.*\sFROM|UNION\sSELECT|DROP\sTABLE/i,
    severity: 'medium',
    description: 'Detects common SQL injection keywords.',
  },
];

// Configure PromptGuard with the custom patterns
const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'medium',
  customPatterns: customPatterns,
  onDetection: (event) => {
    console.warn(`[SECURITY] Detected pattern: ${event.patternName}`);
  },
});

// This guard can now be used in an Agent's hooks
// const agent = new Agent({ hooks: { beforeLLM: guard.hook() } });
```

## See Also

- `PromptGuard`: The security middleware class that consumes `PromptGuardPattern` objects.
- `PromptGuardConfig`: The configuration object for `PromptGuard` where custom patterns are defined.
- `PromptGuardEvent`: The event object emitted upon detection, which includes the `patternName` from the matched `PromptGuardPattern`.