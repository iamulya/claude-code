---
summary: A helper function that creates a `GenerateFn` instance from any YAAF-compatible LLM that implements a `complete({ messages })` method.
export_name: makeGenerateFn
source_file: src/knowledge/compiler/extractor/extractor.ts
category: function
title: makeGenerateFn
entity_type: api
search_terms:
 - model adapter
 - create GenerateFn
 - wrap LLM for knowledge compiler
 - how to pass a model to KBCompiler
 - YAAF model compatibility
 - complete({ messages }) wrapper
 - LLM function factory
 - connect model to ontology generator
 - knowledge base model configuration
 - yaaf/knowledge helpers
 - GenerateFn factory
 - model abstraction
stub: false
compiled_at: 2026-04-24T17:20:53.196Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `make[[[[[[[[GenerateFn]]]]]]]]` function is a convenience helper that adapts a standard YAAF Large Language Model ([LLM](../concepts/llm.md)) into a simplified function signature required by the knowledge base compilation pipeline [Source 2]. It acts as a factory, taking any model object that has a `complete({ messages })` method and returning an asynchronous `GenerateFn` [Source 2].

This abstraction decouples [Tools](../subsystems/tools.md) like the `[[[[[[[[KBCompiler]]]]]]]]` and `[[[[[[[[OntologyGenerator]]]]]]]]` from specific model implementations (e.g., `GeminiChatModel`). Instead of depending on the full `BaseLLMAdapter` interface, these tools only require the simpler `GenerateFn` signature, which is `(systemPrompt: string, userPrompt: string) => Promise<string>` [Source 2]. This makes the knowledge subsystem more modular and easier to test [Source 2].

You would use `makeGenerateFn` [when](./when.md) configuring the `KBCompiler` or `OntologyGenerator` to provide them with the LLMs needed for knowledge extraction and synthesis [Source 1].

## Signature / Constructor

The `makeGenerateFn` function returns a value of type `GenerateFn`.

### GenerateFn Type

This is the target function signature that `makeGenerateFn` produces. It represents a simple, stateless call to an LLM.

```typescript
export type GenerateFn = (
  systemPrompt: string,
  userPrompt: string
) => Promise<string>;
```
[Source 2]

### makeGenerateFn()

This is the factory function itself.

```typescript
export function makeGenerateFn(
  model: {
    complete: (args: {
      messages: { role: 'system' | 'user'; content: string }[];
      [key: string]: any; // For temperature, maxTokens, etc.
    }) => Promise<{ content: string | null; [key: string]: any }>;
  },
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): GenerateFn;
```
[Source 2]

**Parameters:**

*   `model`: An instance of a YAAF-compatible LLM. The only requirement is that it exposes a `complete()` method that accepts a `messages` array and returns a promise resolving to an object with a `content` property [Source 2].
*   `options` (optional): An object to configure generation parameters like `temperature` and `maxTokens` for all calls made through the resulting `GenerateFn` [Source 2].

## Examples

### Basic Usage with KBCompiler

The most common use case is to provide models to the `KBCompiler`. This example configures a faster model for extraction and a more powerful model for synthesis.

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

// 1. Instantiate your LLM models
const extractionLLM = new GeminiChatModel({ model: 'gemini-2.5-flash' });
const synthesisLLM = new GeminiChatModel({ model: 'gemini-2.5-pro' });

// 2. Adapt them into GenerateFn instances
const extractionModelFn = makeGenerateFn(extractionLLM);
const synthesisModelFn = makeGenerateFn(synthesisLLM);

// 3. Pass the functions to the compiler
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: extractionModelFn,
  synthesisModel: synthesisModelFn,
});

const result = await compiler.compile();
console.log(`Created ${result.synthesis.created} articles.`);
```
[Source 1]

### Usage with OntologyGenerator

Similarly, `makeGenerateFn` is used to provide a model to the `OntologyGenerator` for bootstrapping a new knowledge base schema.

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  outputPath: './knowledge/ontology.yaml',
});

const result = await generator.generate({
  domain: 'Acme SDK — a TypeScript library for building widgets.',
  srcDirs: ['./src'],
});

console.log(`Ontology written to: ${result.outputPath}`);
```
[Source 1]

### Manual Implementation (for comparison)

The following example shows how one would create a `GenerateFn` manually. `makeGenerateFn` automates this boilerplate.

```typescript
import { GeminiChatModel } from 'yaaf';
import type { GenerateFn } from 'yaaf/knowledge';

const model = new GeminiChatModel({ model: 'gemini-2.5-flash' });

// Manually creating the function that makeGenerateFn() would generate
const generateFn: GenerateFn = async (system, user) => {
  const result = await model.complete({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    maxTokens: 2048,
  });
  return result.content ?? '';
};
```
[Source 2]

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts