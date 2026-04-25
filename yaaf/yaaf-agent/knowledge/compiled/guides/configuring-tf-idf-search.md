---
title: Configuring TF-IDF Search
entity_type: guide
summary: A guide on how to customize and configure the built-in TF-IDF search plugin in YAAF.
difficulty: intermediate
search_terms:
 - how to change search algorithm
 - customize knowledge base search
 - TF-IDF plugin setup
 - YAAF search adapter
 - KBSearchAdapter configuration
 - using a different tokenizer
 - field weighting in search
 - search engine settings
 - registering search plugin
 - TfIdfSearchPlugin options
 - multilingual search setup
 - zero-dependency search
stub: false
compiled_at: 2026-04-24T18:06:11.537Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Overview

YAAF includes a built-in, production-grade [TF-IDF](../concepts/tf-idf.md) search engine that serves as the default search adapter for the `KnowledgeBase` subsystem [Source 1]. While this search plugin works automatically with no configuration, you may need to customize its behavior, such as changing the [tokenization](../concepts/tokenization.md) strategy for a specific language or enabling [Vocabulary](../concepts/vocabulary.md)-aware query expansion.

This guide walks through the process of explicitly registering and configuring the `TfIdfSearchPlugin` to override its default settings.

## Prerequisites

Before starting, you should have a YAAF project with a `PluginHost` instance and a `KnowledgeBase` that you intend to query. This guide assumes you are familiar with the basic plugin registration process in YAAF.

## Step-by-Step

### Step 1: Understand the Default Behavior

By default, any `KnowledgeBase` instance will automatically use the `TfIdfSearchPlugin` if no other `KBSearchAdapter` plugin has been registered with the `PluginHost` [Source 1]. For many use cases, this zero-configuration setup is sufficient.

```typescript
// Automatic: The TfIdfSearchPlugin is used internally by default
const kb = await KnowledgeBase.load('./my-kb');
const results = await kb.search('attention mechanisms');
```

In this scenario, the search engine uses its default settings, including the `HybridTokenizer` for multilingual support [Source 1].

### Step 2: Instantiate the Plugin with Custom Configuration

To override the defaults, you must first create an instance of the `TfIdfSearchPlugin` and pass a configuration object to its constructor. The source material provides an example of configuring a specific tokenizer and providing a vocabulary for query expansion [Source 1].

```typescript
import { TfIdfSearchPlugin } from 'yaaf/knowledge'; // Note: actual import path may vary
import { EnglishTokenizer } from 'yaaf/tokenizers'; // Note: actual import path may vary

// Assume 'Ontology' is a loaded Ontology object with a vocabulary
const customSearchPlugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: [[Ontology]].vocabulary,
});
```

This configuration replaces the default multilingual tokenizer with one optimized for English and enables synonym-aware search via the provided vocabulary [Source 1].

### Step 3: Register the Plugin with the PluginHost

Once the plugin is instantiated with your custom configuration, you must register it with your application's `PluginHost`. This registration ensures that your configured version of the search adapter is used by the `KnowledgeBase` instead of the automatic default.

```typescript
// Assume 'host' is your application's PluginHost instance
await host.register(customSearchPlugin);

// Now, any KnowledgeBase operations will use your configured plugin
const kb = await KnowledgeBase.load('./my-kb');
const results = await kb.search('attention mechanisms');
```

After these steps, all subsequent search operations will use the customized TF-IDF engine.

## Configuration Reference

The following options can be passed to the `TfIdfSearchPlugin` constructor, based on the example in the source material [Source 1].

| Option       | Type                | Description                                                                                                                                                                                                                         |
|--------------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `tokenizer`  | `TokenizerStrategy` | An instance of a tokenizer class. The default is `HybridTokenizer`, which supports multiple languages including CJK, Thai, Latin, and more. You can provide a language-specific tokenizer for more specialized behavior [Source 1]. |
| `vocabulary` | `VocabularyEntry[]` | An array of vocabulary entries from an [Ontology](../concepts/ontology.md). Providing this enables vocabulary-aware query expansion, which automatically includes synonyms in the search [Source 1].                                                            |

## Common Mistakes

1.  **Instantiating but Not Registering:** Simply creating an instance of `TfIdfSearchPlugin` with custom options is not enough. If you do not register it with the `PluginHost`, the `KnowledgeBase` will fall back to using a default, unconfigured instance of the plugin.
2.  **Mismatching Tokenizer and Content Language:** The effectiveness of TF-IDF search is highly dependent on correct tokenization. Using a tokenizer designed for one language (e.g., `EnglishTokenizer`) on content written in another will lead to poor search relevance. Ensure the chosen `TokenizerStrategy` matches the language of your knowledge base documents.
3.  **Expecting Query Expansion Without a Vocabulary:** The vocabulary-aware query expansion feature is only active if a `vocabulary` is provided during configuration [Source 1]. If you expect synonyms to be included in searches, you must supply this data during instantiation.

## Sources

[Source 1] src/knowledge/store/tfidfSearch.ts