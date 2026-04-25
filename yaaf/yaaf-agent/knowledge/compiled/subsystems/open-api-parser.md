---
title: OpenAPI Parser
entity_type: subsystem
summary: Parses OpenAPI 3.x specification documents to extract normalized API operations and security schemes.
primary_files:
 - src/tools/openapi/parser.ts
exports:
 - parseOpenAPISpec
 - ParseResult
 - ParsedOperation
 - SecurityScheme
 - FileResolver
search_terms:
 - parse OpenAPI spec
 - OpenAPI 3 parser
 - how to use OpenAPI tools
 - extract API operations from spec
 - resolve $ref in OpenAPI
 - handle OpenAPI circular references
 - load external OpenAPI files
 - swagger parser
 - API specification parsing
 - normalized API operations
 - extract security schemes from OpenAPI
 - FileResolver for OpenAPI
stub: false
compiled_at: 2026-04-24T18:17:36.700Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/parser.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The OpenAPI Parser subsystem is responsible for interpreting OpenAPI 3.x specification documents and transforming them into a simplified, normalized format that is easier for other parts of the YAAF framework to consume [Source 1]. It addresses the complexity inherent in OpenAPI specifications, such as resolving JSON references (`$ref`), handling circular references, and extracting server URLs, parameters, and request bodies for each API endpoint [Source 1]. The primary output is a flat list of API operations, abstracting away the nested and referenced structure of the original document.

## Architecture

The central component of this subsystem is the `parseOpenAPISpec` function. This function ingests an OpenAPI specification, provided as a JavaScript object, and processes it to produce a `ParseResult` object [Source 1].

The `ParseResult` contains two key properties [Source 1]:
1.  `operations`: An array of `ParsedOperation` objects. Each object represents a single, fully resolved API endpoint (e.g., `GET /users/{id}`). It includes the HTTP method, path, server URL, summary, description, parameters, request body, and any required security schemes.
2.  `securitySchemes`: A record mapping the names of security schemes (e.g., "ApiKeyAuth") to their definitions, represented by `SecurityScheme` objects.

A significant architectural feature is its handling of external `$ref` pointers. The parser itself is decoupled from the file system or network. It relies on a caller-provided `FileResolver` callback function to load content from external files. This design allows the parser to be used in various environments (e.g., Node.js, browser) by supplying an appropriate resolver implementation [Source 1]. The parser handles local JSON pointers, relative file references, and combined file and pointer references, and includes detection for circular references [Source 1].

## Key APIs

-   **`parseOpenAPISpec(spec, options)`**: The main function of the subsystem. It takes the raw OpenAPI specification object and an optional options object (which can contain a `FileResolver`) and returns a `ParseResult` [Source 1]. It will throw an error if the specification is missing required fields like `openapi` or `paths` [Source 1].

-   **`ParseResult`**: The structured object returned by `parseOpenAPISpec`. It contains the final `operations` array and `securitySchemes` record [Source 1].

-   **`ParsedOperation`**: A type representing a single, normalized API operation. This is the primary data structure that consumers of the parser will interact with. It contains all necessary details to make an API call, including `operationId`, `method`, `path`, `serverUrl`, `parameters`, `requestBody`, and `security` requirements [Source 1].

-   **`SecurityScheme`**: A type that describes a single security scheme, such as an API key or an HTTP bearer token. It details the type of scheme, its name, and where it should be placed in a request (e.g., header, query) [Source 1].

-   **`FileResolver`**: A function signature for a callback that the parser uses to load external files referenced by `$ref`. The caller must provide a function matching this signature if the OpenAPI specification is split across multiple files [Source 1].
    ```typescript
    export type FileResolver = (filePath: string) => Record<string, unknown> | undefined;
    ```

## Extension Points

The primary extension point for the OpenAPI Parser is the `FileResolver` callback. By implementing a custom `FileResolver`, developers can control how external specification files are loaded. This allows for advanced use cases such as fetching specifications from a remote URL, a database, or a virtual file system, rather than just the local disk [Source 1].

## Sources

[Source 1]: src/[Tools](./tools.md)/openapi/parser.ts