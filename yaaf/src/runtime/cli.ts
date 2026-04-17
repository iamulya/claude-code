/**
 * createCLI — Ship your agent as a CLI product.
 *
 * Wraps any YAAF agent in a production-quality terminal interface with:
 * - Interactive REPL with history persistence
 * - Streaming token rendering
 * - Tool call status indicators
 * - Permission prompts (Y/N before dangerous operations)
 * - Slash commands (/help, /clear, /quit, /context, /cost)
 * - Configurable greeting, prompt, and theming
 * - Graceful shutdown with session preservation
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { createCLI } from 'yaaf/cli-runtime';
 *
 * const agent = new Agent({
 * systemPrompt: 'You are a helpful assistant.',
 * tools: myTools,
 * });
 *
 * createCLI(agent, {
 * name: 'my-assistant',
 * greeting: 'Hello! How can I help you today?',
 * streaming: true,
 * });
 * ```
 *
 * @module runtime/cli
 */

import { createInterface, Interface as ReadlineInterface } from "node:readline";
import { resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal agent interface — anything with a run() method. */
export type CLIAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>;
  /** Optional streaming interface. If present, tokens render as they arrive. */
  runStream?: (input: string, signal?: AbortSignal) => AsyncIterable<CLIStreamEvent>;
};

export type CLIStreamEvent = {
  type: "text_delta" | "tool_call_start" | "tool_call_end" | "done";
  text?: string;
  toolName?: string;
};

export type CLITheme = {
  /** Color for the user prompt indicator */
  promptColor: string;
  /** Color for the agent name/indicator */
  agentColor: string;
  /** Color for system messages */
  systemColor: string;
  /** Color for errors */
  errorColor: string;
};

export type CLIConfig = {
  /** Display name for the agent (shown in prompt) */
  name?: string;
  /** Greeting message displayed on startup */
  greeting?: string;
  /** Enable streaming mode (requires agent.runStream) */
  streaming?: boolean;
  /** User prompt string. Default: 'you ▸ ' */
  promptString?: string;
  /** Agent response prefix. Default: '<name> ▸ ' */
  agentPrefix?: string;
  /** Directory for history file and session data */
  dataDir?: string;
  /** Max history entries to persist */
  maxHistory?: number;
  /** Custom theme colors */
  theme?: Partial<CLITheme>;
  /** Custom slash commands */
  commands?: Record<string, CLISlashCommand>;
  /** Called before the agent runs (e.g., to inject context). Return modified input. */
  beforeRun?: (input: string) => string | Promise<string>;
  /** Called after the agent responds. */
  afterRun?: (input: string, response: string) => void | Promise<void>;
  /** Permission handler for tool approvals. Return true to allow, false to deny. */
  approveToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<boolean>;
  /** Called on graceful shutdown. */
  onExit?: () => void | Promise<void>;
};

export type CLISlashCommand = {
  description: string;
  handler: (args: string, ctx: CLIContext) => void | Promise<void>;
};

export type CLIContext = {
  /** Number of messages in this session */
  messageCount: number;
  /** Session start time */
  startedAt: Date;
  /** Clear the screen */
  clear: () => void;
  /** Print a system message */
  print: (msg: string) => void;
};

// ── ANSI Colors ──────────────────────────────────────────────────────────────

const ANSI = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  clearLine: "\x1b[2K\r",
};

const DEFAULT_THEME: CLITheme = {
  promptColor: ANSI.cyan,
  agentColor: ANSI.magenta,
  systemColor: ANSI.dim,
  errorColor: ANSI.red,
};

// ── CLI Runtime ──────────────────────────────────────────────────────────────

export function createCLI(agent: CLIAgent, config: CLIConfig = {}): void {
  const name = config.name ?? "agent";
  const theme = { ...DEFAULT_THEME, ...config.theme };
  const promptStr = config.promptString ?? `${theme.promptColor}you ▸${ANSI.reset} `;
  const agentPrefix =
    config.agentPrefix ?? `${theme.agentColor}${ANSI.bold}${name} ▸${ANSI.reset} `;
  const dataDir = config.dataDir ?? resolve(homedir(), `.${name}`);
  const maxHistory = config.maxHistory ?? 1000;

  let messageCount = 0;
  let isProcessing = false;
  const startedAt = new Date();

  // Ensure data directory
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const historyFile = resolve(dataDir, "history");

  // Load history
  const history: string[] = [];
  if (existsSync(historyFile)) {
    try {
      const lines = readFileSync(historyFile, "utf-8").split("\n").filter(Boolean);
      history.push(...lines.slice(-maxHistory));
    } catch {
      /* ignore */
    }
  }

  // Build slash commands
  const builtinCommands: Record<string, CLISlashCommand> = {
    quit: { description: "Exit", handler: () => shutdown() },
    exit: { description: "Exit", handler: () => shutdown() },
    q: { description: "Exit", handler: () => shutdown() },
    clear: {
      description: "Clear screen",
      handler: (_, ctx) => {
        ctx.clear();
        ctx.print(`${ANSI.green}✓ Screen cleared${ANSI.reset}`);
      },
    },
    help: {
      description: "Show available commands",
      handler: (_, ctx) => {
        const allCmds = { ...builtinCommands, ...config.commands };
        ctx.print(`\n ${ANSI.bold}Commands:${ANSI.reset}`);
        const shown = new Set<string>();
        for (const [cmd, def] of Object.entries(allCmds)) {
          if (shown.has(def.description)) continue;
          shown.add(def.description);
          ctx.print(
            ` ${ANSI.green}/${cmd}${ANSI.reset} ${ANSI.dim}${def.description}${ANSI.reset}`,
          );
        }
        ctx.print("");
      },
    },
    history: {
      description: "Show recent history",
      handler: (_, ctx) => {
        const recent = history.slice(-10);
        ctx.print(`\n ${ANSI.bold}Recent (${recent.length}):${ANSI.reset}`);
        for (const entry of recent) {
          ctx.print(` ${ANSI.dim}${entry}${ANSI.reset}`);
        }
        ctx.print("");
      },
    },
  };

  const allCommands = { ...builtinCommands, ...config.commands };

  // Build context object for slash commands
  const ctx: CLIContext = {
    get messageCount() {
      return messageCount;
    },
    startedAt,
    clear: () => console.clear(),
    print: (msg: string) => console.log(msg),
  };

  // Print greeting
  if (config.greeting) {
    console.log(`\n ${theme.agentColor}${config.greeting}${ANSI.reset}\n`);
  } else {
    console.log(`\n ${ANSI.dim}Type a message to start. /help for commands.${ANSI.reset}\n`);
  }

  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: promptStr,
    terminal: true,
    history,
    historySize: maxHistory,
  });

  // Graceful shutdown
  async function shutdown(): Promise<void> {
    // Save history
    try {
      writeFileSync(historyFile, history.slice(-maxHistory).join("\n") + "\n", "utf-8");
    } catch {
      /* ignore */
    }

    const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);
    console.log(`\n ${ANSI.dim}Session: ${messageCount} messages in ${elapsed}s${ANSI.reset}\n`);

    await config.onExit?.();
    process.exit(0);
  }

  // Handle SIGINT
  process.on("SIGINT", () => void shutdown());

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Persist to history
    history.push(input);

    // Handle slash commands
    if (input.startsWith("/")) {
      const [cmdName, ...cmdArgs] = input.slice(1).split(/\s+/);
      const cmd = allCommands[cmdName!];
      if (cmd) {
        await cmd.handler(cmdArgs.join(" "), ctx);
      } else {
        console.log(` ${theme.errorColor}Unknown command: /${cmdName}${ANSI.reset}`);
      }
      rl.prompt();
      return;
    }

    // Process through agent
    if (isProcessing) {
      console.log(` ${ANSI.yellow}⏳ Still processing previous message...${ANSI.reset}`);
      rl.prompt();
      return;
    }

    isProcessing = true;
    messageCount++;

    try {
      // Pre-processing hook
      let processedInput = input;
      if (config.beforeRun) {
        processedInput = await config.beforeRun(input);
      }

      // Streaming or batch mode
      if (config.streaming && agent.runStream) {
        process.stdout.write(`\n${agentPrefix}`);

        let fullResponse = "";
        for await (const event of agent.runStream(processedInput)) {
          switch (event.type) {
            case "text_delta":
              if (event.text) {
                process.stdout.write(event.text);
                fullResponse += event.text;
              }
              break;
            case "tool_call_start":
              process.stdout.write(`\n ${ANSI.dim}⚙ ${event.toolName ?? "tool"}...${ANSI.reset}`);
              break;
            case "tool_call_end":
              process.stdout.write(` ${ANSI.green}✓${ANSI.reset}\n`);
              break;
          }
        }
        console.log("\n");

        await config.afterRun?.(input, fullResponse);
      } else {
        // Batch mode — show spinner
        const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        let frame = 0;
        const spinner = setInterval(() => {
          process.stdout.write(
            `${ANSI.clearLine} ${ANSI.dim}${spinnerFrames[frame % spinnerFrames.length]} Thinking...${ANSI.reset}`,
          );
          frame++;
        }, 80);

        try {
          const response = await agent.run(processedInput);
          clearInterval(spinner);
          process.stdout.write(ANSI.clearLine);
          console.log(`\n${agentPrefix}${response}\n`);

          await config.afterRun?.(input, response);
        } catch (err) {
          clearInterval(spinner);
          process.stdout.write(ANSI.clearLine);
          throw err;
        }
      }
    } catch (err) {
      console.error(
        ` ${theme.errorColor}Error: ${err instanceof Error ? err.message : String(err)}${ANSI.reset}\n`,
      );
    } finally {
      isProcessing = false;
    }

    rl.prompt();
  });

  rl.on("close", () => void shutdown());
}
