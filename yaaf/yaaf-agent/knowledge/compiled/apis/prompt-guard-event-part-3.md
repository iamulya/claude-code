---
title: "PromptGuardEvent (Part 3: Examples)"
entity_type: api
part_of: "PromptGuardEvent"
part_number: 3
---
## Examples

The primary way to interact with `PromptGuardEvent` is through the `onDetection` callback in the `PromptGuard` configuration. This allows for custom logging or alerting whenever a potential threat is detected.

```typescript
import { PromptGuard, PromptGuardEvent } from 'yaaf';

// Example of a logging function that consumes a PromptGuardEvent
const logSecurityEvent = (event: PromptGuardEvent) => {
  console.warn(`[SECURITY] Prompt injection attempt detected!`, {
    pattern: event.patternName,
    severity: event.severity,
    action: event.action,
    messageIndex: event.messageIndex,
    excerpt: event.matchExcerpt,
    timestamp: event.timestamp.toISOString(),
    llmVerdict: event.layer2Verdict || 'N/A',
  });
};

// Configure PromptGuard to use the custom logger
const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  onDetection: logSecurityEvent,
});

// This guard can now be used in an agent's `beforeLLM` hook.
// When it detects and blocks a message, `logSecurityEvent` will be called
// with a PromptGuardEvent containing details of the detection.
```
## See Also

- `PromptGuard`: The security middleware class that generates these events.
- `PromptGuardConfig`: The configuration object where the `onDetection` handler for these events is defined.
- `PromptGuardResult`: The return type from the guard's hook, which contains an array of `PromptGuardEvent` objects.
## Sources

[Source 1]: src/security/promptGuard.ts

---

[← Previous: Signature](prompt-guard-event-part-2.md) | 
*Part 3 of 3*