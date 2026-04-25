---
summary: A category of agent lifecycle hooks designed to enforce security policies, such as PII redaction or output sanitization, by intercepting and potentially blocking agent execution.
title: Security Hooks
entity_type: concept
see_also:
 - "[Agent Hooks](./agent-hooks.md)"
 - "[PII Redaction](./pii-redaction.md)"
 - "[Prompt Injection Detection](./prompt-injection-detection.md)"
 - "[Audit Logging (Security)](./audit-logging-security.md)"
 - "[Defense-in-depth](./defense-in-depth.md)"
search_terms:
 - agent security policies
 - how to redact PII in agents
 - sanitize LLM output
 - block dangerous tool calls
 - prompt injection prevention
 - fail-safe agent design
 - fail-closed security
 - secure agent lifecycle
 - beforeLLM hook security
 - afterLLM hook security
 - output sanitization hook
 - input validation for LLM
stub: false
compiled_at: 2026-04-25T00:24:19.164Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Security Hooks are a specific application of the general [Agent Hooks](./agent-hooks.md) concept in YAAF, designed to implement security controls and policies directly within an agent's execution lifecycle. They serve as interception points that can inspect, modify, or block agent operations to mitigate risks such as data leakage, prompt injection, or the execution of unauthorized actions [Source 1].

These hooks are a key component of a [Defense-in-depth](./defense-in-depth.md) strategy for LLM agents. By embedding security checks at critical junctures—before data is sent to an LLM, after a response is received, or before a tool is executed—developers can enforce policies like PII redaction, input scanning, and output sanitization [Source 1].

## How It Works in YAAF

Security Hooks are implemented as standard [Lifecycle Hooks](./lifecycle-hooks.md), but they are distinguished by their "fail-closed" design philosophy. This ensures that if a security control fails or throws an error, the agent's operation is halted rather than proceeding in an insecure state [Source 1].

YAAF's hook dispatchers enforce this behavior for LLM interactions:

*   **`beforeLLM` Hooks**: These hooks run before a message list is sent to the LLM. They are commonly used for [PII Redaction](./pii-redaction.md) or [Prompt Injection Detection](./prompt-injection-detection.md). If a `beforeLLM` hook throws an exception (e.g., a PII redaction service is unavailable), the framework blocks the LLM call by re-throwing the exception. This prevents potentially sensitive or malicious content from reaching the LLM when a security mechanism is broken [Source 1].

*   **`afterLLM` Hooks**: These hooks process the LLM's response before it is passed to the user or used for subsequent tool calls. They are ideal for output sanitization. If an `afterLLM` hook throws an error, the framework blocks the LLM's response and stops further execution. This prevents unsanitized output from being exposed if a security filter fails [Source 1].

*   **`beforeToolCall` Hooks**: These hooks can implement access control or safety checks before a tool is executed. A hook can return a `{ action: 'block' }` result to prevent the tool call from proceeding, for example, if a user has not confirmed a destructive action [Source 1].

This fail-closed approach ensures that the failure of a security component defaults to a secure state (blocking the operation) rather than an insecure one (allowing the operation to continue without checks).

## Configuration

Security Hooks are configured in the `Agent` constructor, just like any other [Agent Hooks](./agent-hooks.md). The following example demonstrates a hook that acts as a simple security gate, requiring user confirmation before executing a sensitive tool [Source 1].

```typescript
import { Agent } from '@yaaf/agent';

// Assume auditLog and userConfirmed are defined elsewhere
declare const auditLog: { record: (data: any) => Promise<void> };
declare let userConfirmed: boolean;

const agent = new Agent({
  systemPrompt: 'You are a helpful travel assistant.',
  hooks: {
    // A security hook to prevent a sensitive tool call without confirmation.
    beforeToolCall: async ({ toolName, arguments: args }) => {
      if (toolName === 'book_trip' && !userConfirmed) {
        // Block the execution and provide a reason.
        return { action: 'block', reason: 'Awaiting user confirmation' };
      }
      // Allow all other tool calls to proceed.
      return { action: 'continue' };
    },
    // A hook for security audit logging.
    afterToolCall: async ({ toolName }, result) => {
      await auditLog.record({ tool: toolName, result });
      return { action: 'continue' };
    },
  },
});
```

## See Also

*   [Agent Hooks](./agent-hooks.md): The underlying framework mechanism for all lifecycle hooks.
*   [Defense-in-depth](./defense-in-depth.md): The high-level security strategy that Security Hooks help implement.
*   [PII Redaction](./pii-redaction.md): A common use case for `beforeLLM` security hooks.
*   [Prompt Injection Detection](./prompt-injection-detection.md): Another critical security function implemented via `beforeLLM` hooks.
*   [Audit Logging (Security)](./audit-logging-security.md): A security practice often implemented using `afterToolCall` or `afterLLM` hooks.

## Sources

[Source 1]: src/hooks.ts