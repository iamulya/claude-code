/**
 * OpenAPI Toolset
 *
 * Automatically generates YAAF Tool instances from an OpenAPI 3.x specification.
 * Each operation (e.g., GET /pets, POST /orders) becomes a separate Tool that
 * agents can call to interact with the REST API.
 *
 * Zero required dependencies — uses native fetch for HTTP execution.
 * YAML support requires the optional `yaml` peer dependency.
 *
 * @example
 * ```ts
 * // From a JSON spec string
 * const tools = OpenAPIToolset.fromSpec(jsonString)
 *
 * // From a file
 * const tools = await OpenAPIToolset.fromFile('./petstore.json')
 *
 * // From a URL
 * const tools = await OpenAPIToolset.fromURL('https://petstore3.swagger.io/api/v3/openapi.json')
 *
 * // With authentication
 * const tools = OpenAPIToolset.fromSpec(spec, {
 *   auth: { type: 'bearer', token: process.env.API_TOKEN! },
 * })
 *
 * // Use with an Agent
 * const agent = new Agent({ tools, systemPrompt: 'You manage the pet store.' })
 * ```
 *
 * @module tools/openapi
 */

import { readFile, readFile as readFileAsync } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Tool } from '../tool.js'
import { parseOpenAPISpec, type ParsedOperation, type SecurityScheme, type FileResolver, type ResolveOptions } from './parser.js'
import { createRestApiTool, type RestApiToolConfig } from './restApiTool.js'
import { deduplicateNames, generateToolName } from './naming.js'
import type { AuthConfig } from './auth.js'

// ── Re-exports ───────────────────────────────────────────────────────────────

export type { AuthConfig } from './auth.js'
export type { ParsedOperation, ParsedParam, ParsedBody, SecurityScheme, FileResolver } from './parser.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type OpenAPIToolsetOptions = {
  /** Override format detection ('json' | 'yaml' | 'auto', default: 'auto') */
  format?: 'json' | 'yaml' | 'auto'
  /** Credential values keyed by security scheme name from the spec */
  credentials?: Record<string, string>
  /** Global auth config applied to all tools */
  auth?: AuthConfig
  /**
   * Filter which operations to generate tools for.
   * Pass an array of operationIds or a filter function.
   */
  operationFilter?: string[] | ((operationId: string, method: string, path: string) => boolean)
  /** Override generated tool names: { operationId: 'custom_name' } */
  nameOverrides?: Record<string, string>
  /** Timeout for API calls in ms (default: 30_000) */
  timeoutMs?: number
  /** Custom headers added to every API request */
  headers?: Record<string, string>
  /**
   * Custom file resolver for external `$ref` resolution.
   * If not provided, `fromFile()` auto-creates one from the spec's directory.
   * For `fromSpec()` and `fromURL()`, external file refs require this.
   */
  fileResolver?: FileResolver
}

// ── YAML Parsing ─────────────────────────────────────────────────────────────

/**
 * Attempt to parse YAML using the optional `yaml` peer dependency.
 * Throws a helpful error if the package is not installed.
 */
async function parseYAML(input: string): Promise<Record<string, unknown>> {
  try {
    // Dynamic import via variable to bypass TS static module resolution
    const moduleId = 'yaml'
    const yamlModule = await import(/* @vite-ignore */ moduleId) as { parse: (s: string) => unknown }
    return yamlModule.parse(input) as Record<string, unknown>
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Cannot find module') || err.message.includes('ERR_MODULE_NOT_FOUND'))
    ) {
      throw new Error(
        [
          'YAML OpenAPI specs require the "yaml" package.',
          'Install it:  npm install yaml',
          'Or convert your spec to JSON first.',
        ].join('\n'),
      )
    }
    throw err
  }
}

/**
 * Detect if a string is JSON or YAML and parse it.
 */
async function parseSpec(
  input: string,
  format: 'json' | 'yaml' | 'auto',
): Promise<Record<string, unknown>> {
  const trimmed = input.trimStart()

  if (format === 'json' || (format === 'auto' && (trimmed.startsWith('{') || trimmed.startsWith('[')))) {
    return JSON.parse(input) as Record<string, unknown>
  }

  return parseYAML(input)
}

// ── OpenAPIToolset ───────────────────────────────────────────────────────────

export class OpenAPIToolset {
  /** The parsed operations from the spec */
  readonly operations: ParsedOperation[]
  /** The generated Tool instances */
  readonly tools: Tool[]
  /** Security schemes from the spec */
  readonly securitySchemes: Record<string, SecurityScheme>

  private constructor(
    operations: ParsedOperation[],
    tools: Tool[],
    securitySchemes: Record<string, SecurityScheme>,
  ) {
    this.operations = operations
    this.tools = tools
    this.securitySchemes = securitySchemes
  }

  // ── Static Factories ─────────────────────────────────────────────────────

  /**
   * Create tools from an OpenAPI spec string or object.
   *
   * @param spec - JSON string, YAML string, or parsed JS object
   * @param options - Configuration options
   * @returns OpenAPIToolset instance with tools and operations
   *
   * @example
   * ```ts
   * const toolset = OpenAPIToolset.fromSpec(jsonString)
   * const agent = new Agent({ tools: toolset.tools })
   * ```
   */
  static fromSpec(
    spec: string | Record<string, unknown>,
    options?: OpenAPIToolsetOptions,
  ): OpenAPIToolset {
    let specObj: Record<string, unknown>

    if (typeof spec === 'string') {
      // Synchronous path: only JSON (no YAML) for the sync overload
      const trimmed = spec.trimStart()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        specObj = JSON.parse(spec) as Record<string, unknown>
      } else {
        throw new Error(
          'YAML specs must use the async fromSpecAsync() or fromFile() methods. ' +
          'fromSpec() only supports JSON strings or pre-parsed objects.'
        )
      }
    } else {
      specObj = spec
    }

    return OpenAPIToolset.buildFromParsedSpec(specObj, options)
  }

  /**
   * Create tools from an OpenAPI spec string (async — supports YAML).
   *
   * @param spec - JSON string, YAML string, or parsed JS object
   * @param options - Configuration options
   * @returns OpenAPIToolset instance
   */
  static async fromSpecAsync(
    spec: string | Record<string, unknown>,
    options?: OpenAPIToolsetOptions,
  ): Promise<OpenAPIToolset> {
    const specObj = typeof spec === 'string'
      ? await parseSpec(spec, options?.format ?? 'auto')
      : spec

    return OpenAPIToolset.buildFromParsedSpec(specObj, options)
  }

  /**
   * Load and parse an OpenAPI spec from a local file path.
   *
   * @param path - File path to the OpenAPI spec (JSON or YAML)
   * @param options - Configuration options
   * @returns OpenAPIToolset instance
   *
   * @example
   * ```ts
   * const toolset = await OpenAPIToolset.fromFile('./openapi.json')
   * ```
   */
  static async fromFile(
    path: string,
    options?: OpenAPIToolsetOptions,
  ): Promise<OpenAPIToolset> {
    const absPath = resolve(path)
    const baseDir = dirname(absPath)
    const content = await readFileAsync(absPath, 'utf-8')
    const format = options?.format ?? detectFormatFromPath(path)
    const specObj = await parseSpec(content, format)

    // Auto-create a file resolver that reads relative files from the spec's directory
    const fileResolver: FileResolver = options?.fileResolver ?? createFileResolver(baseDir)

    return OpenAPIToolset.buildFromParsedSpec(specObj, { ...options, fileResolver })
  }

  /**
   * Fetch and parse an OpenAPI spec from a URL.
   *
   * @param url - URL to the OpenAPI spec
   * @param options - Configuration options
   * @returns OpenAPIToolset instance
   *
   * @example
   * ```ts
   * const toolset = await OpenAPIToolset.fromURL('https://petstore3.swagger.io/api/v3/openapi.json')
   * ```
   */
  static async fromURL(
    url: string,
    options?: OpenAPIToolsetOptions,
  ): Promise<OpenAPIToolset> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json, application/yaml, text/yaml, */*' },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec from ${url}: ${response.status} ${response.statusText}`)
    }

    const content = await response.text()
    const format = options?.format ?? detectFormatFromContentType(response.headers.get('content-type'), url)
    const specObj = await parseSpec(content, format)
    return OpenAPIToolset.buildFromParsedSpec(specObj, options)
  }

  // ── Private Construction ─────────────────────────────────────────────────

  private static buildFromParsedSpec(
    specObj: Record<string, unknown>,
    options?: OpenAPIToolsetOptions,
  ): OpenAPIToolset {
    const opts = options ?? {}

    // Build resolve options for the parser
    const resolveOpts: ResolveOptions | undefined = opts.fileResolver
      ? { fileResolver: opts.fileResolver }
      : undefined

    const { operations, securitySchemes } = parseOpenAPISpec(specObj, resolveOpts)

    // Apply operation filter
    let filteredOps = operations
    if (opts.operationFilter) {
      if (Array.isArray(opts.operationFilter)) {
        const allowedIds = new Set(opts.operationFilter)
        filteredOps = operations.filter(op => op.operationId && allowedIds.has(op.operationId))
      } else {
        const filterFn = opts.operationFilter
        filteredOps = operations.filter(op =>
          filterFn(op.operationId ?? '', op.method, op.path),
        )
      }
    }

    // Generate tool names and ensure uniqueness
    const rawNames = filteredOps.map(op => {
      if (opts.nameOverrides && op.operationId && opts.nameOverrides[op.operationId]) {
        return opts.nameOverrides[op.operationId]!
      }
      return generateToolName(op.operationId, op.method, op.path)
    })
    const uniqueNames = deduplicateNames(rawNames)

    // Build tools
    const toolConfig: RestApiToolConfig = {
      timeoutMs: opts.timeoutMs ?? 30_000,
      extraHeaders: opts.headers ?? {},
      auth: opts.auth,
      credentials: opts.credentials ?? {},
      securitySchemes,
    }

    const tools = filteredOps.map((op, i) =>
      createRestApiTool(op, toolConfig, uniqueNames[i]),
    )

    return new OpenAPIToolset(filteredOps, tools, securitySchemes)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectFormatFromPath(path: string): 'json' | 'yaml' | 'auto' {
  const lower = path.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  return 'auto'
}

function detectFormatFromContentType(
  contentType: string | null,
  url: string,
): 'json' | 'yaml' | 'auto' {
  if (contentType?.includes('json')) return 'json'
  if (contentType?.includes('yaml') || contentType?.includes('yml')) return 'yaml'
  return detectFormatFromPath(url)
}

/**
 * Create a file resolver for external `$ref` resolution.
 *
 * Resolves relative paths against the given base directory and reads the
 * file synchronously. Supports JSON and YAML (if the `yaml` package is available).
 *
 * @param baseDir - Absolute path to the directory containing the root spec
 * @returns A FileResolver function
 */
function createFileResolver(baseDir: string): FileResolver {
  return (filePath: string): Record<string, unknown> | undefined => {
    const absPath = resolve(baseDir, filePath)
    let content: string
    try {
      content = readFileSync(absPath, 'utf-8')
    } catch {
      return undefined
    }

    // Detect format from extension
    const lower = absPath.toLowerCase()
    if (lower.endsWith('.json')) {
      return JSON.parse(content) as Record<string, unknown>
    }

    // Try JSON first (works for .yaml files that happen to be JSON)
    const trimmed = content.trimStart()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(content) as Record<string, unknown>
      } catch { /* not JSON, try YAML below */ }
    }

    // YAML requires the optional peer dependency
    try {
      const moduleId = 'yaml'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const yamlModule = require(moduleId) as { parse: (s: string) => unknown }
      return yamlModule.parse(content) as Record<string, unknown>
    } catch {
      throw new Error(
        `Cannot parse external $ref file "${filePath}". ` +
        'If it is YAML, install the "yaml" package: npm install yaml'
      )
    }
  }
}
