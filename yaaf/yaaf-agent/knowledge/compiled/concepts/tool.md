---
summary: An abstraction representing a capability or function that an agent can invoke to interact with the external world.
title: Tool
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:04:59.622Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/tools.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/add.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/tools.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/tool.ts
confidence: 1
---

---
title: Tool
entity_type: concept
summary: An abstraction representing a capability or function that an agent can invoke to interact with the external world.
related_subsystems:
  - "Tool System"
  - "Agent API"

## What It Is
In YAAF, a **Tool** is a structured abstraction that allows an LLM-powered agent to perform actions, retrieve data, or interact with external systems. While LLMs are primarily text-processing engines, tools provide the "hands" for the agent, enabling it to perform tasks such as reading files, searching the web, executing code, or calling APIs.

Tools solve the problem of grounding LLM responses in real-world state and ensuring that interactions are safe, validated, and observable. YAAF enforces a strict contract for tools, requiring defined input schemas and providing lifecycle hooks for permissions and execution monitoring.

## How It Works in YAAF
The tool system is built around the `Tool` interface and the `buildTool()` factory function. Every tool in YAAF follows a standardized execution flow within the agent's loop:
1. **Selection**: The LLM determines a tool is needed based on the tool's `name` and `description`.
2. **Validation**: YAAF validates the LLM-generated arguments against the tool's `inputSchema` (JSON Schema).
3. **Permission Check**: The framework checks the `PermissionPolicy` and the tool's `checkPermissions` method.
4. **Execution**: The `call()` method is invoked with the validated input and a `ToolContext`.
5. **Reporting**: The `ToolResult` is returned to the LLM to inform the next step in the conversation.

### The Tool Interface
A complete tool definition includes several functional and metadata fields:
- **Identity**: `name` (unique identifier) and optional `aliases`.
- **Documentation**: `description` (tells the LLM when to use the tool) and `describe()` (provides a human-readable summary of a specific invocation).
- **Validation**: `inputSchema` defines the expected JSON structure for arguments.
- **Execution**: The `call(input, ctx)` function contains the logic.
- **Safety Flags**: Boolean getters like `isReadOnly`, `isConcurrencySafe`, and `isDestructive` inform the framework how to handle the tool (e.g., whether it can run in parallel or requires strict user approval).

### Tool Context (ctx)
The `call` method receives a `ToolContext` object, which provides:
- `signal`: An `AbortSignal` to handle execution cancellation.
- `agentName`: The name of the agent invoking the tool.
- `exec`: Access to shell command execution (if permitted by the sandbox).

### Tool Results
Tools must return a `ToolResult` object, which contains:
- `data`: The primary output (usually a string or JSON-serializable object).
- `error`: An optional string describing any execution failures.
- `metadata`: Optional telemetry or debugging information.

## Configuration
Developers typically create tools using the `buildTool()` factory, which applies "fail-closed" defaults (e.g., assuming a tool is not concurrency-safe and not read-only unless specified).

### Basic Tool Definition
```typescript
import { buildTool } from 'yaaf';

const weatherTool = buildTool({
  name: 'get_weather',
  description: 'Get current weather for a location.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string' },
      units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
    },
    required: ['location'],
  },
  async call({ location, units = 'celsius' }) {
    const data = await fetchWeather(location, units);
    return { data: JSON.stringify(data) };
  },
  isReadOnly: () => true,
});
```

### Agent Integration
Tools are registered with an agent during construction. The agent uses these definitions to inform the LLM of its available capabilities.

```typescript
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [weatherTool, searchTool],
  // Manage context window usage from verbose tool results
  toolResultBudget: {
    maxCharsPerResult: 5000,
    maxTotalChars: 20000,
    strategy: 'truncate-oldest',
  },
});
```

### Specialized Toolsets
YAAF provides utilities for generating tools from existing sources:
- **OpenAPIToolset**: Automatically generates tools from OpenAPI 3.x specifications.
- **KB Tools**: The `createKBTools` function generates tools for querying a compiled Knowledge Base (e.g., `list_kb_index`, `search_kb`).
- **YAAF Doctor**: Includes built-in code-intelligence tools like `run_tsc`, `grep_search`, and `read_file` for project diagnosis.

## See Also
- [Agent API](agent.md)
- [Tools Guide](tools.md)
- [YAAF Doctor](doctor.md)