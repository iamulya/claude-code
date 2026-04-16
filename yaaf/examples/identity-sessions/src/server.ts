/**
 * Identity + Sessions E2E Demo Server
 *
 * Starts a YAAF agent server with:
 * - JWT authentication (HMAC HS256 — self-contained, no external IdP needed)
 * - API key fallback (for simpler testing)
 * - Server-side session management
 * - Session ownership (bound to authenticated user)
 *
 * Run:   npm start
 * Test:  npm test           (automated E2E test script)
 *        curl (see below)   (manual testing)
 *
 * ═══════════════════════════════════════════════════════════════════════
 * Quick curl cheatsheet:
 * ═══════════════════════════════════════════════════════════════════════
 *
 * # 1. Chat with API key (creates session)
 * curl -s http://localhost:4200/chat \
 *   -H "Content-Type: application/json" \
 *   -H "X-API-Key: sk-alice-admin" \
 *   -d '{"message":"Hello, who am I?"}' | jq
 *
 * # 2. Continue a session (paste session_id from step 1)
 * curl -s http://localhost:4200/chat \
 *   -H "Content-Type: application/json" \
 *   -H "X-API-Key: sk-alice-admin" \
 *   -d '{"message":"What did I just say?", "session_id":"<SESSION_ID>"}' | jq
 *
 * # 3. List your sessions
 * curl -s http://localhost:4200/sessions \
 *   -H "X-API-Key: sk-alice-admin" | jq
 *
 * # 4. Unauthenticated request → 401
 * curl -s http://localhost:4200/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"message":"Hello"}' | jq
 *
 * # 5. Chat with JWT (generate one with the test script)
 * curl -s http://localhost:4200/chat \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -d '{"message":"Hello from JWT!"}' | jq
 *
 * # 6. Bob cannot access Alice's session → 403
 * curl -s http://localhost:4200/chat \
 *   -H "Content-Type: application/json" \
 *   -H "X-API-Key: sk-bob-viewer" \
 *   -d '{"message":"Snoop", "session_id":"<ALICE_SESSION_ID>"}' | jq
 */

import * as crypto from 'crypto'
import {
  Agent,
  buildTool,
  JwtIdentityProvider,
  ApiKeyIdentityProvider,
  CompositeIdentityProvider,
  rbac,
  type UserContext,
} from 'yaaf'
import { createServer } from 'yaaf/server'

// ── Shared secret for JWT signing (in production, use RSA/JWKS) ─────────────

export const JWT_SECRET = 'yaaf-demo-jwt-secret-do-not-use-in-production!'

// ── Identity Providers ──────────────────────────────────────────────────────

const jwtProvider = new JwtIdentityProvider({
  secret: JWT_SECRET,
  algorithms: ['HS256'],
  issuer: 'yaaf-demo',
  claims: {
    userId: 'sub',
    name: 'name',
    roles: 'roles',
    attributes: {
      tenantId: 'tenant',
    },
  },
})

const apiKeyProvider = new ApiKeyIdentityProvider({
  keys: {
    'sk-alice-admin': {
      userId: 'alice',
      name: 'Alice Chen',
      roles: ['admin'],
      attributes: { tenantId: 'acme' },
    },
    'sk-bob-viewer': {
      userId: 'bob',
      name: 'Bob Smith',
      roles: ['viewer'],
      attributes: { tenantId: 'acme' },
    },
    'sk-eve-external': {
      userId: 'eve',
      name: 'Eve External',
      roles: ['viewer'],
      attributes: { tenantId: 'globex' },
    },
  },
})

// JWT first, then API key fallback
const identityProvider = new CompositeIdentityProvider([
  jwtProvider,
  apiKeyProvider,
])

// ── A simple echo agent with tools ──────────────────────────────────────────

const greetTool = buildTool({
  name: 'greet_user',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name to greet' },
    },
    required: ['name'],
  },
  maxResultChars: 1_000,
  describe: (input) => `Greet ${input.name}`,
  isReadOnly: () => true,
  async call(input) {
    return { data: { greeting: `Hello, ${input.name}! Welcome to the YAAF demo.` } }
  },
})

const currentTime = buildTool({
  name: 'current_time',
  inputSchema: { type: 'object', properties: {} },
  maxResultChars: 1_000,
  describe: () => 'Get the current server time',
  isReadOnly: () => true,
  async call() {
    return { data: { time: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }
  },
})

const agent = new Agent({
  name: 'YAAF Demo Agent',
  systemPrompt: `You are a helpful demo agent illustrating YAAF's identity and session features.
You have tools to greet users and check the time.
When users ask "who am I", tell them their userId and roles from the user context.
Be concise and friendly.`,
  tools: [greetTool, currentTime],
  accessPolicy: {
    authorization: rbac({
      viewer: ['current_time'],
      admin: ['greet_user', 'current_time'],
    }),
  },
})

// ── Start the server ────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '4200')

const server = createServer(agent, {
  port: PORT,
  name: 'YAAF Identity Demo',
  version: '1.0.0',
  model: 'echo',
  devUi: true,

  // ★ Identity + Sessions — the new features
  identityProvider,
  sessions: {
    ttlMs: 30 * 60_000, // 30 minute session TTL
  },

  onStart: (port) => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔐 YAAF Identity + Sessions Demo Server                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Server:    http://localhost:${port}                          ║
║  Dev UI:    http://localhost:${port}/                         ║
║  Health:    http://localhost:${port}/health                   ║
║                                                               ║
║  Auth: JWT (HS256) or API Key                                 ║
║                                                               ║
║  API Keys:                                                    ║
║    sk-alice-admin    → Alice (admin, acme)                     ║
║    sk-bob-viewer     → Bob (viewer, acme)                      ║
║    sk-eve-external   → Eve (viewer, globex)                    ║
║                                                               ║
║  Test it:                                                     ║
║    npm test                                                   ║
║    curl localhost:${port}/chat -H "X-API-Key: sk-alice-admin"  ║
║         -H "Content-Type: application/json"                   ║
║         -d '{"message":"hello"}'                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)
  },
})
