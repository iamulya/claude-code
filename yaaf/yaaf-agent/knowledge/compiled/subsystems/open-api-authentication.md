---
title: OpenAPI Authentication
entity_type: subsystem
summary: Provides types and functions for handling authentication in OpenAPI-driven agents, supporting various auth schemes and auto-detection.
primary_files:
 - src/tools/openapi/auth.ts
exports:
 - AuthConfig
 - applyAuth
 - schemeToAuthConfig
 - resolveAuth
search_terms:
 - OpenAPI security schemes
 - how to authenticate OpenAPI tools
 - API key authentication
 - bearer token auth
 - basic auth in agents
 - YAAF tool authentication
 - passing credentials to tools
 - resolveAuth function
 - applyAuth function
 - schemeToAuthConfig
 - agent security configuration
 - HTTP request authorization
stub: false
compiled_at: 2026-04-24T18:17:21.782Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/auth.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The OpenAPI Authentication subsystem is responsible for managing and applying authentication credentials to HTTP requests made by [Tools](./tools.md) derived from OpenAPI specifications [Source 1]. It bridges the gap between the abstract security scheme definitions in an OpenAPI document and the concrete modifications (e.g., adding headers or query parameters) required to authenticate an API call. Its primary functions are to represent different authentication methods, resolve which method to use for a given operation based on user-provided credentials, and apply the chosen authentication to a request [Source 1].

## Architecture

The subsystem is composed of a central data type and several utility functions that work together to resolve and apply authentication [Source 1].

*   **`AuthConfig`**: A type that represents a specific, resolved authentication configuration. The provided source defines a variant for API key authentication, specifying whether the key is placed in a `header` or `query`, its `name`, and its `value` [Source 1]. Module comments suggest the system is designed to also support bearer tokens, basic auth, and custom headers [Source 1].

*   **`schemeToAuthConfig`**: A factory function that converts an OpenAPI `SecurityScheme` object and a credential string (e.g., the API key) into a concrete `AuthConfig` object. This function acts as a translator from the OpenAPI specification's definition to the framework's internal representation [Source 1].

*   **`resolveAuth`**: The primary orchestration function. It takes the list of security schemes required by a specific API operation, all available schemes defined in the specification, and a map of user-provided credentials. It iterates through the required schemes, attempting to find a matching credential. It returns the first valid `AuthConfig` it can construct, providing a fallback to a global authentication configuration if one is available [Source 1].

*   **`applyAuth`**: The final step in the process. This function takes a resolved `AuthConfig` object and mutates the headers and query parameters of a pending HTTP request to include the necessary authentication information [Source 1].

## Integration Points

This subsystem is a dependency of the primary OpenAPI [Tool Execution](../concepts/tool-execution.md) logic. [when](../apis/when.md) an agent invokes a tool corresponding to an OpenAPI operation, the execution logic calls `resolveAuth` to determine the correct authentication method. The resulting `AuthConfig` is then passed to `applyAuth` to modify the outgoing HTTP request just before it is dispatched [Source 1].

The subsystem also depends on the [OpenAPI Parser](./open-api-parser.md), from which it receives `SecurityScheme` objects that describe the available authentication methods [Source 1].

## Key APIs

The main public APIs provided by this subsystem are [Source 1]:

*   **`AuthConfig`**: A type alias representing a configured authentication method.
    ```typescript
    export type AuthConfig =
      | { type: "apiKey"; in: "header" | "query"; name: string; value: string }
    ```

*   **`applyAuth(headers, query, auth)`**: Modifies the `headers` and `query` objects in-place to add the authentication details from the `auth` configuration.

*   **`schemeToAuthConfig(scheme, credential)`**: Creates an `AuthConfig` object from an OpenAPI `SecurityScheme` and a credential string. Returns `undefined` if the scheme type is not supported.

*   **`resolveAuth(requiredSchemes, allSchemes, credentials, globalAuth?)`**: The main resolution logic. It determines the appropriate `AuthConfig` to use for an operation by matching required schemes against provided credentials.

## Configuration

Developers configure authentication by providing credentials when setting up the agent or its tools. The `resolveAuth` function's signature indicates that credentials are provided as a key-value map, where the key is the name of the security scheme as defined in the OpenAPI specification (e.g., "api_key") and the value is the secret credential (e.g., the API key string) [Source 1]. A global `AuthConfig` can also be provided as a fallback [Source 1].

## Sources

[Source 1]: src/tools/openapi/auth.ts