---
summary: The iterative process by which a YAAF agent observes, reasons, plans, acts (e.g., using tools), and reflects to achieve its goals.
title: Agent Loop
entity_type: concept
related_subsystems:
 - agent_core
see_also:
 - "[Agent Turn](./agent-turn.md)"
 - "[Tool Execution](./tool-execution.md)"
 - "[LLM Call](./llm-call.md)"
 - "[Agent](../apis/agent.md)"
search_terms:
 - agent execution cycle
 - how do YAAF agents work
 - reason-act loop
 - observe-think-act cycle
 - agent decision making process
 - LLM agent iteration
 - tool use loop
 - self-correction in agents
 - agent control flow
 - YAAF agent lifecycle
 - what is an agent turn
 - agent core logic
stub: false
compiled_at: 2026-04-25T00:16:51.737Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Agent Loop is the fundamental execution model for a YAAF [Agent](../apis/agent.md). It is an iterative process where the agent repeatedly cycles through a sequence of observing its environment, reasoning about its goals, planning its next action, and executing that action. This cycle, often referred to as a "reason-act" or "observe-think-act" loop, allows an agent to break down complex tasks into a series of smaller, manageable steps. The loop continues until the agent's primary goal is achieved, a failure condition is met, or a maximum number of iterations is reached.

## How It Works in YAAF

In YAAF, the Agent Loop orchestrates the interaction between the core [LLM](./llm.md)'s reasoning capabilities and the agent's available [Tools](./tool-use.md). A single pass through this cycle is known as an [Agent Turn](./agent-turn.md).

The process typically involves the following steps:
1.  **Reasoning**: The agent's [LLM](./llm.md) analyzes the current goal, conversation history, and available context to decide on the next action. This often results in the decision to call a specific tool with certain arguments.
2.  **Action**: The framework performs the [Tool Execution](./tool-execution.md), invoking the chosen tool with the LLM-provided inputs. For example, it might execute a `RestApiTool` to make an HTTP request to an external service [Source 1].
3.  **Observation**: The result of the tool execution, whether successful or not, is captured. A key principle in YAAF is that tool errors, such as HTTP error responses, are returned as data back to the loop rather than being thrown as exceptions [Source 1].
4.  **Reflection**: The tool's output is formatted and added to the agent's context for the next iteration. This allows the [LLM](./llm.md) to observe the outcome of its previous action. By receiving errors as data, the LLM can engage in self-correction, such as retrying a failed API call with different parameters or choosing an alternative tool [Source 1].

This cycle repeats, with the output of one turn serving as the input for the next, enabling the agent to progressively work towards its objective.

## Configuration

The provided source material does not detail specific configuration options for the Agent Loop itself, such as setting a maximum number of iterations or defining stop conditions. However, individual components that participate in the loop, such as tools, may have their own configurations (e.g., `RestApiToolConfig` for timeouts and headers) [Source 1].

## Sources

[Source 1]: src/tools/openapi/restApiTool.ts