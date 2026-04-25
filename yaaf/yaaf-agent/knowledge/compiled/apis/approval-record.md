---
export_name: ApprovalRecord
source_file: src/gateway/approvals.ts
category: type
title: ApprovalRecord
entity_type: api
summary: A type representing a completed approval request, including the original request, the final decision, and timing information.
search_terms:
 - approval request history
 - user permission log
 - tool execution decision
 - what is an approval record
 - approved or denied request
 - asynchronous permission result
 - user-in-the-loop flow data
 - approval decision type
 - log of user approvals
 - permission gateway record
 - tool usage audit trail
 - agent interaction log
stub: false
compiled_at: 2026-04-24T16:49:26.075Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalRecord` type is a data structure that represents the complete history of a single asynchronous permission request handled by the `ApprovalManager` [Source 1]. It combines the data from the original `ApprovalRequest` with the final outcome and timing metrics.

This type is primarily used for logging, auditing, and analyzing agent-user interactions. Each time an agent requests permission for a potentially dangerous operation and the user responds (or the request times out), an `ApprovalRecord` is created to capture the entire event [Source 1].

## Signature

`ApprovalRecord` is an extension of the `ApprovalRequest` type, adding fields to describe the outcome of the request [Source 1].

```typescript
export type ApprovalRecord = ApprovalRequest & {
  /** The final decision for the request. */
  decision: ApprovalDecision;

  /** The timestamp [[[[[[[[when]]]]]]]] the decision was made. */
  decidedAt: number;

  /** The total duration of the approval request in milliseconds. */
  durationMs: number;
};
```

### Properties

An `ApprovalRecord` object includes all properties from `ApprovalRequest`, plus the following:

*   `decision`: The outcome of the request, which can be `'approved'`, `'denied'`, or `'timeout'` [Source 1].
*   `decidedAt`: A Unix timestamp (in milliseconds) indicating when the final decision was registered [Source 1].
*   `durationMs`: The time in milliseconds from when the request was initiated (`timestamp`) to when it was resolved (`decidedAt`) [Source 1].

It also inherits these properties from `ApprovalRequest`:

*   `tool`: The name of the tool that requested approval [Source 1].
*   `description`: A human-readable summary of the action to be performed [Source 1].
*   `risk`: The assessed risk level: `'low'`, `'medium'`, `'high'`, or `'critical'` [Source 1].
*   `args`: The raw input arguments provided to the tool [Source 1].
*   `timestamp`: A Unix timestamp (in milliseconds) indicating when the request was created [Source 1].

## Examples

The following example shows what a typical `ApprovalRecord` object might look like after a user has approved a high-risk [Tool Execution](../concepts/tool-execution.md). This object would be generated internally by an `ApprovalManager`.

```typescript
import type { ApprovalRecord } from 'yaaf';

const record: ApprovalRecord = {
  // Inherited from ApprovalRequest
  tool: 'fileSystem.delete',
  description: 'Delete the file at path /tmp/project_data.zip',
  risk: 'high',
  args: { path: '/tmp/project_data.zip' },
  timestamp: 1678886400000,

  // ApprovalRecord-specific fields
  decision: 'approved',
  decidedAt: 1678886415321,
  durationMs: 15321,
};

console.log(`User approved '${record.tool}' after ${record.durationMs}ms.`);
// Output: User approved 'fileSystem.delete' after 15321ms.
```

## See Also

*   `ApprovalRequest`: The type representing a pending request before a decision is made.
*   `ApprovalDecision`: The type for the possible outcomes (`'approved'`, `'denied'`, `'timeout'`).
*   `ApprovalManager`: The class that manages the approval lifecycle and produces `ApprovalRecord` objects.

## Sources

*   [Source 1]: `src/gateway/approvals.ts`