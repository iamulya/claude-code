---
title: safeParseJson
entity_type: api
summary: A utility function that safely parses a JSON string and validates it against a Zod schema, returning a typed result without throwing errors.
export_name: safeParseJson
source_file: src/schemas.ts
category: function
search_terms:
 - parse JSON safely
 - validate JSON with Zod
 - error handling for JSON.parse
 - Zod schema parsing
 - type-safe JSON parsing
 - avoid JSON parse errors
 - JSON validation utility
 - schema-based parsing
 - safe json utility
 - how to parse llm output
 - handle malformed json
 - zod safeParse wrapper
 - structured data extraction
stub: false
compiled_at: 2026-04-25T00:12:49.276Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Overview

The `safeParseJson` function is a utility for parsing JSON strings in a robust and type-safe manner. It wraps the standard `JSON.parse` method but provides two key advantages:

1.  **Error Suppression**: It catches exceptions that `JSON.parse` would normally throw on malformed input, preventing crashes.
2.  **Schema Validation**: It validates the parsed object against a provided Zod schema, ensuring the data conforms to the expected structure and types.

This function is particularly useful when dealing with unreliable data sources, such as the output from Large Language Models (LLMs) or external API responses, which may not always produce perfectly-formed JSON. Instead of throwing an error, it returns `undefined` if the string is not valid JSON or if the resulting object does not match the schema.

## Signature

```typescript
import { z } from 'zod';

/**
 * Safely parses a JSON string and validates it against a Zod schema.
 *
 * @param jsonString The string to parse.
 * @param schema The Zod schema to validate against.
 * @returns The parsed and validated data, or undefined if parsing or validation fails.
 */
export function safeParseJson<T>(
  jsonString: string,
  schema: z.Schema<T>
): T | undefined;
```

### Parameters

-   `jsonString` (string): The JSON string to be parsed.
-   `schema` (z.Schema<T>): An instance of a Zod schema that defines the expected shape of the data.

### Returns

-   `(T | undefined)`: If parsing and validation are successful, it returns the typed data object `T`. Otherwise, it returns `undefined`.

## Examples

### Successful Parsing

The following example demonstrates parsing a valid JSON string that matches the schema.

```typescript
import { z } from 'zod';
import { safeParseJson } from 'yaaf/schemas';

// Define a schema for a user profile
const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  isActive: z.boolean(),
});

const jsonString = '{"id": 123, "name": "Alice", "isActive": true}';

const userProfile = safeParseJson(jsonString, UserProfileSchema);

if (userProfile) {
  console.log('Successfully parsed user:', userProfile.name);
  // Output: Successfully parsed user: Alice
  // typeof userProfile is { id: number; name: string; isActive: boolean; }
} else {
  console.log('Failed to parse user profile.');
}
```

### Handling Invalid JSON

This example shows how `safeParseJson` handles a string that is not valid JSON.

```typescript
import { z } from 'zod';
import { safeParseJson } from 'yaaf/schemas';

const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Malformed JSON (missing closing brace)
const malformedJson = '{"id": 456, "name": "Bob"';

const result = safeParseJson(malformedJson, UserProfileSchema);

console.log(result);
// Output: undefined
```

### Handling Schema Mismatch

This example shows `safeParseJson` handling a valid JSON string that does not conform to the provided schema.

```typescript
import { z } from 'zod';
import { safeParseJson } from 'yaaf/schemas';

const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Valid JSON, but 'id' is a string instead of a number
const schemaMismatchJson = '{"id": "789", "name": "Charlie"}';

const result = safeParseJson(schemaMismatchJson, UserProfileSchema);

console.log(result);
// Output: undefined
```

## See Also

-   [MemoryRelevanceEngine](./memory-relevance-engine.md): This class uses `safeParseJson` to process LLM output when selecting relevant memories.