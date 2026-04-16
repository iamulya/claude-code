---
summary: Manages a registry of LLM-specific context limits and provides resolution logic for auto-configuring framework defaults.
primary_files:
  - src/models/specs.ts
title: Model Specs Registry
entity_type: subsystem
exports:
  - ModelSpecs
  - resolveModelSpecs
  - registerModelSpecs
stub: false
compiled_at: 2026-04-16T14:06:02.927Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/specs.ts
confidence: 1
---

## Purpose
The Model Specs Registry centralizes technical specifications for Large Language Models (LLMs), specifically their context window capacities and maximum output token limits. Its primary goal is to enable a "zero-config" experience for developers by allowing the framework to automatically determine the appropriate token budgets for context management and response generation based solely on the model name.

By providing a standardized way to look up these limits, the registry prevents common errors associated with manual configuration and ensures that features like proactive compaction and overflow recovery function correctly across different providers.

## Architecture
The subsystem is structured around a central registry that maps model identifiers to their respective capabilities.

### Data Model
The registry stores information using the `ModelSpecs` type:
- **contextWindowTokens**: The total capacity of the model (input plus output).
- **maxOutputTokens**: The maximum number of tokens the model can generate in a single completion call.

### Resolution Logic
The registry employs a prefix-aware matching strategy. When a model name is queried, the system attempts to find a match in the following order:
1.  **Exact Match**: An identical string match in the registry.
2.  **Prefix/Substring Match**: Matching the start of the string (e.g., `claude-3-5-sonnet-20241022` resolves to the specifications for `claude-3-5-sonnet`).
3.  **Conservative Fallback**: If no match is found, the system returns safe, conservative default values to ensure framework stability.

### Supported Model Families
The built-in registry includes specifications for over 40 well-known models, including:
- **OpenAI**: GPT-4o, GPT-4o-mini, o1-series, o3-series, GPT-4 Turbo, and GPT-3.5.
- **Anthropic**: Claude 3.5 (Sonnet/Haiku), Claude 3 (Opus/Sonnet/Haiku), and Claude 4.
- **Google**: Gemini 1.5 and 2.0 (Pro/Flash).
- **Meta**: Llama 3.1, 3.2, and 3.3 (compatible with Groq, Ollama, and Together AI).
- **Mistral/Mixtral**: Mistral Large/Small and Mixtral 8x7b/8x22b.
- **DeepSeek**: DeepSeek Chat, Coder, and R1.

## Integration Points
The Model Specs Registry is a foundational utility used by higher-level components:

- **Agent**: When an `Agent` is initialized with `contextManager: 'auto'`, it uses the registry to resolve the specs for the specified `model` and automatically configures its internal context management logic.
- **ContextManager**: Developers can use the registry to manually populate the `contextWindowTokens` and `maxOutputTokens` fields when instantiating a `ContextManager`.

## Key APIs

### resolveModelSpecs
Retrieves the specifications for a given model name.
```typescript
import { resolveModelSpecs } from 'yaaf';

const specs = resolveModelSpecs('gpt-4o');
// Returns { contextWindowTokens: 128000, maxOutputTokens: 16384 }
```

### registerModelSpecs
Allows developers to extend the registry at runtime with custom or newly released models.
```typescript
import { registerModelSpecs } from 'yaaf';

registerModelSpecs('my-fine-tuned-llama', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
});
```

## Extension Points
The registry is designed to be extensible to accommodate private deployments, fine-tuned models, or new model releases that occur between framework updates. Developers can use `registerModelSpecs` at the application entry point to ensure their custom models are recognized by the framework's auto-configuration logic.