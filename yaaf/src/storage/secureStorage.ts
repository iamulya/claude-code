/**
 * SecureStorage — AES-256-GCM encrypted key-value store.
 *
 * Persists sensitive agent data (API keys, tokens, user secrets) encrypted
 * at rest. Each value is individually encrypted with a unique IV so
 * identical values produce different ciphertext.
 *
  * SecretService backend), but implemented with pure Node.js crypto so it works
 * cross-platform without native addon dependencies.
 *
 * ## Key derivation
 * The encryption key is derived from either:
 *  1. `YAAF_STORAGE_KEY` env var (hex string — use `openssl rand -hex 32`)
 *  2. `masterPassword` passed to the constructor
 *  3. A machine-stable key derived from hostname + username (dev-only, not for prod)
 *
 * @example
 * ```ts
 * const store = new SecureStorage({ namespace: 'my-agent' });
 *
 * await store.set('github_token', 'ghp_...');
 * const token = await store.get('github_token');
 *
 * // Inject into Agent tools
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   tools: createTools({ githubToken: await store.get('github_token') }),
 * });
 * ```
 */

import * as crypto from 'crypto'
import * as fsp from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32  // bytes
const IV_LENGTH = 12   // bytes (96-bit IV for GCM)
const TAG_LENGTH = 16  // bytes
const KDF_ITERATIONS = 100_000
const KDF_DIGEST = 'sha256'
const STORAGE_VERSION = 1

type EncryptedEntry = {
  v: number     // version
  iv: string    // hex
  tag: string   // hex
  data: string  // hex
}

type StorageFile = {
  version: number
  entries: Record<string, EncryptedEntry>
}

// ── SecureStorage ─────────────────────────────────────────────────────────────

export type SecureStorageConfig = {
  /**
   * Namespace for this store. Determines the file name:
   * `~/.yaaf/secure/<namespace>.enc.json`
   */
  namespace: string

  /**
   * Directory to store encrypted files.
   * Default: `~/.yaaf/secure/`
   */
  dir?: string

  /**
   * Master password used to derive the encryption key.
   * Overridden by `YAAF_STORAGE_KEY` env var.
   * If neither is provided, falls back to a machine-stable key (dev-only).
   */
  masterPassword?: string
}

export class SecureStorage {
  private readonly filePath: string
  private readonly key: Buffer
  private cache: Map<string, string> = new Map()
  private dirty = false

  constructor(config: SecureStorageConfig) {
    const dir = config.dir ?? path.join(os.homedir(), '.yaaf', 'secure')
    this.filePath = path.join(dir, `${config.namespace}.enc.json`)
    this.key = deriveKey(config.masterPassword)
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Get a stored value. Returns undefined if the key doesn't exist.
   */
  async get(key: string): Promise<string | undefined> {
    await this.ensureLoaded()
    return this.cache.get(key)
  }

  /**
   * Get a value or throw if not set.
   */
  async require(key: string): Promise<string> {
    const value = await this.get(key)
    if (value === undefined) throw new Error(`SecureStorage: key not found: "${key}"`)
    return value
  }

  /**
   * Store a value. Persisted immediately (encrypted).
   */
  async set(key: string, value: string): Promise<void> {
    await this.ensureLoaded()
    this.cache.set(key, value)
    this.dirty = true
    await this.persist()
  }

  /**
   * Delete a stored value.
   */
  async delete(key: string): Promise<boolean> {
    await this.ensureLoaded()
    const had = this.cache.delete(key)
    if (had) { this.dirty = true; await this.persist() }
    return had
  }

  /**
   * Check if a key exists.
   */
  async has(key: string): Promise<boolean> {
    await this.ensureLoaded()
    return this.cache.has(key)
  }

  /**
   * List all stored keys (values remain encrypted).
   */
  async keys(): Promise<string[]> {
    await this.ensureLoaded()
    return Array.from(this.cache.keys())
  }

  /**
   * Delete all entries for this namespace.
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.dirty = true
    await this.persist()
  }

  // ── Encryption ────────────────────────────────────────────────────────────

  private encrypt(plaintext: string): EncryptedEntry {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH })
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
      v: STORAGE_VERSION,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex'),
    }
  }

  private decrypt(entry: EncryptedEntry): string {
    const iv = Buffer.from(entry.iv, 'hex')
    const tag = Buffer.from(entry.tag, 'hex')
    const data = Buffer.from(entry.data, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH })
    decipher.setAuthTag(tag)
    return decipher.update(data).toString('utf8') + decipher.final('utf8')
  }

  // ── File I/O ──────────────────────────────────────────────────────────────

  private loaded = false

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    this.loaded = true

    let raw: string
    try {
      raw = await fsp.readFile(this.filePath, 'utf8')
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
      throw err
    }

    try {
      const file = JSON.parse(raw) as StorageFile
      for (const [key, entry] of Object.entries(file.entries ?? {})) {
        try {
          this.cache.set(key, this.decrypt(entry))
        } catch {
          // Individual entry corruption — skip, preserve others
        }
      }
    } catch {
      // Corrupt file — treat as empty
    }
  }

  private async persist(): Promise<void> {
    if (!this.dirty) return

    const file: StorageFile = {
      version: STORAGE_VERSION,
      entries: {},
    }

    for (const [key, value] of this.cache.entries()) {
      file.entries[key] = this.encrypt(value)
    }

    await fsp.mkdir(path.dirname(this.filePath), { recursive: true })
    // Atomic write: write to temp file, then rename
    const tmp = this.filePath + '.tmp'
    await fsp.writeFile(tmp, JSON.stringify(file, null, 2), { mode: 0o600 })
    await fsp.rename(tmp, this.filePath)
    this.dirty = false
  }
}

// ── Key derivation ────────────────────────────────────────────────────────────

function deriveKey(masterPassword?: string): Buffer {
  // Priority: env var > masterPassword > machine-stable (dev-only)
  const envKey = process.env.YAAF_STORAGE_KEY
  if (envKey) {
    const buf = Buffer.from(envKey, 'hex')
    if (buf.length !== KEY_LENGTH) {
      throw new Error(`YAAF_STORAGE_KEY must be ${KEY_LENGTH * 2} hex chars (use: openssl rand -hex 32)`)
    }
    return buf
  }

  const password = masterPassword ?? machinePassword()
  const salt = Buffer.from('yaaf-secure-storage-v1')
  return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, KDF_DIGEST)
}

function machinePassword(): string {
  // Deterministic but machine-specific — NOT secure for production.
  // Users should set YAAF_STORAGE_KEY for any real usage.
  const id = `${os.hostname()}:${os.userInfo().username}:yaaf-dev`
  if (process.env.NODE_ENV === 'production') {
    console.warn('[yaaf/secure] WARNING: using machine-derived key. Set YAAF_STORAGE_KEY for production.')
  }
  return id
}
