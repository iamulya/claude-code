---
primary_files:
  - src/integrations/mcpOAuth.ts
summary: Subsystem providing integration with the Model Context Protocol (MCP), including authentication and server connection management.
title: MCP Integration
entity_type: subsystem
exports:
  - McpOAuthClient
  - FileTokenStore
  - oauthMcpServer
  - McpOAuthConfig
  - OAuthTokens
stub: false
compiled_at: 2026-04-16T14:22:10.664Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 0.9
---

## Purpose
The MCP Integration subsystem facilitates secure communication between YAAF agents and servers implementing the Model Context Protocol (MCP). Its primary focus is managing the authentication lifecycle for production-grade MCP servers—such as those for GitHub, Google Drive, or Slack—which typically require OAuth 2.0. It abstracts the complexities of token acquisition, persistence, and automatic refreshing, providing a standardized way to inject authentication headers into MCP server connections.

## Architecture
The subsystem is built around a modular authentication architecture that separates protocol logic from token storage.

### Key Components
- **McpOAuthClient**: The central orchestrator that manages the OAuth 2.0 lifecycle. It handles authorization URL generation, code exchange, and token refresh logic.
- **Token Storage**: A pluggable system for persisting credentials. While the default behavior is in-memory storage, the subsystem provides a `FileTokenStore` for CLI tools and allows for custom implementations via the `TokenStore` interface.
- **Flow Support**: The subsystem explicitly supports two primary OAuth 2.0 flows:
    - **Authorization Code + PKCE**: The recommended flow for server-side and CLI applications to prevent authorization code injection attacks.
    - **Client Credentials**: Used for machine-to-machine authentication where no user interaction is required.

## Integration Points
This subsystem is designed to work in tandem with the `McpPlugin`. It produces configuration objects and HTTP headers that are compatible with `McpSseServer` instances. The `oauthMcpServer` helper function serves as the primary bridge, combining OAuth configuration with MCP server metadata to create a ready-to-use plugin configuration.

## Key APIs

### McpOAuthClient
The main class for managing authentication.

- `getAuthorizationUrl()`: Generates the URL for the user to visit to authorize the application, including state and PKCE challenge parameters.
- `exchangeCode(code, state)`: Exchanges an authorization code for access and refresh tokens.
- `authenticate()`: Performs authentication for the `client_credentials` grant type.
- `getHeaders()`: Returns an object containing the `Authorization` bearer token, automatically refreshing the token if it is within the configured refresh buffer.
- `listenForCallback(port)`: A utility method for CLI tools that starts a temporary local HTTP server to capture the OAuth redirect callback.

### oauthMcpServer
A high-level utility function that streamlines the creation of an authenticated MCP server configuration.

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

## Configuration
The subsystem is configured via the `McpOAuthConfig` object:

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | `string` | The OAuth 2.0 client identifier. |
| `clientSecret` | `string` | The OAuth 2.0 client secret (optional for some flows). |
| `authorizationUrl` | `string` | The endpoint for the authorization code flow. |
| `tokenUrl` | `string` | The endpoint to exchange codes or credentials for tokens. |
| `grantType` | `string` | Either `authorization_code` (default) or `client_credentials`. |
| `usePKCE` | `boolean` | Whether to use Proof Key for Code Exchange (default: true). |
| `refreshBufferSeconds`| `number` | Buffer time to refresh tokens before expiry (default: 300s). |

## Extension Points
Developers can extend the subsystem's persistence capabilities by implementing the `TokenStore` interface. This allows tokens to be stored in databases, encrypted vaults, or other custom storage backends.

### FileTokenStore
A built-in extension for persisting tokens to the local file system, useful for maintaining authentication state across CLI tool restarts.

```typescript
const store = new FileTokenStore('/path/to/tokens.json');
const oauth = new McpOAuthClient({ tokenStore: store, ... });
```