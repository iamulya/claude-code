---
summary: Step-by-step guide on how to generate tools from an OpenAPI spec and attach them to an agent.
title: Using OpenAPI with YAAF
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:38:26.568Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
confidence: 0.92
---

## Overview
The `OpenAPIToolset` in YAAF allows developers to automatically generate `Tool` instances from an OpenAPI 3.x specification. Each operation defined in the specification (e.g., `GET /pets`, `POST /orders`) is converted into a separate tool that an agent can invoke to interact with a REST API. This integration uses native `fetch` for execution and requires no mandatory external dependencies for JSON specifications.

## Prerequisites
- A valid OpenAPI 3.x specification in JSON or YAML format.
- If using YAML specifications, the `yaml` peer dependency must be installed in your project.
- A YAAF environment configured for agent deployment.

## Step-by-Step

### 1. Load the OpenAPI Specification
YAAF provides three primary methods to ingest an OpenAPI specification: from a raw string/object, a local file, or a remote URL.

```typescript
import { OpenAPIToolset } from 'yaaf/tools/openapi';

// From a JSON string or object
const toolsFromSpec = OpenAPIToolset.fromSpec(jsonString);

// From a local file (async)
const toolsFromFile = await OpenAPIToolset.fromFile('./petstore.json');

// From a remote URL (async)
const toolsFromURL = await OpenAPIToolset.fromURL('https://petstore3.swagger.io/api/v3/openapi.json');
```

### 2. Configure Authentication
If the API requires authentication, you can provide global credentials or map values to specific security schemes defined in the specification.

```typescript
const tools = await OpenAPIToolset.fromURL(apiUrl, {
  auth: { 
    type: 'bearer', 
    token: process.env.API_TOKEN! 
  },
  // Or map to specific security scheme names in the spec
  credentials: {
    ApiKeyAuth: process.env.API_KEY!
  }
});
```

### 3. Filter and Customize Tools
To prevent an agent from accessing every endpoint in a large API, use the `operationFilter`. You can also override generated tool names to make them more intuitive for the LLM.

```typescript
const tools = await OpenAPIToolset.fromFile('./api.json', {
  // Only include specific operations
  operationFilter: ['getPetById', 'addPet'],
  
  // Or use a predicate function
  // operationFilter: (operationId, method, path) => method === 'GET',

  // Rename tools for better agent understanding
  nameOverrides: {
    getPetById: 'fetch_pet_details'
  }
});
```

### 4. Attach Tools to an Agent
Once the toolset is generated, it is passed as an array to the `Agent` constructor.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  tools, // The array of generated Tool instances
  systemPrompt: 'You are a pet store inventory manager. Use the provided tools to look up and update pet records.'
});
```

## Configuration Reference

The `OpenAPIToolsetOptions` object supports the following configuration:

| Property | Type | Description |
| :--- | :--- | :--- |
| `format` | `'json' \| 'yaml' \| 'auto'` | Override format detection. Defaults to `'auto'`. |
| `credentials` | `Record<string, string>` | Credential values keyed by security scheme name from the spec. |
| `auth` | `AuthConfig` | Global authentication configuration applied to all tools. |
| `operationFilter` | `string[] \| Function` | Filter which operations to generate tools for. |
| `nameOverrides` | `Record<string, string>` | Map of `operationId` to custom tool names. |
| `timeoutMs` | `number` | Timeout for API calls in milliseconds. Defaults to `30_000`. |
| `headers` | `Record<string, string>` | Custom headers added to every API request. |
| `fileResolver` | `FileResolver` | Custom resolver for external `$ref` resolution. |

## Common Mistakes
- **Missing YAML Dependency**: Attempting to load a YAML specification without the `yaml` package installed will cause a runtime error.
- **External Reference Failures**: When using `fromSpec()` or `fromURL()`, external file references (`$ref`) require a custom `fileResolver`. `fromFile()` handles local relative references automatically.
- **Ambiguous Tool Names**: If the OpenAPI spec lacks `operationId` fields, YAAF generates names based on the path and method. If these are not descriptive, the agent may struggle to select the correct tool. Use `nameOverrides` to provide clearer names.

## Sources
- `src/tools/openapi/index.ts`