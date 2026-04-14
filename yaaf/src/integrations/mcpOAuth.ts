/**
 * MCP OAuth — OAuth 2.0 authentication for MCP server connections.
 *
 * Many production MCP servers require OAuth 2.0 authentication (e.g., GitHub,
 * Google Drive, Slack). This module provides the OAuth flow so YAAF agents
 * can authenticate with these servers automatically.
 *
 * Supports:
 * - **Authorization Code + PKCE** — the recommended flow for server-side apps
 * - **Client Credentials** — for machine-to-machine authentication
 * - **Token Refresh** — automatic token refresh before expiration
 * - **Token Storage** — pluggable token persistence (memory, file, custom)
 * - **MCP Integration** — generates `headers` objects ready for `McpSseServer`
 *
 * @example
 * ```ts
 * // Authorization Code flow
 * const oauth = new McpOAuthClient({
 *   clientId: process.env.GITHUB_CLIENT_ID!,
 *   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *   authorizationUrl: 'https://github.com/login/oauth/authorize',
 *   tokenUrl: 'https://github.com/login/oauth/access_token',
 *   scopes: ['repo', 'read:org'],
 *   redirectUri: 'http://localhost:9090/callback',
 * });
 *
 * // Get the authorization URL — user visits this in a browser
 * const { url, state } = oauth.getAuthorizationUrl();
 *
 * // After user authorizes, exchange the code for tokens
 * await oauth.exchangeCode(code, state);
 *
 * // Get headers for MCP SSE server
 * const headers = await oauth.getHeaders();
 * // → { Authorization: 'Bearer gho_abc123...' }
 *
 * // Use with McpPlugin
 * const plugin = new McpPlugin({
 *   servers: [{
 *     name: 'github',
 *     type: 'sse',
 *     url: 'https://mcp.github.com',
 *     headers, // ← OAuth headers
 *   }],
 * });
 * ```
 *
 * @example
 * ```ts
 * // Client Credentials flow (machine-to-machine)
 * const oauth = new McpOAuthClient({
 *   clientId: 'my-app',
 *   clientSecret: 'secret',
 *   tokenUrl: 'https://auth.example.com/token',
 *   grantType: 'client_credentials',
 *   scopes: ['mcp:tools'],
 * });
 *
 * await oauth.authenticate();
 * const headers = await oauth.getHeaders();
 * ```
 *
 * @example
 * ```ts
 * // Local callback server (for CLI tools)
 * const oauth = new McpOAuthClient({ ... });
 * const { code, state } = await oauth.listenForCallback(9090);
 * await oauth.exchangeCode(code, state);
 * ```
 *
 * @module integrations/mcpOAuth
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomBytes, createHash } from 'crypto'

// ── Types ────────────────────────────────────────────────────────────────────

export type McpOAuthConfig = {
  /** OAuth client ID. */
  clientId: string
  /** OAuth client secret. */
  clientSecret?: string
  /** Authorization endpoint URL (for auth code flow). */
  authorizationUrl?: string
  /** Token endpoint URL. */
  tokenUrl: string
  /** OAuth scopes to request. */
  scopes?: string[]
  /** Redirect URI for auth code flow. Default: 'http://localhost:9090/callback'. */
  redirectUri?: string
  /** Grant type. Default: 'authorization_code'. */
  grantType?: 'authorization_code' | 'client_credentials'
  /** Use PKCE (Proof Key for Code Exchange). Default: true for auth code flows. */
  usePKCE?: boolean
  /** Custom token storage. Default: in-memory. */
  tokenStore?: TokenStore
  /** Additional parameters for the authorization request. */
  authParams?: Record<string, string>
  /** Additional parameters for the token request. */
  tokenParams?: Record<string, string>
  /** Refresh tokens before they expire, with this many seconds of buffer. Default: 300 (5 min). */
  refreshBufferSeconds?: number
}

export type OAuthTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // Epoch ms
  tokenType?: string
  scope?: string
}

/** Pluggable token persistence. */
export interface TokenStore {
  get(key: string): Promise<OAuthTokens | null>
  set(key: string, tokens: OAuthTokens): Promise<void>
  delete(key: string): Promise<void>
}

export type AuthorizationUrlResult = {
  url: string
  state: string
  codeVerifier?: string // For PKCE
}

export type CallbackResult = {
  code: string
  state: string
}

// ── In-Memory Token Store ────────────────────────────────────────────────────

class InMemoryTokenStore implements TokenStore {
  private readonly store = new Map<string, OAuthTokens>()

  async get(key: string): Promise<OAuthTokens | null> {
    return this.store.get(key) ?? null
  }
  async set(key: string, tokens: OAuthTokens): Promise<void> {
    this.store.set(key, tokens)
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// ── File-Based Token Store ──────────────────────────────────────────────────

/**
 * Persist tokens to disk (for CLI tools that need to survive restarts).
 *
 * @example
 * ```ts
 * const store = new FileTokenStore('/tmp/mcp-tokens.json');
 * const oauth = new McpOAuthClient({ tokenStore: store, ... });
 * ```
 */
export class FileTokenStore implements TokenStore {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async get(key: string): Promise<OAuthTokens | null> {
    try {
      const fs = await import('fs/promises')
      const data = await fs.readFile(this.filePath, 'utf-8')
      const store = JSON.parse(data) as Record<string, OAuthTokens>
      return store[key] ?? null
    } catch {
      return null
    }
  }

  async set(key: string, tokens: OAuthTokens): Promise<void> {
    const fs = await import('fs/promises')
    let store: Record<string, OAuthTokens> = {}
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      store = JSON.parse(data)
    } catch { /* file doesn't exist yet */ }
    store[key] = tokens
    await fs.writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8')
  }

  async delete(key: string): Promise<void> {
    const fs = await import('fs/promises')
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      const store = JSON.parse(data) as Record<string, OAuthTokens>
      delete store[key]
      await fs.writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8')
    } catch { /* ignore */ }
  }
}

// ── McpOAuthClient ──────────────────────────────────────────────────────────

/**
 * OAuth 2.0 client for MCP server authentication.
 *
 * Handles the full OAuth lifecycle: authorization URL generation,
 * code exchange, token storage, and automatic refresh.
 */
export class McpOAuthClient {
  private readonly config: Required<Omit<McpOAuthConfig, 'clientSecret' | 'authorizationUrl' | 'authParams' | 'tokenParams'>> & Pick<McpOAuthConfig, 'clientSecret' | 'authorizationUrl' | 'authParams' | 'tokenParams'>
  private readonly storeKey: string
  /** Cached PKCE verifier for the current auth flow. */
  private pendingCodeVerifier: string | null = null
  private pendingState: string | null = null

  constructor(config: McpOAuthConfig) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: config.authorizationUrl,
      tokenUrl: config.tokenUrl,
      scopes: config.scopes ?? [],
      redirectUri: config.redirectUri ?? 'http://localhost:9090/callback',
      grantType: config.grantType ?? 'authorization_code',
      usePKCE: config.usePKCE ?? (config.grantType !== 'client_credentials'),
      tokenStore: config.tokenStore ?? new InMemoryTokenStore(),
      authParams: config.authParams,
      tokenParams: config.tokenParams,
      refreshBufferSeconds: config.refreshBufferSeconds ?? 300,
    }
    // Unique key for token storage based on client + token URL
    this.storeKey = `oauth:${config.clientId}@${config.tokenUrl}`
  }

  // ── Authorization Code Flow ──────────────────────────────────────────

  /**
   * Generate the authorization URL for the user to visit.
   * Returns the URL, state parameter, and PKCE code verifier.
   */
  getAuthorizationUrl(): AuthorizationUrlResult {
    if (!this.config.authorizationUrl) {
      throw new Error('authorizationUrl is required for authorization code flow')
    }

    const state = randomBytes(16).toString('hex')
    this.pendingState = state

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state,
      ...(this.config.scopes.length ? { scope: this.config.scopes.join(' ') } : {}),
      ...(this.config.authParams ?? {}),
    })

    let codeVerifier: string | undefined

    if (this.config.usePKCE) {
      codeVerifier = randomBytes(32).toString('base64url')
      this.pendingCodeVerifier = codeVerifier
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url')
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    return {
      url: `${this.config.authorizationUrl}?${params.toString()}`,
      state,
      codeVerifier,
    }
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(code: string, state: string): Promise<OAuthTokens> {
    // Validate state
    if (this.pendingState && state !== this.pendingState) {
      throw new Error(`OAuth state mismatch: expected ${this.pendingState}, got ${state}`)
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      ...(this.config.tokenParams ?? {}),
    }

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret
    }

    if (this.pendingCodeVerifier) {
      body.code_verifier = this.pendingCodeVerifier
    }

    const tokens = await this.tokenRequest(body)
    await this.config.tokenStore.set(this.storeKey, tokens)

    this.pendingState = null
    this.pendingCodeVerifier = null

    return tokens
  }

  // ── Client Credentials Flow ──────────────────────────────────────────

  /**
   * Authenticate using client credentials (machine-to-machine).
   */
  async authenticate(): Promise<OAuthTokens> {
    if (this.config.grantType !== 'client_credentials') {
      throw new Error('authenticate() is only for client_credentials flow. Use getAuthorizationUrl() + exchangeCode() for auth code flow.')
    }

    if (!this.config.clientSecret) {
      throw new Error('clientSecret is required for client_credentials flow')
    }

    const body: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      ...(this.config.scopes.length ? { scope: this.config.scopes.join(' ') } : {}),
      ...(this.config.tokenParams ?? {}),
    }

    const tokens = await this.tokenRequest(body)
    await this.config.tokenStore.set(this.storeKey, tokens)
    return tokens
  }

  // ── Token Management ─────────────────────────────────────────────────

  /**
   * Get a valid access token, refreshing if needed.
   */
  async getAccessToken(): Promise<string> {
    let tokens = await this.config.tokenStore.get(this.storeKey)
    if (!tokens) {
      throw new Error('No tokens available. Call authenticate() or exchangeCode() first.')
    }

    // Check if token needs refresh
    if (this.isExpired(tokens)) {
      if (tokens.refreshToken) {
        tokens = await this.refreshTokens(tokens.refreshToken)
      } else if (this.config.grantType === 'client_credentials') {
        tokens = await this.authenticate()
      } else {
        throw new Error('Access token expired and no refresh token available. Re-authorize.')
      }
    }

    return tokens.accessToken
  }

  /**
   * Get HTTP headers ready for MCP SSE server configuration.
   *
   * @example
   * ```ts
   * const headers = await oauth.getHeaders();
   * // → { Authorization: 'Bearer abc123...' }
   * ```
   */
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken()
    return { Authorization: `Bearer ${token}` }
  }

  /**
   * Check if the client has valid (non-expired) tokens.
   */
  async hasValidTokens(): Promise<boolean> {
    const tokens = await this.config.tokenStore.get(this.storeKey)
    if (!tokens) return false
    return !this.isExpired(tokens) || !!tokens.refreshToken
  }

  /**
   * Clear stored tokens (logout).
   */
  async clearTokens(): Promise<void> {
    await this.config.tokenStore.delete(this.storeKey)
  }

  /**
   * Get the raw stored tokens.
   */
  async getTokens(): Promise<OAuthTokens | null> {
    return this.config.tokenStore.get(this.storeKey)
  }

  // ── Local Callback Server ────────────────────────────────────────────

  /**
   * Start a temporary local HTTP server to receive the OAuth callback.
   * Useful for CLI tools that need the authorization code flow.
   *
   * Returns a promise that resolves with the code and state when
   * the callback is received.
   *
   * @example
   * ```ts
   * const { url } = oauth.getAuthorizationUrl();
   * console.log('Visit:', url);
   * const { code, state } = await oauth.listenForCallback(9090);
   * await oauth.exchangeCode(code, state);
   * ```
   */
  listenForCallback(port?: number, timeoutMs = 120_000): Promise<CallbackResult> {
    const callbackPort = port ?? (parseInt(new URL(this.config.redirectUri).port) || 9090)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        server.close()
        reject(new Error(`OAuth callback timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://localhost:${callbackPort}`)

        if (url.pathname === '/callback' || url.pathname === new URL(this.config.redirectUri).pathname) {
          const code = url.searchParams.get('code')
          const state = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<h1>OAuth Error</h1><p>${error}</p><p>You can close this window.</p>`)
            clearTimeout(timer)
            server.close()
            reject(new Error(`OAuth error: ${error}`))
            return
          }

          if (code && state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<h1>Authentication Successful</h1><p>You can close this window and return to the terminal.</p>')
            clearTimeout(timer)
            server.close()
            resolve({ code, state })
            return
          }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      })

      server.listen(callbackPort, () => {
        // Server is listening, ready for callback
      })
    })
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken,
      ...(this.config.tokenParams ?? {}),
    }

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret
    }

    const tokens = await this.tokenRequest(body)
    // Preserve the refresh token if the server didn't return a new one
    if (!tokens.refreshToken) {
      tokens.refreshToken = refreshToken
    }
    await this.config.tokenStore.set(this.storeKey, tokens)
    return tokens
  }

  private async tokenRequest(body: Record<string, string>): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OAuth token request failed (${response.status}): ${text}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
      scope?: string
    }

    if (!data.access_token) {
      throw new Error('OAuth token response missing access_token')
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
      tokenType: data.token_type ?? 'Bearer',
      scope: data.scope,
    }
  }

  private isExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) return false // No expiration = never expires
    const buffer = this.config.refreshBufferSeconds * 1000
    return Date.now() >= tokens.expiresAt - buffer
  }
}

// ── Factory Helper ──────────────────────────────────────────────────────────

/**
 * Create an OAuth-authenticated MCP SSE server config.
 *
 * Combines OAuth token management with MCP server configuration.
 * Returns a config object ready to pass to `McpPlugin`.
 *
 * @example
 * ```ts
 * import { McpPlugin } from 'yaaf';
 * import { oauthMcpServer } from 'yaaf/integrations/mcpOAuth';
 *
 * const server = await oauthMcpServer({
 *   serverName: 'github',
 *   serverUrl: 'https://mcp.github.com',
 *   oauth: {
 *     clientId: process.env.GITHUB_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *     authorizationUrl: 'https://github.com/login/oauth/authorize',
 *     tokenUrl: 'https://github.com/login/oauth/access_token',
 *     scopes: ['repo'],
 *   },
 * });
 *
 * const plugin = new McpPlugin({ servers: [server] });
 * ```
 */
export async function oauthMcpServer(config: {
  serverName: string
  serverUrl: string
  oauth: McpOAuthConfig
}): Promise<{
  name: string
  type: 'sse'
  url: string
  headers: Record<string, string>
}> {
  const client = new McpOAuthClient(config.oauth)

  // Try to use existing tokens, or authenticate
  if (!(await client.hasValidTokens())) {
    if (config.oauth.grantType === 'client_credentials') {
      await client.authenticate()
    } else {
      throw new Error(
        `No valid tokens for "${config.serverName}". ` +
        'Call McpOAuthClient.getAuthorizationUrl() and exchangeCode() first, ' +
        'or use grantType: "client_credentials" for machine-to-machine auth.',
      )
    }
  }

  const headers = await client.getHeaders()

  return {
    name: config.serverName,
    type: 'sse' as const,
    url: config.serverUrl,
    headers,
  }
}
