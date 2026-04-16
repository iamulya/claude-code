---
export_name: OpenAPIToolsetOptions
source_file: src/tools/openapi/index.ts
category: type
summary: Configuration options for the OpenAPI tool generation process, including filtering and authentication.
title: OpenAPIToolsetOptions
entity_type: api
stub: false
compiled_at: 2026-04-16T14:38:17.151Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
confidence: 0.95
---

## Overview
`OpenAPIToolsetOptions` is a configuration object used when generating YAAF tools from OpenAPI 3.x specifications. It provides controls for filtering specific API operations, overriding tool naming conventions, configuring authentication, and managing network request behavior such as timeouts and custom headers.

This type is used by the factory methods of the `OpenAPIToolset` class, including `fromSpec`, `fromFile`, and `fromURL`.

## Signature / Constructor
```typescript
export type OpenAPIToolsetOptions = {
  format?: 'json' | 'yaml' | 'auto'
  credentials?: Record<string, string>
  auth?: AuthConfig
  operationFilter?: string[] | ((operationId: string, method: string, path: string) => boolean)
  nameOverrides?: Record<string, string>
  timeoutMs?: number
  headers?: Record<string, string>
  fileResolver?: FileResolver
}
```

## Methods & Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `format` | `'json' \| 'yaml' \| 'auto'` | Overrides format detection for the input specification. Defaults to `'auto'`. |
| `credentials` | `Record<string, string>` | Credential values keyed by the security scheme name defined in the OpenAPI specification. |
| `auth` | `AuthConfig` | Global authentication configuration applied to all generated tools. |
| `operationFilter` | `string[] \| function` | Determines which operations to generate tools for. Accepts an array of `operationId` strings or a predicate function. |
| `nameOverrides` | `Record<string, string>` | A mapping of `operationId` to custom tool names, allowing manual control over how tools appear to the agent. |
| `timeoutMs` | `number` | The timeout for API calls in milliseconds. Defaults to `30_000`. |
| `headers` | `Record<string, string>` | Custom HTTP headers added to every API request made by the generated tools. |
| `fileResolver` | `FileResolver` | A custom resolver for handling external `$ref` pointers. Required for external file references when using `fromSpec()` or `fromURL()`. |

## Examples

### Filtering Operations
You can limit the tools generated to a specific subset of the API using an array of IDs or a filter function.
```typescript
const options: OpenAPIToolsetOptions = {
  // Only generate tools for these specific operationIds
  operationFilter: ['getPetById', 'addPet'],
  
  // Or use a function to filter by path/method
  // operationFilter: (id, method, path) => path.startsWith('/v1/orders')
};
```

### Authentication and Headers
Configuring global authentication and custom headers for all generated tools.
```typescript
const options: OpenAPIToolsetOptions = {
  auth: { 
    type: 'bearer', 
    token: process.env.API_TOKEN! 
  },
  headers: {
    'X-Organization-ID': 'org_12345'
  },
  timeoutMs: 10000
};
```

### Custom Naming
Overriding the default tool names generated from the specification.
```typescript
const options: OpenAPIToolsetOptions = {
  nameOverrides: {
    'list_all_pets_v2': 'list_pets',
    'create_new_user_account': 'register_user'
  }
};
```

## See Also
(No related articles available)