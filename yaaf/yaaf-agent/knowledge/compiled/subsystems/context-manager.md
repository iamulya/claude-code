---
summary: Token-budget-aware context window management for LLM interactions.
primary_files:
  - src/index.ts
title: Context Manager
entity_type: subsystem
stub: false
compiled_at: 2026-04-16T14:20:15.811Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
confidence: 0.95
---

## Purpose
The Context Manager is a core subsystem of the YAAF framework responsible for managing the context window provided to Large Language Models (LLMs). Its primary objective is to ensure that interactions remain within defined token budgets, preventing errors associated with exceeding model context limits and optimizing the information density of LLM prompts.

## Architecture
The Context Manager is one of the six primary subsystems of YAAF. It functions as a specialized layer that sits between the agent's internal state (such as Memory and State Store) and the LLM provider. Its internal logic focuses on the "token-budget-aware" processing of data, ensuring that the most relevant information is prioritized when constructing the final payload for an LLM.

## Key APIs
The Context Manager provides the underlying infrastructure for managing the context window. Based on the framework's core definitions, its functional surface area includes:

*   **Token Budgeting**: Monitoring and enforcing limits on the number of tokens used in a single request.
*   **Window Management**: Handling the selection and pruning of data to fit within the constraints of the LLM's context window.

## Sources
* `src/index.ts`