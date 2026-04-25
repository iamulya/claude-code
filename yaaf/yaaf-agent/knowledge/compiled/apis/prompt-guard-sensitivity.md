---
title: PromptGuardSensitivity
entity_type: api
summary: Defines the sensitivity levels for `PromptGuard`'s injection detection.
export_name: PromptGuardSensitivity
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - prompt injection sensitivity
 - configure PromptGuard
 - low medium high security
 - injection detection levels
 - PromptGuardConfig sensitivity
 - what patterns does PromptGuard check
 - role hijacking detection
 - instruction override detection
 - system prompt extraction detection
 - block more attacks
 - reduce false positives
 - security middleware settings
stub: false
compiled_at: 2026-04-24T17:30:25.524Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`PromptGuardSensitivity` is a string literal type that specifies the strictness of the detection rules used by the `PromptGuard` security middleware [Source 1]. It allows developers to balance the breadth of security coverage against the potential for false positives.

This setting is configured via the `sensitivity` property in the `PromptGuardConfig` object. The chosen level determines which categories of [Prompt Injection](../concepts/prompt-injection.md) patterns are actively checked for in incoming messages [Source 1].

## Signature

`PromptGuardSensitivity` is a type alias for a set of string literals [Source 1].

```typescript
export type PromptGuardSensitivity = "low" | "medium" | "high";
```

### Levels

*   **`"low"`**: Checks only for the most direct and obvious injection attempts, such as instruction overrides (e.g., "ignore previous instructions") [Source 1].
*   **`"medium"`** (Default): Includes all `"low"` checks and adds detection for role hijacking (e.g., "act as..."), encoding attacks, and delimiter escape attempts. Role hijacking patterns are included at this level, rather than `"high"`, because they are one of the most common real-world attack vectors [Source 1].
*   **`"high"`**: Includes all `"medium"` checks and adds patterns for detecting [System Prompt](../concepts/system-prompt.md) extraction attempts, scanning for malicious content payloads (e.g., `<script>` tags), and multi-language injection patterns [Source 1].

## Examples

The sensitivity level is set [when](./when.md) instantiating a `PromptGuard` [Source 1].

### High Sensitivity

This example configures the guard to use the most comprehensive set of detection rules.

```typescript
import { PromptGuard } from 'yaaf';

const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high', // Use the most strict set of rules
});

// This guard will now check for all pattern types, including
// system prompt extraction and multi-language attacks.
```

### Medium Sensitivity (Default)

If `sensitivity` is not specified, it defaults to `"medium"` [Source 1].

```typescript
import { PromptGuard } from 'yaaf';

// This is equivalent to setting sensitivity: 'medium'
const guard = new PromptGuard({
  mode: 'detect',
});

// This guard will check for instruction overrides, role hijacking,
// encoding attacks, and delimiter escapes.
```

### Low Sensitivity

This configuration uses the most permissive set of rules, only checking for basic instruction overrides.

```typescript
import { PromptGuard } from 'yaaf';

const guard = new PromptGuard({
  sensitivity: 'low',
});

// This guard will only flag direct commands like "ignore your instructions".
```

## See Also

*   `PromptGuard`: The security middleware class that uses this type.
*   `PromptGuardConfig`: The configuration object for `PromptGuard`.
*   `PromptGuardMode`: A type that defines the action (`detect` or `block`) `PromptGuard` takes upon detection.

## Sources

[Source 1] src/security/promptGuard.ts