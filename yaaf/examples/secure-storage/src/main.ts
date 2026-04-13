/**
 * SecureStorage Example
 *
 * Demonstrates:
 *   - SecureStorage: AES-256-GCM encrypted key-value store
 *   - Three key derivation modes:
 *       1. Environment variable (YAAF_STORAGE_KEY) — recommended for prod
 *       2. Password-based (PBKDF2) — for user-specific secrets
 *       3. Machine-derived (hostname + username) — for local dev only
 *   - Store, retrieve, list, and delete secrets
 *   - Using SecureStorage to hold API credentials securely
 *
 * Run:
 *   npx tsx src/main.ts
 *
 *   # With an explicit key (most secure):
 *   YAAF_STORAGE_KEY=$(openssl rand -hex 32) npx tsx src/main.ts
 */

import { SecureStorage } from 'yaaf'

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${c.bold}${c.cyan}${title}${c.reset}`)
  console.log(`${c.dim}${'─'.repeat(50)}${c.reset}`)
}

function ok(msg: string) { console.log(`  ${c.green}✓${c.reset} ${msg}`) }
function info(msg: string) { console.log(`  ${c.dim}${msg}${c.reset}`) }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}🔑 SecureStorage Example${c.reset}`)
  console.log(`${c.dim}AES-256-GCM encrypted key-value store${c.reset}`)

  const storageDir = '/tmp/yaaf-example-storage'

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Environment-variable key (recommended for production)
  // ─────────────────────────────────────────────────────────────────────────
  section('1. Environment Key Mode (YAAF_STORAGE_KEY)')

  const store1 = new SecureStorage({
    namespace: 'my-agent-prod',
    dir: storageDir,               // dir (not storageDir)
    // Key comes from YAAF_STORAGE_KEY env var automatically
  })

  info(`Key source: ${process.env.YAAF_STORAGE_KEY ? 'YAAF_STORAGE_KEY env var' : 'machine-derived (dev mode)'}`)

  // Store secrets
  await store1.set('openai_api_key', 'sk-example-key-never-commit-real-keys')
  await store1.set('database_url', 'postgresql://user:password@localhost/mydb')
  await store1.set('webhook_secret', 'whsec_example_webhook_secret')
  ok('Stored 3 secrets')

  // Retrieve
  const apiKey = await store1.get('openai_api_key')
  ok(`Retrieved openai_api_key: ${apiKey?.slice(0, 15)}...`)

  // Check existence
  const hasDb = await store1.has('database_url')
  ok(`has("database_url") = ${hasDb}`)

  // List keys (method is .keys(), not .list())
  const keys = await store1.keys()
  ok(`keys(): [${keys.join(', ')}]`)

  // Delete
  await store1.delete('webhook_secret')
  const afterDelete = await store1.keys()
  ok(`After delete: [${afterDelete.join(', ')}]`)

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Password-based key (PBKDF2)
  // ─────────────────────────────────────────────────────────────────────────
  section('2. Password-Based Key Mode (PBKDF2)')

  const store2 = new SecureStorage({
    namespace: 'user-vault',
    dir: storageDir,
    masterPassword: 'my-super-secret-passphrase-123',  // masterPassword (not password)
    // PBKDF2: 100k iterations, SHA-256
  })
  info('Key derived from passphrase using PBKDF2 (100k iterations)')

  await store2.set('github_token', 'ghp_example_github_token')
  await store2.set('slack_token',  'xoxb-example-slack-token')
  ok('Stored 2 user-vault secrets')

  const github = await store2.get('github_token')
  ok(`Retrieved github_token: ${github?.slice(0, 10)}...`)

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Multiple namespaces — each is isolated
  // ─────────────────────────────────────────────────────────────────────────
  section('3. Namespace Isolation')

  const storeA = new SecureStorage({ namespace: 'agent-a', dir: storageDir })
  const storeB = new SecureStorage({ namespace: 'agent-b', dir: storageDir })

  await storeA.set('secret', 'agent-a-value')
  await storeB.set('secret', 'agent-b-value')

  const aVal = await storeA.get('secret')
  const bVal = await storeB.get('secret')

  ok(`agent-a "secret" = "${aVal}"`)
  ok(`agent-b "secret" = "${bVal}"`)
  ok(`Namespaces are fully isolated (different encryption contexts)`)

  // ─────────────────────────────────────────────────────────────────────────
  // 4. require() — throws if key is missing (useful for startup validation)
  // ─────────────────────────────────────────────────────────────────────────
  section('4. require() — typed missing-key error')

  try {
    await store1.require('nonexistent_key')
  } catch (err) {
    ok(`require() threw for missing key: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Using SecureStorage with an Agent
  // ─────────────────────────────────────────────────────────────────────────
  section('5. Usage Pattern: Load Secrets at Agent Startup')

  const secrets = new SecureStorage({ namespace: 'agent-creds', dir: storageDir })

  // Store credentials once (e.g. during onboarding)
  await secrets.set('api_key', process.env.OPENAI_API_KEY ?? 'sk-placeholder')

  // Later: retrieve and pass to Agent
  const storedKey = await secrets.get('api_key')

  info('Pattern: store credentials encrypted, retrieve at agent init time')
  info(`Retrieved key at startup: ${storedKey ? '✓ found' : '✗ missing'}`)
  info('Pass to: new Agent({ apiKey: await secrets.get("api_key"), ... })')

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────
  section('Cleanup')
  await store1.clear()
  await store2.clear()
  await storeA.clear()
  await storeB.clear()
  await secrets.clear()
  ok('All storage cleared')

  console.log(`\n${c.dim}Storage files were in: ${storageDir}${c.reset}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
