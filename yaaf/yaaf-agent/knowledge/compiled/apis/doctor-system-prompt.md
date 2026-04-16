---
title: DOCTOR_SYSTEM_PROMPT
entity_type: api
summary: The base system prompt used to initialize the YAAF Doctor agent, containing its core identity and framework knowledge.
export_name: DOCTOR_SYSTEM_PROMPT
source_file: src/doctor/prompt.ts
category: constant
stub: false
compiled_at: 2026-04-16T14:17:37.396Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/prompt.ts
confidence: 1
---

## Overview
`DOCTOR_SYSTEM_PROMPT` is a string constant that serves as the foundational instruction set for the YAAF Doctor agent. It defines the agent's identity, operational constraints, and provides a comprehensive, static reference of the YAAF framework's architecture and APIs.

The Doctor agent's intelligence is derived from two distinct knowledge sources defined within this architecture:
1.  **Static Reference**: A baked-in knowledge base of YAAF's internal structure, allowing the agent to understand the framework without reading its own source code.
2.  **Dynamic Context**: Information about the developer's specific project, which the agent retrieves at runtime using provided tools.

This constant is typically used when initializing a specialized agent instance dedicated to framework-level diagnostics, code generation, or project maintenance.

## Signature / Constructor
```typescript
export const DOCTOR_SYSTEM_PROMPT: string;
```

## Examples

### Initializing a Doctor Agent
This example demonstrates how the constant is used to provide the system instructions for a new agent instance.

```typescript
import { Agent } from 'yaaf';
import { DOCTOR_SYSTEM_PROMPT } from 'yaaf/doctor';

const doctor = new Agent({
  name: 'YAAF-Doctor',
  systemPrompt: DOCTOR_SYSTEM_PROMPT,
  tools: [
    // Tools for reading project files would be provided here
  ]
});
```

## See Also
- `DOCTOR_TICK_PROMPT`: A function used to generate periodic prompts for the Doctor agent's background operations.