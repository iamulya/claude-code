---
title: createDoctorTools
entity_type: api
summary: A factory function that creates an array of code intelligence tools for the YAAF Doctor agent.
export_name: createDoctorTools
source_file: src/doctor/tools.ts
category: function
search_terms:
 - YAAF Doctor tools
 - code intelligence agent
 - how to create doctor agent tools
 - project inspection tools
 - read file tool
 - search code tool
 - compile project tool
 - run tests tool
 - agent file system access
 - sandboxed agent tools
 - buildTool for doctor
 - diagnose YAAF project
 - agent project context
stub: false
compiled_at: 2026-04-24T16:59:07.450Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/tools.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `createDoctor[[[[[[[[Tools]]]]]]]]` function is a factory that generates a predefined set of Tools for use with a "YAAF Doctor" agent [Source 1]. These tools provide the agent with code intelligence capabilities, allowing it to interact with a YAAF-based project's filesystem and build processes [Source 1].

The generated tools enable an agent to perform actions such as reading files, searching through the codebase, compiling the project, running tests, and inspecting the project structure. All file system operations are sandboxed to the provided project root directory for security [Source 1].

This function is designed to work on any project that uses the YAAF framework, not exclusively within the YAAF source repository itself [Source 1]. Internally, it utilizes the `buildTool` utility to construct the individual `Tool` objects [Source 1].

## Signature

```typescript
export function createDoctorTools(projectRoot: string): Tool[];
```

### Parameters

-   **`projectRoot`** `string`: The absolute or relative path to the root directory of the YAAF project that the agent will analyze. All tool operations are confined within this directory.

### Returns

-   `Tool[]`: An array of `Tool` instances configured for code intelligence tasks within the specified `projectRoot`.

## Examples

The following example demonstrates how to create a set of Doctor tools for a specific project directory.

```typescript
import { createDoctorTools } from 'yaaf';
// Note: createAgent is a hypothetical function used for illustration.
// import { createAgent } from 'yaaf';

// Define the root directory of the project to be analyzed
const projectPath = '/path/to/my-yaaf-project';

// Create the set of specialized tools for the Doctor agent
const doctorTools = createDoctorTools(projectPath);

console.log(`Created ${doctorTools.length} tools for the Doctor agent.`);

// These tools can now be provided to an agent instance during its creation.
/*
const doctorAgent = createAgent({
  name: 'YAAF Doctor',
  tools: doctorTools,
  // ... other agent configuration
});
*/
```

## See Also

-   The `Tool` type, which defines the structure of the objects returned by this function.
-   The `buildTool` function, which is used internally to create each tool.

## Sources

[Source 1]: src/doctor/tools.ts