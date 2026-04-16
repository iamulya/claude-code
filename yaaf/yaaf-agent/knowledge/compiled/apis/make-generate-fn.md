---
summary: A utility function to create generation functions compatible with the KB compiler from YAAF chat models.
export_name: makeGenerateFn
source_file: src/knowledge/index.ts
category: function
title: makeGenerateFn
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:35.178Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/knowledge-base.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
confidence: 1
---

## Overview
`makeGenerateFn` is a convenience utility used to adapt YAAF chat models (subclasses of `BaseLLMAdapter`) into the simplified `GenerateFn` interface required by the Knowledge Base (KB) compilation pipeline. 

The KB compiler's internal components, such as the `ConceptExtractor` and `KnowledgeSynthesizer`, are decoupled from specific provider implementations to ensure testability and provider-agnosticism. `makeGenerateFn` bridges this gap by wrapping a model's `complete` method into a standard functional signature that accepts system and user prompts.

## Signature

```typescript
function makeGenerateFn(
  model: { complete: (params: any) => Promise<{ content?: string }> },
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): GenerateFn;
```

### Parameters
- **model**: Any YAAF-compatible chat model instance that implements a `complete` method.
- **options** (optional):
    - **temperature**: The sampling temperature to use for generation calls.
    - **maxTokens**: The maximum number of tokens to generate per call.

### Return Value
Returns a `GenerateFn`, which is defined as:
```typescript
type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>;
```

## Examples

### Basic Usage with KBCompiler
This example demonstrates how to use `makeGenerateFn` to prepare models for the `KBCompiler`.

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

// Create the compiler with adapted models
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: makeGenerateFn(
    new GeminiChatModel({ model: 'gemini-2.5-flash' }),
    { temperature: 0.1 }
  ),
  synthesisModel: makeGenerateFn(
    new GeminiChatModel({ model: 'gemini-2.5-pro' }),
    { temperature: 0.3 }
  ),
});

// Run the compilation pipeline
const result = await compiler.compile();
```

### Manual Adaptation
While `makeGenerateFn` is the recommended helper, the underlying `GenerateFn` can also be implemented manually if custom logic is required.

```typescript
import { GenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

const model = new GeminiChatModel({ model: 'gemini-2.5-flash' });

const generateFn: GenerateFn = async (system, user) => {
  const result = await model.complete({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.1,
    maxTokens: 2048,
  });
  return result.content ?? '';
};
```