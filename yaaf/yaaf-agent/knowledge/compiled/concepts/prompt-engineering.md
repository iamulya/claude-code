---
summary: The practice of designing and refining prompts for Large Language Models (LLMs) to achieve desired outputs, including grounding, constraint front-loading, and explicit schema definition.
title: Prompt Engineering
entity_type: concept
related_subsystems:
 - Knowledge Extraction Subsystem
 - Agent Subsystem
see_also:
 - "[System Prompt](./system-prompt.md)"
 - "[Structured Output](./structured-output.md)"
 - "[Ontology](./ontology.md)"
 - "[CoordinatorAgent](./coordinator-agent.md)"
 - "[buildCoordinatorPrompt](../apis/build-coordinator-prompt.md)"
 - "[buildExtractionSystemPrompt](../apis/build-extraction-system-prompt.md)"
 - "[buildExtractionUserPrompt](../apis/build-extraction-user-prompt.md)"
search_terms:
 - how to write good prompts
 - LLM prompt design
 - prompt construction techniques
 - grounding LLMs
 - few-shot prompting
 - structured output prompting
 - front-loading constraints
 - system prompt design
 - coordinator prompt
 - knowledge extraction prompt
 - guiding language models
 - prompt optimization
 - LLM instructions
stub: false
compiled_at: 2026-04-25T00:23:30.778Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Prompt Engineering is the practice of designing, constructing, and refining prompts to guide Large Language Models ([LLM](./llm.md)) toward producing specific, accurate, and reliable outputs for a given task. In YAAF, it is a core discipline for controlling agent behavior, ensuring predictable outcomes, and enabling complex patterns like multi-agent coordination and structured data extraction.

## How It Works in YAAF

YAAF applies prompt engineering principles in several key areas, often encapsulating complex prompt logic within dedicated builder functions.

### Multi-Agent Coordination

In YAAF's multi-agent systems, prompt engineering is critical for the [CoordinatorAgent](./coordinator-agent.md) to effectively manage and synthesize work from multiple [WorkerAgents](./worker-agent.md) [Source 1]. The [buildCoordinatorPrompt](../apis/build-coordinator-prompt.md) function generates a detailed [System Prompt](./system-prompt.md) that provides the coordinating [LLM](./llm.md) with essential context, including [Source 1]:

*   **Worker Capabilities:** A manifest of available workers, their descriptions, and the tools they can use.
*   **Concurrency Rules:** Guidelines on how many workers can operate in parallel.
*   **Synthesis Guidance:** Instructions on how to synthesize results from multiple workers into a coherent final answer.

This "battle-tested" approach distills complex coordination logic into a set of instructions the [LLM](./llm.md) can follow, enabling robust delegation and result aggregation [Source 1].

### Knowledge Extraction

During the knowledge ingestion process, prompt engineering is used to create a reliable classification and extraction pipeline. The prompt builders for the concept extractor model are designed to maximize accuracy and ensure the [LLM](./llm.md) produces a valid JSON compilation plan [Source 2]. Key techniques include:

*   **Grounding:** The prompt first grounds the [LLM](./llm.md) in the domain by providing the project's [Ontology](./ontology.md), including entity types and frontmatter schemas, before presenting the source text to be analyzed [Source 2].
*   **Constraint Front-loading:** The most important constraints, such as the list of existing concepts in the concept registry, are placed at the beginning of the prompt to heavily influence the model's output [Source 2].
*   **Fact Provisioning:** Results from static analysis (e.g., entity mentions, directory hints) are presented as pre-computed facts that the [LLM](./llm.md) can rely on, reducing its need to infer this information [Source 2].
*   **Explicit Schema Definition:** The prompt includes a minimal and explicit JSON schema for the desired output, guiding the model to produce well-formed, structured data [Source 2].
*   **Few-Shot Examples:** The prompt may include examples of the expected JSON format to further clarify the task [Source 2].

These principles are implemented in functions like [buildExtractionSystemPrompt](../apis/build-extraction-system-prompt.md) and [buildExtractionUserPrompt](../apis/build-extraction-user-prompt.md), which assemble the final prompts for the knowledge extraction [LLM](./llm.md) [Source 2].

## Sources

[Source 1]: src/agents/coordinator.ts
[Source 2]: src/knowledge/compiler/extractor/prompt.ts