---
export_name: FileTokenStore
source_file: src/integrations/mcpOAuth.ts
category: class
summary: A token storage implementation that persists OAuth tokens to disk for CLI tools and persistent sessions.
title: FileTokenStore
entity_type: api
stub: false
compiled_at: 2026-04-16T14:22:00.275Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/mcpOAuth.ts
confidence: 1
---

## Overview
`FileTokenStore` is a persistence provider for OAuth 2.0 credentials. It implements the `TokenStore` interface to save and retrieve authentication tokens from the local file system. 

This class is specifically designed for environments where authentication state must be maintained across process restarts, such as Command Line Interface (CLI) tools or persistent agent runtimes. By using `FileTokenStore`, an agent can reuse existing access tokens or use refresh tokens to obtain new ones without requiring the user to re-authenticate through a browser flow on every execution.

## Signature / Constructor

```typescript
export class FileTokenStore implements TokenStore {
  constructor(filePath: string)
}
```

### Parameters
*   `filePath`: The filesystem path where the token data should be stored (typically a `.json` file).

## Methods & Properties
`FileTokenStore` implements the standard `TokenStore` interface required by the OAuth client. It handles the serialization and deserialization of `OAuthTokens` objects to and from the specified file path.

## Examples

### Basic Usage with McpOAuthClient
This example demonstrates how to initialize a file-based store and provide it to an OAuth client to ensure tokens persist on disk.

```typescript
import { FileTokenStore, McpOAuthClient } from 'yaaf/integrations/mcpOAuth';

// Initialize the store with a path to a local JSON file
const store = new FileTokenStore('/tmp/mcp-tokens.json');

// Configure the OAuth client to use the file store
const oauth = new McpOAuthClient({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  tokenStore: store, // Tokens will be saved to /tmp/mcp-tokens.json
});
```

## See Also
*   `McpOAuthClient`
*   `OAuthTokens`

## Sources
*   `src/integrations/mcpOAuth.ts`