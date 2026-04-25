---
title: ToolResult
entity_type: api
summary: The standardized return type for tool execution, encapsulating output data.
export_name: ToolResult
source_file: src/tool.ts
category: type
search_terms:
 - tool return value
 - what should a tool call return
 - tool output format
 - tool data structure
 - yaaf tool call result
 - how to return data from a tool
 - tool call() return type
 - tool execution output
 - standard tool response
 - tool data property
stub: false
compiled_at: 2026-04-24T17:45:21.380Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

`ToolResult` is the required return type for a tool's `call` method in YAAF. It standardizes the output of all tool executions by wrapping the resulting data in a consistent object structure.

According to the YAAF Doctor's analysis, a tool's `call()` method must return an object conforming to the `ToolResult` type, specifically in the format `{ data: ... }`. Returning a primitive value like a plain string is not permitted and will cause errors [Source 1]. This structure ensures that the agent's core logic can reliably access the output of any tool.

## Signature

`ToolResult` is a type alias for an object with a `data` property.

```typescript
export type ToolResult<T = any> = {
  /**
   * The output or result of the tool's execution.
   */
  data: T;
};
```

## Properties

*   **`data`**: `any`
    The payload returned by the tool. This can be any data type (string, number, object, etc.) that represents the outcome of the tool's operation.

## Examples

The following example shows a simple tool implementation. The `call` method performs an action and returns its result wrapped in a `ToolResult` object, as required by the framework.

```typescript
import { ToolResult } from 'yaaf';

// A hypothetical tool that fetches user data.
class UserFetchTool {
  name = 'getUser';
  description = 'Fetches a user profile by ID.';
  
  // The call method's return type must be Promise<ToolResult>.
  async call(input: { userId: string }): Promise<ToolResult> {
    // In a real tool, this would be a database call or API request.
    const userProfile = {
      id: input.userId,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
    };

    // The tool's output is placed in the 'data' property of the return object.
    return {
      data: userProfile,
    };
  }
}
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md