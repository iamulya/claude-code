---
export_name: CompileLock
source_file: src/knowledge/compiler/lock.ts
category: class
summary: Manages exclusive locks to prevent concurrent knowledge base compilation, supporting file-based and port-based strategies.
title: CompileLock
entity_type: api
search_terms:
 - concurrent compilation
 - knowledge base lock
 - prevent race conditions
 - file-based mutex
 - port-based locking
 - atomic lock acquisition
 - O_EXCL lock
 - NFS locking
 - distributed lock
 - KBCompiler lock
 - compile mutex
 - how to lock knowledge base
stub: false
compiled_at: 2026-04-24T16:56:29.187Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/lock.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `CompileLock` class provides a mechanism to prevent concurrent executions of the knowledge base compilation process, such as `KBCompiler.compile()`, which could otherwise lead to data corruption [Source 1]. It ensures that only one compilation process can run at a time for a given knowledge base.

`CompileLock` supports two distinct locking strategies to accommodate different filesystem environments [Source 1]:
1.  **`'file'` (Default):** This strategy is designed for local POSIX filesystems. It uses the `open('wx')` system call flags (`O_WRONLY | O_CREAT | O_EXCL`) to atomically acquire an exclusive lock. This approach is robust against time-of-check-to-time-of-use (TOCTOU) race conditions that can occur with simpler read-then-write lock checks [Source 1].
2.  **`'port'`:** This strategy is intended for network filesystems like NFS or CIFS where `O_EXCL` file locking can be unreliable. It works by binding to a unique TCP port to establish a lock [Source 1].

To prevent locks from being held indefinitely by a crashed process, `CompileLock` implements a [Heartbeat Mechanism](../concepts/heartbeat-mechanism.md). A live process refreshes its lock's `startedAt` timestamp every two minutes. This results in an effective lock time-to-live (TTL) of six minutes, after which a stale lock from a crashed process will expire. A lock held by a healthy, running process will never expire [Source 1].

## Signature / Constructor

The `CompileLock` class is configured using a `LockStrategy`.

```typescript
export type LockStrategy = "file" | "port";

export class CompileLock {
  // Constructor and methods are not detailed in the provided source material.
}
```

## Examples

No examples are available in the source material.

## Sources

[Source 1]: src/knowledge/compiler/lock.ts