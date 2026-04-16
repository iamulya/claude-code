---
title: Agent Orchestration
entity_type: subsystem
summary: The core subsystem responsible for coordinating LLMs, tools, memory, and security policies during agent execution.
primary_files:
  - src/agent.ts
  - src/runner.ts
exports:
  - Agent
  - AgentConfig
  - RunOptions
  - PlanModeConfig
stub: false
compiled_at: 2026-04-16T14:12:31.497Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
confidence: 0.95
---

## Purpose
The Agent Orchestration subsystem serves as the central coordination layer of the YAAF framework. It provides a high-level abstraction, primarily through the `Agent` class, to manage the lifecycle and execution of LLM-powered agents. This subsystem solves the complexity of manually wiring together LLM providers, tool registries, memory persistence, security policies, and execution sandboxes. It ensures that agents operate within defined boundaries, such as token limits, iteration caps, and safety protocols.

## Architecture
The subsystem is structured around the `Agent` class, which acts as a facade for the underlying `AgentRunner`. Internally, it coordinates several specialized components:

- **Execution Engine**: The `AgentRunner` (internal) handles the iterative loop of LLM calls and tool executions.
- **Plugin Management**: A `PluginHost` manages the registration and initialization of plugins, which can contribute tools or extend agent behavior.
- **Context & Memory**: Integrates with `ContextManager` for token-budget-aware history management and `MemoryStrategy` for long-term information retrieval.
- **Security Layer**: Combines `PermissionPolicy` for tool-level safety and `AccessPolicy` for identity-aware authorization (RBAC/ABAC).
- **Persistence**: Uses the `Session` component to handle conversation history and crash recovery via `.jsonl` files.
- **Diagnostics**: Includes the "YAAF Doctor," a built-in diagnostic agent that monitors the execution stream for errors and provides automated troubleshooting.

## Integration Points
The Agent Orchestration subsystem interacts with nearly every other part of the framework:
- **Models**: Resolves LLM providers (Gemini, OpenAI, etc.) and model specifications automatically based on environment variables or explicit configuration.
- **Tools**: Consumes tool definitions to provide capabilities to the LLM.
- **Sandbox**: Interfaces with the `Sandbox` component to enforce network, file system, and timeout restrictions during execution.
- **IAM**: Utilizes `UserContext` during `run()` calls to enforce data scoping and authorization via the `AccessPolicy`.

## Key APIs
The primary interface for this subsystem is the `Agent` class and its associated configuration types.

### Agent Class
The main entry point for creating and running agents.
- `Agent.run(input: string, options?: RunOptions): Promise<string>`: Executes a task and returns the final text response.
- `Agent.runStream(input: string, options?: RunOptions)`: Returns a stream of events for real-time monitoring of the agent's progress.
- `Agent.create(config: AgentConfig): Promise<Agent>`: An asynchronous factory method recommended when using plugins that require async initialization.

### RunOptions
Options passed to individual execution calls:
```typescript
export type RunOptions = {
  signal?: AbortSignal; // For cancellation
  user?: UserContext;   // Identity for IAM and data scoping
}
```

## Configuration
Agents are configured via the `AgentConfig` object, which supports a wide array of functional and safety settings:

- **LLM Selection**: Configuration for `provider`, `model`, `apiKey`, and `baseUrl`.
- **Safety & Control**: 
    - `permissions`: A `PermissionPolicy` to allow, deny, or require approval for tool calls.
    - `sandbox`: A `Sandbox` instance to restrict the execution environment.
    - `security`: `SecurityHooksConfig` for automated prompt injection protection and PII redaction.
- **Context Management**: 
    - `contextManager`: Can be set to `'auto'` for automated token management and overflow recovery.
    - `memoryStrategy`: Defines how relevant memories are injected into the prompt.
- **Capabilities**:
    - `planMode`: Enables a "think-first" mode where the agent generates a plan for user approval before execution.
    - `skills`: Markdown-based capability packs injected into the system prompt.

## Extension Points
Developers can extend the orchestration behavior through several mechanisms:

- **Lifecycle Hooks**: The `hooks` property allows developers to inject logic `beforeToolCall`, `afterToolCall`, and during LLM turns.
- **Plugins**: The `plugins` array accepts `Plugin` implementations that can provide tools or modify the agent's internal state during initialization.
- **System Prompt Builders**: The `systemPromptProvider` allows for dynamic, section-based prompt construction instead of a static string.
- **Custom Strategies**: Developers can provide custom implementations for `MemoryStrategy`, `Sandbox`, and `AccessPolicy`.

## Sources
- Source 1: `src/agent.ts` (Framework core orchestration logic)