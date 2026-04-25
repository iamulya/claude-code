/**
 * Shell quoting utility for OS sandbox command construction.
 *
 * Provides POSIX-safe shell quoting for arguments injected into
 * sandbox wrapper commands. Prevents shell injection attacks when
 * building bwrap/sandbox-exec/docker command lines.
 */

/**
 * Quote a string for safe inclusion in a POSIX shell command.
 *
 * Uses single-quote wrapping with proper escaping of embedded
 * single quotes (the only character that can break single-quoting).
 *
 * @example
 * shellQuote("hello world")     // "'hello world'"
 * shellQuote("it's fine")       // "'it'\\''s fine'"
 * shellQuote("")                // "''"
 * shellQuote("simple")          // "'simple'"   (always quotes for safety)
 */
export function shellQuote(s: string): string {
  // Empty string → ''
  if (s.length === 0) return "''";

  // Replace each ' with '\'' (end single-quote, escaped single-quote, start single-quote)
  // Then wrap the entire thing in single quotes
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Escape a string for inclusion inside an already-single-quoted context.
 * Used when building sandbox-exec -p '...' where the profile is already quoted.
 */
export function shellEscapeInSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\\''");
}
