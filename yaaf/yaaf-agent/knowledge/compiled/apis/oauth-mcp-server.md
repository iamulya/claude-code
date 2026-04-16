---
export_name: oauthMcpServer
source_file: src/integrations/mcpOAuth.ts
category: function
summary: A helper function to create an OAuth-authenticated MCP SSE server configuration for use with McpPlugin.
title: oauthMcpServer
entity_type: api
stub: false
compiled_at: 2026-04-16T14:22:08.695Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 1
---

## Overview
`oauthMcpServer` is a utility function designed to simplify the integration of OAuth 2.0 authentication with Model Context Protocol (MCP) servers. It automates the process of obtaining and refreshing OAuth tokens and formatting them into the headers required for a Server-Sent Events (SSE) MCP connection. 

This function is primarily used when connecting to production-grade MCP servers that require secure authentication, such as those for GitHub, Google Drive, or Slack. It returns a configuration object that can be passed directly to the `McpPlugin`.

## Signature / Constructor

```typescript
export async function oauthMcpServer(config: {
  serverName: string;
  serverUrl: string;
  oauth: McpOAuthConfig;
}): Promise<any>
```

### Parameters

The function accepts a single configuration object with the following properties:

*   **serverName**: `string` — A unique identifier for the MCP server.
*   **serverUrl**: `string` — The base URL of the MCP SSE endpoint.
*   **oauth**: `McpOAuthConfig` — The OAuth configuration details.

### McpOAuthConfig

The `oauth` property uses the `McpOAuthConfig` type, which supports the following fields:

| Property | Type | Description |
| :--- | :--- | :--- |
| `clientId` | `string` | The OAuth 2.0 client identifier. |
| `clientSecret` | `string` | (Optional) The OAuth 2.0 client secret. |
| `authorizationUrl` | `string` | (Optional) The URL for the authorization endpoint (required for authorization code flow). |
| `tokenUrl` | `string` | The URL for the token exchange endpoint. |
| `scopes` | `string[]` | (Optional) A list of OAuth scopes to request. |
| `redirectUri` | `string` | (Optional) The redirect URI for the authorization code flow. Defaults to `http://localhost:9090/callback`. |
| `grantType` | `'authorization_code' \| 'client_credentials'` | (Optional) The OAuth grant type. Defaults to `authorization_code`. |
| `usePKCE` | `boolean` | (Optional) Whether to use Proof Key for Code Exchange. Defaults to `true` for authorization code flows. |
| `tokenStore` | `TokenStore` | (Optional) A custom implementation for persisting tokens. Defaults to in-memory storage. |
| `authParams` | `Record<string, string>` | (Optional) Additional parameters for the authorization request. |
| `tokenParams` | `Record<string, string>` | (Optional) Additional parameters for the token request. |
| `refreshBufferSeconds` | `number` | (Optional) Seconds before expiration to trigger a token refresh. Defaults to 300 (5 minutes). |

## Examples

### Basic OAuth Configuration for GitHub
This example demonstrates how to use `oauthMcpServer` to configure a GitHub MCP server using the authorization code flow.

```typescript
import { McpPlugin } from 'yaaf';
import { oauthMcpServer } from 'yaaf/integrations/mcpOAuth';

const server = await oauthMcpServer({
  serverName: 'github',
  serverUrl: 'https://mcp.github.com',
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo'],
  },
});

const plugin = new McpPlugin({ servers: [server] });
```