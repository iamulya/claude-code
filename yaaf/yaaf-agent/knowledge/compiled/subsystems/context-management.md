---
summary: Manages the construction and optimization of the agent's context, including dynamic system prompt content, prioritization, token budgeting, and conversation history compaction.
primary_files:
 - src/agents/contextEngine.ts
 - src/context/historySnip.ts
 - src/context/compactionPrompts.ts
 - src/context/contentReplacement.ts
 - src/context/circuitBreaker.ts
title: Context Management
entity_type: subsystem
exports:
 - ContextEngine
 - CompactionCircuitBreaker
 - ContentReplacementTracker
 - buildCompactionPrompt
 - stripAnalysisBlock
 - snipHistory
 - deduplicateToolResults
search_terms:
 - system prompt construction
 - managing agent context
 - LLM context window optimization
 - conversation summarization
 - token budgeting
 - how to reduce prompt size
 - history compaction
 - droppable context sections
 - preventing context overflow
 - auto-compact circuit breaker
 - snipping tool results
 - structured compaction prompts
 - preserve state during compaction
stub: false
compiled_at: 2026-04-24T18:11:46.162Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/circuitBreaker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/contentReplacement.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Context Management subsystem is responsible for constructing and maintaining the information provided to the [LLM](../concepts/llm.md) in each turn. LLMs have a finite [Context Window](../concepts/context-window.md), and this subsystem provides the [Tools](./tools.md) to manage that constraint effectively. Its responsibilities are twofold:

1.  **[System Prompt](../concepts/system-prompt.md) Construction**: It assembles the agent's system prompt from various static and dynamic pieces of information, such as base instructions, tool definitions, and memories. It supports prioritization and token budgeting to ensure the most critical information is included without exceeding character limits [Source 1].
2.  **Conversation History Optimization**: It provides a multi-stage process for reducing the size of the message history as a conversation progresses. This prevents the context window from overflowing and helps manage API costs. The process includes cheap pre-passes to remove noise and more powerful LLM-based summarization for significant size reduction [Source 5, Source 3].

## Architecture

The subsystem is composed of several specialized components that work together to manage the agent's full context (both system prompt and message history).

### System Prompt Construction

The `ContextEngine` is the central class for building the system prompt. It operates on a collection of `ContextSection` objects. Each section has content, a priority, and a flag indicating if it can be dropped under token pressure. The engine assembles the final prompt by ordering sections by priority and, if a `maxChars` budget is set, removing the lowest-priority droppable sections until the prompt fits within the budget [Source 1].

### Conversation History Management

Managing the growing list of messages is a multi-layered process designed to be both efficient and effective.

1.  **[History Snipping](../concepts/history-snipping.md)**: This is a fast, inexpensive pre-pass that runs before full compaction. The `snipHistory` function removes known low-value content, such as old [tool results](../concepts/tool-results.md), large tool outputs that have been summarized, and empty [Tool Calls](../concepts/tool-calls.md). The `deduplicateToolResults` function removes consecutive identical tool results. These operations are performed without LLM calls, serving to "clean" the history and make subsequent steps cheaper [Source 5].

2.  **LLM-based Compaction**: For more significant size reduction, the subsystem uses an LLM to summarize parts of the conversation. The `buildCompactionPrompt` function generates a carefully engineered, structured prompt that instructs the model to produce a high-quality summary with specific required sections. This prompt includes techniques like an "analysis scratchpad" to improve reasoning and an "anti-tool preamble" to prevent the model from trying to call tools during the summarization task [Source 3]. After the LLM generates the summary, utility functions like `stripAnalysisBlock` are used to extract the clean summary from the model's full output [Source 3].

3.  **State Preservation**: A key challenge with compaction is that it can cause the agent to lose important state information contained in dropped messages (e.g., which files have been edited). The `ContentReplacementTracker` solves this by tracking file edits separately. Before compaction, it can generate a summary of all file modifications. This summary can then be re-injected into the context as a `ContextSection` after compaction, preserving this critical knowledge [Source 4].

4.  **Safety Mechanism**: Repeatedly failing to compact an oversized context can waste many expensive API calls. The `CompactionCircuitBreaker` acts as a safety valve. If auto-compaction fails a configured number of times consecutively, the circuit "opens," and further attempts are blocked for a period. This prevents the agent from getting stuck in a costly failure loop [Source 2].

## Integration Points

The Context Management subsystem is primarily used by the agent's core execution loop.

*   On each turn, the agent runtime interacts with the `ContextEngine` to assemble the final system prompt that will be sent to the LLM provider.
*   [when](../apis/when.md) the total token count of the message history approaches the provider's limit, the agent runtime invokes the history management components. It would typically run the snipping pre-pass first, and if more space is needed, proceed with the full LLM-based compaction [workflow](../concepts/workflow.md).
*   The output of this subsystem—the final system prompt and the managed message history—is the primary input for the LLM provider.

## Key APIs

*   **`ContextEngine`**: A class that manages a collection of `ContextSection` objects to build a final system prompt, respecting priority and a character budget [Source 1].
*   **`ContextSection`**: A data structure representing a piece of content for the system prompt, with properties for `id`, `name`, `content`, `priority`, and a `droppable` flag [Source 1].
*   **`snipHistory(messages, config)`**: A function that performs a cheap pre-compaction pass on a message list, removing old or large tool results and replacing them with a placeholder [Source 5].
*   **`buildCompactionPrompt(config)`**: A function that constructs a detailed, structured prompt for instructing an LLM to summarize a conversation history [Source 3].
*   **`ContentReplacementTracker`**: A class that tracks file edits (`create`, `modify`, `delete`) across compaction events to prevent state loss. Its `getEditSummary()` method produces a textual summary for re-injection into the context [Source 4].
*   **`CompactionCircuitBreaker`**: A class that prevents runaway costs from repeated, failing compaction attempts by temporarily disabling the feature after several consecutive failures [Source 2].

## Configuration

Several components in this subsystem are configurable to tune the agent's behavior.

*   **`ContextEngineConfig`**:
    *   `basePrompt`: The core task instructions that are always included in the system prompt [Source 1].
    *   `maxChars`: An optional character limit for the entire system prompt, which triggers the dropping of low-priority sections if exceeded [Source 1].
*   **`SnipConfig`**:
    *   `maxOldToolResults`: The maximum number of old tool results to retain [Source 5].
    *   `maxToolResultAge`: The age in turns after which a tool result becomes eligible for snipping [Source 5].
    *   `exemptTools`: A list of tool names whose results should never be snipped [Source 5].
*   **`CompactionPromptConfig`**:
    *   `partial`: A boolean that adjusts the prompt for summarizing either the entire conversation or only a recent portion [Source 3].
    *   `sections`: Allows customization of the required sections in the summary [Source 3].
    *   `additionalInstructions`: Appends extra instructions to the compaction prompt [Source 3].
*   **`CircuitBreakerConfig`**:
    *   `maxConsecutiveFailures`: The number of failures before the circuit opens. Defaults to 3 [Source 2].
    *   `autoResetMs`: The timeout in milliseconds after which the circuit automatically closes. Defaults to 5 minutes [Source 2].

## Extension Points

The subsystem is designed to be extended, primarily through the composition of the system prompt.

*   **Dynamic Context Sections**: The primary extension method is for other parts of the system, such as plugins, to dynamically add and remove `ContextSection` objects from the `ContextEngine`. This allows tools, memories, and other runtime components to inject relevant information into the system prompt on a turn-by-turn basis.
*   **[Soul](../apis/soul.md) Transform**: The `ContextEngine` accepts an optional `SoulTransform` function. This is a dedicated hook for prepending a personality or identity layer to the base prompt, designed to integrate with the optional "Soul" module [Source 1].

## Sources

*   [Source 1]: `src/agents/contextEngine.ts`
*   [Source 2]: `src/context/circuitBreaker.ts`
*   [Source 3]: `src/context/compactionPrompts.ts`
*   [Source 4]: `src/context/contentReplacement.ts`
*   [Source 5]: `src/context/historySnip.ts`