---
summary: Large Language Models (LLMs) are the core reasoning and generation components in YAAF, used for decision-making, tool use, content synthesis, and semantic evaluation.
title: LLM
entity_type: concept
related_subsystems:
 - Concept Extractor
 - Knowledge Synthesizer
 - Vision Pass
see_also:
 - LLM Adapter Pattern
 - LLM Call
 - ChatModel
 - BaseLLMAdapter
 - resolveModel
 - Prompt Engineering
 - Grounding (LLM)
 - Hallucination (LLM)
search_terms:
 - large language model
 - how yaaf uses llms
 - configure llm provider
 - model routing
 - llm adapter
 - chat model
 - generative ai in yaaf
 - llm-based agents
 - connecting to openai
 - using gemini with yaaf
 - anthropic claude integration
 - ollama setup
 - llm call lifecycle
stub: false
compiled_at: 2026-04-25T00:20:56.950Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/prompt.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A Large Language Model (LLM) is the core artificial intelligence component responsible for generating responses and making decisions within a YAAF [Agent](../apis/agent.md). LLMs serve as the primary reasoning engine, driving an agent's behavior by interpreting user requests, selecting appropriate tools, and synthesizing information into coherent replies.

YAAF is designed to be provider-agnostic, treating the specific LLM as a configurable component. This is achieved through an adapter pattern, allowing developers to integrate various models from different providers without altering the core agent logic [Source 15, 16].

## How It Works in YAAF

LLMs are integrated into multiple parts of the YAAF framework, from the main agent execution loop to offline knowledge processing pipelines.

### Core Agent Loop

In the primary agent runtime, the LLM orchestrates the [Agent Turn](./agent-turn.md). Its main responsibilities include:
- **Tool Selection and Execution**: The LLM analyzes the user's request and the conversation history to decide which tools to use. It makes this decision based on the `name` and `description` provided in each tool's definition [Source 1, 3]. The LLM then generates the necessary arguments for the selected tool, which are parsed and used to execute the tool's `call` function [Source 18].
- **Response Generation**: After tools have been executed, their results are returned to the LLM, which then synthesizes the information into a final response for the user.

### Knowledge Compilation

YAAF's knowledge base compilation pipeline leverages LLMs for several automated tasks:
- **Concept Extraction**: The [Concept Extractor](../subsystems/concept-extractor.md) subsystem uses a fast and cost-effective LLM to perform a classification pass on ingested source documents. The LLM is prompted with an [Ontology](./ontology.md) and existing article information to produce a structured JSON plan for creating or updating knowledge base articles [Source 7].
- **Content Synthesis**: The [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) employs a powerful, high-capability LLM to author complete, well-structured markdown articles. The LLM receives a compilation plan, relevant source text, and authoring guidelines to generate the final content, including YAML [Frontmatter](./frontmatter.md) [Source 8, 9].
- **Ontology Generation**: To bootstrap a new knowledge base, the [OntologyGenerator](../apis/ontology-generator.md) can use an LLM to scan a project's source code and documentation, inferring the key concepts and relationships to draft an initial `ontology.yaml` file [Source 13].
- **Vision Processing**: The [Vision Pass](../subsystems/vision-pass.md) utilizes vision-capable LLMs to automatically generate descriptive alt-text for images found in articles. This allows agents using text-only models to understand the content of diagrams and figures [Source 12].

### Memory and Retrieval

To provide agents with long-term memory, the [MemoryRelevanceEngine](../apis/memory-relevance-engine.md) uses a fast LLM to perform a semantic search. Given a user query, the LLM scans the headers of all available memories and selects a small, relevant subset to inject into the agent's context for the current turn [Source 14].

### Safety and Validation

YAAF provides several mechanisms to control and validate LLM behavior:
- **Structured Output**: The framework can compel an LLM to return responses in a specific JSON format that conforms to a given schema. This is achieved by using native provider features (e.g., OpenAI's `json_schema` mode) or by including schema instructions in the prompt as a fallback [Source 2].
- **Grounding and Hallucination Detection**: The [GroundingValidator](../apis/grounding-validator.md) cross-references an LLM's claims against the evidence provided by tool results. As a final check for complex cases, it can optionally use an [LLM Semantic Scorer](./llm-semantic-scorer.md) to semantically evaluate whether a claim is truly supported by the source data, helping to mitigate [hallucinations](./hallucination-llm.md) [Source 17].
- **Lifecycle Hooks**: [Agent Hooks](./agent-hooks.md) like `beforeLLM` and `afterLLM` allow developers to intercept and modify data flowing to and from the LLM. This enables the implementation of security measures such as PII redaction, [Prompt Injection](./prompt-injection.md) detection, and output sanitization [Source 4]. The `fenceContent` utility is also provided to wrap untrusted content in prompts, preventing the LLM from misinterpreting data as instructions [Source 11].

### Abstraction Layer

All direct communication with LLM providers is handled through the [BaseLLMAdapter](../apis/base-llm-adapter.md) abstract class. Concrete implementations of this class for different providers (e.g., OpenAI, Anthropic, Gemini) handle the specific API requests, making the rest of the framework independent of any single LLM provider [Source 15].

## Configuration

YAAF determines which LLM to use through the [resolveModel](../apis/resolve-model.md) function, which follows a specific priority order based on configuration and environment variables [Source 16].

The resolution priority is:
1.  A pre-constructed `chatModel` object passed directly in the agent configuration.
2.  An LLM adapter registered as a plugin with the `PluginHost`.
3.  The `LLM_BASE_URL` environment variable, which activates an OpenAI-compatible client for providers like Ollama, Groq, and others.
4.  Provider-specific API key environment variables (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
5.  If no configuration is found, an error is thrown.

Key environment variables for LLM configuration include [Source 16]:
- `LLM_MODEL`: The specific model name to use (e.g., `gpt-4o-mini`, `claude-3-5-sonnet-20240620`).
- `LLM_API_KEY`: The API key, primarily for use with `LLM_BASE_URL`.
- `LLM_BASE_URL`: The base URL for an OpenAI-compatible API endpoint.
- `GEMINI_API_KEY`: API key for Google Gemini.
- `ANTHROPIC_API_KEY`: API key for Anthropic Claude.
- `OPENAI_API_KEY`: API key for OpenAI.

## See Also

- [LLM Adapter Pattern](./llm-adapter-pattern.md)
- [LLM Call](./llm-call.md)
- [ChatModel](../apis/chat-model.md)
- [BaseLLMAdapter](../apis/base-llm-adapter.md)
- [resolveModel](../apis/resolve-model.md)
- [Prompt Engineering](./prompt-engineering.md)
- [Grounding (LLM)](./grounding-llm.md)
- [Hallucination (LLM)](./hallucination-llm.md)

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
[Source 6]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
[Source 7]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
[Source 8]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
[Source 9]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/prompt.ts
[Source 10]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
[Source 11]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
[Source 12]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
[Source 13]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
[Source 14]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
[Source 15]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
[Source 16]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
[Source 17]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
[Source 18]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/restApiTool.ts