---
primary_files:
 - src/agents/agentSummary.ts
 - src/agents/structuredOutput.ts
title: Agent Core
entity_type: subsystem
summary: Provides the fundamental building blocks for agent execution, including structured output enforcement and progress summarization for long-running tasks.
exports:
 - startAgentSummarization
 - structuredAgent
 - parseStructuredOutput
 - buildSchemaPromptSection
search_terms:
 - force LLM to output JSON
 - agent progress monitoring
 - structured data from LLM
 - JSON schema validation for agents
 - background agent tasks
 - how to get agent status
 - sub-agent summarization
 - YAAF structured output
 - agent lifecycle management
 - tools-disabled agent
 - parse model output
 - schema-enforced responses
stub: false
compiled_at: 2026-04-25T00:27:42.636Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/agentSummary.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Agent Core subsystem provides fundamental capabilities for creating and managing agents within the YAAF framework. It is responsible for core execution logic and provides high-level abstractions for common agent patterns. This includes enforcing structured, schema-compliant JSON output from models and a mechanism for monitoring the progress of long-running, subordinate agents.

This subsystem addresses two key challenges:
1.  **Reliability of Output**: Ensuring that an agent's response is machine-readable and conforms to a predefined data structure, rather than being unpredictable free-form text.
2.  **Visibility into Execution**: Providing insight into the status of complex, multi-agent operations, particularly for UI display or logging purposes.

## Architecture

The Agent Core is composed of distinct but related functionalities for managing agent I/O and lifecycle.

### Structured Output

YAAF provides robust support for forcing an LLM to return JSON that matches a specified schema. The system is designed to work with any provider that supports native structured output, including OpenAI, Gemini, and Anthropic (via a tool-use workaround) [Source 2]. For providers that lack native support, such as Ollama, the framework provides a fallback mechanism that injects schema instructions directly into the prompt [Source 2].

The framework offers two primary approaches for achieving structured output:

1.  **Dedicated Schema-Only Agent**: The `[[structuredAgent]]` factory function creates a specialized, tools-disabled agent. This agent is optimized for tasks where the sole objective is to produce a structured JSON response based on a prompt and a schema. This is analogous to the `output_schema` feature in some other frameworks but is implemented as a distinct agent type in YAAF [Source 2].

2.  **Post-Hoc Validation**: The `[[parseStructuredOutput]]` utility function can be used to parse and validate the text output from any standard agent, such as one created by `[[AgentRunner]]`. This approach is for agents that need to use tools *and* produce a structured final answer. The parser is designed to handle common LLM formatting quirks, such as markdown code fences (` ```json ... ``` `) and extraneous text surrounding the JSON object [Source 2].

### Agent Summarization

For long-running or complex operations involving multiple agents (e.g., a coordinator agent spawning several worker agents), the Agent Core provides a progress summarization feature. This allows each worker agent to periodically generate a short, 3-5 word summary of its current activity (e.g., "Reading config.json", "Fixing null check") [Source 1].

This functionality is implemented as a non-overlapping background process initiated by `[[startAgentSummarization]]`. It uses a separate, small, and fast model to generate summaries, ensuring that the summarization task does not interfere with the agent's primary model and workload. The summarization loop waits for the previous summary generation to complete before scheduling the next, preventing race conditions [Source 1].

## Integration Points

-   **[Agent Orchestration System](./agent-orchestration-system.md)**: The agent summarization feature is designed to be used within coordinator-worker patterns. An orchestrator would call `[[startAgentSummarization]]` for each worker it spawns, using the `onSummary` callback to update a UI or log the progress of the distributed task [Source 1].
-   **[AgentRunner](../apis/agent-runner.md)**: While `[[structuredAgent]]` creates a self-contained agent, the `[[parseStructuredOutput]]` function is intended to be used on the final `ChatResult` from a standard `[[Agent]]` or `[[AgentRunner]]` instance that may have used tools during its execution [Source 2].

## Key APIs

-   **[structuredAgent](../apis/structured-agent.md)**: A factory function that creates a simple, tools-disabled agent which is guaranteed to return JSON output conforming to a specified schema [Source 2].
-   **[parseStructuredOutput](../apis/parse-structured-output.md)**: A utility function to parse and validate raw text output from any agent against a JSON schema. It robustly handles common LLM formatting inconsistencies [Source 2].
-   **[startAgentSummarization](../apis/start-agent-summarization.md)**: Initiates a periodic, background process to generate progress summaries for an agent. It returns a `[[SummarizationHandle]]` to control the process [Source 1].
-   **[buildSchemaPromptSection](../apis/build-schema-prompt-section.md)**: A helper function that generates a system prompt section instructing a model to output JSON matching a schema. This is used as a fallback for LLM providers without native support for structured output [Source 2].
-   **[SummarizationHandle](../apis/summarization-handle.md)**: An object returned by `[[startAgentSummarization]]` that provides methods to `stop()` the summarization loop and retrieve the `lastSummary()` [Source 1].

## Configuration

### Agent Summarization

The behavior of the summarization feature is configured via the `[[AgentSummarizationConfig]]` object passed to `[[startAgentSummarization]]`. Key properties include:

-   `agentId`: A unique identifier for the agent being summarized.
-   `model`: A small and fast `ChatModel` instance used specifically for generating summaries.
-   `getMessages`: A function that returns the agent's current message history.
-   `onSummary`: A callback function that is invoked with the generated summary text.
-   `intervalMs`: The time in milliseconds between summary attempts. Defaults to 30,000 (30 seconds).
-   `minMessages`: The minimum number of messages that must exist in the history before the first summary is generated. Defaults to 3.

[Source 1]

### Structured Agent

The `[[structuredAgent]]` function is configured with an object containing a `systemPrompt` and a `schema` that defines the desired JSON output structure [Source 2].

## Sources

[Source 1]: src/agents/agentSummary.ts
[Source 2]: src/agents/structuredOutput.ts