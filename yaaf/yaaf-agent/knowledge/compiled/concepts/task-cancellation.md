---
summary: The mechanism for gracefully stopping an ongoing task using an AbortController within YAAF.
primary_files:
 - src/agents/taskManager.ts
title: Task Cancellation
entity_type: concept
related_subsystems:
 - TaskManager
search_terms:
 - stop a running task
 - how to cancel an agent run
 - aborting a workflow
 - graceful shutdown of tasks
 - AbortController in YAAF
 - kill a task
 - task lifecycle management
 - asynchronous task interruption
 - stopping background work
 - task state killed
 - interrupting a long-running process
stub: false
compiled_at: 2026-04-24T18:03:01.165Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Task Cancellation is the process within YAAF for gracefully interrupting and stopping a task that is currently in progress. It provides a standardized way to signal termination to background work such as agent runs, shell commands, or workflows. This mechanism is a core part of the task lifecycle, allowing a task to transition from a `running` state to a terminal `killed` state without waiting for its natural completion [Source 1].

## How It Works in YAAF

The YAAF framework implements task cancellation using the standard web `AbortController` API. This functionality is managed by the `TaskManager` [Source 1].

[when](../apis/when.md) a new task is created, its corresponding `TaskState` object includes an optional `abortController` property. This controller is associated with the task for its entire lifecycle. To initiate cancellation, an external process calls the `abort()` method on the task's specific `AbortController` instance. The long-running process associated with the task is expected to listen to the `signal` from this controller and halt its execution when the `abort` event is received.

Upon successful cancellation, the `TaskManager` transitions the task's status to `killed`, which is a terminal state indicating that the task was stopped prematurely by an explicit request [Source 1].

## Sources

[Source 1]: src/agents/taskManager.ts