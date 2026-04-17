/**
 * Camoufox Plugin — Stealth browser automation for agent web actions
 *
 * Implements: BrowserAdapter + ToolProvider
 *
 * @example
 * ```ts
 * const host = new PluginHost();
 * await host.register(new CamoufoxPlugin({ headless: true }));
 *
 * const browser = host.getAdapter<BrowserAdapter>('browser')!;
 * const page = await browser.navigate('https://example.com');
 *
 * // Tools auto-provided to agents
 * const tools = host.getAllTools();
 * // → [web_browse, web_screenshot, web_click, web_type, web_extract]
 * ```
 */

import { spawn, type ChildProcess } from "child_process";
import type {
  PluginCapability,
  BrowserAdapter,
  ToolProvider,
  ContextProvider,
  ContextSection,
  NavigateOptions,
  PageContent,
  ScreenshotOptions,
  ScreenshotData,
} from "../plugin/types.js";
import { PluginBase } from "../plugin/base.js";
import { buildTool, type Tool } from "../tools/tool.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type CamoufoxConfig = {
  pythonPath?: string;
  host?: string;
  port?: number;
  headless?: boolean;
  virtualDisplay?: boolean;
  proxy?: { server: string; username?: string; password?: string };
  fingerprint?: Record<string, unknown>;
  geolocation?: { latitude: number; longitude: number };
  locale?: string;
  blockImages?: boolean;
  blockWebRTC?: boolean;
  addons?: string[];
  startupTimeoutMs?: number;
  /** Prefix for generated tool names (default: 'web') */
  toolPrefix?: string;
  /** Auto-start browser on plugin init (default: false) */
  autoStart?: boolean;
};

export type ElementInfo = {
  selector: string;
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  isVisible: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

// ── RPC Client ───────────────────────────────────────────────────────────────

async function rpcCall(
  host: string,
  port: number,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 30_000,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`http://${host}:${port}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: controller.signal,
    });
    const result = (await response.json()) as {
      result?: unknown;
      error?: { code: number; message: string };
    };
    if (result.error) throw new Error(`Camoufox RPC error: ${result.error.message}`);
    return result.result;
  } finally {
    clearTimeout(timer);
  }
}

// ── CamoufoxPlugin ───────────────────────────────────────────────────────────

/**
 * Single-class Camoufox integration.
 *
 * - Implements BrowserAdapter for generic browser operations
 * - Implements ToolProvider to expose web_browse/web_click/etc. tools
 * - Exposes Camoufox-specific APIs (cookies, evaluate JS, query elements)
 */
export class CamoufoxPlugin
  extends PluginBase
  implements BrowserAdapter, ToolProvider, ContextProvider
{
  override readonly capabilities: readonly PluginCapability[] = [
    "browser",
    "tool_provider",
    "context_provider",
  ];

  private process: ChildProcess | null = null;
  private isRunning = false;
  private cachedTools: Tool[] | null = null;

  private readonly pythonPath: string;
  private readonly rpcHost: string;
  private readonly rpcPort: number;
  private readonly headless: boolean;
  private readonly virtualDisplay: boolean;
  private readonly proxy: { server: string; username?: string; password?: string };
  private readonly fingerprint: Record<string, unknown>;
  private readonly locale: string;
  private readonly blockImages: boolean;
  private readonly blockWebRTC: boolean;
  private readonly addons: string[];
  private readonly startupTimeoutMs: number;
  private readonly toolPrefix: string;
  private readonly autoStartEnabled: boolean;

  constructor(config: CamoufoxConfig = {}) {
    super("camoufox", ["browser", "tool_provider"]);
    this.pythonPath = config.pythonPath ?? "python3";
    this.rpcHost = config.host ?? "127.0.0.1";
    this.rpcPort = config.port ?? 9222;
    this.headless = config.headless ?? true;
    this.virtualDisplay = config.virtualDisplay ?? false;
    this.proxy = config.proxy ?? { server: "" };
    this.fingerprint = config.fingerprint ?? {};
    this.locale = config.locale ?? "";
    this.blockImages = config.blockImages ?? false;
    this.blockWebRTC = config.blockWebRTC ?? false;
    this.addons = config.addons ?? [];
    this.startupTimeoutMs = config.startupTimeoutMs ?? 30_000;
    this.toolPrefix = config.toolPrefix ?? "web";
    this.autoStartEnabled = config.autoStart ?? false;
  }

  private rpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isRunning) throw new Error("Camoufox not running. Call start() first.");
    return rpcCall(this.rpcHost, this.rpcPort, method, params);
  }

  // ── Plugin Lifecycle ─────────────────────────────────────────────────────

  override async initialize(): Promise<void> {
    if (this.autoStartEnabled) await this.start();
  }

  override async destroy(): Promise<void> {
    if (this.isRunning) await this.stop();
  }

  override async healthCheck(): Promise<boolean> {
    if (!this.autoStartEnabled && !this.isRunning) return true;
    return this.isRunning;
  }

  // ── BrowserAdapter Implementation ────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isRunning) return;

    const args = ["-m", "camoufox.serve", "--host", this.rpcHost, "--port", String(this.rpcPort)];
    if (this.headless) args.push("--headless");
    if (this.virtualDisplay) args.push("--virtual-display");
    if (this.proxy.server) {
      args.push("--proxy", this.proxy.server);
      if (this.proxy.username) args.push("--proxy-username", this.proxy.username);
      if (this.proxy.password) args.push("--proxy-password", this.proxy.password);
    }
    if (this.blockImages) args.push("--block-images");
    if (this.blockWebRTC) args.push("--block-webrtc");
    if (this.locale) args.push("--locale", this.locale);
    for (const addon of this.addons) args.push("--addon", addon);
    if (Object.keys(this.fingerprint).length > 0) {
      args.push("--config", JSON.stringify(this.fingerprint));
    }

    this.process = spawn(this.pythonPath, args, { stdio: ["pipe", "pipe", "pipe"] });

    const deadline = Date.now() + this.startupTimeoutMs;
    while (Date.now() < deadline) {
      try {
        await rpcCall(this.rpcHost, this.rpcPort, "ping", {}, 2000);
        this.isRunning = true;
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw new Error(`Camoufox failed to start within ${this.startupTimeoutMs}ms`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    try {
      await this.rpc("shutdown");
    } catch {
      /* may be gone */
    }
    this.process?.kill("SIGTERM");
    this.process = null;
    this.isRunning = false;
  }

  get running(): boolean {
    return this.isRunning;
  }

  async navigate(url: string, opts?: NavigateOptions): Promise<PageContent> {
    if (!this.isRunning) await this.start();
    return (await this.rpc("navigate", {
      url,
      wait_until: opts?.waitUntil ?? "domcontentloaded",
      extract_html: opts?.extractHtml ?? false,
    })) as PageContent;
  }

  async screenshot(opts?: ScreenshotOptions): Promise<ScreenshotData> {
    if (!this.isRunning) throw new Error("Browser not running");
    return (await this.rpc("screenshot", {
      full_page: opts?.fullPage ?? false,
      selector: opts?.selector,
    })) as ScreenshotData;
  }

  async click(selector: string): Promise<void> {
    await this.rpc("click", { selector });
  }
  async type(selector: string, text: string): Promise<void> {
    await this.rpc("type", { selector, text });
  }
  async scroll(direction: "up" | "down", amount: number = 300): Promise<void> {
    await this.rpc("scroll", { direction, amount });
  }
  async waitForSelector(selector: string, timeoutMs: number = 10_000): Promise<boolean> {
    return (await this.rpc("wait_for_selector", { selector, timeout: timeoutMs })) as boolean;
  }
  async getUrl(): Promise<string> {
    return (await this.rpc("get_url")) as string;
  }
  async evaluate(expression: string): Promise<unknown> {
    return await this.rpc("evaluate", { expression });
  }

  asTools(prefix?: string): Tool[] {
    const p = prefix ?? this.toolPrefix;
    return this.buildTools(p);
  }

  // ── ToolProvider Implementation ──────────────────────────────────────────

  getTools(): Tool[] {
    if (!this.cachedTools) this.cachedTools = this.buildTools(this.toolPrefix);
    return this.cachedTools;
  }

  // ── ContextProvider Implementation ──────────────────────────────────────

  /**
   * Contributes current page title, URL, and text content as agent context.
   * Only active when the browser is running. Allows the agent to passively
   * "see" the current page without an explicit tool call.
   */
  async getContextSections(_query: string): Promise<ContextSection[]> {
    if (!this.isRunning) return [];
    try {
      const [url, title, text] = await Promise.all([
        this.getUrl().catch(() => ""),
        this.getTitle().catch(() => ""),
        this.getTextContent().catch(() => ""),
      ]);
      if (!url) return [];
      const truncated = text.length > 8_000 ? text.slice(0, 8_000) + "\n[truncated]" : text;
      return [
        {
          key: "browser_context",
          content: `## Current Browser Page\n**URL:** ${url}\n**Title:** ${title}\n\n${truncated}`,
          priority: 30,
          placement: "system" as const,
        },
      ];
    } catch {
      return [];
    }
  }

  private buildTools(prefix: string): Tool[] {
    const browser = this;

    return [
      buildTool({
        name: `${prefix}_browse`,
        aliases: [`${prefix}_navigate`, `${prefix}_goto`],
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to navigate to" },
            extract_html: { type: "boolean", description: "Include raw HTML in results" },
          },
          required: ["url"],
        },
        maxResultChars: 100_000,
        describe: (input) => `Browse to ${(input as Record<string, unknown>).url}`,
        async call(input: Record<string, unknown>) {
          const result = await browser.navigate(input.url as string, {
            extractHtml: input.extract_html as boolean | undefined,
          });
          return { data: result };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => false,
      }),

      buildTool({
        name: `${prefix}_screenshot`,
        inputSchema: {
          type: "object",
          properties: {
            full_page: { type: "boolean", description: "Full page or viewport only" },
            selector: { type: "string", description: "CSS selector for specific element" },
          },
        },
        maxResultChars: 500,
        describe: () => "Take a screenshot of the current page",
        async call(input: Record<string, unknown>) {
          return {
            data: await browser.screenshot({
              fullPage: input.full_page as boolean | undefined,
              selector: input.selector as string | undefined,
            }),
          };
        },
        isReadOnly: () => true,
      }),

      buildTool({
        name: `${prefix}_click`,
        inputSchema: {
          type: "object",
          properties: { selector: { type: "string", description: "CSS selector to click" } },
          required: ["selector"],
        },
        maxResultChars: 1_000,
        describe: (input) => `Click ${(input as Record<string, unknown>).selector}`,
        async call(input: Record<string, unknown>) {
          await browser.click(input.selector as string);
          return { data: { success: true } };
        },
      }),

      buildTool({
        name: `${prefix}_type`,
        inputSchema: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS selector for input" },
            text: { type: "string", description: "Text to type" },
          },
          required: ["selector", "text"],
        },
        maxResultChars: 1_000,
        describe: (input) => `Type into ${(input as Record<string, unknown>).selector}`,
        async call(input: Record<string, unknown>) {
          await browser.type(input.selector as string, input.text as string);
          return { data: { success: true } };
        },
      }),

      buildTool({
        name: `${prefix}_extract`,
        inputSchema: {
          type: "object",
          properties: { selector: { type: "string", description: "CSS selector to query" } },
          required: ["selector"],
        },
        maxResultChars: 50_000,
        describe: (input) =>
          `Extract elements matching ${(input as Record<string, unknown>).selector}`,
        async call(input: Record<string, unknown>) {
          return { data: await browser.queryElements(input.selector as string) };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
      }),
    ];
  }

  // ── Camoufox-Specific APIs ───────────────────────────────────────────────

  async back(): Promise<void> {
    await this.rpc("back");
  }
  async forward(): Promise<void> {
    await this.rpc("forward");
  }
  async reload(): Promise<void> {
    await this.rpc("reload");
  }

  async getTextContent(): Promise<string> {
    return (await this.rpc("get_text_content")) as string;
  }
  async getHtml(): Promise<string> {
    return (await this.rpc("get_html")) as string;
  }
  async getTitle(): Promise<string> {
    return (await this.rpc("get_title")) as string;
  }

  async queryElements(selector: string): Promise<ElementInfo[]> {
    return (await this.rpc("query_elements", { selector })) as ElementInfo[];
  }

  async hover(selector: string): Promise<void> {
    await this.rpc("hover", { selector });
  }
  async select(selector: string, value: string): Promise<void> {
    await this.rpc("select", { selector, value });
  }

  async getCookies(): Promise<Array<{ name: string; value: string; domain: string }>> {
    return (await this.rpc("get_cookies")) as Array<{
      name: string;
      value: string;
      domain: string;
    }>;
  }

  async setCookie(cookie: {
    name: string;
    value: string;
    domain: string;
    path?: string;
  }): Promise<void> {
    await this.rpc("set_cookie", cookie);
  }
}
