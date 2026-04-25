---
summary: A constant defining the standard filename for the YAAF knowledge base configuration.
export_name: KB_CONFIG_FILENAME
source_file: src/knowledge/ontology/loader.ts
category: constant
title: KB_CONFIG_FILENAME
entity_type: api
search_terms:
 - knowledge base config file
 - kb.config.yaml
 - YAAF knowledge base setup
 - configure knowledge base
 - knowledge base file name
 - ontology configuration
 - where is kb config
 - knowledge base settings
 - YAAF KB file
 - standard config filename
stub: false
compiled_at: 2026-04-24T17:16:08.397Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`KB_CONFIG_FILENAME` is a string constant that holds the standard filename for a YAAF Knowledge Base (KB) configuration file: `kb.config.yaml` [Source 1].

This constant provides a consistent, centralized reference to the configuration filename, preventing the use of hardcoded strings and reducing the risk of typos [when](./when.md) locating or creating the file. It is typically used in file system operations to resolve the path to the knowledge base configuration within a project's KB root directory.

## Signature

The constant is defined as a string literal.

```typescript
export const KB_CONFIG_FILENAME = "kb.config.yaml";
```

## Examples

### Resolving the Configuration File Path

This example demonstrates using `KB_CONFIG_FILENAME` with the Node.js `path` module to construct the full path to the knowledge base configuration file.

```typescript
import { join } from 'path';
import { KB_CONFIG_FILENAME } from 'yaaf';

const kbRootDirectory = './my-agent-kb';
const configFilePath = join(kbRootDirectory, KB_CONFIG_FILENAME);

console.log(configFilePath);
// Output: my-agent-kb/kb.config.yaml
```

## See Also

*   `ONTOLOGY_FILENAME`: A related constant defining the filename for the knowledge base [Ontology](../concepts/ontology.md), `ontology.yaml`.

## Sources

[Source 1]: src/knowledge/ontology/loader.ts