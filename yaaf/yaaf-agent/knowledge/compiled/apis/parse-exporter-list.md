---
title: parseExporterList
entity_type: api
summary: Parses a comma-separated list of OpenTelemetry exporter types.
export_name: parseExporterList
source_file: src/telemetry/telemetry.ts
category: function
search_terms:
 - parse OTEL exporter string
 - comma separated exporters
 - telemetry configuration helper
 - OTEL_TRACES_EXPORTER parsing
 - split exporter list
 - handle 'none' exporter
 - environment variable parsing
 - OpenTelemetry setup
 - YAAF telemetry
 - configure telemetry exporters
 - otlp,console string
 - filter none exporter
stub: false
compiled_at: 2026-04-24T17:26:11.368Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `parseExporterList` function is a utility for parsing a comma-separated string of [OpenTelemetry](../concepts/open-telemetry.md) exporter names into an array of strings [Source 1]. It is primarily used within the YAAF telemetry subsystem to process environment variables like `OTEL_TRACES_EXPORTER` or `YAAF_OTEL_TRACES_EXPORTER`.

The function specifically handles cases where an exporter is disabled by filtering out the special value `"none"` as well as any empty strings that might result from parsing [Source 1]. This allows for a consistent way to determine which exporters should be initialized.

According to source code comments, this function's behavior mirrors a similar utility named `parseExporterTypes()` in an internal, non-public repository [Source 1].

## Signature

```typescript
export function parseExporterList(value: string | undefined): string[];
```

**Parameters:**

*   `value` (`string | undefined`): The comma-separated string of exporter names, typically read from an environment variable. If `undefined`, an empty array is returned.

**Returns:**

*   `string[]`: An array of exporter names. The values `"none"` and any empty strings are excluded from the returned array.

## Examples

### Parsing multiple exporters

```typescript
import { parseExporterList } from 'yaaf';

const exporterString = "console,otlp";
const exporters = parseExporterList(exporterString);

console.log(exporters);
// Output: ['console', 'otlp']
```

### Handling the "none" value

The function filters out `"none"`, which is used to explicitly disable telemetry signals.

```typescript
import { parseExporterList } from 'yaaf';

const exporterString = "none";
const exporters = parseExporterList(exporterString);

console.log(exporters);
// Output: []
```

### Handling undefined or empty input

If the input is `undefined` or an empty string, the function returns an empty array.

```typescript
import { parseExporterList } from 'yaaf';

console.log(parseExporterList(undefined));
// Output: []

console.log(parseExporterList(""));
// Output: []
```

### Handling extra whitespace and empty segments

The function correctly handles extra whitespace around commas and empty segments.

```typescript
import { parseExporterList } from 'yaaf';

const exporterString = " otlp , ,, console ";
const exporters = parseExporterList(exporterString);

console.log(exporters);
// Output: ['otlp', 'console']
```

## Sources

[Source 1] src/telemetry/telemetry.ts