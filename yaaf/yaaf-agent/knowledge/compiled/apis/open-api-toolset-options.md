---
summary: Defines the configuration options for the OpenAPIToolset class.
export_name: OpenAPIToolsetOptions
source_file: src/tools/openapi/index.ts
category: type
title: OpenAPIToolsetOptions
entity_type: api
search_terms:
 - OpenAPI tool configuration
 - configure OpenAPI tools
 - OpenAPI authentication
 - filter OpenAPI operations
 - custom tool names OpenAPI
 - API call timeout
 - custom headers for tools
 - OpenAPI file resolver
 - $ref resolution
 - operationFilter
 - nameOverrides
 - AuthConfig for OpenAPI
 - YAAF OpenAPI integration
 - set API credentials
 - customize tool generation
stub: false
compiled_at: 2026-04-24T17:24:44.701Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`OpenAPI[[[[[[[[Tools]]]]]]]]etOptions` is a TypeScript type that defines the configuration object for the `OpenAPIToolset` class. It allows for customization of how Tools are generated from an OpenAPI specification, including authentication, operation filtering, naming, request timeouts, and more [Source 1].

This options object is passed as the second argument to the `OpenAPIToolset` factory methods like `fromSpec`, `fromFile`, and `fromURL` [Source 1].

## Signature

`OpenAPIToolsetOptions` is a type alias for an object with the following properties [Source 1]:

```typescript
export type OpenAPIToolsetOptions = {
  /** Override format detection ('json' | 'yaml' | 'auto', default: 'auto') */
  format?: "json" | "yaml" | "auto";
  /** Credential values keyed by security scheme name from the spec */
  credentials?: Record<string, string>;
  /** Global auth config applied to all tools */
  auth?: AuthConfig;
  /**
   * Filter which operations to generate tools for.
   * Pass an array of operationIds or a filter function.
   */
  operationFilter?: string[] | ((operationId: string, method: string, path: string) => boolean);
  /** Override generated tool names: { operationId: 'custom_name' } */
  nameOverrides?: Record<string, string>;
  /** Timeout for API calls in ms (default: 30_000) */
  timeoutMs?: number;
  /** Custom headers added to every API request */
  headers?: Record<string, string>;
  /**
   * Custom file resolver for external `$ref` resolution.
   * If not provided, `fromFile()` auto-creates one from the spec's directory.
   * For `fromSpec()` and `fromURL()`, external file refs require this.
   */
  fileResolver?: FileResolver;
};
```

### Properties

*   **`format`**: ` "json" | "yaml" | "auto" ` (optional)
    Overrides the automatic detection of the specification format. Defaults to `'auto'` [Source 1].

*   **`credentials`**: ` Record<string, string> ` (optional)
    An object providing credential values, where keys are the security scheme names defined in the OpenAPI specification [Source 1].

*   **`auth`**: ` AuthConfig ` (optional)
    A global authentication configuration that will be applied to all generated tools [Source 1].

*   **`operationFilter`**: ` string[] | ((operationId: string, method: string, path: string) => boolean) ` (optional)
    Determines which API operations are converted into tools. It can be an array of `operationId` strings to include, or a function that returns `true` for operations to include [Source 1].

*   **`nameOverrides`**: ` Record<string, string> ` (optional)
    An object that maps an operation's `operationId` to a custom tool name, overriding the default generated name [Source 1].

*   **`timeoutMs`**: ` number ` (optional)
    The timeout in milliseconds for all API calls made by the generated tools. Defaults to 30,000 ms [Source 1].

*   **`headers`**: ` Record<string, string> ` (optional)
    An object of custom headers that will be added to every API request [Source 1].

*   **`fileResolver`**: ` FileResolver ` (optional)
    A custom function for resolving external `$ref`s in the specification. This is required [when](./when.md) using `fromSpec()` or `fromURL()` with specifications that reference external files. The `fromFile()` method automatically creates a resolver based on the input file's directory [Source 1].

## Examples

The following example demonstrates how to use `OpenAPIToolsetOptions` to configure tool generation from an OpenAPI specification string. It sets up bearer token authentication, filters for specific operations, renames one of the tools, and adds a custom header and timeout [Source 1].

```typescript
import { OpenAPIToolset, OpenAPIToolsetOptions } from 'yaaf';

// Assume `specString` contains a valid OpenAPI specification
const specString = `...`; 

const options: OpenAPIToolsetOptions = {
  // Use a bearer token for all API calls
  auth: { type: 'bearer', token: process.env.API_TOKEN! },

  // Set a 15-second timeout for requests
  timeoutMs: 15000,

  // Add a custom header to every request
  headers: { 'X-Client-ID': 'yaaf-agent-123' },

  // Only generate tools for these two operations
  operationFilter: ['getUser', 'updateUser'],

  // Rename the tool for the 'getUser' operation
  nameOverrides: {
    'getUser': 'fetch_user_by_id'
  }
};

const tools = OpenAPIToolset.fromSpec(specString, options);

// `tools` will now contain two tools: `fetch_user_by_id` and `updateUser`.
// All calls made by these tools will include the specified auth, timeout, and headers.
```

## Sources

[Source 1]: src/tools/openapi/index.ts