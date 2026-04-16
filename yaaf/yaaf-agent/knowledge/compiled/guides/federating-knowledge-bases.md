---
title: How to Federate Knowledge Bases
entity_type: guide
summary: A step-by-step guide on combining multiple KnowledgeBase instances into a FederatedKnowledgeBase and attaching them to an Agent.
stub: false
compiled_at: 2026-04-16T14:29:02.272Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/federation.ts
confidence: 0.85
---

---
title: "How to Federate Knowledge Bases"
entity_type: "guide"
summary: "A step-by-step guide on combining multiple KnowledgeBase instances into a FederatedKnowledgeBase and attaching them to an Agent."
difficulty: intermediate

## Overview
Knowledge federation allows an agent to access multiple distinct knowledge sources through a single, unified interface. By using a `FederatedKnowledgeBase`, developers can combine specialized knowledge bases (e.g., one for technical documentation and another for internal API references) into a single entity. 

The federation handles namespacing automatically, ensuring that document IDs from different sources do not collide and that the agent can distinguish between sources during search and retrieval operations.

## Prerequisites
- Existing `KnowledgeBase` instances or directories containing compiled knowledge base data.
- An understanding of the YAAF `Agent` configuration.

## Step-by-Step

### 1. Load Individual Knowledge Bases
Before federating, you must initialize or load the individual `KnowledgeBase` instances that will serve as the data sources.

```typescript
import { KnowledgeBase } from 'yaaf/knowledge';

// Load existing knowledge bases from disk
const technicalDocs = await KnowledgeBase.load('./kb-technical');
const apiReference = await KnowledgeBase.load('./kb-api');
```

### 2. Initialize the FederatedKnowledgeBase
Create the federation by mapping unique namespace keys to your knowledge base instances. You can provide the instance directly or use a `FederatedKBEntry` object to specify a human-readable label.

```typescript
import { FederatedKnowledgeBase } from 'yaaf/knowledge';

const federated = FederatedKnowledgeBase.from({
  // Simple mapping using the key as the namespace
  tech: technicalDocs,
  
  // Mapping with an explicit label for the agent's system prompt
  internal_api: {
    kb: apiReference,
    label: "Internal API Reference"
  }
});
```

### 3. Attach to an Agent
To make the federated knowledge available to an agent, you must provide the generated tools and the system prompt section. The federation automatically generates tools like `search_kb` and `fetch_kb_document` that operate across all namespaces.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  // The federation provides a suite of tools for the agent
  tools: federated.tools(),
  
  // The system prompt section informs the agent about available namespaces
  systemPrompt: `
    You are a helpful assistant.
    ${federated.systemPromptSection()}
  `,
});
```

### 4. Accessing Documents
When the agent or a developer interacts with a federated knowledge base, document IDs are prefixed with their namespace using the format `namespace:docId`.

- **Search**: Results returned from `search_kb` include a `qualifiedId` (e.g., `tech:concepts/architecture`).
- **Retrieval**: The `fetch_kb_document` tool accepts these qualified IDs to retrieve the specific content from the correct underlying knowledge base.

## Configuration Reference

### FederatedKBConfig
The primary configuration object used in `FederatedKnowledgeBase.from()`. It is a `Record<string, KnowledgeBase | FederatedKBEntry>`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | The namespace identifier used to prefix document IDs. |
| `value` | `KnowledgeBase \| FederatedKBEntry` | The knowledge base instance or an entry object. |

### FederatedKBEntry
Used when additional metadata is required for a specific knowledge base within the federation.

| Property | Type | Description |
| :--- | :--- | :--- |
| `kb` | `KnowledgeBase` | The loaded KnowledgeBase instance. |
| `label` | `string` (optional) | A human-readable label used in the system prompt. Defaults to the namespace key. |

### FederatedKBOptions
Options passed during the creation of the federation to customize tool behavior.

| Property | Type | Description |
| :--- | :--- | :--- |
| `toolOptions` | `KBToolOptions` | Configuration for the generated tools (e.g., max results, similarity thresholds). |

## Common Mistakes
- **Namespace Collisions**: Ensure that the keys provided in the `FederatedKBConfig` are unique. While the framework prevents internal collisions by using these keys as prefixes, overlapping keys will overwrite previous entries in the configuration object.
- **Forgetting the System Prompt**: If `federated.systemPromptSection()` is omitted from the agent's system prompt, the agent may not understand the namespacing structure or know which namespaces are available for searching.
- **Unloaded Knowledge Bases**: Attempting to federate `KnowledgeBase` instances that have not been properly loaded or initialized will result in runtime errors during tool execution.

## Sources
- `src/knowledge/store/federation.ts`---