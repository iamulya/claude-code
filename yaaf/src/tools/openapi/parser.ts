/**
 * OpenAPI 3.x Parser
 *
 * Parses an OpenAPI specification document and extracts a normalized list of
 * API operations. Handles:
 *   - `$ref` resolution:
 *     - Local JSON Pointer refs: `#/components/schemas/Pet`
 *     - Relative file refs: `./models/pet.yaml`
 *     - File + pointer refs: `./models.yaml#/Pet`
 *   - Circular reference detection
 *   - Server URL extraction
 *   - Parameter + request body extraction
 *
 * @module tools/openapi/parser
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type ParsedParam = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  schema: Record<string, unknown>
  description?: string
}

export type ParsedBody = {
  required: boolean
  mediaType: string
  schema: Record<string, unknown>
}

export type ParsedOperation = {
  operationId?: string
  method: HttpMethod
  path: string
  summary: string
  description: string
  serverUrl: string
  parameters: ParsedParam[]
  requestBody?: ParsedBody
  /** Security scheme names required by this operation */
  security?: string[]
}

export type SecurityScheme = {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  name?: string       // for apiKey
  in?: string         // for apiKey: 'header' | 'query' | 'cookie'
  scheme?: string     // for http: 'bearer', 'basic'
}

export type ParseResult = {
  operations: ParsedOperation[]
  securitySchemes: Record<string, SecurityScheme>
}

/**
 * Callback to load an external file referenced by a `$ref`.
 *
 * Receives the resolved file path (relative paths already resolved against
 * the base directory). Returns the parsed content as a JS object, or
 * undefined if the file cannot be loaded.
 *
 * @example
 * ```ts
 * const resolver: FileResolver = (filePath) => {
 *   const raw = readFileSync(filePath, 'utf-8')
 *   return JSON.parse(raw)
 * }
 * ```
 */
export type FileResolver = (filePath: string) => Record<string, unknown> | undefined

/** Options for $ref resolution */
export type ResolveOptions = {
  /** Resolver for external file refs (e.g., `./models/pet.yaml`) */
  fileResolver?: FileResolver
}

// ── $ref Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a JSON Pointer (`#/components/schemas/Pet`) against a document.
 *
 * @param doc - The document to resolve against
 * @param pointer - JSON Pointer string (with or without leading `#`)
 */
function resolvePointer(doc: Record<string, unknown>, pointer: string): unknown {
  // Strip leading "#" or "#/"
  const normalized = pointer.startsWith('#/') ? pointer.slice(2)
    : pointer.startsWith('#') ? pointer.slice(1)
    : pointer

  if (!normalized) return doc

  const path = normalized.split('/')
  let current: unknown = doc

  for (const segment of path) {
    // Decode JSON Pointer escapes (RFC 6901)
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~')
    if (current === null || typeof current !== 'object') {
      throw new Error(`Cannot resolve $ref pointer "${pointer}": path segment "${key}" hit non-object`)
    }
    current = (current as Record<string, unknown>)[key]
    if (current === undefined) {
      throw new Error(`Cannot resolve $ref pointer "${pointer}": "${key}" not found`)
    }
  }

  return current
}

/**
 * Parse a $ref string into its file path and JSON Pointer components.
 *
 * Examples:
 *   "#/components/schemas/Pet"       → { filePath: undefined, pointer: "#/components/schemas/Pet" }
 *   "./models/pet.yaml"              → { filePath: "./models/pet.yaml", pointer: undefined }
 *   "./models.yaml#/Pet"             → { filePath: "./models.yaml", pointer: "#/Pet" }
 *   "../common/error.json#/ErrorObj" → { filePath: "../common/error.json", pointer: "#/ErrorObj" }
 */
function parseRefString(ref: string): { filePath?: string; pointer?: string } {
  // Local ref: starts with #
  if (ref.startsWith('#')) {
    return { pointer: ref }
  }

  // File ref, possibly with a JSON Pointer fragment
  const hashIdx = ref.indexOf('#')
  if (hashIdx === -1) {
    return { filePath: ref }
  }

  return {
    filePath: ref.slice(0, hashIdx),
    pointer: ref.slice(hashIdx),
  }
}

/** Cache of already-loaded external files to avoid redundant I/O */
type FileCache = Map<string, Record<string, unknown>>

/**
 * Deep-resolve all `$ref` pointers in an object tree.
 *
 * Supports:
 *   - Local refs: `#/components/schemas/Pet`
 *   - Relative file refs: `./models/pet.yaml`
 *   - File + pointer refs: `./models.yaml#/Pet`
 *
 * Uses a visiting set to detect circular references. When a cycle is detected,
 * returns a `{ type: 'object' }` placeholder instead of infinitely recursing.
 */
function resolveRefs(
  node: unknown,
  root: Record<string, unknown>,
  visiting = new Set<string>(),
  fileResolver?: FileResolver,
  fileCache: FileCache = new Map(),
): unknown {
  if (node === null || typeof node !== 'object') return node

  if (Array.isArray(node)) {
    return node.map(item => resolveRefs(item, root, visiting, fileResolver, fileCache))
  }

  const obj = node as Record<string, unknown>

  // Handle $ref
  if (typeof obj.$ref === 'string') {
    const ref = obj.$ref
    if (visiting.has(ref)) {
      // Circular reference — return a safe placeholder
      return { type: 'object', description: `(circular ref: ${ref})` }
    }
    visiting.add(ref)
    try {
      const { filePath, pointer } = parseRefString(ref)

      if (filePath) {
        // External file ref
        return resolveExternalRef(filePath, pointer, root, visiting, fileResolver, fileCache)
      }

      // Local ref — resolve pointer against root document
      const resolved = resolvePointer(root, pointer ?? '#')
      return resolveRefs(resolved, root, visiting, fileResolver, fileCache)
    } finally {
      visiting.delete(ref)
    }
  }

  // Recursively resolve all properties
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefs(value, root, visiting, fileResolver, fileCache)
  }
  return result
}

/**
 * Resolve an external file $ref.
 *
 * Loads the external file via the fileResolver, caches it, and optionally
 * resolves a JSON Pointer within the loaded document.
 */
function resolveExternalRef(
  filePath: string,
  pointer: string | undefined,
  _root: Record<string, unknown>,
  visiting: Set<string>,
  fileResolver?: FileResolver,
  fileCache: FileCache = new Map(),
): unknown {
  if (!fileResolver) {
    throw new Error(
      `External $ref "${filePath}" found but no file resolver is configured. ` +
      'Use OpenAPIToolset.fromFile() to auto-resolve relative file refs, ' +
      'or pass a fileResolver in the parse options.'
    )
  }

  // Load file (cached)
  let externalDoc = fileCache.get(filePath)
  if (!externalDoc) {
    externalDoc = fileResolver(filePath)
    if (!externalDoc) {
      throw new Error(`Failed to load external $ref file: "${filePath}"`)
    }
    fileCache.set(filePath, externalDoc)
  }

  // Apply pointer within the external doc (if any)
  const target = pointer ? resolvePointer(externalDoc, pointer) : externalDoc

  // Continue resolving refs within the external document
  return resolveRefs(target, externalDoc, visiting, fileResolver, fileCache)
}

// ── Spec Parsing ─────────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete']

/**
 * Parse an OpenAPI 3.x specification into normalized operations.
 *
 * @param spec - The OpenAPI spec as a plain JS object (already parsed from JSON/YAML)
 * @param options - Optional resolve options (file resolver for external $refs)
 * @returns Parsed operations and security schemes
 *
 * @throws if the spec is missing required fields (openapi, paths)
 */
export function parseOpenAPISpec(
  spec: Record<string, unknown>,
  options?: ResolveOptions,
): ParseResult {
  const fileResolver = options?.fileResolver
  const fileCache: FileCache = new Map()
  // Validate minimum structure
  const openapi = spec.openapi as string | undefined
  if (!openapi || !openapi.startsWith('3.')) {
    throw new Error(
      `Unsupported OpenAPI version: "${openapi ?? 'missing'}". Only OpenAPI 3.x is supported.`
    )
  }

  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined
  if (!paths || typeof paths !== 'object') {
    throw new Error('OpenAPI spec is missing the "paths" object.')
  }

  // Extract server URL (first server, or empty string for relative URLs)
  const servers = spec.servers as Array<{ url: string }> | undefined
  const serverUrl = servers?.[0]?.url?.replace(/\/$/, '') ?? ''

  // Extract security schemes
  const components = spec.components as Record<string, unknown> | undefined
  const rawSchemes = (components?.securitySchemes ?? {}) as Record<string, Record<string, unknown>>
  const securitySchemes: Record<string, SecurityScheme> = {}

  for (const [name, scheme] of Object.entries(rawSchemes)) {
    const resolved = resolveRefs(scheme, spec, new Set(), fileResolver, fileCache) as Record<string, unknown>
    securitySchemes[name] = {
      type: resolved.type as SecurityScheme['type'],
      name: resolved.name as string | undefined,
      in: resolved.in as string | undefined,
      scheme: resolved.scheme as string | undefined,
    }
  }

  // Global security requirements
  const globalSecurity = spec.security as Array<Record<string, unknown>> | undefined
  const globalSecurityNames = globalSecurity
    ? globalSecurity.flatMap(s => Object.keys(s))
    : []

  // Extract operations
  const operations: ParsedOperation[] = []

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) continue

    // Path-level parameters (shared across all methods)
    const pathLevelParams = resolveRefs(
      (pathItem as Record<string, unknown>).parameters ?? [],
      spec,
      new Set(),
      fileResolver,
      fileCache,
    ) as Array<Record<string, unknown>>

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as Record<string, unknown> | undefined
      if (!operation || typeof operation !== 'object') continue

      // Resolve all $refs within the operation
      const resolved = resolveRefs(operation, spec, new Set(), fileResolver, fileCache) as Record<string, unknown>

      // Parameters: merge path-level + operation-level (operation wins on conflict)
      const rawParams = [
        ...pathLevelParams,
        ...((resolved.parameters ?? []) as Array<Record<string, unknown>>),
      ]

      const paramMap = new Map<string, ParsedParam>()
      for (const raw of rawParams) {
        const p = raw as Record<string, unknown>
        const key = `${p.in}:${p.name}`
        paramMap.set(key, {
          name: p.name as string,
          in: p.in as ParsedParam['in'],
          required: (p.required as boolean) ?? false,
          schema: (p.schema as Record<string, unknown>) ?? { type: 'string' },
          description: p.description as string | undefined,
        })
      }

      // Request body
      let requestBody: ParsedBody | undefined
      const rawBody = resolved.requestBody as Record<string, unknown> | undefined
      if (rawBody) {
        const content = rawBody.content as Record<string, Record<string, unknown>> | undefined
        if (content) {
          // Prefer application/json, fall back to first available
          const mediaType = content['application/json']
            ? 'application/json'
            : Object.keys(content)[0] ?? 'application/json'
          const mediaObj = content[mediaType]

          if (mediaObj) {
            requestBody = {
              required: (rawBody.required as boolean) ?? false,
              mediaType,
              schema: (mediaObj.schema as Record<string, unknown>) ?? { type: 'object' },
            }
          }
        }
      }

      // Security: operation-level overrides global
      const opSecurity = resolved.security as Array<Record<string, unknown>> | undefined
      const securityNames = opSecurity
        ? opSecurity.flatMap(s => Object.keys(s))
        : globalSecurityNames

      operations.push({
        operationId: resolved.operationId as string | undefined,
        method,
        path: pathStr,
        summary: (resolved.summary as string) ?? '',
        description: (resolved.description as string) ?? (resolved.summary as string) ?? '',
        serverUrl,
        parameters: Array.from(paramMap.values()),
        requestBody,
        security: securityNames.length > 0 ? securityNames : undefined,
      })
    }
  }

  return { operations, securitySchemes }
}
