---
title: ErrorCode
entity_type: api
summary: A union type of machine-readable error codes used for programmatic error handling and classification.
export_name: ErrorCode
source_file: src/errors.ts
category: type
stub: false
compiled_at: 2026-04-16T14:18:19.611Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/errors.ts
confidence: 1
---

## Overview
`ErrorCode` is a TypeScript union type that defines a standardized set of string literals used to identify specific failure modes within the YAAF framework. It is a core component of the error handling system, primarily used as the `code` property on the `YAAFError` class and its subclasses. By using a fixed set of machine-readable identifiers, the framework enables type-safe error handling and branching logic without requiring developers to perform string parsing on error messages.

## Signature / Constructor
```typescript
export type ErrorCode =
  | 'RATE_LIMIT'
  | 'OVERLOADED'
  | 'AUTH_ERROR'
  | 'API_ERROR'
  | 'API_CONNECTION_ERROR'
  | 'CONTEXT_OVERFLOW'
  | 'TOOL_EXECUTION_ERROR'
  | 'SANDBOX_VIOLATION'
  | 'PERMISSION_DENIED'
  | 'ABORT'
  | 'RETRY_EXHAUSTED'
  | 'COMPACTION_ERROR'
  | 'UNKNOWN';
```

## Methods & Properties
The following literal values are members of the `ErrorCode` union:

| Value | Description |
| :--- | :