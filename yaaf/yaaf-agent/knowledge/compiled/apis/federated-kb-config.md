---
summary: A type representing the configuration map for a FederatedKnowledgeBase, mapping namespaces to KnowledgeBase instances or FederatedKBEntry objects.
export_name: FederatedKBConfig
source_file: src/knowledge/store/federation.ts
category: type
title: FederatedKBConfig
entity_type: api
search_terms:
 - federated knowledge base setup
 - combine multiple knowledge bases
 - knowledge base namespace
 - multi-KB configuration
 - FederatedKBEntry type
 - knowledge base trust weight
 - how to configure FederatedKnowledgeBase
 - map namespaces to KBs
 - multiple KB sources
 - unified knowledge search config
 - ADR-012 score rigging
 - federation config object
stub: false
compiled_at: 2026-04-25T00:06:40.199Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`FederatedKBConfig` is a TypeScript type alias for an object used to configure a `FederatedKnowledgeBase` [Source 1]. This configuration object maps string keys, which serve as unique namespaces, to individual [Knowledge Base](../subsystems/knowledge-base.md) instances. This allows multiple, distinct knowledge bases to be combined into a single, searchable entity [Source 1].

Each entry in the configuration can be either a direct `KnowledgeBase` instance or a `FederatedKBEntry` object for more advanced settings, such as providing a human-readable label or adjusting the trust level of a specific knowledge source [Source 1].

## Signature

The `FederatedKBConfig` type is a record where keys are strings (namespaces) and values are either a `KnowledgeBase` or a `FederatedKBEntry` object [Source 1].

```typescript
export type FederatedKBConfig = Record<string, KnowledgeBase | FederatedKBEntry>;
```

### FederatedKBEntry

When more control over a namespace is needed, a `FederatedKBEntry` object can be used as the value [Source 1].

```typescript
export type FederatedKBEntry = {
  /** The loaded KnowledgeBase instance */
  kb: KnowledgeBase;

  /** Human-readable label for this KB (used in system prompt). Defaults to namespace. */
  label?: string;

  /**
   * Trust weight for this namespace (0.0–1.0). Default: 1.0.
   * Applied as a multiplier to search scores from this KB.
   */
  trustWeight?: number;
};
```

**Properties:**

*   `kb`: The `KnowledgeBase` instance for this namespace [Source 1].
*   `label`: An optional human-readable string to identify the [Knowledge Base](../subsystems/knowledge-base.md) in contexts like the system prompt. If not provided, the namespace key is used [Source 1].
*   `trustWeight`: An optional number between 0.0 and 1.0 (defaulting to 1.0) that acts as a multiplier on search scores from this namespace. This allows operators to reduce the influence of less-trusted knowledge sources in federated search results [Source 1].

## Examples

### Basic Configuration

This example shows a simple configuration where namespaces are mapped directly to `KnowledgeBase` instances [Source 1].

```typescript
import { KnowledgeBase } from 'yaaf';
import type { FederatedKBConfig } from 'yaaf';

// Assume kbML and kbTools are loaded KnowledgeBase instances
const kbML: KnowledgeBase = await KnowledgeBase.load('./kb-ml');
const kbTools: KnowledgeBase = await KnowledgeBase.load('./kb-tools');

const config: FederatedKBConfig = {
  ml: kbML,
  tools: kbTools,
};

// This config can then be passed to FederatedKnowledgeBase.from(config)
```

### Advanced Configuration with FederatedKBEntry

This example uses `FederatedKBEntry` objects to provide custom labels and apply a trust weight to one of the knowledge bases [Source 1].

```typescript
import { KnowledgeBase } from 'yaaf';
import type { FederatedKBConfig } from 'yaaf';

const highTrustKB: KnowledgeBase = await KnowledgeBase.load('./kb-internal-docs');
const communityKB: KnowledgeBase = await KnowledgeBase.load('./kb-community-wiki');

const config: FederatedKBConfig = {
  internal: {
    kb: highTrustKB,
    label: 'Internal Engineering Docs',
    trustWeight: 1.0, // Full trust
  },
  community: {
    kb: communityKB,
    label: 'Community Wiki',
    trustWeight: 0.8, // Scores from this KB will be reduced by 20%
  },
};
```

## See Also

*   [Knowledge Base](../subsystems/knowledge-base.md)
*   `FederatedKnowledgeBase` class, which consumes this configuration type.
*   `FederatedKBEntry` type, for advanced namespace configuration.

## Sources

*   [Source 1] `src/knowledge/store/federation.ts`
*   [Source 2] `src/knowledge/store/index.ts`