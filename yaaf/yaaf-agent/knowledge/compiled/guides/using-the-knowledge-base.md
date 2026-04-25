---
title: Using the Knowledge Base
entity_type: guide
summary: A guide on how to load, search, and interact with the YAAF knowledge base system.
difficulty: beginner
search_terms:
 - how to use knowledge base
 - load knowledge base
 - search documents
 - YAAF KB
 - knowledge base setup
 - information retrieval
 - document search
 - TF-IDF search
 - KBSearchAdapter
 - find information in agent
 - agent memory
 - agent knowledge
 - load documents from directory
stub: false
compiled_at: 2026-04-24T18:08:16.811Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Overview

This guide provides the fundamental steps for loading a knowledge base from a local directory and performing searches against it. YAAF includes a built-in, production-grade search engine that works out-of-the-box with no configuration required. By following these steps, a developer can equip an agent with the ability to retrieve information from a collection of documents.

The default search functionality is provided by the `TfIdfSearchPlugin`, a zero-dependency [TF-IDF](../concepts/tf-idf.md) search engine. It features sublinear TF-IDF scoring, field weighting, multilingual [tokenization](../concepts/tokenization.md), and [Vocabulary](../concepts/vocabulary.md)-aware query expansion [Source 1].

## Prerequisites

Before you begin, ensure you have:
1. A YAAF project set up.
2. A directory on your filesystem containing the documents that will form the knowledge base.

## Step-by-Step

Interacting with the knowledge base is a two-step process: loading the data and then executing searches.

### Step 1: Load the Knowledge Base

The first step is to load the documents from a specified directory. The `KnowledgeBase.load()` method reads the documents, processes them, and builds an in-[Memory](../concepts/memory.md) search index. This operation is asynchronous and must be awaited.

```typescript
import { KnowledgeBase } from 'yaaf-agent';

// Path to the directory containing your knowledge base files
const kbDirectoryPath = './my-kb';

// Load the knowledge base and build the search index
const kb = await KnowledgeBase.load(kbDirectoryPath);

console.log('Knowledge base loaded successfully.');
```

[when](../apis/when.md) this code executes, YAAF automatically uses the built-in `TfIdfSearchPlugin` to create an inverted index of the document contents. The index construction is an O(n) operation, and the resulting index resides in memory for fast lookups [Source 1].

### Step 2: Search the Knowledge Base

Once the `KnowledgeBase` instance is loaded, you can use its `search()` method to find relevant documents. This method takes a string query and returns a promise that resolves with the search results.

```typescript
// Assuming 'kb' is the loaded KnowledgeBase instance from Step 1

const query = 'attention mechanisms';
const searchResults = await kb.search(query);

console.log(`Found ${searchResults.length} results for "${query}":`);
searchResults.forEach(result => {
  console.log(`- ${result.title} (Score: ${result.score})`);
});
```

This search operation uses the in-memory TF-IDF index to retrieve and rank documents based on relevance to the query string [Source 1].

## Advanced Configuration

While the knowledge base works without any configuration, the underlying search adapter can be configured explicitly for more control. This is done by registering the `TfIdfSearchPlugin` with the `PluginHost`. This pattern allows for customization, such as specifying a different tokenizer or providing a vocabulary for query expansion [Source 1].

```typescript
import { TfIdfSearchPlugin, EnglishTokenizer } from 'yaaf-agent';
import { host } from 'yaaf-agent/host'; // Assuming a central plugin host
import { ontology } from './my-ontology'; // Assuming an ontology with a vocabulary

// Create an instance of the search plugin with custom options
const searchPlugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: ontology.vocabulary,
});

// Register the plugin with the host before loading the knowledge base
await host.register(searchPlugin);

// Now, when KnowledgeBase.load() is called, it will use this configured instance
const kb = await KnowledgeBase.load('./my-kb');
await kb.search('attention mechanisms');
```

## Common Mistakes

1.  **Not `await`-ing `load()` or `search()`:** Both `KnowledgeBase.load()` and `kb.search()` are asynchronous methods that return Promises. Forgetting the `await` keyword will result in attempting to operate on a pending Promise instead of the resolved value, leading to runtime errors.
2.  **Incorrect Directory Path:** Providing a wrong path to `KnowledgeBase.load()` will cause the loading process to fail, typically with a file system error. Always ensure the path is correct relative to the execution context.
3.  **Searching Before Loading is Complete:** Attempting to call `kb.search()` before the `KnowledgeBase.load()` promise has resolved will result in an error, as the `kb` object is not yet a fully initialized `KnowledgeBase` instance.

## Sources

[Source 1]: src/knowledge/store/tfidfSearch.ts