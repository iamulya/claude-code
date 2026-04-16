---
summary: How to set up OAuth 2.0 authentication for MCP servers using the McpOAuthClient in YAAF.
title: Authenticating with MCP Servers via OAuth
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:22:17.751Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 0.95
---

## Overview
Many production-grade Model Context Protocol (MCP) servers, such as those for GitHub, Google Drive, or Slack, require OAuth 2.0 authentication to access user data. YAAF provides the `McpOAuthClient` and associated utilities to manage the OAuth lifecycle, including authorization code exchange, PKCE (Proof Key for Code Exchange), token persistence, and automatic background refreshing.

This guide covers how to implement both user-facing authorization flows and machine-to-machine authentication for MCP integrations.

## Prerequisites
- A YAAF project initialized with TypeScript.
- OAuth 2.0 credentials (Client ID and Client Secret) from a provider (e.g., GitHub Developer Settings).
- A target MCP server that supports SSE (Server-Sent Events) and requires Bearer token authentication.

## Step-by-Step

### 1. Configure the OAuth Client
The `McpOAuthClient` is the central class for managing tokens. For CLI tools or local development, you can use the `FileTokenStore` to ensure authentication persists across process restarts.

```typescript
import { McpOAuthClient, FileTokenStore } from 'yaaf/integrations/mcpOAuth';

const oauth = new McpOAuthClient({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'read:org'],
  redirectUri: 'http://localhost:9090/callback',
  tokenStore: new FileTokenStore('./.tokens.json')
});
```

### 2. Perform the Authorization Flow
For the **Authorization Code flow**, the agent must direct the user to a browser to authorize the application.

```typescript
// 1. Generate the URL for the user to visit
const { url, state } = oauth.getAuthorizationUrl();
console.log(`Please visit: ${url}`);

// 2. Start a temporary local server to catch the redirect (useful for CLI)
const { code, state: returnedState } = await oauth.listenForCallback(9090);

// 3. Exchange the temporary code for an access token
await oauth.exchangeCode(code, returnedState);
```

For **Client Credentials (Machine-to-Machine)**, use the simplified authentication method:

```typescript
const m2mClient = new McpOAuthClient({
  clientId: 'my-service-id',
  clientSecret: 'my-service-secret',
  tokenUrl: 'https://auth.example.com/token',
  grantType: 'client_credentials',
  scopes: ['mcp:tools']
});

await m2mClient.authenticate();
```

### 3. Attach OAuth Headers to MCP Plugin
Once authenticated, the client can generate the necessary HTTP headers for the MCP connection. YAAF provides a helper function `oauthMcpServer` to streamline this process when configuring the `McpPlugin`.

```typescript
import { McpPlugin } from 'yaaf';
import { oauthMcpServer } from 'yaaf/integrations/mcpOAuth';

const serverConfig = await oauthMcpServer({
  serverName: 'github-mcp',
  serverUrl: 'https://mcp.github.com',
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo'],
  },
});

const plugin = new McpPlugin({
  servers: [serverConfig]
});
```

## Configuration Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `clientId` | `string` | Required | The OAuth 2.0 client identifier. |
| `clientSecret` | `string` | `undefined` | The OAuth 2.0 client secret. |
| `authorizationUrl` | `string` | `undefined` | The endpoint for the authorization code flow. |
| `tokenUrl` | `string` | Required | The endpoint to exchange codes/credentials for tokens. |
| `scopes` | `string[]` | `[]` | List of permissions to request. |
| `redirectUri` | `string` | `http://localhost:9090/callback` | The URI where the provider sends the auth code. |
| `grantType` | `enum` | `authorization_code` | Either `authorization_code` or `client_credentials`. |
| `usePKCE` | `boolean` | `true` | Enables Proof Key for Code Exchange for auth code flows. |
| `refreshBufferSeconds` | `number` | `300` | Refreshes tokens this many seconds before they expire. |
| `tokenStore` | `TokenStore` | In-memory | Pluggable storage (e.g., `FileTokenStore`). |

## Common Mistakes
- **Redirect URI Mismatch**: The `redirectUri` provided in the `McpOAuthConfig` must exactly match the URI registered in the OAuth provider's developer console.
- **Missing Scopes**: If the MCP server returns 403 Forbidden errors despite successful authentication, verify that the `scopes` array includes all permissions required by the server's tools.
- **Port Conflicts**: When using `listenForCallback(9090)`, ensure the port is not being used by another process or the MCP server itself.
- **Token Expiration**: If the agent runs for long periods, ensure a `refreshToken` is provided by the OAuth server; otherwise, the agent will require re-authorization once the access token expires.

## Next Steps
- Explore the `McpPlugin` documentation to learn how to register tools and resources from authenticated servers.
- Implement a custom `TokenStore` to persist tokens in a database for multi-user production environments.
- Configure multiple MCP servers with different OAuth providers within a single agent.