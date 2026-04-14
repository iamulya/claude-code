/**
 * MCP OAuth Example — Authenticated MCP Server Connections
 *
 * Demonstrates YAAF's OAuth 2.0 integration for MCP servers:
 *
 *   1. Authorization Code + PKCE flow (for user-interactive auth)
 *   2. Client Credentials flow (for machine-to-machine auth)
 *   3. Token persistence with FileTokenStore
 *   4. Token lifecycle management (check, refresh, clear)
 *   5. Local callback server for CLI OAuth flows
 *   6. Integration with McpPlugin for authenticated SSE connections
 *
 * This example uses a mock OAuth server to demonstrate the flows
 * without requiring real OAuth credentials. In production, you'd
 * replace the mock server with a real OAuth provider (GitHub, Google, etc.)
 *
 * Run:
 *   npx tsx src/index.ts
 *
 * No API keys required — this example is self-contained.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { McpOAuthClient, FileTokenStore } from 'yaaf'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { tmpdir } from 'os'

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'═'.repeat(62)}\n  ${title}\n${'═'.repeat(62)}`)
}

function section(title: string) {
  console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`)
}

// ── Mock OAuth Server ────────────────────────────────────────────────────────

/**
 * A minimal mock OAuth 2.0 server for demonstration.
 * Supports:
 *   - GET /authorize → redirects with authorization code
 *   - POST /token → issues access/refresh tokens
 *
 * In production, this would be GitHub, Google, Slack, etc.
 */
async function startMockOAuthServer(port: number) {
  const validCodes = new Map<string, string>() // code → state

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)

    // Authorization endpoint — simulates user granting access
    if (url.pathname === '/authorize' && req.method === 'GET') {
      const code = `mock_code_${randomUUID().slice(0, 8)}`
      const state = url.searchParams.get('state') ?? ''
      const redirectUri = url.searchParams.get('redirect_uri') ?? ''
      const clientId = url.searchParams.get('client_id') ?? ''

      validCodes.set(code, state)
      console.log(`    📝 OAuth: Authorization request from client "${clientId}"`)
      console.log(`       Scope: ${url.searchParams.get('scope') ?? '(none)'}`)
      console.log(`       PKCE:  ${url.searchParams.has('code_challenge') ? 'Yes (S256)' : 'No'}`)
      console.log(`       → Issuing code: ${code}`)

      // Auto-redirect (simulates user clicking "Approve")
      const redirectTo = `${redirectUri}?code=${code}&state=${state}`
      res.writeHead(302, { Location: redirectTo })
      res.end()
      return
    }

    // Token endpoint — issues tokens
    if (url.pathname === '/token' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: Buffer) => (body += chunk.toString()))
      req.on('end', () => {
        const params = new URLSearchParams(body)
        const grantType = params.get('grant_type') ?? ''

        console.log(`    🔑 OAuth: Token request (grant_type=${grantType})`)

        if (grantType === 'authorization_code') {
          const code = params.get('code') ?? ''
          if (!validCodes.has(code)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid or expired code' }))
            return
          }
          validCodes.delete(code)

          if (params.has('code_verifier')) {
            console.log(`       PKCE verifier: ${params.get('code_verifier')!.slice(0, 16)}...`)
          }
        }

        if (grantType === 'client_credentials') {
          const clientId = params.get('client_id') ?? ''
          console.log(`       Client: ${clientId}`)
        }

        // Issue tokens
        const accessToken = `mock_access_${randomUUID().slice(0, 12)}`
        const refreshToken = grantType !== 'client_credentials' ? `mock_refresh_${randomUUID().slice(0, 12)}` : undefined

        console.log(`       → Issued access token: ${accessToken.slice(0, 20)}...`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600, // 1 hour
          scope: params.get('scope') ?? 'read',
        }))
      })
      return
    }

    // Protected resource — requires Bearer token
    if (url.pathname === '/api/resource') {
      const auth = req.headers.authorization
      if (!auth?.startsWith('Bearer mock_access_')) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized — valid Bearer token required' }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        message: 'Authenticated! This is protected data.',
        token_used: auth.replace('Bearer ', '').slice(0, 20) + '...',
        timestamp: new Date().toISOString(),
      }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(port, () => {
      resolve({
        url: `http://localhost:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      })
    })
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('MCP OAuth: Authenticated Server Connections')
  console.log(`
  This demo shows how to use OAuth 2.0 to authenticate with MCP servers.
  A mock OAuth server simulates the token exchange without needing
  real credentials from GitHub, Google, etc.
  `)

  // Start mock OAuth server
  const oauthServer = await startMockOAuthServer(9876)
  console.log(`  Mock OAuth server at ${oauthServer.url}`)

  // ── 1. Client Credentials Flow (Machine-to-Machine) ──────────────────────
  section('Step 1: Client Credentials Flow (Machine-to-Machine)')

  console.log(`
  The client_credentials flow is for service accounts and backends.
  No user interaction needed — the app authenticates directly.
  `)

  const m2mClient = new McpOAuthClient({
    clientId: 'my-backend-service',
    clientSecret: 'service-secret-key',
    tokenUrl: `${oauthServer.url}/token`,
    grantType: 'client_credentials',
    scopes: ['mcp:tools', 'mcp:read'],
  })

  // Initially no tokens
  console.log(`  Has valid tokens: ${await m2mClient.hasValidTokens()}`)

  // Authenticate
  const m2mTokens = await m2mClient.authenticate()
  console.log(`\n  ✅ Authenticated!`)
  console.log(`     Access token:  ${m2mTokens.accessToken.slice(0, 20)}...`)
  console.log(`     Token type:    ${m2mTokens.tokenType}`)
  console.log(`     Expires at:    ${new Date(m2mTokens.expiresAt!).toLocaleTimeString()}`)
  console.log(`     Scope:         ${m2mTokens.scope}`)

  // Get headers for MCP
  const headers = await m2mClient.getHeaders()
  console.log(`\n  Headers for MCP: ${JSON.stringify(headers)}`)

  // Test the headers against a protected resource
  const protectedRes = await fetch(`${oauthServer.url}/api/resource`, { headers })
  const protectedData = await protectedRes.json() as any
  console.log(`\n  Protected API call: ${protectedData.message}`)

  // ── 2. Authorization Code + PKCE Flow ─────────────────────────────────────
  section('Step 2: Authorization Code + PKCE Flow')

  console.log(`
  The authorization_code flow is for user-interactive authentication.
  PKCE (Proof Key for Code Exchange) is enabled by default for security.
  `)

  const authCodeClient = new McpOAuthClient({
    clientId: 'my-cli-app',
    clientSecret: 'cli-secret',
    authorizationUrl: `${oauthServer.url}/authorize`,
    tokenUrl: `${oauthServer.url}/token`,
    scopes: ['repo', 'read:org'],
    redirectUri: 'http://localhost:9877/callback',
  })

  // Generate authorization URL
  const { url: authUrl, state, codeVerifier } = authCodeClient.getAuthorizationUrl()

  console.log(`  Authorization URL:`)
  console.log(`    ${authUrl}`)
  console.log(`\n  State:         ${state}`)
  console.log(`  PKCE verifier: ${codeVerifier!.slice(0, 20)}...`)
  console.log(`  PKCE enabled:  ✅ (S256 challenge in URL)`)

  // In a real CLI app, we'd open the browser and wait for callback.
  // For this demo, we simulate the flow by fetching the authorize URL
  // (which auto-redirects with a code) and extracting the code.

  console.log(`\n  Simulating user authorization flow...`)

  // Fetch the authorization URL — the mock server auto-redirects
  const authResponse = await fetch(authUrl, { redirect: 'manual' })
  const locationHeader = authResponse.headers.get('location')
  const callbackUrl = new URL(locationHeader!)
  const code = callbackUrl.searchParams.get('code')!
  const returnedState = callbackUrl.searchParams.get('state')!

  console.log(`  → Code received: ${code}`)
  console.log(`  → State matches: ${returnedState === state ? '✅' : '❌'}`)

  // Exchange code for tokens
  const tokens = await authCodeClient.exchangeCode(code, returnedState)
  console.log(`\n  ✅ Tokens acquired!`)
  console.log(`     Access token:  ${tokens.accessToken.slice(0, 20)}...`)
  console.log(`     Refresh token: ${tokens.refreshToken!.slice(0, 20)}...`)
  console.log(`     Expires in:    ~${Math.round((tokens.expiresAt! - Date.now()) / 1000)}s`)

  // ── 3. Token Persistence with FileTokenStore ──────────────────────────────
  section('Step 3: Token Persistence (FileTokenStore)')

  const tokenPath = join(tmpdir(), `yaaf-oauth-demo-${Date.now()}.json`)
  console.log(`\n  Token file: ${tokenPath}`)

  const fileStore = new FileTokenStore(tokenPath)

  // Create a client with file-based persistence
  const persistentClient = new McpOAuthClient({
    clientId: 'persistent-app',
    clientSecret: 'persistent-secret',
    tokenUrl: `${oauthServer.url}/token`,
    grantType: 'client_credentials',
    tokenStore: fileStore,
  })

  // Authenticate — tokens will be saved to disk
  await persistentClient.authenticate()
  console.log(`  ✅ Tokens saved to file`)

  // Create a NEW client instance with the same file store
  // to prove persistence works
  const restoredClient = new McpOAuthClient({
    clientId: 'persistent-app',
    clientSecret: 'persistent-secret',
    tokenUrl: `${oauthServer.url}/token`,
    grantType: 'client_credentials',
    tokenStore: new FileTokenStore(tokenPath), // New store, same file
  })

  const hasTokens = await restoredClient.hasValidTokens()
  console.log(`  New client has tokens from file: ${hasTokens ? '✅' : '❌'}`)

  const restoredToken = await restoredClient.getAccessToken()
  console.log(`  Restored access token: ${restoredToken.slice(0, 20)}...`)

  // Read the stored file
  const fs = await import('fs/promises')
  const storedData = await fs.readFile(tokenPath, 'utf-8')
  console.log(`\n  Token file contents:`)
  const parsed = JSON.parse(storedData)
  for (const [key, val] of Object.entries(parsed)) {
    const t = val as any
    console.log(`    "${key}":`)
    console.log(`      accessToken:  ${t.accessToken.slice(0, 20)}...`)
    console.log(`      expiresAt:    ${new Date(t.expiresAt).toLocaleTimeString()}`)
  }

  // Cleanup temp file
  await fs.unlink(tokenPath).catch(() => {})

  // ── 4. Token Lifecycle ────────────────────────────────────────────────────
  section('Step 4: Token Lifecycle Management')

  console.log(`\n  Token status:`)
  console.log(`    Has valid tokens:  ${await m2mClient.hasValidTokens()}`)

  const rawTokens = await m2mClient.getTokens()
  if (rawTokens) {
    console.log(`    Access token:      ${rawTokens.accessToken.slice(0, 20)}...`)
    console.log(`    Expires at:        ${rawTokens.expiresAt ? new Date(rawTokens.expiresAt).toLocaleTimeString() : 'never'}`)
    console.log(`    Is expired:        ${rawTokens.expiresAt ? (Date.now() >= rawTokens.expiresAt) : false}`)
  }

  // Clear tokens (logout)
  await m2mClient.clearTokens()
  console.log(`\n  After clearTokens():`)
  console.log(`    Has valid tokens:  ${await m2mClient.hasValidTokens()}`)

  // Re-authenticate
  await m2mClient.authenticate()
  console.log(`    Re-authenticated:  ${await m2mClient.hasValidTokens()}`)

  // ── 5. Integration with McpPlugin ─────────────────────────────────────────
  section('Step 5: MCP Integration Pattern')

  console.log(`
  Here's how you'd use McpOAuthClient with McpPlugin:

  \x1b[36m// 1. Client Credentials (backend / service account)
  const oauth = new McpOAuthClient({
    clientId: process.env.MCP_CLIENT_ID!,
    clientSecret: process.env.MCP_CLIENT_SECRET!,
    tokenUrl: 'https://auth.example.com/token',
    grantType: 'client_credentials',
    scopes: ['mcp:tools'],
  });
  await oauth.authenticate();

  const plugin = new McpPlugin({
    servers: [{
      name: 'secure-server',
      type: 'sse',
      url: 'https://mcp.example.com/sse',
      headers: await oauth.getHeaders(),
    }],
  });

  // 2. Authorization Code (CLI / user-facing app)
  const oauth = new McpOAuthClient({
    clientId: 'my-app',
    clientSecret: 'secret',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo'],
    tokenStore: new FileTokenStore('~/.yaaf/github-tokens.json'),
  });

  if (!(await oauth.hasValidTokens())) {
    const { url } = oauth.getAuthorizationUrl();
    console.log('Visit:', url);
    const { code, state } = await oauth.listenForCallback(9090);
    await oauth.exchangeCode(code, state);
  }

  const plugin = new McpPlugin({
    servers: [{
      name: 'github',
      type: 'sse',
      url: 'https://mcp.github.com',
      headers: await oauth.getHeaders(),
    }],
  });

  // 3. Quick helper (combines OAuth + MCP config)
  import { oauthMcpServer } from 'yaaf';

  const server = await oauthMcpServer({
    serverName: 'github',
    serverUrl: 'https://mcp.github.com',
    oauth: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      tokenUrl: 'https://github.com/login/oauth/access_token',
      grantType: 'client_credentials',
    },
  });
  const plugin = new McpPlugin({ servers: [server] });\x1b[0m
  `)

  // ── Summary ───────────────────────────────────────────────────────────────
  banner('✅ MCP OAuth Demo Complete!')
  console.log(`
  What we demonstrated:

  ┌─── OAuth 2.0 Flows ────────────────────────────────────────┐
  │  Client Credentials                                        │
  │  ├── Machine-to-machine authentication                    │
  │  └── No user interaction needed                           │
  │                                                            │
  │  Authorization Code + PKCE                                 │
  │  ├── Interactive user authentication                      │
  │  ├── PKCE auto-enabled (S256 challenge)                   │
  │  ├── State parameter validation                           │
  │  └── Local callback server for CLI apps                   │
  └────────────────────────────────────────────────────────────┘

  ┌─── Token Management ───────────────────────────────────────┐
  │  Storage                                                    │
  │  ├── InMemoryTokenStore (default, ephemeral)              │
  │  ├── FileTokenStore (persists across restarts)            │
  │  └── Custom TokenStore interface (Redis, DB, etc.)        │
  │                                                            │
  │  Lifecycle                                                  │
  │  ├── hasValidTokens() — check before API calls            │
  │  ├── getAccessToken() — auto-refresh if expired           │
  │  ├── getHeaders() — ready for MCP SSE config              │
  │  └── clearTokens() — logout / reset                       │
  └────────────────────────────────────────────────────────────┘

  ✓ Client Credentials flow (service accounts)
  ✓ Authorization Code + PKCE (user authentication)
  ✓ File-based token persistence
  ✓ Token restoration across client instances
  ✓ Token lifecycle (check, refresh, clear)
  ✓ Protected resource access with Bearer tokens
  ✓ MCP SSE integration pattern
  `)

  // Cleanup
  await oauthServer.close()
  console.log('  Mock OAuth server stopped. Done.\n')
  process.exit(0)
}

main().catch(console.error)
