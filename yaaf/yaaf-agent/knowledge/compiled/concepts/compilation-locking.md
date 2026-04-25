---
title: Compilation Locking
entity_type: concept
summary: A mechanism to prevent concurrent `KBCompiler.compile()` calls from corrupting the knowledge base by ensuring only one compilation process runs at a time.
search_terms:
 - concurrent compilation
 - KBCompiler lock
 - prevent knowledge base corruption
 - atomic lock acquisition
 - TOCTOU race condition
 - cross-process mutex
 - lock file
 - port locking
 - NFS lock strategy
 - compile lock heartbeat
 - stale lock expiration
 - O_EXCL flag
stub: false
compiled_at: 2026-04-24T17:53:16.873Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/lock.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Compilation Locking is a mechanism within YAAF that prevents multiple `KBCompiler.compile()` processes from running concurrently [Source 1]. Its primary purpose is to protect the integrity of the Knowledge Base (KB) by ensuring that only one compilation process can write to it at any given time, thus preventing data corruption [Source 1].

This mechanism was introduced to solve a time-of-check-to-time-of-use (TOCTOU) race condition present in a previous implementation, where two processes could simultaneously observe the absence of a lock and both proceed to start compilation, leading to conflicts [Source 1].

## How It Works in YAAF

The `CompileLock` class implements the compilation locking logic using a cross-process mutex [Source 1]. YAAF supports two distinct strategies for acquiring and holding this lock, configurable based on the underlying filesystem environment [Source 1].

### Lock Strategies

1.  **`file` (Default Strategy)**
    This strategy is designed for local POSIX filesystems. It achieves an atomic, exclusive lock by using the `open('wx')` flag [when](../apis/when.md) creating a lock file. This flag corresponds to the system-level `O_WRONLY | O_CREAT | O_EXCL` flags, which guarantees that the file creation and lock acquisition will succeed only if the file does not already exist. This atomic operation is the correct way to implement a cross-process mutex on POSIX filesystems and eliminates the TOCTOU race condition [Source 1].

2.  **`port` Strategy**
    This strategy is provided for environments where file-based exclusive locking is unreliable, such as on network filesystems like NFS or CIFS. It works by binding to a TCP port, using the operating system's port allocation uniqueness as the locking mechanism [Source 1].

### Heartbeat and Lock Expiration

To prevent a crashed process from holding a lock indefinitely, the compilation lock incorporates a heartbeat and expiration system. A process that successfully acquires a lock will periodically refresh a `startedAt` timestamp every two minutes. This heartbeat ensures that the lock of a healthy, running process never expires [Source 1].

If a process crashes, it will stop sending heartbeats. The lock is considered expired and will be released after a maximum of six minutes (three times the heartbeat interval), allowing another compilation process to proceed [Source 1].

## Configuration

A developer can select the locking mechanism via the `lockStrategy` option when configuring the `KBCompiler`.

```typescript
// Hypothetical configuration example
const compiler = new KBCompiler({
  // ... other options
  
  // Use 'port' strategy for network filesystems like NFS or CIFS.
  // The default is 'file'.
  lockStrategy: 'port' 
});
```

## Sources

[Source 1] `src/knowledge/compiler/lock.ts`