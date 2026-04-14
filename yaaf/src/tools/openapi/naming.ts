/**
 * OpenAPI Tool Naming Utilities
 *
 * Converts operationId values to snake_case tool names compatible with
 * LLM function calling. Follows the same strategy as ADK:
 *   operationId → snake_case → truncate at 60 chars
 *   fallback:    method + path segments → snake_case
 *
 * @module tools/openapi/naming
 */

/** Maximum tool name length (LLM function name limits) */
const MAX_NAME_LENGTH = 60

/**
 * Convert a string to snake_case.
 *
 * Handles camelCase, PascalCase, kebab-case, dot.case, and space-separated.
 *
 * @example
 * toSnakeCase('listPets')           // → 'list_pets'
 * toSnakeCase('GetPetById')         // → 'get_pet_by_id'
 * toSnakeCase('list-all-users')     // → 'list_all_users'
 * toSnakeCase('already_snake')      // → 'already_snake'
 */
export function toSnakeCase(str: string): string {
  return (
    str
      // Insert underscore before uppercase runs: "getHTTPResponse" → "get_HTTP_Response"
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      // Split uppercase runs from following lowercase: "HTTPResponse" → "HTTP_Response"
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      // Replace non-alphanumeric with underscore
      .replace(/[^a-zA-Z0-9]+/g, '_')
      // Collapse multiple underscores
      .replace(/_+/g, '_')
      // Trim leading/trailing underscores
      .replace(/^_|_$/g, '')
      .toLowerCase()
  )
}

/**
 * Generate a tool name from an OpenAPI operation.
 *
 * Priority:
 * 1. operationId (converted to snake_case)
 * 2. "{method}_{path_segments}" fallback
 *
 * The result is truncated to MAX_NAME_LENGTH characters.
 *
 * @param operationId - The operationId from the spec (may be undefined)
 * @param method - HTTP method (get, post, etc.)
 * @param path - URL path (e.g., '/pets/{petId}')
 * @returns A snake_case tool name
 *
 * @example
 * generateToolName('listPets', 'get', '/pets')       // → 'list_pets'
 * generateToolName(undefined, 'get', '/pets/{petId}') // → 'get_pets_by_id'
 * generateToolName(undefined, 'post', '/users/{userId}/orders') // → 'post_users_orders'
 */
export function generateToolName(
  operationId: string | undefined,
  method: string,
  path: string,
): string {
  if (operationId) {
    return truncateName(toSnakeCase(operationId))
  }

  // Fallback: build from method + path
  const segments = path
    .split('/')
    .filter(Boolean)
    .map(seg => {
      // Replace path params like {petId} with "by_id" for readability
      if (seg.startsWith('{') && seg.endsWith('}')) {
        const paramName = seg.slice(1, -1)
        // "petId" → "by_id", "userId" → "by_id", "id" → "by_id"
        return paramName.toLowerCase().endsWith('id') ? 'by_id' : paramName
      }
      return seg
    })

  const raw = [method.toLowerCase(), ...segments].join('_')
  return truncateName(toSnakeCase(raw))
}

/**
 * Truncate a tool name to the maximum allowed length.
 * Truncates at the last underscore boundary to keep names readable.
 */
function truncateName(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name

  // Try to break at an underscore boundary
  const truncated = name.slice(0, MAX_NAME_LENGTH)
  const lastUnderscore = truncated.lastIndexOf('_')

  // Only use the underscore break if it preserves at least half the length
  if (lastUnderscore > MAX_NAME_LENGTH / 2) {
    return truncated.slice(0, lastUnderscore)
  }

  return truncated
}

/**
 * Ensure tool names are unique across a set of operations.
 * Appends numeric suffixes for duplicates.
 */
export function deduplicateNames(names: string[]): string[] {
  const counts = new Map<string, number>()
  return names.map(name => {
    const count = counts.get(name) ?? 0
    counts.set(name, count + 1)
    return count === 0 ? name : `${name}_${count}`
  })
}
