---
summary: The result type returned by a tool's `validateInput` method, indicating whether the input is valid.
export_name: ValidationResult
source_file: src/tools/tool.ts
category: type
title: ValidationResult
entity_type: api
search_terms:
 - tool input validation
 - validate tool arguments
 - how to validate tool input
 - tool validateInput method
 - preventing invalid tool calls
 - tool parameter checking
 - input schema validation
 - custom tool validation logic
 - tool pre-execution check
 - tool safety checks
 - early exit for tools
 - secure tool inputs
stub: false
compiled_at: 2026-04-25T00:16:26.589Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`ValidationResult` is a type that represents the outcome of a [Tool](./tool.md)'s input validation process. It is the return type of the optional `validateInput` method on the [Tool](./tool.md) interface.

This mechanism allows a tool to perform custom checks on its input arguments before any other operations, including permission checks or the main execution logic in the `call` method. If the input is deemed invalid, the tool's execution can be halted early, preventing errors or unintended side effects. This is a crucial step for ensuring tool robustness and security.

The validation logic is executed before the `checkPermissions` method, ensuring that only well-formed requests are considered for user approval.

## Signature

The precise type definition for `ValidationResult` is not available in the provided source material. However, it is used as the return type for the `Tool.validateInput` method, as shown in its signature below. A common implementation pattern is an object containing a boolean `isValid` flag and an optional `reason` string for failures.

```typescript
// From the Tool interface
validateInput?(input: Input, context: ToolContext): Promise<ValidationResult>;
```

## Examples

The following example demonstrates how to implement the `validateInput` method on a custom tool. It checks if a file path provided as input is within a permitted directory.

```typescript
import { buildTool, ToolContext, ValidationResult } from 'yaaf';
import * as path from 'path';

// NOTE: The structure of ValidationResult is assumed for this example,
// based on its intended use. A common pattern is an object with a
// boolean validity flag and an optional reason for failure.

interface FileReadInput {
  filePath: string;
}

const ALLOWED_DIRECTORY = '/var/data/shared';

export const fileReadTool = buildTool<FileReadInput, string>({
  name: 'FileRead',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'The path to the file to read.' },
    },
    required: ['filePath'],
  },
  describe: (input) => `Read the contents of the file at ${input.filePath}`,

  async validateInput(input: FileReadInput): Promise<ValidationResult> {
    const resolvedPath = path.resolve(input.filePath);

    if (!resolvedPath.startsWith(path.resolve(ALLOWED_DIRECTORY))) {
      return {
        isValid: false,
        reason: `File access is restricted. The path '${input.filePath}' is outside the allowed directory.`,
      };
    }

    return { isValid: true };
  },

  async call(input: FileReadInput, context: ToolContext): Promise<{ data: string }> {
    // This code will only run if validateInput returns a valid result.
    const fileContents = await context.fs.readFile(input.filePath, 'utf-8');
    return { data: fileContents };
  },

  isReadOnly: () => true,
});
```

## See Also

- [Tool](./tool.md): The interface that defines the structure of all tools, including the `validateInput` method.
- [buildTool](./build-tool.md): The factory function used to create well-formed [Tool](./tool.md) instances.

## Sources

- [Source 1]: src/tools/tool.ts