---
title: openaiModel
entity_type: api
summary: A factory function that creates a ChatModel instance for interacting with OpenAI models.
export_name: openaiModel
source_file: src/models/router.ts
category: function
search_terms:
 - OpenAI model factory
 - create OpenAI chat model
 - how to use gpt-4o
 - gpt-4o-mini wrapper
 - YAAF OpenAI integration
 - ChatModel for OpenAI
 - using OpenAI with RouterChatModel
 - LLM provider factory
 - OpenAI API wrapper
 - configure OpenAI model
 - connect to openai
 - openai llm adapter
stub: false
compiled_at: 2026-04-25T00:10:53.270Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview
The `openaiModel` function is a factory that creates a [ChatModel](./chat-model.md) instance configured to work with OpenAI's API. It simplifies the process of instantiating a specific OpenAI model (e.g., `gpt-4o` or `gpt-4o-mini`) for use in other parts of the YAAF framework, such as the [RouterChatModel](./router-chat-model.md) [Source 1].

## Signature
The provided source material shows `openaiModel` in use, but does not include its definition. The signature can be inferred from its usage [Source 1].

```typescript
import { ChatModel } from 'yaaf';

// Inferred from usage. The second options parameter is speculative.
function openaiModel(modelName: string, options?: object): ChatModel;
```

**Parameters:**
- `modelName` [string]: The identifier for the OpenAI model to be used, such as `'gpt-4o-mini'` or `'gpt-4o'` [Source 1].
- `options` [object] (optional): Additional configuration options for the model. The specific structure of this object is not detailed in the provided source.

**Returns:**
A [ChatModel](./chat-model.md) instance configured for the specified OpenAI model.

## Examples
A common use case for `openaiModel` is to provide `fast` and `capable` models to a [RouterChatModel](./router-chat-model.md) for cost optimization [Source 1].

```typescript
import { RouterChatModel } from 'yaaf';
import { openaiModel } from 'yaaf'; // NOTE: Actual import path may vary.

// Use openaiModel to configure a RouterChatModel with a fast and a capable model.
const model = new RouterChatModel({
  fast: openaiModel('gpt-4o-mini'),
  capable: openaiModel('gpt-4o'),
  route: ({ messages, tools }) => {
    // A custom routing function to decide which model to use.
    const lastMessageContent = messages.at(-1)?.content ?? '';
    
    if ((tools?.length ?? 0) > 5) return 'capable';
    if (messages.length > 20) return 'capable';
    if (/plan|architect|design|refactor/i.test(lastMessageContent)) {
      return 'capable';
    }
    
    return 'fast';
  },
});
```

## See Also
- [RouterChatModel](./router-chat-model.md): A two-tiered model router that often uses `openaiModel` for its configuration.
- [ChatModel](./chat-model.md): The interface implemented by the model instance returned by this factory.

## Sources
[Source 1]: src/models/router.ts