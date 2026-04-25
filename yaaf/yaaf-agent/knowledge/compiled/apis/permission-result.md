---
summary: The result type returned by a tool's `checkPermissions` method, indicating whether the tool invocation is permitted.
export_name: PermissionResult
source_file: src/tools/tool.ts
category: type
title: PermissionResult
entity_type: api
search_terms:
 - tool permissions
 - checkPermissions return value
 - allow tool execution
 - ask for tool approval
 - tool security model
 - agent tool authorization
 - fail-closed permission
 - auto-permit tool
 - user approval for tools
 - what does checkPermissions return
 - Tool.checkPermissions
 - tool security policy
 - agent safety
stub: false
compiled_at: 2026-04-25T00:11:22.950Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`PermissionResult` is a string literal type that represents the outcome of a permission check for a [Tool](./tool.md) invocation. It is the return type of the `checkPermissions` method on the [Tool](./tool.md) interface.

This type is a core part of YAAF's security model, allowing tools to declare whether they can run automatically or if they require explicit user approval. The framework uses this result to determine whether to proceed with the tool call or to engage an [ApprovalManager](./approval-manager.md) to request user consent.

By default, the [buildTool](./build-tool.md) factory implements a "fail-closed" security posture, where the default `checkPermissions` behavior is to return `'ask'`, ensuring that unconfigured tools always prompt for approval [Source 1].

## Signature

`PermissionResult` is a string literal type with the following possible values [Source 1]:

```typescript
export type PermissionResult = 'allow' | 'ask';
```

| Value   | Description                                                                                                                                                           |
| :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow` | The tool invocation is permitted and can proceed immediately without requiring user approval. This is suitable for safe, read-only, or low-impact operations.         |
| `ask`   | The tool invocation requires explicit user approval before it can be executed. The agent's execution will be paused until a decision is received from the user. This is the default behavior. |

## Examples

### Automatically Allowing a Safe Tool

This example defines a read-only tool that is always permitted to run without user approval.

```typescript
import { buildTool, ToolContext, PermissionResult } from 'yaaf';
import { z } from 'zod';

const fileReadSchema = z.object({
  path: z.string().describe('The path of the file to read.'),
});

const fileReaderTool = buildTool({
  name: 'FileRead',
  inputSchema: fileReadSchema,
  describe: (input) => `Read the contents of the file at ${input.path}`,
  isReadOnly: () => true,
  
  // This tool is safe, so we can always allow it.
  checkPermissions: async (input, context): Promise<PermissionResult> => {
    return 'allow';
  },

  async call(input, context) {
    // Implementation to read the file...
    return { data: `Contents of ${input.path}` };
  },
});
```

### Requiring Approval for a Potentially Destructive Tool

This example defines a tool that writes to the filesystem. Since this is a destructive action, it always asks for user permission before executing.

```typescript
import { buildTool, ToolContext, PermissionResult } from 'yaaf';
import { z } from 'zod';

const fileWriteSchema = z.object({
  path: z.string().describe('The path of the file to write.'),
  content: z.string().describe('The content to write to the file.'),
});

const fileWriterTool = buildTool({
  name: 'FileWrite',
  inputSchema: fileWriteSchema,
  describe: (input) => `Write content to the file at ${input.path}`,
  isDestructive: () => true,

  // This tool modifies the filesystem, so it must ask for permission.
  checkPermissions: async (input, context): Promise<PermissionResult> => {
    return 'ask';
  },

  async call(input, context) {
    // Implementation to write the file...
    return { data: `Successfully wrote to ${input.path}` };
  },
});
```

## See Also

-   [Tool](./tool.md): The interface that uses `PermissionResult` in its `checkPermissions` method.
-   [buildTool](./build-tool.md): The factory function for creating tools, which provides a default `checkPermissions` implementation.
-   [ApprovalManager](./approval-manager.md): The subsystem responsible for handling the `'ask'` result and managing the user approval workflow.

## Sources

[Source 1]: src/tools/tool.ts