---
title: TfIdfSearchPluginOptions
entity_type: api
summary: A type alias for the configuration options of the TF-IDF search plugin.
export_name: TfIdfSearchPluginOptions
source_file: src/knowledge/store/tfidfSearch.js
category: type
search_terms:
 - TF-IDF configuration
 - term frequency-inverse document frequency options
 - configure knowledge base search
 - search plugin settings
 - information retrieval tuning
 - how to set up TF-IDF search
 - knowledge store search parameters
 - text search plugin
 - document scoring options
 - relevance ranking settings
 - KB search options
 - full-text search config
stub: false
compiled_at: 2026-04-25T00:15:36.198Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`TfIdfSearchPluginOptions` is a TypeScript type alias that defines the configuration object for the TF-IDF (Term Frequency-Inverse Document Frequency) search plugin. This plugin provides a classical information retrieval mechanism for a [Knowledge Base](../subsystems/knowledge-base.md).

This type is used to pass settings to the TF-IDF search plugin upon its instantiation, allowing for customization of its search and indexing behavior.

## Signature

The `TfIdfSearchPluginOptions` type is exported from `src/knowledge/store/tfidfSearch.js` [Source 1]. The specific properties of the type are not detailed in the provided source material.

```typescript
// The specific properties of this type are defined in src/knowledge/store/tfidfSearch.js.
export type { TfIdfSearchPluginOptions } from "./tfidfSearch.js";
```

## Examples

The following example illustrates how `TfIdfSearchPluginOptions` would be used to configure and instantiate a TF-IDF search plugin for a [Knowledge Base](../subsystems/knowledge-base.md).

```typescript
// NOTE: The specific properties of TfIdfSearchPluginOptions are not
// available in the source material and are shown for illustrative purposes only.

import { KnowledgeBase } from 'yaaf';
import { TfIdfSearchPlugin } from 'yaaf/plugins'; // Assuming plugin is exported here
import type { TfIdfSearchPluginOptions } from 'yaaf';

// Define the configuration for the TF-IDF search plugin.
const tfidfOptions: TfIdfSearchPluginOptions = {
  // Hypothetical properties might include:
  // maxResults: 10,
  // minScore: 0.1,
  // customStopWords: ['a', 'the', 'in'],
};

// Create an instance of the search plugin with the options.
const searchPlugin = new TfIdfSearchPlugin(tfidfOptions);

// Use the plugin when creating a new KnowledgeBase instance.
const kb = new KnowledgeBase({
  // ... other KnowledgeBase options
  search: searchPlugin,
});
```

## See Also

*   [Knowledge Base](../subsystems/knowledge-base.md): The primary subsystem that utilizes search plugins.

## Sources

*   [Source 1] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts`