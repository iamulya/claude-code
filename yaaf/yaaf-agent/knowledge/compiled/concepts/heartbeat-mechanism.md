---
summary: A mechanism used by `CompileLock` to periodically refresh a lock's `startedAt` timestamp, preventing locks held by live processes from expiring prematurely.
title: Heartbeat Mechanism
entity_type: concept
related_subsystems:
 - knowledge_compiler
see_also:
 - concept:Compilation Locking
 - api:CompileLock
search_terms:
 - lock expiration
 - long-running process lock
 - prevent premature lock release
 - CompileLock TTL
 - how does CompileLock stay alive
 - lock refresh mechanism
 - stale lock cleanup
 - distributed lock keep-alive
 - knowledge base compilation lock
 - heartbeat for file locks
 - process liveness check
stub: false
compiled_at: 2026-04-25T00:19:52.886Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/lock.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Heartbeat Mechanism is a design pattern used within YAAF's [Compilation Locking](./compilation-locking.md) system to ensure that locks held by active, long-running processes do not expire prematurely [Source 1]. It solves the problem of distinguishing between a process that has crashed (and whose lock should be released) and a process that is simply taking a long time to complete its task, such as a full knowledge base compilation.

Without this mechanism, a fixed lock timeout could lead to a race condition where a lock expires mid-operation, allowing another process to acquire it and potentially corrupt shared resources. The heartbeat provides a continuous "I'm still alive" signal, maintaining the lock's validity for as long as the holding process is running.

## How It Works in YAAF

The Heartbeat Mechanism is implemented within the [CompileLock](../apis/compile-lock.md) class, which manages locks for the `KBCompiler.compile()` process [Source 1].

When a process acquires a compile lock, it also starts a periodic timer. This timer triggers a "heartbeat" action every two minutes. The action consists of updating the `startedAt` timestamp within the lock file to the current time [Source 1].

The system determines if a lock is stale or expired by checking if the time elapsed since the `startedAt` timestamp exceeds a certain Time-To-Live (TTL). The effective TTL is configured to be three times the heartbeat interval, resulting in a 6-minute expiration window [Source 1].

This implementation has two key outcomes:
1.  **Live Process**: A running process will refresh its lock's timestamp every two minutes, so the lock never reaches the 6-minute expiration threshold. Its lock will never expire [Source 1].
2.  **Crashed Process**: If a process crashes, it stops sending heartbeats. Its lock's `startedAt` timestamp becomes static, and the lock is guaranteed to expire after a maximum of 6 minutes, allowing other processes to clean it up and acquire a new lock [Source 1].

## See Also

*   [Compilation Locking](./compilation-locking.md): The broader concept that this mechanism supports.
*   [CompileLock](../apis/compile-lock.md): The API class that implements the heartbeat mechanism.

## Sources

[Source 1]: src/knowledge/compiler/lock.ts