/**
 * Skills — Zero-dependency glob path matcher.
 *
 * Implements conditional skill activation via the `paths` frontmatter field.
 * When a skill declares `paths: ["src/**\/*.ts", "tests/**"]`, it only
 * activates when the agent touches files matching those globs.
 *
 * Supports:
 * - `*` — match any characters except `/`
 * - `**` — match any characters including `/` (recursive)
 * - `?` — match exactly one character except `/`
 * - `{a,b}` — match either `a` or `b` (brace expansion, one level)
 * - Character classes `[abc]` NOT supported (rare in skill configs)
 *
 * Security:
 * - Pattern length capped at 256 characters to prevent ReDoS
 * - Maximum 4 `**` segments per pattern
 *
 * @module skills/pathMatcher
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum glob pattern length. Prevents ReDoS via crafted patterns. */
const MAX_GLOB_LENGTH = 256;

/** Maximum number of ** segments in a pattern. Prevents exponential backtracking. */
const MAX_DOUBLESTAR_COUNT = 4;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert a glob pattern to a RegExp.
 *
 * @param pattern - Glob pattern (e.g., `src/**\/*.ts`)
 * @returns Compiled RegExp
 * @throws Error if pattern exceeds length or complexity limits
 */
export function globToRegExp(pattern: string): RegExp {
  // Security: cap pattern length to prevent ReDoS
  if (pattern.length > MAX_GLOB_LENGTH) {
    throw new Error(
      `Glob pattern too long (${pattern.length} > ${MAX_GLOB_LENGTH}): ${pattern.slice(0, 50)}...`,
    );
  }

  // Security: cap ** count to prevent exponential backtracking
  const doubleStarCount = (pattern.match(/\*\*/g) || []).length;
  if (doubleStarCount > MAX_DOUBLESTAR_COUNT) {
    throw new Error(
      `Glob pattern too complex (${doubleStarCount} ** segments > ${MAX_DOUBLESTAR_COUNT}): ${pattern.slice(0, 50)}...`,
    );
  }

  const result = convertGlob(pattern);
  return new RegExp(`^${result}$`);
}

/**
 * Check if a skill should be active for a given set of touched paths.
 *
 * Rules:
 * - If the skill has no `paths` field or empty `paths`, it's always active.
 * - Otherwise, at least one touched path must match at least one pattern.
 * - Comparison is case-sensitive.
 * - Paths are normalized to forward slashes before matching.
 * - Invalid patterns are silently skipped (fail-open for activation).
 *
 * @param skillPaths - The skill's `paths` patterns from frontmatter
 * @param touchedPaths - Paths of files the agent has touched
 * @returns Whether the skill should be active
 */
export function isSkillActiveForPaths(
  skillPaths: string[] | undefined,
  touchedPaths: string[],
): boolean {
  if (!skillPaths || skillPaths.length === 0) return true;
  if (touchedPaths.length === 0) return false;

  // Compile patterns, silently skipping invalid ones
  const compiledPatterns: RegExp[] = [];
  for (const p of skillPaths) {
    try {
      compiledPatterns.push(globToRegExp(p));
    } catch {
      // Skip invalid patterns — don't block skill activation
    }
  }

  if (compiledPatterns.length === 0) return true; // all patterns invalid → treat as always active

  return touchedPaths.some((touchedPath) => {
    // Normalize: strip leading ./ and use forward slashes
    const normalized = touchedPath.replace(/\\/g, "/").replace(/^\.\//, "");
    return compiledPatterns.some((re) => re.test(normalized));
  });
}

// ── Internal ─────────────────────────────────────────────────────────────────

/**
 * Convert a glob pattern to a regex string.
 * Single implementation handles all features: *, **, ?, {a,b}, escaping.
 * Braces are expanded inline; alternatives are recursively converted.
 */
function convertGlob(segment: string): string {
  let result = "";
  let i = 0;

  while (i < segment.length) {
    const ch = segment[i]!;
    const next = i + 1 < segment.length ? segment[i + 1] : "";

    if (ch === "{") {
      // Find matching close brace
      const closeIdx = segment.indexOf("}", i);
      if (closeIdx === -1) {
        // No matching brace — treat literally
        result += "\\{";
        i++;
        continue;
      }
      const inner = segment.slice(i + 1, closeIdx);
      // Recursively convert each alternative (supports *, **, ? inside braces)
      const alternatives = inner.split(",").map((s) => convertGlob(s.trim()));
      result += `(${alternatives.join("|")})`;
      i = closeIdx + 1;
    } else if (ch === "*" && next === "*") {
      // ** — match anything including /
      if (i + 2 < segment.length && segment[i + 2] === "/") {
        result += "(?:.*/)?";
        i += 3;
      } else {
        result += ".*";
        i += 2;
      }
    } else if (ch === "*") {
      // * — match anything except /
      result += "[^/]*";
      i++;
    } else if (ch === "?") {
      // ? — match one char except /
      result += "[^/]";
      i++;
    } else if (".+^$()|[]\\".includes(ch)) {
      // Escape regex-special characters (NOT { and } — handled above)
      result += `\\${ch}`;
      i++;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}
