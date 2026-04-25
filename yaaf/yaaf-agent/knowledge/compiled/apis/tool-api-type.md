---
title: Tool (API type)
entity_type: api
summary: A TypeScript type that defines the structure for a function or capability that an agent can execute.
export_name: Tool
source_file: src/tools/tool.ts
category: type
search_terms:
 - agent capabilities
 - defining agent functions
 - how to create a tool
 - tool schema
 - function calling interface
 - connecting agents to external systems
 - buildTool function
 - YAAF Doctor tools
 - agent action definition
 - extending agent abilities
 - custom agent tools
stub: false
compiled_at: 2026-04-24T17:44:45.002Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/tools.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Tool` type is a TypeScript interface that defines the contract for a capability that can be provided to a YAAF agent. [Tools](../subsystems/tools.md) are the primary mechanism for extending an agent's abilities, allowing it to interact with external systems, read files, execute commands, or perform any other prescribed action.

For example, the "YAAF Doctor" agent is equipped with a set of tools for inspecting a YAAF project, including capabilities to read, search, compile, and test the codebase [Source 1]. These capabilities are all defined as objects conforming to the `Tool` type.

Tools are typically created using the `buildTool` factory function, which helps ensure they are structured correctly [Source 1].

## Signature

The precise definition of the `Tool` type is not available in the provided source materials. However, its usage as a type import and a function return type can be observed.

It is imported as a type from `src/tools/tool.ts`:
```typescript
import { type Tool } from "../tools/tool.js";
```

It is used to define the return value of functions that create collections of tools for an agent:
```typescript
export function createDoctorTools(projectRoot: string): Tool[] { /* ... */ }
```

## Examples

The following example shows a function signature from the YAAF Doctor subsystem. This function is responsible for creating and returning an array of `Tool` objects that an agent can use to analyze a project directory.

```typescript
// Source: src/doctor/tools.ts

import { type Tool } from "../tools/tool.js";

/**
 * Creates a set of code intelligence tools for the YAAF Doctor agent.
 * @param projectRoot The root directory of the project to be analyzed.
 * @returns An array of Tool objects.
 */
export function createDoctorTools(projectRoot: string): Tool[] {
  // ... implementation that builds and returns tools
}
```

## See Also

*   **buildTool**: A factory function used to construct instances of `Tool` objects.

## Sources

[Source 1]: src/doctor/tools.ts