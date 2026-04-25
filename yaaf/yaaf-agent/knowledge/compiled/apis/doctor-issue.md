---
summary: The `DoctorIssue` type defines the structure for diagnostic issues reported by the YAAF Doctor system.
export_name: DoctorIssue
source_file: src/doctor/index.ts
category: type
title: DoctorIssue
entity_type: api
search_terms:
 - YAAF Doctor errors
 - diagnostic issue format
 - compile error structure
 - test failure data type
 - runtime error object
 - pattern warning type
 - how to handle doctor issues
 - YaafDoctor issue event payload
 - troubleshooting agent problems
 - agent health check
 - daemon mode errors
 - onIssue event type
stub: false
compiled_at: 2026-04-24T17:03:21.635Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `DoctorIssue` type is a TypeScript interface that defines the data structure for a single diagnostic problem identified by the `YaafDoctor` subsystem [Source 1]. It serves as a standardized format for reporting various types of issues that can occur within a YAAF project, such as compilation errors, test failures, or potential anti-patterns.

This type is primarily used as the payload for events emitted by a `YaafDoctor` instance, particularly [when](./when.md) running in daemon mode. Consumers can listen for these events to log, display, or otherwise react to problems detected in the project [Source 1].

## Signature

`DoctorIssue` is a type alias for an object with the following properties [Source 1]:

```typescript
export type DoctorIssue = {
  type: "compile_error" | "test_failure" | "pattern_warning" | "runtime_error";
  summary: string;
  details: string;
  timestamp: Date;
};
```

### Properties

*   **`type`**: ` "compile_error" | "test_failure" | "pattern_warning" | "runtime_error" `
    A string literal indicating the category of the issue.

*   **`summary`**: ` string `
    A concise, one-line description of the problem.

*   **`details`**: ` string `
    A more detailed explanation of the issue, which may include stack traces, error logs, or diagnostic suggestions.

*   **`timestamp`**: ` Date `
    A `Date` object representing when the issue was detected.

## Examples

### Handling a DoctorIssue Event

The most common use case for `DoctorIssue` is as the parameter in the callback for the `YaafDoctor.onIssue` event handler. The following example shows how to set up a `YaafDoctor` in daemon mode and log any detected issues to the console [Source 1].

```typescript
import { YaafDoctor, type DoctorIssue } from 'yaaf';

const doctor = new YaafDoctor({ daemon: true });

// The 'issue' parameter is of type DoctorIssue
doctor.onIssue((issue: DoctorIssue) => {
  console.log(`🔴 [${issue.type}] ${issue.summary}`);
  console.log(`   Detected at: ${issue.timestamp.toISOString()}`);
  console.log(`   Details: ${issue.details}`);
});

// Start the daemon to begin watching for issues.
await doctor.startDaemon();
```

### Sample DoctorIssue Object

Below is an example of what a `DoctorIssue` object might look like for a compilation error.

```typescript
const compileErrorIssue: DoctorIssue = {
  type: "compile_error",
  summary: "Type 'string' is not assignable to type 'number'.",
  details: `
File: src/my-agent.ts:25:10
Error TS2322: Type 'string' is not assignable to type 'number'.
  24 |   let count: number;
> 25 |   count = "five";
     |           ^^^^^^
  `,
  timestamp: new Date("2023-10-27T10:30:00Z"),
};
```

## See Also

*   `YaafDoctor`: The class that generates and emits `DoctorIssue` objects.

## Sources

[Source 1]: src/doctor/index.ts