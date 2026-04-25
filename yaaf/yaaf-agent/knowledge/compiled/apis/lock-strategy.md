---
export_name: LockStrategy
source_file: src/knowledge/compiler/lock.ts
category: type
summary: "Defines the available strategies for acquiring a compilation lock: 'file' (default) or 'port'."
title: LockStrategy
entity_type: api
search_terms:
 - compilation lock strategy
 - concurrent compilation prevention
 - file vs port locking
 - NFS lock file
 - CIFS lock file
 - atomic lock acquisition
 - KBCompiler lock
 - O_EXCL locking
 - TCP port binding lock
 - cross-process mutex
 - prevent knowledge base corruption
 - compile lock file
stub: false
compiled_at: 2026-04-24T17:19:21.287Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/lock.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `LockStrategy` type specifies the mechanism used by the `KBCompiler` to prevent multiple processes from compiling a Knowledge Base simultaneously, which could otherwise lead to data corruption [Source 1].

Two strategies are available:

1.  `'file'`: The default strategy, which uses an atomic file creation flag (`O_EXCL`) to acquire a lock. This is the recommended and most reliable method for local POSIX-compliant filesystems [Source 1].
2.  `'port'`: An alternative strategy that works by binding to a local TCP port. This method should be used [when](./when.md) the Knowledge Base resides on a network filesystem like NFS or CIFS, where atomic file locking can be unreliable [Source 1].

Choosing the correct strategy is important for ensuring the integrity of the compiled Knowledge Base in multi-process or distributed environments.

## Signature

`LockStrategy` is a string literal type that accepts one of two values.

```typescript
export type LockStrategy = "file" | "port";
```

### Values

| Value    | Description                                                                                                                                                           |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'file'` | **(Default)** Uses an atomic file-based lock (`O_EXCL`). Ideal for local filesystems.                                                                                   |
| `'port'` | Uses TCP port binding to establish a lock. Necessary for network filesystems like NFS or CIFS where file-based locking primitives may not be reliably implemented [Source 1]. |

## Examples

The `LockStrategy` is typically provided as an option when configuring a `KBCompiler`.

```typescript
import { KBCompiler, LockStrategy } from 'yaaf';

// Example configuration for a compiler running on a local filesystem.
// The 'file' strategy is the default and does not need to be set explicitly.
const localCompiler = new KBCompiler({
  lockStrategy: 'file',
  // ... other compiler options
});

// Example configuration for a compiler writing to an NFS share.
// The 'port' strategy is required for reliability on network filesystems.
const nfsCompiler = new KBCompiler({
  lockStrategy: 'port',
  // ... other compiler options
});
```

## Sources

[Source 1]: src/knowledge/compiler/lock.ts