---
title: alwaysCapable
entity_type: api
summary: A factory function that creates a `RouterChatModel` which always uses the 'capable' model, bypassing any routing logic.
export_name: alwaysCapable
source_file: src/models/router.ts
category: function
search_terms:
 - disable model routing
 - force capable model
 - production model selection
 - bypass fast model
 - use expensive model only
 - RouterChatModel helper
 - turn off routing
 - static model routing
 - always use pro model
 - disable cost optimization
 - production configuration
 - no routing overhead
stub: false
compiled_at: 2026-04-24T16:48:08.494Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `alwaysCapable` function is a factory that creates and configures a `RouterChatModel` instance to exclusively use the "capable" model for all operations [Source 1].

This utility is primarily used to disable the dynamic routing behavior of a `RouterChatModel` without changing the call sites where the model is used. By forcing the selection of the more powerful model, it ensures maximum quality for every request. This is particularly useful in production environments or for specific tasks where the cost-saving benefits of routing are outweighed by the need for consistent, high-quality responses [Source 1].

Using this function also eliminates the performance overhead associated with executing the routing logic before each model invocation [Source 1].

## Signature

```typescript
export function alwaysCapable(capable: ChatModel): RouterChatModel;
```

**Parameters:**

*   `capable`: `ChatModel`
    *   An instance of a `ChatModel` that will be designated as the "capable" model. This model will handle all incoming requests.

**Returns:**

*   `RouterChatModel`
    *   A new `RouterChatModel` instance configured to always route to the provided `capable` model.

## Examples

The following example demonstrates how to create a model router that is locked to a single, powerful model. This is a common pattern for production deployments where routing logic is disabled in favor of consistent performance.

```typescript
import { alwaysCapable } from 'yaaf';
import { type ChatModel } from 'yaaf';
// Assuming a concrete ChatModel implementation exists, e.g., from a provider plugin.
import { SomeProviderChatModel } from 'some-provider';

// 1. Instantiate the powerful model you want to use.
const capableModel: ChatModel = new SomeProviderChatModel({
  model: 'some-provider/most-capable-model-v2',
  apiKey: process.env.PROVIDER_API_KEY,
});

// 2. Use the alwaysCapable factory to create a RouterChatModel.
// This model will have the same interface but will bypass routing.
const productionModel = alwaysCapable(capableModel);

// 3. The `productionModel` can now be passed to agents or runners.
// All calls will be directed to `capableModel` without any routing overhead.
// await agent.run('Execute a complex task.', { model: productionModel });
```

## See Also

*   `RouterChatModel`: The class that performs two-tier [Model Routing](../concepts/model-routing.md) for [Cost Optimization](../concepts/cost-optimization.md).
*   `alwaysFast`: A companion factory function that creates a `RouterChatModel` which always uses the "fast" model.

## Sources

[Source 1]: src/models/router.ts