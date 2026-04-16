---
title: Tool System
entity_type: subsystem
summary: Schema-validated tool definitions with permission layers for agent capabilities.
primary_files:
  - src/tools/tool.ts
  - src/tools/agentTool.ts
  - src/tools/loopDetector.ts
  - src/index.ts
exports:
  - buildTool
  - agentTool
  - ToolLoopDetector
  - StreamingToolExecutor
stub: false
compiled_at: 2026-04-16T14:12:11.045Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/tools.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/agentTool.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/loopDetector.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/tool.ts
confidence: 0.95
---

## Purpose
The Tool System provides a structured framework for defining the actions an agent can perform. It ensures that interactions between the Large Language Model (LLM) and external systems are schema-validated, permission-aware, and safe. The system solves the problem of unpredictable LLM outputs by enforcing strict input validation and providing mechanisms to detect runaway execution loops.

## Architecture
The Tool System is built around a set of core components that manage the lifecycle and execution of agent capabilities.

### Core Components
- **Tool Interface**: The central contract defining a tool's identity, input requirements, and execution logic. Every tool includes a unique name, a JSON Schema for input validation, and a `call` function.
- **buildTool Factory**: A utility that constructs a complete `Tool` object from a partial definition. It implements a "fail-closed" philosophy, providing safe defaults for safety flags (e.g., assuming a tool is not concurrency-safe or read-only unless specified).
- **Tool Context (`ToolContext`)**: An object passed to the tool during execution. It provides access to the execution environment, including an `AbortSignal` for cancellation, the calling agent's name, and optional access to a sandbox for shell command execution.
- **Tool Loop Detector**: A safety mechanism that monitors tool call patterns to prevent infinite loops. It tracks consecutive identical calls or alternating patterns (e.g., Tool A calling Tool B calling Tool A) and can trigger warnings or break execution.
- **Streaming Tool Executor**: A component responsible for managing the execution of multiple tools, supporting parallel execution for tools marked as concurrency-safe.

### Safety and Metadata
Tools in YAAF include several metadata flags used by the framework to determine execution strategy:
- `isReadOnly`: Indicates the tool does not modify state.
- `isConcurrencySafe`: Indicates the tool can be run in parallel with others.
- `isDestructive`: Indicates the tool performs irreversible operations (e.g., file deletion).

## Integration Points
The Tool System interacts with several other YAAF subsystems:
- **Agent Runner**: The runner uses the Tool System to identify which tools are available to the LLM and to execute them when requested.
- **Context Manager**: Tool results are managed by the context window via a `toolResultBudget`, which handles truncation of verbose outputs to preserve token space.
- **Multi-Agent Orchestration**: Through the `agentTool` primitive, entire agents can be wrapped as tools, allowing a "parent" agent to delegate tasks to "child" agents.

## Key APIs

### buildTool
The primary entry point for creating tools. It merges developer-defined logic with framework defaults.
```typescript
const myTool = buildTool({
  name: 'example_tool',
  description: 'Description for the LLM',
  inputSchema: { /* JSON Schema */ },
  async call(input, ctx) {
    // Implementation
    return { data: 'result' };
  }
});
```

### agentTool
A composition primitive that wraps an `AgentRunner` or `WorkflowStep` as a standard tool. This allows for hierarchical agent structures where a coordinator agent treats specialist agents as tools.

### ToolLoopDetector
Used within agent hooks to monitor and interrupt repetitive tool call patterns.
- `record(name, args)`: Logs a tool invocation.
- `isLooping()`: Returns true if a pattern exceeds the configured threshold.

## Configuration
Tools are configured during definition and when assigned to an agent.

### Tool Definition Fields
| Field | Description |
|-------|-------------|
| `name` | Unique identifier used by the LLM. |
| `inputSchema` | JSON Schema used to validate LLM-generated arguments. |
| `maxResultChars` | Hard limit on the length of the tool's return string. |
| `describe` | Function returning a human-readable string of the specific call. |

### Agent-Level Tool Configuration
Agents can manage tool output via the `toolResultBudget` configuration:
- `maxCharsPerResult`: Limits individual tool output length.
- `maxTotalChars`: Limits the aggregate length of all tool results in the context.
- `strategy`: Defines how to handle budget overflows (e.g., `truncate-oldest`).

## Extension Points
- **Custom Validation**: Developers can implement `validateInput` to perform complex logic beyond JSON Schema validation.
- **Permission Layers**: The `checkPermissions` method allows for per-invocation authorization checks before the tool's `call` logic is executed.
- **System Prompt Contributions**: Tools can provide a `prompt()` method to inject specific instructions or context into the agent's base system prompt when the tool is active.