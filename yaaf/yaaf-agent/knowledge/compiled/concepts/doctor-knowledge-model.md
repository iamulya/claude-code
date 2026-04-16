---
title: Doctor Knowledge Model
entity_type: concept
summary: The dual-source knowledge architecture of the YAAF Doctor, separating static framework reference from dynamic project context.
stub: false
compiled_at: 2026-04-16T14:17:44.855Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/prompt.ts
confidence: 0.95
---

---
title: Doctor Knowledge Model
entity_type: concept
summary: The dual-source knowledge architecture of the YAAF Doctor, separating static framework reference from dynamic project context.
related_subsystems:
  - Doctor

## What It Is
The Doctor Knowledge Model is the architectural design used by the YAAF Doctor agent to manage and access information. It addresses the challenge of providing an agent with deep, authoritative knowledge of the YAAF framework while simultaneously allowing it to reason about a developer's unique, evolving codebase. 

By separating framework-level expertise from project-level context, the model ensures the Doctor can provide accurate architectural guidance without the overhead of re-indexing the framework's own source code during every session.

## How It Works in YAAF
The model operates through a dual-source system defined primarily within the Doctor's prompting logic:

1.  **Static Framework Reference**: This is a comprehensive, pre-compiled reference of YAAF's architecture and APIs. It is "baked in" to the agent's core instructions, meaning the Doctor possesses an innate understanding of YAAF's internal mechanics from initialization. It does not need to read the YAAF source code at runtime to understand framework-level constraints or capabilities.
2.  **Dynamic Project Context**: This represents the developer's specific implementation. The Doctor does not possess this knowledge "at birth." Instead, it uses specialized tools to read and analyze the developer's local files on-demand.

### Implementation Details
The knowledge model is implemented through specific prompt structures:
*   `DOCTOR_SYSTEM_PROMPT`: Contains the static reference and the core instructions for the agent.
*   `DOCTOR_TICK_PROMPT`: Facilitates the "daemon tick" mechanism, which provides the agent with a temporal context (timestamp and tick count) to perform periodic checks on the project state.

## Sources
* `src/doctor/prompt.ts`---