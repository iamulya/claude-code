/**
 * Identity + Sessions Test Suite
 *
 * Tests the full identity resolution → session binding → server routing pipeline:
 *
 * - JWT verification (HMAC — fully testable without external keys)
 * - JWT claim mapping (userId, roles, attributes, nested paths)
 * - API Key identity provider (static + dynamic)
 * - Composite identity provider (fallback chain)
 * - Anonymous identity provider
 * - Session ownership (bind, canAccess, owner persistence)
 * - Server integration (identity + session routing, /sessions endpoints)
 * - IdentityAdapter plugin (PluginHost integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'

import {
  JwtIdentityProvider,
  ApiKeyIdentityProvider,
  CompositeIdentityProvider,
  AnonymousIdentityProvider,
  type JwtIdentityConfig,
  type ApiKeyIdentityConfig,
} from '../iam/providers.js'
import {
  verifyJwt,
  decodeJwt,
  JwtError,
} from '../iam/jwt.js'
import type { IncomingRequest, UserContext } from '../iam/types.js'
import { Session, listSessions } from '../session.js'
import { PluginHost, type IdentityAdapter, type PluginCapability } from '../plugin/types.js'
import { PluginBase } from '../plugin/base.js'

// ── Test Helpers ─────────────────────────────────────────────────────────────

const TEST_SECRET = 'super-secret-key-for-testing-only-32bytes!'

/**
 * Create a valid HMAC-SHA256 JWT for testing.
 * Uses Node.js crypto — no external libraries.
 */
function createTestJwt(
  payload: Record<string, unknown>,
  secret: string = TEST_SECRET,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): string {
  const encodeBase64Url = (data: string | Buffer): string => {
    const b64 = Buffer.from(data).toString('base64')
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerB64 = encodeBase64Url(JSON.stringify(header))
  const payloadB64 = encodeBase64Url(JSON.stringify(payload))
  const signatureInput = `${headerB64}.${payloadB64}`

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(signatureInput)
  const signature = encodeBase64Url(hmac.digest())

  return `${headerB64}.${payloadB64}.${signature}`
}

function makeRequest(headers: Record<string, string> = {}, query?: Record<string, string>): IncomingRequest {
  return { headers, query }
}

// Temp dir for session tests
let tmpDir: string

beforeEach(async () => {
  tmpDir = path.join(process.cwd(), '.yaaf', 'test-sessions-' + crypto.randomUUID().slice(0, 8))
  await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
  try { await fs.rm(tmpDir, { recursive: true, force: true }) } catch { /* ok */ }
})

// ── JWT Verification ─────────────────────────────────────────────────────────

describe('JWT verification', () => {
  it('verifies a valid HS256 token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({
      sub: 'user-123',
      name: 'Alice',
      iss: 'test-issuer',
      iat: now,
      exp: now + 3600,
    })

    const payload = await verifyJwt(token, TEST_SECRET, {
      algorithms: ['HS256'],
      issuer: 'test-issuer',
    })

    expect(payload.sub).toBe('user-123')
    expect(payload.name).toBe('Alice')
  })

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({
      sub: 'user-123',
      exp: now - 3600, // expired 1 hour ago
    })

    await expect(
      verifyJwt(token, TEST_SECRET, { algorithms: ['HS256'] }),
    ).rejects.toThrow('JWT expired')
  })

  it('rejects wrong issuer', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({
      sub: 'user-123',
      iss: 'wrong-issuer',
      exp: now + 3600,
    })

    await expect(
      verifyJwt(token, TEST_SECRET, {
        algorithms: ['HS256'],
        issuer: 'expected-issuer',
      }),
    ).rejects.toThrow('Issuer mismatch')
  })

  it('rejects wrong audience', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({
      sub: 'user-123',
      aud: 'wrong-audience',
      exp: now + 3600,
    })

    await expect(
      verifyJwt(token, TEST_SECRET, {
        algorithms: ['HS256'],
        audience: 'expected-audience',
      }),
    ).rejects.toThrow('Audience mismatch')
  })

  it('rejects a tampered token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({ sub: 'user-123', exp: now + 3600 })
    // Tamper with the payload
    const parts = token.split('.')
    parts[1] = Buffer.from(JSON.stringify({ sub: 'admin' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const tampered = parts.join('.')

    await expect(
      verifyJwt(tampered, TEST_SECRET, { algorithms: ['HS256'] }),
    ).rejects.toThrow('Invalid JWT signature')
  })

  it('rejects a wrong secret', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({ sub: 'user-123', exp: now + 3600 })

    await expect(
      verifyJwt(token, 'wrong-secret', { algorithms: ['HS256'] }),
    ).rejects.toThrow('Invalid JWT signature')
  })

  it('rejects disallowed algorithms', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({ sub: 'user-123', exp: now + 3600 })

    await expect(
      verifyJwt(token, TEST_SECRET, { algorithms: ['RS256'] }),
    ).rejects.toThrow('Algorithm "HS256" not allowed')
  })

  it('decodes without verification', () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createTestJwt({ sub: 'test', custom: 'data', exp: now + 100 })
    const { header, payload } = decodeJwt(token)

    expect(header.alg).toBe('HS256')
    expect(payload.sub).toBe('test')
    expect(payload.custom).toBe('data')
  })

  it('handles clock tolerance', async () => {
    const now = Math.floor(Date.now() / 1000)
    // Expired 10 seconds ago — within 30s default tolerance
    const token = createTestJwt({ sub: 'user-123', exp: now - 10 })

    const payload = await verifyJwt(token, TEST_SECRET, {
      algorithms: ['HS256'],
      clockToleranceSec: 30,
    })
    expect(payload.sub).toBe('user-123')
  })

  it('respects nbf (not before)', async () => {
    const now = Math.floor(Date.now() / 1000)
    // Valid in 1 hour — well outside tolerance
    const token = createTestJwt({ sub: 'user-123', nbf: now + 3600, exp: now + 7200 })

    await expect(
      verifyJwt(token, TEST_SECRET, { algorithms: ['HS256'] }),
    ).rejects.toThrow('JWT not yet valid')
  })
})

// ── JWT Identity Provider ────────────────────────────────────────────────────

describe('JwtIdentityProvider', () => {
  const now = Math.floor(Date.now() / 1000)

  const config: JwtIdentityConfig = {
    secret: TEST_SECRET,
    claims: {
      userId: 'sub',
      name: 'name',
      roles: 'roles',
      attributes: {
        tenantId: 'org_id',
        department: 'dept',
      },
    },
    algorithms: ['HS256'],
  }

  const provider = new JwtIdentityProvider(config)

  it('resolves identity from Bearer token', async () => {
    const token = createTestJwt({
      sub: 'alice-123',
      name: 'Alice Chen',
      roles: ['admin', 'editor'],
      org_id: 'acme-corp',
      dept: 'engineering',
      exp: now + 3600,
    })

    const user = await provider.resolve(
      makeRequest({ authorization: `Bearer ${token}` }),
    )

    expect(user).not.toBeNull()
    expect(user!.userId).toBe('alice-123')
    expect(user!.name).toBe('Alice Chen')
    expect(user!.roles).toEqual(['admin', 'editor'])
    expect(user!.attributes?.tenantId).toBe('acme-corp')
    expect(user!.attributes?.department).toBe('engineering')
  })

  it('propagates credentials by default', async () => {
    const token = createTestJwt({ sub: 'user-1', exp: now + 3600 })
    const user = await provider.resolve(
      makeRequest({ authorization: `Bearer ${token}` }),
    )

    expect(user!.credentials).toBeDefined()
    expect(user!.credentials!.type).toBe('bearer')
    expect(user!.credentials!.token).toBe(token)
  })

  it('returns null for missing token', async () => {
    const user = await provider.resolve(makeRequest({}))
    expect(user).toBeNull()
  })

  it('throws for invalid token (X-5: fail-closed)', async () => {
    await expect(
      provider.resolve(
        makeRequest({ authorization: 'Bearer invalid.token.here' }),
      ),
    ).rejects.toThrow()
  })

  it('throws for expired token (X-5: fail-closed)', async () => {
    const token = createTestJwt({ sub: 'user-1', exp: now - 3600 })
    await expect(
      provider.resolve(
        makeRequest({ authorization: `Bearer ${token}` }),
      ),
    ).rejects.toThrow('JWT expired')
  })

  it('reads from query parameter when configured', async () => {
    const configWithQuery: JwtIdentityConfig = {
      ...config,
      queryParam: 'token',
    }
    const provider2 = new JwtIdentityProvider(configWithQuery)
    const token = createTestJwt({ sub: 'bob', exp: now + 3600 })

    const user = await provider2.resolve(
      makeRequest({}, { token }),
    )
    expect(user!.userId).toBe('bob')
  })

  it('handles space-separated roles string', async () => {
    const token = createTestJwt({
      sub: 'user-1',
      roles: 'admin editor viewer',
      exp: now + 3600,
    })

    const user = await provider.resolve(
      makeRequest({ authorization: `Bearer ${token}` }),
    )
    expect(user!.roles).toEqual(['admin', 'editor', 'viewer'])
  })

  it('supports nested claim paths', async () => {
    const nestedConfig: JwtIdentityConfig = {
      secret: TEST_SECRET,
      algorithms: ['HS256'],
      claims: {
        userId: 'sub',
        roles: 'realm_access.roles',
      },
    }
    const provider3 = new JwtIdentityProvider(nestedConfig)
    const token = createTestJwt({
      sub: 'keycloak-user',
      realm_access: { roles: ['realm-admin', 'user'] },
      exp: now + 3600,
    })

    const user = await provider3.resolve(
      makeRequest({ authorization: `Bearer ${token}` }),
    )
    expect(user!.roles).toEqual(['realm-admin', 'user'])
  })

  it('rejects tokens with wrong issuer', async () => {
    const strictConfig: JwtIdentityConfig = {
      ...config,
      issuer: 'https://auth.example.com',
    }
    const strictProvider = new JwtIdentityProvider(strictConfig)
    const token = createTestJwt({
      sub: 'user-1',
      iss: 'https://evil.example.com',
      exp: now + 3600,
    })

    await expect(
      strictProvider.resolve(
        makeRequest({ authorization: `Bearer ${token}` }),
      ),
    ).rejects.toThrow('Issuer mismatch')
  })

  it('throws if no key source is provided', () => {
    expect(() => new JwtIdentityProvider({
      claims: { userId: 'sub' },
    } as JwtIdentityConfig)).toThrow('requires one of')
  })

  it('throws if multiple key sources are provided', () => {
    expect(() => new JwtIdentityProvider({
      secret: 'abc',
      publicKey: '-----BEGIN PUBLIC KEY-----',
      claims: { userId: 'sub' },
    })).toThrow('provide only one')
  })
})

// ── API Key Identity Provider ────────────────────────────────────────────────

describe('ApiKeyIdentityProvider', () => {
  it('resolves from static key map', async () => {
    const provider = new ApiKeyIdentityProvider({
      keys: {
        'sk-prod-abc': { userId: 'alice', roles: ['admin'] },
        'sk-dev-xyz': { userId: 'bob', roles: ['viewer'] },
      },
    })

    const user = await provider.resolve(
      makeRequest({ authorization: 'Bearer sk-prod-abc' }),
    )
    expect(user!.userId).toBe('alice')
    expect(user!.roles).toEqual(['admin'])
  })

  it('resolves from X-API-Key header', async () => {
    const provider = new ApiKeyIdentityProvider({
      keys: { 'my-key': { userId: 'test-user' } },
    })

    const user = await provider.resolve(
      makeRequest({ 'x-api-key': 'my-key' }),
    )
    expect(user!.userId).toBe('test-user')
  })

  it('resolves from dynamic resolver', async () => {
    const resolver = vi.fn().mockResolvedValue({
      userId: 'dynamic-user',
      roles: ['custom'],
    })

    const provider = new ApiKeyIdentityProvider({ resolve: resolver })

    const user = await provider.resolve(
      makeRequest({ authorization: 'Bearer dynamic-key-123' }),
    )
    expect(user!.userId).toBe('dynamic-user')
    expect(resolver).toHaveBeenCalledWith('dynamic-key-123')
  })

  it('tries static first, then dynamic', async () => {
    const resolver = vi.fn().mockResolvedValue({ userId: 'fallback' })

    const provider = new ApiKeyIdentityProvider({
      keys: { 'known-key': { userId: 'static-user' } },
      resolve: resolver,
    })

    // Known key — static lookup, no resolver call
    const user1 = await provider.resolve(
      makeRequest({ authorization: 'Bearer known-key' }),
    )
    expect(user1!.userId).toBe('static-user')
    expect(resolver).not.toHaveBeenCalled()

    // Unknown key — falls through to resolver
    const user2 = await provider.resolve(
      makeRequest({ authorization: 'Bearer unknown-key' }),
    )
    expect(user2!.userId).toBe('fallback')
    expect(resolver).toHaveBeenCalledWith('unknown-key')
  })

  it('returns null for unknown keys', async () => {
    const provider = new ApiKeyIdentityProvider({
      keys: { 'valid-key': { userId: 'alice' } },
    })

    const user = await provider.resolve(
      makeRequest({ authorization: 'Bearer invalid-key' }),
    )
    expect(user).toBeNull()
  })

  it('returns null for missing key', async () => {
    const provider = new ApiKeyIdentityProvider({
      keys: { 'key': { userId: 'user' } },
    })

    const user = await provider.resolve(makeRequest({}))
    expect(user).toBeNull()
  })

  it('reads from custom header', async () => {
    const provider = new ApiKeyIdentityProvider({
      keys: { 'custom-key': { userId: 'custom-user' } },
      header: 'x-custom-auth',
    })

    const user = await provider.resolve(
      makeRequest({ 'x-custom-auth': 'custom-key' }),
    )
    expect(user!.userId).toBe('custom-user')
  })
})

// ── Composite Identity Provider ──────────────────────────────────────────────

describe('CompositeIdentityProvider', () => {
  it('tries providers in order — first match wins', async () => {
    const now = Math.floor(Date.now() / 1000)
    const jwtProvider = new JwtIdentityProvider({
      secret: TEST_SECRET,
      algorithms: ['HS256'],
      claims: { userId: 'sub' },
    })
    const apiKeyProvider = new ApiKeyIdentityProvider({
      keys: { 'fallback-key': { userId: 'api-user' } },
    })

    const composite = new CompositeIdentityProvider([jwtProvider, apiKeyProvider])

    // JWT is tried first and succeeds
    const token = createTestJwt({ sub: 'jwt-user', exp: now + 3600 })
    const user1 = await composite.resolve(
      makeRequest({ authorization: `Bearer ${token}` }),
    )
    expect(user1!.userId).toBe('jwt-user')

    // API key is used when JWT fails
    const user2 = await composite.resolve(
      makeRequest({ 'x-api-key': 'fallback-key' }),
    )
    expect(user2!.userId).toBe('api-user')
  })

  it('returns null when all providers fail', async () => {
    const apiKeyProvider = new ApiKeyIdentityProvider({
      keys: { 'valid': { userId: 'user' } },
    })

    const composite = new CompositeIdentityProvider([apiKeyProvider])
    const user = await composite.resolve(makeRequest({}))
    expect(user).toBeNull()
  })

  it('collects errors from providers but still tries fallback (X-6)', async () => {
    const throwingProvider = {
      name: 'broken',
      resolve: async () => { throw new Error('connection refused') },
    }
    const fallback = new ApiKeyIdentityProvider({
      keys: { 'key': { userId: 'fallback' } },
    })

    // With allowAnonymous: false (default), if the throwing provider throws
    // and the next provider returns null (no matching key), the composite
    // propagates the error. But if the fallback succeeds, it returns the result.
    const composite = new CompositeIdentityProvider([throwingProvider, fallback])
    const user = await composite.resolve(
      makeRequest({ 'x-api-key': 'key' }),
    )
    expect(user!.userId).toBe('fallback')
  })
})

// ── Anonymous Identity Provider ──────────────────────────────────────────────

describe('AnonymousIdentityProvider', () => {
  it('always returns a user context', async () => {
    const provider = new AnonymousIdentityProvider()
    const user = await provider.resolve(makeRequest({}))

    expect(user.userId).toBe('anonymous')
    expect(user.roles).toEqual(['anonymous'])
  })

  it('accepts custom defaults', async () => {
    const provider = new AnonymousIdentityProvider({
      userId: 'guest',
      roles: ['guest'],
      attributes: { tier: 'free' },
    })
    const user = await provider.resolve(makeRequest({}))

    expect(user.userId).toBe('guest')
    expect(user.attributes?.tier).toBe('free')
  })
})

// ── Session Ownership ────────────────────────────────────────────────────────

describe('Session ownership', () => {
  it('creates an unbound session (no owner)', () => {
    const session = Session.create('test-1', tmpDir)
    expect(session.owner).toBeUndefined()
    expect(session.canAccess('anyone')).toBe(true)
  })

  it('binds a session to a user', () => {
    const session = Session.create('test-2', tmpDir)
    session.bind('alice')

    expect(session.owner).toBe('alice')
    expect(session.canAccess('alice')).toBe(true)
    expect(session.canAccess('bob')).toBe(false)
  })

  it('allows re-binding to the same user', () => {
    const session = Session.create('test-3', tmpDir)
    session.bind('alice')
    session.bind('alice') // no-op, same user
    expect(session.owner).toBe('alice')
  })

  it('throws when binding to a different user', () => {
    const session = Session.create('test-4', tmpDir)
    session.bind('alice')

    expect(() => session.bind('bob')).toThrow('owned by "alice"')
  })

  it('persists owner to JSONL and restores on resume', async () => {
    // Create and bind
    const session1 = Session.create('owner-test', tmpDir)
    session1.bind('alice')
    await session1.append([{ role: 'user', content: 'hello' }])

    // Resume and check
    const session2 = await Session.resume('owner-test', tmpDir)
    expect(session2.owner).toBe('alice')
    expect(session2.canAccess('alice')).toBe(true)
    expect(session2.canAccess('bob')).toBe(false)
    expect(session2.messageCount).toBe(1)
  })

  it('unbound sessions remain accessible after resume', async () => {
    const session1 = Session.create('unbound-test', tmpDir)
    await session1.append([{ role: 'user', content: 'hi' }])

    const session2 = await Session.resume('unbound-test', tmpDir)
    expect(session2.owner).toBeUndefined()
    expect(session2.canAccess('anyone')).toBe(true)
  })
})

// ── Session CRUD ─────────────────────────────────────────────────────────────

describe('Session CRUD', () => {
  it('creates, appends, and resumes', async () => {
    const session = Session.create('crud-1', tmpDir)
    await session.append([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '4' },
    ])

    const resumed = await Session.resume('crud-1', tmpDir)
    expect(resumed.messageCount).toBe(2)
    expect(resumed.getMessages()[0]!.content).toBe('What is 2+2?')
  })

  it('resumeOrCreate creates new if not found', async () => {
    const session = await Session.resumeOrCreate('new-session', tmpDir)
    expect(session.id).toBe('new-session')
    expect(session.messageCount).toBe(0)
  })

  it('resumeOrCreate resumes if found', async () => {
    const orig = Session.create('existing-session', tmpDir)
    await orig.append([{ role: 'user', content: 'hi' }])

    const resumed = await Session.resumeOrCreate('existing-session', tmpDir)
    expect(resumed.messageCount).toBe(1)
  })

  it('lists sessions', async () => {
    await Session.create('list-a', tmpDir).append([{ role: 'user', content: 'a' }])
    await Session.create('list-b', tmpDir).append([{ role: 'user', content: 'b' }])

    const sessions = await listSessions(tmpDir)
    expect(sessions).toContain('list-a')
    expect(sessions).toContain('list-b')
  })

  it('deletes a session', async () => {
    const session = Session.create('to-delete', tmpDir)
    await session.append([{ role: 'user', content: 'bye' }])

    await session.delete()

    const sessions = await listSessions(tmpDir)
    expect(sessions).not.toContain('to-delete')
  })
})

// ── IdentityAdapter Plugin ───────────────────────────────────────────────────

describe('IdentityAdapter plugin', () => {
  class TestIdentityPlugin extends PluginBase implements IdentityAdapter {
    readonly name = 'test-identity'
    readonly version = '1.0.0'
    readonly capabilities = ['identity'] as const

    async resolve(request: IncomingRequest): Promise<UserContext | null> {
      const key = request.headers['x-api-key']
      if (key === 'valid-key') {
        return { userId: 'plugin-user', roles: ['admin'] }
      }
      return null
    }
  }

  it('registers with PluginHost', async () => {
    const host = new PluginHost()
    await host.register(new TestIdentityPlugin())

    expect(host.hasCapability('identity' as PluginCapability)).toBe(true)
  })

  it('is discoverable via getIdentityAdapter()', async () => {
    const host = new PluginHost()
    const plugin = new TestIdentityPlugin()
    await host.register(plugin)

    const adapter = host.getIdentityAdapter()
    expect(adapter).not.toBeNull()
    expect(adapter!.name).toBe('test-identity')
  })

  it('resolves identity through the plugin', async () => {
    const host = new PluginHost()
    await host.register(new TestIdentityPlugin())

    const adapter = host.getIdentityAdapter()!
    const user = await adapter.resolve({ headers: { 'x-api-key': 'valid-key' } })
    expect(user!.userId).toBe('plugin-user')

    const noUser = await adapter.resolve({ headers: {} })
    expect(noUser).toBeNull()
  })

  it('returns null when no identity plugin is registered', () => {
    const host = new PluginHost()
    expect(host.getIdentityAdapter()).toBeNull()
  })
})

// ── Server Integration (Identity + Sessions) ────────────────────────────────

import { createServer, type ServerHandle } from '../runtime/server.js'

describe('Server with identity + sessions', () => {
  let server: ServerHandle | undefined

  const echoAgent = {
    run: async (input: string) => `Echo: ${input}`,
  }

  // Use random high ports to avoid conflicts
  let nextPort = 19100 + Math.floor(Math.random() * 900)
  const getPort = () => nextPort++

  afterEach(async () => {
    if (server) {
      await server.close().catch(() => {})
      server = undefined
    }
  })

  it('authenticates with API key and returns session_id', async () => {
    const port = getPort()
    server = createServer(echoAgent, {
      port,
      identityProvider: new ApiKeyIdentityProvider({
        keys: { 'test-key': { userId: 'alice', roles: ['admin'] } },
      }),
      sessions: { dir: tmpDir },
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    const res = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key',
      },
      body: JSON.stringify({ message: 'hello' }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.response).toBe('Echo: hello')
    expect(data.session_id).toBeDefined()
    expect(typeof data.session_id).toBe('string')
  })

  it('returns 401 for unauthenticated requests', async () => {
    const port = getPort()
    server = createServer(echoAgent, {
      port,
      identityProvider: new ApiKeyIdentityProvider({
        keys: { 'valid': { userId: 'alice' } },
      }),
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    const res = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })

    expect(res.status).toBe(401)
  })

  it('resumes a session with session_id', async () => {
    const port = getPort()
    server = createServer(echoAgent, {
      port,
      sessions: { dir: tmpDir },
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    // First request — creates session
    const res1 = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'first' }),
    })
    const data1 = await res1.json()
    const sessionId = data1.session_id

    // Second request — resumes session
    const res2 = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'second', session_id: sessionId }),
    })
    const data2 = await res2.json()
    expect(data2.session_id).toBe(sessionId)

    // Verify session has both turns
    const session = await Session.resume(sessionId, tmpDir)
    expect(session.messageCount).toBe(4) // 2 user + 2 assistant
  })

  it('lists sessions via GET /sessions', async () => {
    // Pre-create a session
    const pre = Session.create('list-test-1', tmpDir)
    await pre.append([{ role: 'user', content: 'hi' }])

    const port = getPort()
    server = createServer(echoAgent, {
      port,
      sessions: { dir: tmpDir },
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    const res = await fetch(`http://localhost:${port}/sessions`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sessions).toContain('list-test-1')
  })

  it('deletes a session via DELETE /sessions/:id', async () => {
    // Pre-create a session
    const pre = Session.create('delete-test-1', tmpDir)
    await pre.append([{ role: 'user', content: 'hi' }])

    const port = getPort()
    server = createServer(echoAgent, {
      port,
      sessions: { dir: tmpDir },
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    const res = await fetch(`http://localhost:${port}/sessions/delete-test-1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deleted).toBe('delete-test-1')

    // Verify it's gone
    const sessions = await listSessions(tmpDir)
    expect(sessions).not.toContain('delete-test-1')
  })

  it('works without identity or sessions (backward compatible)', async () => {
    const port = getPort()
    server = createServer(echoAgent, {
      port,
      onStart: () => {},
    })

    await new Promise(resolve => setTimeout(resolve, 150))

    const res = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.response).toBe('Echo: hello')
    expect(data.session_id).toBeUndefined()
  })
})
