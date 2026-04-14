/**
 * Tests for the three new features:
 * 1. A2A Protocol (Client + Server)
 * 2. Remote Sessions (WebSocket)
 * 3. MCP OAuth
 */

import { describe, it, expect, beforeEach, afterEach, vi , beforeAll, afterAll} from 'vitest'

// ── 1. A2A Protocol Tests ───────────────────────────────────────────────────

describe('A2A Protocol', () => {
  describe('A2AServer', () => {
    let server: any
    let handle: { url: string; port: number; close: () => Promise<void> }

    beforeAll(async () => {
      const { A2AServer } = await import('../integrations/a2a.js')
      const mockAgent = {
        async run(input: string) {
          return `Echo: ${input}`
        },
      }

      server = new A2AServer(mockAgent, {
        name: 'Test A2A Agent',
        description: 'A test agent',
        port: 0, // random port
        skills: [{ id: 'echo', name: 'Echo', description: 'Echoes input' }],
      })
    })

    afterAll(async () => {
      if (handle) await handle.close()
    })

    it('should generate a valid Agent Card', () => {
      const card = server.getAgentCard()
      expect(card.name).toBe('Test A2A Agent')
      expect(card.description).toBe('A test agent')
      expect(card.skills).toHaveLength(1)
      expect(card.skills![0].id).toBe('echo')
      expect(card.capabilities?.streaming).toBe(true)
      expect(card.capabilities?.stateTransitionHistory).toBe(true)
      expect(card.defaultInputModes).toContain('text')
      expect(card.defaultOutputModes).toContain('text')
    })

    it('should include auth scheme when tokens are configured', async () => {
      const { A2AServer } = await import('../integrations/a2a.js')
      const authServer = new A2AServer(
        { async run() { return 'ok' } },
        { name: 'Auth Agent', acceptedTokens: ['secret-token'] },
      )
      const card = authServer.getAgentCard()
      expect(card.authentication?.schemes).toBeDefined()
      expect(card.authentication!.schemes[0].scheme).toBe('bearer')
    })
  })

  describe('A2AClient', () => {
    it('should create a tool from the client', async () => {
      const { A2AClient } = await import('../integrations/a2a.js')
      const client = new A2AClient({
        url: 'https://example.com',
        token: 'test-token',
        timeoutMs: 5000,
      })

      const tool = client.asTool('my_test_tool')
      expect(tool.name).toBe('my_test_tool')
      expect(tool.inputSchema.properties).toHaveProperty('message')
      expect(tool.inputSchema.required).toContain('message')
    })

    it('should use correct auth headers', async () => {
      const { A2AClient } = await import('../integrations/a2a.js')

      // Test bearer token
      const bearerClient = new A2AClient({ url: 'https://x.com', token: 'bearer-test' })
      const bearerTool = bearerClient.asTool()
      expect(bearerTool.name).toMatch(/^a2a_/)

      // Test API key
      const apiKeyClient = new A2AClient({ url: 'https://x.com', apiKey: 'key-test' })
      const apiKeyTool = apiKeyClient.asTool()
      expect(apiKeyTool.name).toMatch(/^a2a_/)
    })
  })

  describe('a2aTool factory', () => {
    it('should create a tool from a URL', async () => {
      const { a2aTool } = await import('../integrations/a2a.js')
      const tool = a2aTool('https://agent.example.com', { token: 'test' })
      expect(tool.name).toMatch(/^a2a_/)
      expect(tool.inputSchema.required).toContain('message')
    })
  })

  describe('A2A Types', () => {
    it('should support all A2A part types', async () => {
      const { A2AClient } = await import('../integrations/a2a.js')

      // Verify types compile correctly
      const textPart: import('../integrations/a2a.js').A2APart = { text: 'hello' }
      const filePart: import('../integrations/a2a.js').A2APart = {
        type: 'file',
        file: { name: 'test.txt', mimeType: 'text/plain', data: 'base64data' },
      }
      const dataPart: import('../integrations/a2a.js').A2APart = {
        type: 'data',
        data: { key: 'value' },
      }

      expect(textPart).toBeDefined()
      expect(filePart).toBeDefined()
      expect(dataPart).toBeDefined()
    })
  })
})

// ── 2. Remote Sessions Tests ────────────────────────────────────────────────

describe('Remote Sessions', () => {
  describe('RemoteSessionServer', () => {
    it('should start and stop cleanly', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const mockAgent = { async run(input: string) { return `Reply: ${input}` } }

      const server = new RemoteSessionServer(mockAgent, {
        port: 0,
        name: 'test-remote',
        maxSessions: 5,
      })

      const handle = await server.start()
      expect(handle.url).toContain('http://')
      expect(handle.sessionCount()).toBe(0)
      expect(handle.sessions()).toEqual([])

      await handle.close()
    })

    it('should handle HTTP chat requests', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const mockAgent = { async run(input: string) { return `Hello, ${input}!` } }

      const server = new RemoteSessionServer(mockAgent, { port: 0 })
      const handle = await server.start()

      try {
        // Send a chat message via HTTP
        const response = await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'world' }),
        })

        expect(response.ok).toBe(true)
        const data = await response.json() as { sessionId: string; response: string }
        expect(data.response).toBe('Hello, world!')
        expect(data.sessionId).toBeDefined()
        expect(handle.sessionCount()).toBe(1)
      } finally {
        await handle.close()
      }
    })

    it('should provide health and info endpoints', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const mockAgent = { async run() { return 'ok' } }

      const server = new RemoteSessionServer(mockAgent, { port: 0, name: 'health-test' })
      const handle = await server.start()

      try {
        // Health check
        const healthRes = await fetch(`${handle.url}/health`)
        expect(healthRes.ok).toBe(true)
        const health = await healthRes.json() as { status: string; name: string }
        expect(health.status).toBe('ok')
        expect(health.name).toBe('health-test')

        // Info endpoint
        const infoRes = await fetch(`${handle.url}/info`)
        expect(infoRes.ok).toBe(true)
        const info = await infoRes.json() as { name: string; transport: string[] }
        expect(info.name).toBe('health-test')
        expect(info.transport).toContain('websocket')

        // Sessions list
        const sessionsRes = await fetch(`${handle.url}/sessions`)
        expect(sessionsRes.ok).toBe(true)
        const sessions = await sessionsRes.json() as { sessions: unknown[] }
        expect(sessions.sessions).toEqual([])
      } finally {
        await handle.close()
      }
    })

    it('should persist sessions across HTTP requests', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const callCount = { n: 0 }
      const mockAgent = { async run(input: string) { callCount.n++; return `Response #${callCount.n}` } }

      const server = new RemoteSessionServer(mockAgent, { port: 0 })
      const handle = await server.start()

      try {
        // First request — creates a session
        const res1 = await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello' }),
        })
        const data1 = await res1.json() as { sessionId: string; response: string }
        expect(data1.response).toBe('Response #1')
        const sessionId = data1.sessionId

        // Second request — reuses the session
        const res2 = await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'world', sessionId }),
        })
        const data2 = await res2.json() as { sessionId: string; response: string }
        expect(data2.sessionId).toBe(sessionId)
        expect(data2.response).toBe('Response #2')
        expect(handle.sessionCount()).toBe(1) // Same session
      } finally {
        await handle.close()
      }
    })

    it('should enforce max sessions', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const mockAgent = { async run() { return 'ok' } }

      const server = new RemoteSessionServer(mockAgent, { port: 0, maxSessions: 2 })
      const handle = await server.start()

      try {
        // Create 2 sessions (at max)
        await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'a' }),
        })
        await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'b' }),
        })
        expect(handle.sessionCount()).toBe(2)

        // Third should fail
        const res3 = await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'c' }),
        })
        expect(res3.status).toBe(503)
      } finally {
        await handle.close()
      }
    })

    it('should allow force-destroying sessions', async () => {
      const { RemoteSessionServer } = await import('../remote/sessions.js')
      const mockAgent = { async run() { return 'ok' } }

      const server = new RemoteSessionServer(mockAgent, { port: 0 })
      const handle = await server.start()

      try {
        const res = await fetch(`${handle.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello' }),
        })
        const data = await res.json() as { sessionId: string }
        expect(handle.sessionCount()).toBe(1)

        handle.destroySession(data.sessionId)
        expect(handle.sessionCount()).toBe(0)
      } finally {
        await handle.close()
      }
    })
  })

  describe('startRemoteServer factory', () => {
    it('should start a server with default config', async () => {
      const { startRemoteServer } = await import('../remote/sessions.js')
      const handle = await startRemoteServer(
        { async run() { return 'ok' } },
        { port: 0 },
      )
      expect(handle.url).toContain('http://')
      await handle.close()
    })
  })
})

// ── 3. MCP OAuth Tests ──────────────────────────────────────────────────────

describe('MCP OAuth', () => {
  describe('McpOAuthClient', () => {
    it('should generate a valid authorization URL', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: ['read', 'write'],
        redirectUri: 'http://localhost:9090/callback',
      })

      const result = client.getAuthorizationUrl()

      expect(result.url).toContain('https://auth.example.com/authorize')
      expect(result.url).toContain('client_id=test-client')
      expect(result.url).toContain('scope=read+write')
      expect(result.url).toContain('response_type=code')
      expect(result.url).toContain('redirect_uri=')
      expect(result.state).toBeTruthy()
      expect(result.state.length).toBeGreaterThan(10)

      // PKCE should be enabled by default
      expect(result.codeVerifier).toBeTruthy()
      expect(result.url).toContain('code_challenge=')
      expect(result.url).toContain('code_challenge_method=S256')
    })

    it('should generate auth URL without PKCE when disabled', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test-client',
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        usePKCE: false,
      })

      const result = client.getAuthorizationUrl()
      expect(result.codeVerifier).toBeUndefined()
      expect(result.url).not.toContain('code_challenge')
    })

    it('should throw when trying auth code flow without authorizationUrl', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        tokenUrl: 'https://auth.example.com/token',
      })

      expect(() => client.getAuthorizationUrl()).toThrow('authorizationUrl is required')
    })

    it('should validate state on code exchange', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
      })

      const { state } = client.getAuthorizationUrl()

      // Should reject wrong state
      await expect(
        client.exchangeCode('some-code', 'wrong-state'),
      ).rejects.toThrow('state mismatch')
    })

    it('should report no valid tokens initially', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        tokenUrl: 'https://auth.example.com/token',
        grantType: 'client_credentials',
        clientSecret: 'secret',
      })

      expect(await client.hasValidTokens()).toBe(false)
    })

    it('should throw when getting token without authentication', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        tokenUrl: 'https://auth.example.com/token',
      })

      await expect(client.getAccessToken()).rejects.toThrow('No tokens available')
    })

    it('should throw when using authenticate() with auth code flow', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        tokenUrl: 'https://auth.example.com/token',
        grantType: 'authorization_code',
      })

      await expect(client.authenticate()).rejects.toThrow('only for client_credentials')
    })

    it('should throw when client_credentials has no secret', async () => {
      const { McpOAuthClient } = await import('../integrations/mcpOAuth.js')

      const client = new McpOAuthClient({
        clientId: 'test',
        tokenUrl: 'https://auth.example.com/token',
        grantType: 'client_credentials',
      })

      await expect(client.authenticate()).rejects.toThrow('clientSecret is required')
    })
  })

  describe('FileTokenStore', () => {
    const testPath = '/tmp/yaaf-oauth-test-tokens.json'

    beforeEach(async () => {
      try {
        const fs = await import('fs/promises')
        await fs.unlink(testPath)
      } catch { /* may not exist */ }
    })

    afterEach(async () => {
      try {
        const fs = await import('fs/promises')
        await fs.unlink(testPath)
      } catch { /* ignore */ }
    })

    it('should persist and retrieve tokens', async () => {
      const { FileTokenStore } = await import('../integrations/mcpOAuth.js')
      const store = new FileTokenStore(testPath)

      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600_000,
      }

      await store.set('test-key', tokens)
      const retrieved = await store.get('test-key')
      expect(retrieved).toEqual(tokens)
    })

    it('should return null for non-existent keys', async () => {
      const { FileTokenStore } = await import('../integrations/mcpOAuth.js')
      const store = new FileTokenStore(testPath)

      const result = await store.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete tokens', async () => {
      const { FileTokenStore } = await import('../integrations/mcpOAuth.js')
      const store = new FileTokenStore(testPath)

      await store.set('key', { accessToken: 'token' })
      expect(await store.get('key')).toBeTruthy()

      await store.delete('key')
      expect(await store.get('key')).toBeNull()
    })
  })

  describe('oauthMcpServer', () => {
    it('should throw when no tokens are available for auth code flow', async () => {
      const { oauthMcpServer } = await import('../integrations/mcpOAuth.js')

      await expect(
        oauthMcpServer({
          serverName: 'test',
          serverUrl: 'https://mcp.example.com',
          oauth: {
            clientId: 'test',
            tokenUrl: 'https://auth.example.com/token',
          },
        }),
      ).rejects.toThrow('No valid tokens')
    })
  })
})
