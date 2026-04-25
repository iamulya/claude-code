---
summary: The static system prompt that defines the YAAF Doctor's core knowledge and role.
export_name: DOCTOR_SYSTEM_PROMPT
source_file: src/doctor/prompt.ts
category: const
title: DOCTOR_SYSTEM_PROMPT
entity_type: api
search_terms:
 - YAAF Doctor prompt
 - system message for agent
 - how does the doctor agent work
 - doctor agent knowledge base
 - static agent context
 - pre-configured agent instructions
 - YAAF diagnostic agent
 - agent personality prompt
 - core agent instructions
 - built-in YAAF knowledge
 - doctor agent system message
stub: false
compiled_at: 2026-04-24T17:03:31.953Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/prompt.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`DOCTOR_SYSTEM_PROMPT` is a constant string that serves as the [System Prompt](../concepts/system-prompt.md) for the YAAF Doctor, a specialized diagnostic agent. This prompt provides the Doctor with its core, static knowledge base [Source 1].

The Doctor's knowledge is designed to come from two distinct sources:
1.  **Static Knowledge**: A comprehensive, built-in reference of YAAF's architecture, APIs, and best practices. This is provided by `DOCTOR_SYSTEM_PROMPT` [Source 1].
2.  **Dynamic Context**: Information about the developer's specific project, which the Doctor reads on-demand using its [Tools](../subsystems/tools.md) [Source 1].

This separation is a key architectural principle, allowing the Doctor to possess deep framework expertise from its inception while learning the specifics of a user's codebase at runtime [Source 1].

## Signature

`DOCTOR_SYSTEM_PROMPT` is a constant string.

```typescript
export const DOCTOR_SYSTEM_PROMPT: string;
```

The value is a long string that begins with:
```
# YAAF Doctor
...
```

## Examples

This constant is typically used [when](./when.md) initializing an agent or a language model call that is intended to act as the YAAF Doctor.

```typescript
import { DOCTOR_SYSTEM_PROMPT, createAgent } from 'yaaf';

// Example of using the prompt to configure a new agent
// with the YAAF Doctor's persona and knowledge.
const doctorAgent = createAgent({
  // ... other agent configuration
  systemPrompt: DOCTOR_SYSTEM_PROMPT,
  // ... tools for reading project files
});

console.log('YAAF Doctor agent has been configured.');
```

## Sources

[Source 1] src/doctor/prompt.ts