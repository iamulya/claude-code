---
export_name: McpOAuthClient
source_file: src/integrations/mcpOAuth.ts
category: class
summary: OAuth 2.0 client for MCP server authentication, handling authorization flows, token storage, and automatic refresh.
title: McpOAuthClient
entity_type: api
stub: false
compiled_at: 2026-04-16T14:22:05.421Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 1
---

## Overview
The `McpOAuthClient` class provides OAuth 2.0 authentication capabilities for Model Context Protocol (MCP) server connections. It is designed to handle the authentication requirements of production MCP servers (such as GitHub, Google Drive, or Slack) that require secure token-based access.

The client supports multiple OAuth flows, including Authorization Code with PKCE (recommended for server-side applications) and Client Credentials (for machine-to-machine authentication). It manages the full token lifecycle, including automatic refresh before expiration and pluggable token persistence.

## Signature / Constructor

```typescript
export class McpOAuthClient {
  constructor(config: McpOAuthConfig);
}
```

### McpOAuthConfig
The configuration object for the client defines the OAuth endpoints, credentials, and behavior.

| Property | Type | Description |
| :--- | :--- | :--- |
| `clientId` | `string` | OAuth client ID. |
| `clientSecret` | `string` | (Optional) OAuth client secret. |
| `authorizationUrl` | `string` | (Optional) Authorization endpoint URL (required for auth code flow). |
| `tokenUrl` | `string` | Token endpoint URL. |
| `scopes` | `string[]` | (Optional) OAuth scopes to request. |
| `redirectUri` | `string` | (Optional) Redirect URI for auth code flow. Default: `http://localhost:9090/callback`. |
| `grantType` | `'authorization_code' \| 'client_credentials'` | (Optional) The OAuth grant type to use. Default: `'authorization_code'`. |
| `usePKCE` | `boolean` | (Optional) Whether to use Proof Key for Code Exchange. Default: `true` for auth code flows. |
| `tokenStore` | `TokenStore` | (Optional) Custom token storage implementation. Default: in-memory. |
| `authParams` | `Record<string, string>` | (Optional) Additional parameters for the authorization request. |
| `tokenParams` | `Record<string, string>` | (Optional) Additional parameters for the token request. |
| `refreshBufferSeconds` | `number` | (Optional) Refresh tokens before they expire, with this many seconds of buffer. Default: `300` (5 min). |

## Methods & Properties

### getAuthorizationUrl()
Generates the authorization URL and state for the Authorization Code flow.
- **Returns**: `{ url: string, state: string }`

### exchangeCode(code, state)
Exchanges an authorization code for access and refresh tokens.
- **Parameters**:
  - `code`: The authorization code received from the callback.
  - `state`: The state string to verify against the original request.
- **Returns**: `Promise<void>`

### getHeaders()
Retrieves the current valid access token and returns it as an HTTP header object. If the token is expired or near expiration, it attempts an automatic refresh.
- **Returns**: `Promise<{ Authorization: string }>`

### authenticate()
Performs authentication for the `client_credentials` grant type.
- **Returns**: `Promise<void>`

### listenForCallback(port)
Starts a temporary local HTTP server to capture the OAuth callback. This is primarily used for CLI tools.
- **Parameters**:
  - `port`: The port to listen on (should match the `redirectUri`).
- **Returns**: `Promise<{ code: string, state: string }>`

## Examples

### Authorization Code Flow
This example demonstrates the standard flow for a user-facing application.

```typescript
// Authorization Code flow
const oauth = new McpOAuthClient({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'read:org'],
  redirectUri: 'http://localhost:9090/callback',
});

// Get the authorization URL — user visits this in a browser
const { url, state } = oauth.getAuthorizationUrl();

// After user authorizes, exchange the code for tokens
await oauth.exchangeCode(code, state);

// Get headers for MCP SSE server
const headers = await oauth.getHeaders();
// → { Authorization: 'Bearer gho_abc123...' }
```

### Client Credentials Flow
Used for machine-to-machine authentication where no user interaction is required.

```typescript
// Client Credentials flow (machine-to-machine)
const oauth = new McpOAuthClient({
  clientId: 'my-app',
  clientSecret: 'secret',
  tokenUrl: 'https://auth.example.com/token',
  grantType: 'client_credentials',
  scopes: ['mcp:tools'],
});

await oauth.authenticate();
const headers = await oauth.getHeaders();
```

### Local Callback Server
Useful for CLI tools to automate the capture of the authorization code.

```typescript
// Local callback server (for CLI tools)
const oauth = new McpOAuthClient({ 
  clientId: '...',
  tokenUrl: '...',
  authorizationUrl: '...',
  redirectUri: 'http://localhost:9090/callback'
});

const { code, state } = await oauth.listenForCallback(9090);
await oauth.exchangeCode(code, state);
```

## Sources
- `src/integrations/mcpOAuth.ts`