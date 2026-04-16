---
title: Worker
entity_type: api
summary: The core class for executing agent tasks within a managed worker thread or process.
export_name: Worker
source_file: src/runtime/worker.ts
category: class
stub: false
compiled_at: 2026-04-16T14:33:43.831Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/worker.ts
confidence: 0.85
---

## Overview
The `Worker` class is a fundamental component of the YAAF runtime environment. It is responsible for the execution of agent tasks within a managed context, such as a worker thread or a separate process. This class provides the necessary isolation and resource management required for running LLM-powered agents in production-grade environments.

## Signature / Constructor
```typescript
export class Worker
```
*Note: Detailed constructor parameters and configuration types are not specified in the current source material.*

## Examples
The following example demonstrates the basic import and instantiation of the `Worker` class.

```typescript
import { Worker } from 'yaaf';

/**
 * The Worker class is used to manage agent task execution.
 * Specific implementation details depend on the runtime configuration.
 */
const worker = new Worker();
```