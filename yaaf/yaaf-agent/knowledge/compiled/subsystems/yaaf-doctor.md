---
title: YAAF Doctor
entity_type: subsystem
summary: A diagnostic and assistance subsystem that combines framework knowledge with dynamic project context to assist developers.
primary_files:
  - src/doctor/prompt.ts
  - src/doctor/tools.ts
exports:
  - DOCTOR_SYSTEM_PROMPT
  - DOCTOR_TICK_PROMPT
  - createDoctorTools
stub: false
compiled_at: 2026-04-16T14:17:36.151Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/prompt.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/tools.ts
confidence: 1
---

## Purpose
The YAAF Doctor is a diagnostic and developer assistance subsystem designed to bridge the gap between general framework knowledge and specific project implementations. It provides an intelligent agentic interface that can analyze, debug, and provide guidance on YAAF-based projects by inspecting the developer's local environment and codebase.

## Architecture
The YAAF Doctor operates using a dual-source knowledge architecture, separating framework-level expertise from project-specific data:

1.  **Static Knowledge**: A comprehensive reference of YAAF's architecture and APIs is embedded directly into the subsystem's system prompt. This allows the Doctor to understand framework principles without needing to parse the YAAF source code at runtime.
2.  **Dynamic Context**: The subsystem utilizes a suite of tools to inspect the developer's actual project files on-demand. This context is gathered dynamically to ensure the Doctor's advice is relevant to the specific implementation.

The subsystem is designed to run as a background process or "daemon," utilizing a "tick" mechanism to periodically check the state of the project.

## Key APIs
The subsystem exposes several key constants and functions for initializing the diagnostic environment:

### DOCTOR_SYSTEM_PROMPT
The primary system prompt that defines the Doctor's persona, capabilities, and static knowledge of the YAAF framework.

### DOCTOR_TICK_PROMPT
A function that generates a prompt for the "daemon tick," instructing the Doctor on what to verify or check during each wake-up cycle.
```typescript
export const DOCTOR_TICK_PROMPT = (ts: string, count: number) =>
  `<tick timestamp="${ts}" count="${count}">`
```

### createDoctorTools
A factory function used to instantiate the code intelligence tools required by the Doctor. These tools are sandboxed to the project root and provide capabilities such as:
*   Reading and searching files.
*   Compiling the project.
*   Running tests.
*   Inspecting project structure.

## Extension Points
The YAAF Doctor's capabilities are primarily extended through the `createDoctorTools` function, which provides the agent with the ability to interact with the local filesystem and shell.

### Code Intelligence Tools
The tools are built using the `buildTool()` utility and are designed to work on any project that utilizes YAAF, regardless of whether the project is located within the YAAF repository itself. All file operations are strictly sandboxed to the developer's project root to ensure security and prevent accidental modification of files outside the project scope.

## Sources
- `src/doctor/prompt.ts`
- `src/doctor/tools.ts`---