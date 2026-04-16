---
summary: The main entry point function for the YAAF CLI.
export_name: main
source_file: src/cli/index.ts
category: function
title: main
entity_type: api
stub: false
compiled_at: 2026-04-16T14:16:24.514Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/index.ts
confidence: 0.9
---

## Overview
The `main` function serves as the primary entry point for the YAAF Command Line Interface (CLI). It is responsible for processing command-line arguments and dispatching execution to specific sub-commands. Based on the internal imports, this function orchestrates operations including project initialization, development environment execution, component management, and context listing.

## Signature / Constructor
```typescript
export async function main(argv: string[] = process.argv.slice(2)): Promise<void>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `argv` | `string[]` | An array of command-line arguments. Defaults to the current process arguments excluding the executable and script paths (`process.argv.slice(2)`). |

## Examples

### Standard CLI Execution
In a typical CLI binary (e.g., `bin/yaaf.js`), the function is invoked without arguments to use the environment's `process.argv`.

```typescript
import { main } from 'yaaf/cli';

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Programmatic Invocation
The function can be called programmatically by providing a custom array of strings to simulate CLI commands.

```typescript
import { main } from 'yaaf/cli';

// Programmatically trigger the 'init' command
await main(['init', 'my-new-agent']);
```

## See Also
* `initProject`
* `runDev`
* `addComponent`
* `contextList`