---
title: contextList
entity_type: api
summary: CLI command function that scans the project for context sources and displays the assembled system prompt.
export_name: contextList
source_file: src/cli/context.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:15.664Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/context.ts
confidence: 1
---

## Overview
`contextList` is a utility function designed for the YAAF Command Line Interface (CLI). It performs a scan of the current project to identify all active context sources. Once identified, it aggregates these sources to display the final system prompt that would be provided to an LLM at runtime. 

This function is primarily used by developers to inspect and verify the composition of the system prompt, ensuring that all intended context files and data sources are correctly resolved and injected before deploying or running an agent.

## Signature / Constructor
```typescript
export async function contextList(): Promise<void>
```

## Examples
The `contextList` function is typically invoked as part of a CLI command execution. When called, it reads from the local filesystem to assemble the prompt.

```typescript
import { contextList } from 'yaaf/cli/context';

/**
 * Executes the 'yaaf context list' command logic.
 * This will output the assembled system prompt to the console.
 */
async function runCommand() {
  await contextList();
}
```

## Sources
- `src/cli/context.ts`