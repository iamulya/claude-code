/**
 * JWT — Zero-dependency JSON Web Token verification.
 *
 * Uses Node.js built-in `crypto.subtle` (Web Crypto API, available since v20)
 * for signature verification. Supports:
 * - HMAC: HS256, HS384, HS512
 * - RSA:  RS256, RS384, RS512
 * - ECDSA: ES256, ES384, ES512
 *
 * Also includes a JWKS client with automatic key rotation and caching.
 *
 * No external dependencies (no `jsonwebtoken`, no `jose`).
 *
 * @module iam/jwt
 * @internal — consumed by JwtIdentityProvider, not exported from the public API.
 */

import * as crypto from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export type JwtHeader = {
  alg: string
  typ?: string
  kid?: string
}

export type JwtPayload = Record<string, unknown> & {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
}

export type JwtVerifyOptions = {
  /** Accepted algorithms (default: RS256, ES256) */
  algorithms?: string[]
  /** Expected issuer */
  issuer?: string
  /** Expected audience */
  audience?: string
  /** Clock tolerance in seconds (default: 30) */
  clockToleranceSec?: number
  /**
   * Require the `exp` claim. Default: true.
   * When true, tokens without an expiration are rejected.
   */
  requireExp?: boolean
}

/** A single key from a JWKS endpoint */
export type JwksKey = {
  kty: string
  kid?: string
  alg?: string
  use?: string
  n?: string   // RSA modulus
  e?: string   // RSA exponent
  x?: string   // EC x coordinate
  y?: string   // EC y coordinate
  crv?: string // EC curve
}

export type JwksResponse = {
  keys: JwksKey[]
}

// ── Algorithm → Web Crypto mapping ────────────────────────────────────────────

type AlgorithmMapping = {
  name: string
  hash?: string
  namedCurve?: string
}

const ALG_MAP: Record<string, AlgorithmMapping> = {
  HS256: { name: 'HMAC', hash: 'SHA-256' },
  HS384: { name: 'HMAC', hash: 'SHA-384' },
  HS512: { name: 'HMAC', hash: 'SHA-512' },
  RS256: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  RS384: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  RS512: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
  ES256: { name: 'ECDSA', hash: 'SHA-256', namedCurve: 'P-256' },
  ES384: { name: 'ECDSA', hash: 'SHA-384', namedCurve: 'P-384' },
  ES512: { name: 'ECDSA', hash: 'SHA-512', namedCurve: 'P-521' },
}

// ── Base64url ─────────────────────────────────────────────────────────────────

function base64urlDecode(input: string): Uint8Array {
  // Restore standard base64 padding
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const paddedLen = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  return Uint8Array.from(Buffer.from(paddedLen, 'base64'))
}

function base64urlDecodeString(input: string): string {
  return Buffer.from(base64urlDecode(input)).toString('utf8')
}

// ── JWT decode (no verification) ──────────────────────────────────────────────

export function decodeJwt(token: string): { header: JwtHeader; payload: JwtPayload } {
  const parts = token.split('.')
  if (parts.length !== 3) throw new JwtError('Invalid JWT: expected 3 parts')

  try {
    const header = JSON.parse(base64urlDecodeString(parts[0]!)) as JwtHeader
    const payload = JSON.parse(base64urlDecodeString(parts[1]!)) as JwtPayload
    return { header, payload }
  } catch (err) {
    throw new JwtError(`Invalid JWT encoding: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── JWT verify ────────────────────────────────────────────────────────────────

/**
 * Verify a JWT signature and validate claims.
 *
 * @param token — the raw JWT string (header.payload.signature)
 * @param keyMaterial — HMAC secret (string/Buffer) or PEM public key (string)
 * @param options — validation options (algorithms, issuer, audience, clock tolerance)
 * @returns The verified payload
 * @throws JwtError on invalid signature or failed claim validation
 */
export async function verifyJwt(
  token: string,
  keyMaterial: string | Buffer,
  options: JwtVerifyOptions = {},
): Promise<JwtPayload> {
  const { header, payload } = decodeJwt(token)
  const alg = header.alg

  // X-1 fix: explicitly reject 'none' algorithm before any other processing
  if (!alg || alg.toLowerCase() === 'none') {
    throw new JwtError('Algorithm "none" is not permitted — all JWTs must be signed')
  }

  // Check algorithm is allowed
  const allowedAlgs = options.algorithms ?? ['RS256', 'ES256']
  if (!allowedAlgs.includes(alg)) {
    throw new JwtError(`Algorithm "${alg}" not allowed. Allowed: ${allowedAlgs.join(', ')}`)
  }

  const mapping = ALG_MAP[alg]
  if (!mapping) throw new JwtError(`Unsupported algorithm: ${alg}`)

  // Split token for verification
  const parts = token.split('.')
  const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const signature = base64urlDecode(parts[2]!)

  // Import key and verify
  const cryptoKey = await importKey(keyMaterial, mapping, alg)
  const verifyAlgorithm = mapping.namedCurve
    ? { name: mapping.name, hash: mapping.hash }
    : { name: mapping.name }

  const valid = await crypto.subtle.verify(
    verifyAlgorithm,
    cryptoKey,
    signature,
    signatureInput,
  )

  if (!valid) throw new JwtError('Invalid JWT signature')

  // Validate claims
  validateClaims(payload, options)

  return payload
}

/**
 * Verify a JWT using a JWKS endpoint (auto-fetches and caches keys).
 */
export async function verifyJwtWithJwks(
  token: string,
  jwksUri: string,
  options: JwtVerifyOptions = {},
): Promise<JwtPayload> {
  const { header } = decodeJwt(token)
  const key = await fetchJwksKey(jwksUri, header.kid, header.alg)
  const pem = jwkToPem(key)
  return verifyJwt(token, pem, options)
}

// ── Key import ────────────────────────────────────────────────────────────────

async function importKey(
  keyMaterial: string | Buffer,
  mapping: AlgorithmMapping,
  alg: string,
) {
  const isHmac = alg.startsWith('HS')
  const isRsa = alg.startsWith('RS')
  const isEc = alg.startsWith('ES')

  if (isHmac) {
    const keyData = typeof keyMaterial === 'string'
      ? new TextEncoder().encode(keyMaterial)
      : keyMaterial
    return crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: mapping.hash! },
      false,
      ['verify'],
    )
  }

  // RSA or EC — expect PEM public key
  const pemStr = typeof keyMaterial === 'string' ? keyMaterial : keyMaterial.toString('utf8')
  const pemBinary = pemToBinary(pemStr)

  if (isRsa) {
    return crypto.subtle.importKey(
      'spki',
      pemBinary,
      { name: mapping.name, hash: mapping.hash! },
      false,
      ['verify'],
    )
  }

  if (isEc) {
    return crypto.subtle.importKey(
      'spki',
      pemBinary,
      { name: mapping.name, namedCurve: mapping.namedCurve! },
      false,
      ['verify'],
    )
  }

  throw new JwtError(`Cannot import key for algorithm: ${alg}`)
}

function pemToBinary(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '')
  return Buffer.from(lines, 'base64').buffer
}

// ── Claim validation ──────────────────────────────────────────────────────────

function validateClaims(payload: JwtPayload, options: JwtVerifyOptions): void {
  const now = Math.floor(Date.now() / 1000)
  const tolerance = options.clockToleranceSec ?? 30
  const requireExp = options.requireExp ?? true

  // X-2 fix: reject tokens without expiration by default
  if (requireExp && payload.exp === undefined) {
    throw new JwtError('JWT missing required "exp" claim — tokens must have an expiration')
  }

  // Expiration
  if (payload.exp !== undefined) {
    if (now > payload.exp + tolerance) {
      throw new JwtError('JWT expired')
    }
  }

  // Not Before
  if (payload.nbf !== undefined) {
    if (now < payload.nbf - tolerance) {
      throw new JwtError('JWT not yet valid (nbf)')
    }
  }

  // Issuer
  if (options.issuer !== undefined) {
    if (payload.iss !== options.issuer) {
      throw new JwtError(`Issuer mismatch: expected "${options.issuer}", got "${payload.iss}"`)
    }
  }

  // Audience
  if (options.audience !== undefined) {
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!audList.includes(options.audience)) {
      throw new JwtError(`Audience mismatch: expected "${options.audience}"`)
    }
  }
}

// ── JWKS client ───────────────────────────────────────────────────────────────

type JwksCache = {
  keys: JwksKey[]
  fetchedAt: number
}

/**
 * H5 FIX: JWKS client with per-instance cache instead of a global singleton.
 *
 * Fixes:
 * - Cache is now per-client, not shared across all Agent instances
 * - Max cache size prevents unbounded memory growth (default: 100 URIs)
 * - Per-URI invalidation via `invalidate(uri)` instead of global clear
 * - Cache poisoning is limited to the specific URI, not all cached keys
 */
export class JwksClient {
  private readonly cache = new Map<string, JwksCache>()
  private readonly cacheTtlMs: number
  private readonly maxCacheSize: number

  constructor(options?: { cacheTtlMs?: number; maxCacheSize?: number }) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 10 * 60 * 1000  // 10 minutes
    this.maxCacheSize = options?.maxCacheSize ?? 100
  }

  /**
   * Fetch a specific key from a JWKS endpoint.
   * Caches the full keyset per URI; retries on cache miss (key rotation).
   */
  async fetchKey(
    jwksUri: string,
    kid?: string,
    alg?: string,
  ): Promise<JwksKey> {
    let cached = this.cache.get(jwksUri)

    // Try cache first
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      const key = findKey(cached.keys, kid, alg)
      if (key) return key
    }

    // Cache miss or stale — fetch fresh
    const response = await fetch(jwksUri)
    if (!response.ok) {
      // H5 FIX: On fetch failure, invalidate only this URI (not everything)
      this.cache.delete(jwksUri)
      throw new JwtError(`JWKS fetch failed: ${response.status} ${response.statusText}`)
    }
    const jwks = (await response.json()) as JwksResponse
    cached = { keys: jwks.keys, fetchedAt: Date.now() }

    // H5 FIX: Evict oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(jwksUri, cached)

    const key = findKey(cached.keys, kid, alg)
    if (!key) {
      throw new JwtError(
        kid
          ? `No matching key in JWKS for kid="${kid}"${alg ? `, alg="${alg}"` : ''}`
          : `No matching key in JWKS${alg ? ` for alg="${alg}"` : ''}`,
      )
    }
    return key
  }

  /** Invalidate cache for a specific URI. */
  invalidate(jwksUri: string): void {
    this.cache.delete(jwksUri)
  }

  /** Clear all cached keys. */
  clearAll(): void {
    this.cache.clear()
  }

  /** Number of cached URIs. */
  get size(): number {
    return this.cache.size
  }
}

/**
 * H5 FIX: Default shared JWKS client for backward compatibility.
 * New code should create per-agent `JwksClient` instances.
 * @internal
 */
const defaultJwksClient = new JwksClient()

/**
 * Fetch a specific key from a JWKS endpoint using the default shared client.
 * @deprecated Use `new JwksClient()` for per-agent isolation.
 */
async function fetchJwksKey(
  jwksUri: string,
  kid?: string,
  alg?: string,
): Promise<JwksKey> {
  return defaultJwksClient.fetchKey(jwksUri, kid, alg)
}

function findKey(keys: JwksKey[], kid?: string, alg?: string): JwksKey | undefined {
  return keys.find(k => {
    if (kid && k.kid !== kid) return false
    if (alg && k.alg && k.alg !== alg) return false
    if (k.use && k.use !== 'sig') return false
    return true
  })
}

// ── JWK → PEM conversion ─────────────────────────────────────────────────────

/**
 * Convert a JWK key to PEM format for `crypto.subtle.importKey('spki', ...)`.
 */
export function jwkToPem(jwk: JwksKey): string {
  if (jwk.kty === 'RSA') return rsaJwkToPem(jwk)
  if (jwk.kty === 'EC') return ecJwkToPem(jwk)
  throw new JwtError(`Unsupported JWK key type: ${jwk.kty}`)
}

function rsaJwkToPem(jwk: JwksKey): string {
  if (!jwk.n || !jwk.e) throw new JwtError('RSA JWK missing n or e')

  const n = base64urlDecode(jwk.n)
  const e = base64urlDecode(jwk.e)

  // Build ASN.1 DER for RSA public key (SPKI format)
  const nBytes = encodeUnsignedInteger(n)
  const eBytes = encodeUnsignedInteger(e)

  // RSAPublicKey ::= SEQUENCE { modulus INTEGER, publicExponent INTEGER }
  const rsaKey = encodeSequence(Buffer.concat([nBytes, eBytes]))

  // Wrap in BIT STRING
  const bitString = encodeBitString(rsaKey)

  // AlgorithmIdentifier for RSA
  // OID 1.2.840.113549.1.1.1 (rsaEncryption) + NULL
  const rsaOid = Buffer.from([
    0x30, 0x0d, // SEQUENCE
    0x06, 0x09, // OID
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // 1.2.840.113549.1.1.1
    0x05, 0x00, // NULL
  ])

  const spki = encodeSequence(Buffer.concat([rsaOid, bitString]))

  return `-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`
}

function ecJwkToPem(jwk: JwksKey): string {
  if (!jwk.x || !jwk.y || !jwk.crv) throw new JwtError('EC JWK missing x, y, or crv')

  const x = base64urlDecode(jwk.x)
  const y = base64urlDecode(jwk.y)

  // EC public key = 0x04 || x || y (uncompressed point)
  const point = Buffer.concat([Buffer.from([0x04]), x, y])
  const bitString = encodeBitString(point)

  // OID for EC + curve OID
  const curveOids: Record<string, Buffer> = {
    'P-256': Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]),
    'P-384': Buffer.from([0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22]),
    'P-521': Buffer.from([0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23]),
  }

  const curveOid = curveOids[jwk.crv]
  if (!curveOid) throw new JwtError(`Unsupported EC curve: ${jwk.crv}`)

  // AlgorithmIdentifier: OID ecPublicKey + curve OID
  const ecOid = Buffer.from([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01])
  const algId = encodeSequence(Buffer.concat([ecOid, curveOid]))

  const spki = encodeSequence(Buffer.concat([algId, bitString]))

  return `-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`
}

// ── ASN.1 DER helpers ─────────────────────────────────────────────────────────

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length])
  if (length < 0x100) return Buffer.from([0x81, length])
  return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff])
}

function encodeSequence(content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), encodeLength(content.length), content])
}

function encodeUnsignedInteger(value: Uint8Array): Buffer {
  // Prepend 0x00 if high bit is set (to keep it positive)
  const needsPad = value[0]! & 0x80
  const body = needsPad ? Buffer.concat([Buffer.from([0x00]), value]) : Buffer.from(value)
  return Buffer.concat([Buffer.from([0x02]), encodeLength(body.length), body])
}

function encodeBitString(content: Buffer | Uint8Array): Buffer {
  // BIT STRING: tag 0x03, length, unused-bits (0x00), content
  const total = content.length + 1
  return Buffer.concat([Buffer.from([0x03]), encodeLength(total), Buffer.from([0x00]), content])
}

// ── Error ─────────────────────────────────────────────────────────────────────

export class JwtError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JwtError'
  }
}

/**
 * Clear the default JWKS client cache — useful for testing or forced key rotation.
 * @deprecated Use `jwksClient.clearAll()` on your own `JwksClient` instance.
 */
export function clearJwksCache(): void {
  defaultJwksClient.clearAll()
}
