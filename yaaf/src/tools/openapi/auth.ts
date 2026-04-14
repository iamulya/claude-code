/**
 * OpenAPI Authentication
 *
 * Defines auth configuration types and applies authentication to HTTP requests.
 * Supports API key (header/query), bearer token, basic auth, and custom headers.
 *
 * Also provides auto-detection of auth config from OpenAPI security schemes.
 *
 * @module tools/openapi/auth
 */

import type { SecurityScheme } from './parser.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type AuthConfig =
  | { type: 'apiKey'; in: 'header' | 'query'; name: string; value: string }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'custom'; headers: Record<string, string> }

// ── Auth Application ─────────────────────────────────────────────────────────

/**
 * Apply authentication to a request's headers and query parameters.
 *
 * @param headers - Mutable headers object to modify
 * @param query - Mutable query parameters object to modify
 * @param auth - Authentication configuration
 */
export function applyAuth(
  headers: Record<string, string>,
  query: Record<string, string>,
  auth: AuthConfig,
): void {
  switch (auth.type) {
    case 'apiKey':
      if (auth.in === 'header') {
        headers[auth.name] = auth.value
      } else {
        query[auth.name] = auth.value
      }
      break

    case 'bearer':
      headers['Authorization'] = `Bearer ${auth.token}`
      break

    case 'basic': {
      // Use Buffer for Node.js, btoa for browser environments
      const encoded = typeof Buffer !== 'undefined'
        ? Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
        : btoa(`${auth.username}:${auth.password}`)
      headers['Authorization'] = `Basic ${encoded}`
      break
    }

    case 'custom':
      Object.assign(headers, auth.headers)
      break
  }
}

// ── Auto-Detection from Spec ─────────────────────────────────────────────────

/**
 * Build AuthConfig from an OpenAPI security scheme and a credential value.
 *
 * @param scheme - The security scheme from the OpenAPI spec
 * @param credential - The credential value (API key, token, or "user:pass")
 * @returns An AuthConfig, or undefined if the scheme type isn't supported
 *
 * @example
 * // For an apiKey scheme:
 * //   { type: 'apiKey', name: 'X-API-Key', in: 'header' }
 * // With credential: 'my-secret-key'
 * // → { type: 'apiKey', in: 'header', name: 'X-API-Key', value: 'my-secret-key' }
 */
export function schemeToAuthConfig(
  scheme: SecurityScheme,
  credential: string,
): AuthConfig | undefined {
  switch (scheme.type) {
    case 'apiKey':
      return {
        type: 'apiKey',
        in: (scheme.in ?? 'header') as 'header' | 'query',
        name: scheme.name ?? 'Authorization',
        value: credential,
      }

    case 'http':
      if (scheme.scheme === 'bearer') {
        return { type: 'bearer', token: credential }
      }
      if (scheme.scheme === 'basic') {
        // Credential format: "username:password"
        const colonIdx = credential.indexOf(':')
        if (colonIdx > 0) {
          return {
            type: 'basic',
            username: credential.slice(0, colonIdx),
            password: credential.slice(colonIdx + 1),
          }
        }
        // If no colon, treat the whole string as a pre-encoded Basic token
        return { type: 'custom', headers: { Authorization: `Basic ${credential}` } }
      }
      // Unknown HTTP scheme — pass as custom header
      return { type: 'custom', headers: { Authorization: credential } }

    case 'oauth2':
    case 'openIdConnect':
      // For OAuth2/OIDC, the user provides the token directly (no flow execution)
      return { type: 'bearer', token: credential }

    default:
      return undefined
  }
}

/**
 * Resolve authentication from security schemes and user-provided credentials.
 *
 * Tries each required security scheme name against the credentials map,
 * returning the first match.
 *
 * @param requiredSchemes - Security scheme names required by the operation
 * @param allSchemes - All security schemes from the spec
 * @param credentials - User-provided credential values keyed by scheme name
 * @param globalAuth - Global auth config (fallback)
 * @returns The resolved AuthConfig, or undefined
 */
export function resolveAuth(
  requiredSchemes: string[] | undefined,
  allSchemes: Record<string, SecurityScheme>,
  credentials: Record<string, string>,
  globalAuth?: AuthConfig,
): AuthConfig | undefined {
  // If no security requirements, use global auth if provided
  if (!requiredSchemes || requiredSchemes.length === 0) {
    return globalAuth
  }

  // Try each required scheme
  for (const schemeName of requiredSchemes) {
    const credential = credentials[schemeName]
    if (!credential) continue

    const scheme = allSchemes[schemeName]
    if (!scheme) continue

    const config = schemeToAuthConfig(scheme, credential)
    if (config) return config
  }

  // Fall back to global auth
  return globalAuth
}
