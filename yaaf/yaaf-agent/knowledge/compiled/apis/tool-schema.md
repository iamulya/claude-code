---
title: ToolSchema
entity_type: api
summary: A type that defines the schema for a tool, including its name, description, and parameters, for use by an LLM.
export_name: ToolSchema
source_file: src/agents/runner.ts
category: type
search_terms:
 - tool definition
 - function calling schema
 - agent tool parameters
 - LLM tool format
 - how to define a tool
 - tool schema for agents
 - tool name and description
 - tool input parameters
 - RouterContext tools
 - ChatModel tools
 - agent function signature
 - tool schema type
stub: false
compiled_at: 2026-04-25T00:16:04.551Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ToolSchema` is a TypeScript type that represents the structured definition of a tool intended for use by a Large Language Model (LLM). This schema is used to describe a tool's interface to the model, including its name, its purpose, and the input parameters it accepts. By providing a list of `ToolSchema` objects to a model, an agent can enable function calling, where the LLM can request the execution of a specific tool with appropriate arguments to fulfill a user's request.

This type is used in various parts of the YAAF framework. For example, it is part of the [RouterContext](./router-context.md), which is used by the `RouterChatModel` to make decisions about whether to route a request to a "fast" or "capable" model [Source 1].

## Signature

`ToolSchema` is exported as a type from `src/agents/runner.ts`. While the provided source material does not contain the full definition of the `ToolSchema` type, its name and usage indicate that it is an object that describes a single tool.

## Examples

The following example from `src/models/router.ts` shows `ToolSchema` being used as the type for an optional array of tools within the [RouterContext](./router-context.md) interface [Source 1]. This demonstrates how a collection of available tools is passed as context for routing decisions.

```typescript
import type { ChatMessage, ToolSchema } from "../agents/runner.js";

export type RouterContext = {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  iteration: number;
};
```

## See Also

-   [RouterContext](./router-context.md): A type that uses `ToolSchema` to provide context for model routing.
-   [ChatModel](./chat-model.md): The interface for models that can utilize `ToolSchema` for function calling.

## Sources

[Source 1]: src/models/router.ts