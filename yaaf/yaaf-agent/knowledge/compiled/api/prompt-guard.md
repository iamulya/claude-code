---
title: PromptGuard
entity_type: api
summary: Middleware for detecting and blocking prompt injection attacks (OWASP LLM01).
export_name: PromptGuard
source_file: src/security/promptGuard.ts
category: class
stub: false
compiled_at: 2026-04-16T14:34:37.877Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
confidence: 1
---

## Overview
`PromptGuard` is a security middleware component designed to mitigate prompt injection attacks, categorized as LLM01 in the OWASP Top 10 for LLM Applications. It analyzes incoming message streams for malicious patterns or instructions intended to bypass system prompts or hijack the model's behavior.

It is typically used within the `beforeLLM` hook of an agent to intercept and validate user input before it is sent to the language model.

## Signature / Constructor
```typescript
class PromptGuard {
  constructor(config?: PromptGuardConfig);
}

export type PromptGuardConfig = {
  /** 
   * The action to take when an injection is detected. 
   * 'block' prevents the LLM call from proceeding.
   */
  mode?: 'block' | 'warn';
  /** 
   * Detection sensitivity level. 
   */
  sensitivity?: 'low' | 'medium' | 'high';
}
```

## Methods & Properties
### hook()
Returns a hook function compatible with the YAAF `beforeLLM` lifecycle stage.

**Signature:**
```typescript
hook(): (messages: ChatMessage[]) => LLMHookResult | ChatMessage[] | undefined
```
The returned function processes the message array.