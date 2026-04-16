---
title: KnowledgeBase
entity_type: api
summary: The top-level class for interacting with the YAAF Knowledge Base at runtime, supporting both manual and plugin-based integration.
export_name: KnowledgeBase
source_file: src/knowledge/store/knowledgeBase.ts
category: class
stub: false
compiled_at: 2026-04-16T14:27:51.259Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/knowledgeBase.ts
confidence: 1
---

## Overview
The `KnowledgeBase` class is the primary runtime interface for the YAAF Knowledge Base system. It serves as a bridge between the compile-time pipeline (where raw sources are processed into structured articles) and the runtime environment where agents consume that knowledge.

The class implements the `ToolProvider` and `ContextProvider` interfaces, allowing it to be used either as a standalone utility for generating agent tools or as a plugin that can be registered with a `PluginHost`. It manages access to compiled documents, provides search capabilities, and generates system prompt fragments to inform agents about available knowledge.

## Signature / Constructor

```typescript
export class KnowledgeBase implements ToolProvider, ContextProvider {
  /**
   * Loads a compiled knowledge base from the filesystem.
   * @param options Path to the KB directory or a configuration object.
   */
  static load(options: string | KnowledgeBaseOptions): Promise<KnowledgeBase>;
}

export type KnowledgeBaseOptions = {
  /** Path to the KB root directory (contains ontology.yaml, raw/, compiled/) */
  kbDir: string;
  /** Name of the compiled directory. Default: 'compiled' */
  compiledDirName?: string;
  /** Options for the runtime tools */
  toolOptions?: KBToolOptions;
  /**
   * Optional namespace prefix for all docIds returned by tools.
   * When set, docIds become `namespace:docId` (e.g. `ml:concepts/attention`).
   */
  namespace?: string;
}
```

## Methods & Properties

### tools()
Returns an array of `Tool` objects (such as search and retrieval tools) that can be provided to an LLM-powered agent to interact with the knowledge base.

### systemPromptSection()
Returns a string containing a description of the knowledge base and instructions for the agent. This is intended to be appended to the agent's system prompt to provide context on how to use the available knowledge tools.

### Plugin Integration
As an implementation of `ToolProvider` and `ContextProvider`, `KnowledgeBase` instances can be registered directly with a YAAF `PluginHost`. This allows for automatic discovery of tools and system prompt context during agent initialization.

## Examples

### Manual Agent Integration
This example demonstrates loading a knowledge base and manually passing its tools and prompt section to a new agent.

```typescript
import { KnowledgeBase } from 'yaaf/knowledge'
import { Agent } from 'yaaf'

// Load a compiled KB and create an agent with KB tools
const kb = await KnowledgeBase.load('./my-kb')
const agent = new Agent({
  tools: [...kb.tools()],
  systemPrompt: `You have access to a knowledge base.\n\n${kb.systemPromptSection()}`,
})
```

### Plugin-based Integration
This example shows how to register the `KnowledgeBase` as a plugin, allowing the framework to handle tool and context injection.

```typescript
import { KnowledgeBase } from 'yaaf/knowledge'
import { Agent, PluginHost } from 'yaaf'

const host = new PluginHost()
const kb = await KnowledgeBase.load('./my-kb')

// Plugin usage (auto-discovers tools + system prompt)
await host.register(kb)
const agent = await Agent.create({ 
  plugins: host.listPluginsRaw() 
})
```