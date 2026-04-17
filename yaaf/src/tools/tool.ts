/**
 * Tool System
 *
 * A comprehensive tool abstraction for YAAF agents:
 *
 * - Schema-validated inputs via JSON Schema (no Zod dependency)
 * - Permission layer (allow / deny / ask) with delegation
 * - `buildTool()` factory with safe defaults (fail-closed)
 * - Concurrency safety flags
 * - Read-only / destructive classification
 *
 * Design rationale:
 * goes through `buildTool()` which provides safe defaults: tools are assumed
 * non-concurrent, write-capable, and require permission checks. This fail-closed
 * design means new tools are safe by default — developers opt IN to dangerous
 * capabilities rather than forgetting to opt out.
 *
 * The permission layer separates "can this tool run?" from "should we ask the
 * user?" which lets agents and swarm leaders mediate tool access hierarchically.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** JSON Schema for tool inputs */
export type ToolInput = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

/** Result of running a tool */
export type ToolResult<T = unknown> = {
  data: T;
  /** Additional messages to inject into the conversation after this tool */
  newMessages?: Array<{ role: "user" | "assistant"; content: string }>;
};

/** Permission behavior for a tool invocation */
export type PermissionBehavior = "allow" | "deny" | "ask";

/** Result of a permission check */
export type PermissionResult = {
  behavior: PermissionBehavior;
  /** The (possibly modified) input to use if allowed */
  updatedInput?: Record<string, unknown>;
  /** Human-readable reason for denial */
  message?: string;
  /** Permission suggestions for the UI */
  suggestions?: unknown[];
};

/** Result of input validation */
export type ValidationResult = { valid: true } | { valid: false; message: string };

/** Context passed to tool.call() — the tool's view of the world */
export type ToolContext = {
  /** Model currently driving the agent loop */
  model: string;
  /** All available tools in this session */
  tools: readonly Tool[];
  /** Abort signal for cancellation */
  signal: AbortSignal;
  /** Messages in the current conversation */
  messages: ReadonlyArray<{ role: string; content: unknown }>;
  /** Read a file's content (tools shouldn't access fs directly) */
  readFile?: (path: string) => Promise<string>;
  /** Write a file's content */
  writeFile?: (path: string, content: string) => Promise<void>;
  /** Execute a shell command */
  exec?: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  /** Custom context bag for framework consumers */
  extra?: Record<string, unknown>;
};

/**
 * The complete Tool interface.
 *
 * Every tool in the system conforms to this shape. The `buildTool()` factory
 * ensures safe defaults so tool authors only define what's unique.
 */
export type Tool<Input = Record<string, unknown>, Output = unknown> = {
  /** Unique tool name (e.g., 'FileRead', 'BashTool') */
  readonly name: string;
  /** Optional aliases for backward compatibility */
  readonly aliases?: string[];
  /** JSON Schema for the tool's input */
  readonly inputSchema: ToolInput;
  /** Maximum result size in characters before truncation */
  maxResultChars: number;

  /** Human-readable description of what this tool invocation does */
  describe(input: Input): Promise<string> | string;

  /** Execute the tool */
  call(input: Input, context: ToolContext): Promise<ToolResult<Output>>;

  /** Validate input before execution. Called before checkPermissions. */
  validateInput?(input: Input, context: ToolContext): Promise<ValidationResult>;

  /** Check if this tool invocation requires user permission */
  checkPermissions(input: Input, context: ToolContext): Promise<PermissionResult>;

  /** Is this tool enabled in the current environment? */
  isEnabled(): boolean;
  /** Can this tool run concurrently with other tools? */
  isConcurrencySafe(input: Input): boolean;
  /** Does this tool only read (no side effects)? */
  isReadOnly(input: Input): boolean;
  /** Does this tool perform irreversible operations? */
  isDestructive(input: Input): boolean;

  /** User-facing display name for this tool use */
  userFacingName(input: Partial<Input> | undefined): string;
  /** Short activity description for progress display (e.g., "Reading src/foo.ts") */
  getActivityDescription?(input: Partial<Input> | undefined): string | null;

  /** System prompt contribution — injected into the agent's base prompt */
  prompt?(): Promise<string> | string;
};

// ── Tool Definition (partial, for `buildTool`) ───────────────────────────────

/** Methods that buildTool provides defaults for */
type DefaultableKeys =
  | "isEnabled"
  | "isConcurrencySafe"
  | "isReadOnly"
  | "isDestructive"
  | "checkPermissions"
  | "userFacingName";

/**
 * A partial tool definition — pass to `buildTool()` to get a complete Tool.
 * All methods on DefaultableKeys are optional.
 */
export type ToolDef<Input = Record<string, unknown>, Output = unknown> = Omit<
  Tool<Input, Output>,
  DefaultableKeys
> &
  Partial<Pick<Tool<Input, Output>, DefaultableKeys>>;

// ── buildTool ────────────────────────────────────────────────────────────────

const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,
  isReadOnly: (_input?: unknown) => false,
  isDestructive: (_input?: unknown) => false,
  // Default to 'ask' (fail-closed) instead of 'allow' (fail-open).
  // This makes checkPermissions consistent with the other fail-closed defaults
  // (isConcurrencySafe: false, isReadOnly: false). Tools that should auto-allow
  // must explicitly override checkPermissions.
  checkPermissions: (
    input: Record<string, unknown>,
    _ctx?: ToolContext,
  ): Promise<PermissionResult> =>
    Promise.resolve({ behavior: "ask" as const, updatedInput: input }),
  userFacingName: (_input?: unknown) => "",
};

/**
 * Build a complete Tool from a partial definition, filling in safe defaults.
 *
 * Defaults (fail-closed):
 * - isEnabled → true
 * - isConcurrencySafe → false (assume not safe)
 * - isReadOnly → false (assume writes)
 * - isDestructive → false
 * - checkPermissions → ask (fail-closed; override to 'allow' for auto-permit)
 * - userFacingName → tool.name
 *
 * @example
 * ```ts
 * const myTool = buildTool({
 * name: 'grep',
 * inputSchema: { type: 'object', properties: { pattern: { type: 'string' } } },
 * maxResultChars: 50_000,
 * describe: (input) => `Search for "${input.pattern}"`,
 * async call(input, ctx) {
 * const result = await ctx.exec?.(`grep -rn "${input.pattern}" .`);
 * return { data: result?.stdout ?? '' };
 * },
 * isReadOnly: () => true,
 * isConcurrencySafe: () => true,
 * });
 * ```
 */
export function buildTool<Input = Record<string, unknown>, Output = unknown>(
  def: ToolDef<Input, Output>,
): Tool<Input, Output> {
  return {
    ...TOOL_DEFAULTS,
    userFacingName: () => def.name,
    ...def,
  } as Tool<Input, Output>;
}

/**
 * Find a tool by name or alias from a tools array.
 */
export function findToolByName(tools: readonly Tool[], name: string): Tool | undefined {
  return tools.find((t) => t.name === name || (t.aliases?.includes(name) ?? false));
}
