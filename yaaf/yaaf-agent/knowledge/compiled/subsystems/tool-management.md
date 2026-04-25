---
summary: The YAAF subsystem responsible for defining, managing, and executing external capabilities (tools) for agents.
primary_files:
 - src/tools/tool.ts
title: Tool Management
entity_type: subsystem
exports:
 - Tool
 - ToolDef
 - buildTool
 - findToolByName
search_terms:
 - how to create a tool
 - agent capabilities
 - external functions for LLM
 - buildTool function
 - tool definition
 - agent permissions
 - read-only tools
 - destructive operations
 - tool schema
 - JSON schema for tools
 - concurrency safe tools
 - tool lifecycle
 - adding tools to agent
stub: false
compiled_at: 2026-04-24T18:20:43.082Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Tool Management subsystem provides the core framework for defining, creating, and managing external capabilities that a YAAF agent can execute. It solves the problem of allowing a Large Language Model ([LLM](../concepts/llm.md)) to interact with the outside world in a structured, safe, and predictable manner. This subsystem establishes a clear contract, the `Tool` interface, that all external functions must adhere to, ensuring consistent behavior for validation, permissions, execution, and reporting across the framework [Source 2].

## Architecture

The architecture of the Tool Management subsystem is centered around three key constructs: `ToolDef`, `buildTool`, and `Tool` [Source 2].

1.  **`ToolDef`**: This is a partial type definition that developers use to specify the unique aspects of their tool. It includes required fields like `name`, `inputSchema`, and the `call` method, but makes other properties with safe defaults optional [Source 2].

2.  **`buildTool()`**: This is a factory function that takes a `ToolDef` object and returns a complete, validated `Tool` object. It applies a set of "fail-closed" defaults to ensure safety and predictability. For example, by default, a tool is assumed to have side effects (`isReadOnly` is `false`), to not be safe for concurrent execution (`isConcurrencySafe` is `false`), and to require user permission before running (`checkPermissions` defaults to asking the user) [Source 2].

3.  **`Tool`**: This is the complete, canonical interface for any tool within the system. An object of this type contains all the properties and methods necessary for the agent runtime to manage and execute the tool. Key properties include [Source 2]:
    *   `name`: A unique identifier for the tool.
    *   `inputSchema`: A JSON Schema object defining the expected input parameters.
    *   `describe()`: A method to generate a human-readable description of a specific tool invocation.
    *   `call()`: The core execution method that performs the tool's action.
    *   Safety Flags: A series of boolean methods (`isReadOnly`, `isDestructive`, `isConcurrencySafe`) that inform the agent runtime about the nature of the tool's operation.
    *   `checkPermissions()`: A method to determine if a specific invocation requires user consent.
    *   `prompt()`: An optional method that can contribute content to the agent's [System Prompt](../concepts/system-prompt.md), often used for providing instructions or examples related to the tool.

This design separates the developer's definition of a tool from its final, system-ready representation, with the `buildTool` function acting as a bridge that enforces safety and completeness.

## Integration Points

The Tool Management subsystem integrates with several other parts of the YAAF framework:

*   **[Agent Core](./agent-core.md)**: The primary integration point is the `Agent` class. An agent is configured with a list of available [Tools](./tools.md) during its instantiation. The agent's core logic uses this list to inform the LLM of available capabilities and to execute [Tool Calls](../concepts/tool-calls.md) requested by the model [Source 1].
*   **[[]] Runtime]]**: The YAAF command-line interface interacts with the [Tool System](./tool-system.md). The `yaaf add tool <name>` command scaffolds a new tool definition file. The `yaaf dev` REPL provides a `/tools` command to list all tools available to the agent [Source 1].

## Key APIs

The public API surface of this subsystem is focused on the creation and identification of tools.

### `buildTool()`

This is the primary factory function for creating tools. Developers provide a partial `ToolDef` object, and `buildTool` returns a complete `Tool` object with safe defaults applied for any omitted properties [Source 2].

```typescript
import { buildTool } from 'yaaf';

const greetTool = buildTool({
  name: 'greet',
  description: 'Greet someone by name',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
  isReadOnly: () => true,
});
```
[Source 1]

### `Tool` Interface

The canonical interface that every tool in the system conforms to. It defines the complete set of properties and methods the agent runtime expects for managing and executing a tool [Source 2].

### `ToolDef` Type

A partial type definition that represents the object passed to `buildTool()`. It allows developers to define only the necessary parts of their tool, relying on `buildTool` to fill in the rest [Source 2].

### `findToolByName()`

A utility function that searches an array of `Tool` objects to find a specific tool by its `name` or one of its `aliases` [Source 2].

## Configuration

Tools are configured on a per-agent basis. The standard project structure generated by `yaaf init` includes a `src/tools/` directory. Developers are expected to place tool definitions in this directory, typically with one file per tool [Source 1].

These tool modules export the result of a `buildTool()` call. The main agent configuration file (`src/agent.ts`) then imports these tools and passes them as an array to the `Agent` constructor [Source 1].

```typescript
// In src/agent.ts
import { Agent } from 'yaaf';
import { greetTool } from './tools/greet'; // Assuming greet.ts exports the tool

const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter.',
  tools: [greetTool], // Tools are provided here
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts