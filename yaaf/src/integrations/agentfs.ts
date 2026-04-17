/**
 * AgentFS Plugin — Virtual filesystem for agent tool registries and shared state
 *
 * Implements: FileSystemAdapter + ToolProvider + ContextProvider
 *
 * @example
 * ```ts
 * const host = new PluginHost();
 * await host.register(new AgentFSPlugin());
 *
 * const fs = host.getAdapter<FileSystemAdapter>('filesystem')!;
 * await fs.write('/workspace/notes.md', '# Findings');
 *
 * // Or use AgentFS-specific features directly
 * const afs = host.getPlugin<AgentFSPlugin>('agentfs')!;
 * afs.mountTools([grepTool, bashTool]);
 * const result = await afs.executeTool('/tools/grep', { pattern: 'TODO' }, ctx);
 * ```
 */

import type {
  PluginCapability,
  FileSystemAdapter,
  ToolProvider,
  ContextProvider,
  FSEntryInfo,
  FSStats,
  ContextSection,
} from "../plugin/types.js";
import { PluginBase } from "../plugin/base.js";
import { buildTool, type Tool, type ToolContext, type ToolResult } from "../tools/tool.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type FSNodeType = "file" | "directory" | "tool" | "symlink";

export type FSEntry = {
  name: string;
  path: string;
  type: FSNodeType;
  size?: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
};

type FSNode =
  | { type: "file"; content: string; metadata?: Record<string, unknown> }
  | { type: "directory"; children: Map<string, FSNode>; metadata?: Record<string, unknown> }
  | { type: "tool"; tool: Tool; metadata?: Record<string, unknown> }
  | { type: "symlink"; target: string; metadata?: Record<string, unknown> };

export type TreeEntry = {
  name: string;
  path: string;
  type: FSNodeType;
  children?: TreeEntry[];
  description?: string;
};

export type AgentFSConfig = {
  /** Maximum file size in bytes (default: 1MB) */
  maxFileSize?: number;
  /** Maximum total storage in bytes (default: 50MB) */
  maxTotalSize?: number;
  /** Enable change tracking (default: true) */
  trackChanges?: boolean;
};

export type FSChange = {
  type: "create" | "update" | "delete";
  path: string;
  timestamp: number;
  agentId?: string;
};

// ── AgentFSPlugin ────────────────────────────────────────────────────────────

/**
 * Single-class AgentFS integration.
 *
 * - Implements FileSystemAdapter for generic FS operations
 * - Implements ToolProvider to expose fs_read/fs_write/fs_list/fs_tree tools
 * - Implements ContextProvider to inject filesystem tree into LLM context
 * - Exposes AgentFS-specific APIs (mountTool, executeTool, symlink, etc.)
 */
export class AgentFSPlugin
  extends PluginBase
  implements FileSystemAdapter, ToolProvider, ContextProvider
{
  override readonly capabilities: readonly PluginCapability[] = [
    "filesystem",
    "tool_provider",
    "context_provider",
  ];

  private root: FSNode = { type: "directory", children: new Map() };
  private readonly maxFileSize: number;
  private readonly maxTotalSize: number;
  private readonly trackChangesEnabled: boolean;
  private totalSize = 0;
  private changes: FSChange[] = [];
  /** W8-06: Maximum number of change records to retain (ring-buffer eviction). */
  private readonly maxChanges: number;
  private cachedTools: Tool[] | null = null;

  constructor(config: AgentFSConfig = {}) {
    super("agentfs", ["filesystem", "tool_provider", "context_provider"]);
    this.maxFileSize = config.maxFileSize ?? 1_048_576;
    this.maxTotalSize = config.maxTotalSize ?? 52_428_800;
    this.trackChangesEnabled = config.trackChanges ?? true;
    // W8-06: configurable cap on change history (default 10,000)
    this.maxChanges = (config as AgentFSConfig & { maxChanges?: number }).maxChanges ?? 10_000;

    // Create default directories
    this.mkdirSync("/tools");
    this.mkdirSync("/workspace");
    this.mkdirSync("/artifacts");
    this.mkdirSync("/memory");
  }

  // ── Plugin Lifecycle ─────────────────────────────────────────────────────
  // Provided by PluginBase: initialize(), destroy(), healthCheck()

  // ── Path Utilities (private) ─────────────────────────────────────────────

  private normalizePath(path: string): string {
    return "/" + path.split("/").filter(Boolean).join("/");
  }

  private getParentPath(path: string): string {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }

  private getBasename(path: string): string {
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  }

  private resolve(
    path: string,
    _depth = 0,
  ): {
    node: FSNode | undefined;
    parent: FSNode | undefined;
    name: string;
  } {
    // Guard against symlink cycles by tracking recursion depth.
    // Creating a cycle (A -> B -> A) via symlink() previously caused unbounded
    // recursion until Node.js threw RangeError: Maximum call stack size exceeded,
    // crashing the agent process. We now throw a descriptive error at depth 20.
    const MAX_SYMLINK_DEPTH = 20;
    if (_depth > MAX_SYMLINK_DEPTH) {
      throw new Error(
        `AgentFS: max symlink depth (${MAX_SYMLINK_DEPTH}) exceeded at path "${path}". ` +
          "This usually indicates a symlink cycle.",
      );
    }

    const normalized = this.normalizePath(path);
    if (normalized === "/") return { node: this.root, parent: undefined, name: "" };

    const parts = normalized.split("/").filter(Boolean);
    let current = this.root;
    let parent: FSNode | undefined;

    for (let i = 0; i < parts.length; i++) {
      if (current.type !== "directory") {
        return { node: undefined, parent: undefined, name: parts[i]! };
      }
      parent = current;
      const child = current.children.get(parts[i]!);

      if (i === parts.length - 1) return { node: child, parent, name: parts[i]! };
      if (!child) return { node: undefined, parent: undefined, name: parts[i]! };

      if (child.type === "symlink") {
        // Pass incremented depth to detect cycles.
        const resolved = this.resolve(child.target, _depth + 1);
        if (!resolved.node || resolved.node.type !== "directory") {
          return { node: undefined, parent, name: parts[i]! };
        }
        current = resolved.node;
      } else {
        current = child;
      }
    }
    return { node: current, parent, name: parts[parts.length - 1]! };
  }

  private mkdirSync(path: string): void {
    const parts = this.normalizePath(path).split("/").filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (current.type !== "directory") return;
      if (!current.children.has(part)) {
        current.children.set(part, { type: "directory", children: new Map() });
      }
      const child = current.children.get(part)!;
      if (child.type !== "directory") return;
      current = child;
    }
  }

  // ── FileSystemAdapter Implementation ─────────────────────────────────────

  async read(path: string): Promise<string | null> {
    const { node } = this.resolve(path);
    if (!node) return null;
    if (node.type === "file") return node.content;
    if (node.type === "tool") {
      return `[Tool: ${node.tool.name}]\nSchema: ${JSON.stringify(node.tool.inputSchema, null, 2)}`;
    }
    return null;
  }

  async write(path: string, content: string, agentId?: string): Promise<void> {
    const contentSize = Buffer.byteLength(content, "utf-8");
    if (contentSize > this.maxFileSize) {
      throw new Error(`File exceeds maximum size: ${contentSize} > ${this.maxFileSize}`);
    }

    const normalized = this.normalizePath(path);
    const parentPath = this.getParentPath(normalized);
    const name = this.getBasename(normalized);

    this.mkdirSync(parentPath);
    const { parent } = this.resolve(parentPath + "/" + name);
    if (!parent || parent.type !== "directory") {
      throw new Error(`Cannot write to ${path}: parent is not a directory`);
    }

    const existing = parent.children.get(name);
    if (existing?.type === "file") {
      this.totalSize -= Buffer.byteLength(existing.content, "utf-8");
    }
    if (this.totalSize + contentSize > this.maxTotalSize) {
      throw new Error(
        `Storage quota exceeded: ${this.totalSize + contentSize} > ${this.maxTotalSize}`,
      );
    }

    parent.children.set(name, { type: "file", content });
    this.totalSize += contentSize;

    if (this.trackChangesEnabled) {
      this.pushChange({
        type: existing ? "update" : "create",
        path: normalized,
        timestamp: Date.now(),
        agentId,
      });
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.resolve(path).node !== undefined;
  }

  async remove(path: string, agentId?: string): Promise<boolean> {
    const normalized = this.normalizePath(path);
    const parentPath = this.getParentPath(normalized);
    const name = this.getBasename(normalized);

    const { node: parent } = this.resolve(parentPath);
    if (!parent || parent.type !== "directory") return false;

    const target = parent.children.get(name);
    if (!target) return false;
    if (target.type === "directory" && target.children.size > 0) return false;

    if (target.type === "file") {
      this.totalSize -= Buffer.byteLength(target.content, "utf-8");
    }
    parent.children.delete(name);

    if (this.trackChangesEnabled) {
      this.pushChange({ type: "delete", path: normalized, timestamp: Date.now(), agentId });
    }
    return true;
  }

  async list(path: string): Promise<FSEntryInfo[]> {
    const { node } = this.resolve(path);
    if (!node || node.type !== "directory") return [];

    const entries: FSEntryInfo[] = [];
    for (const [name, child] of node.children) {
      entries.push({
        name,
        path: `${this.normalizePath(path)}/${name}`.replace("//", "/"),
        type: child.type,
        size: child.type === "file" ? Buffer.byteLength(child.content, "utf-8") : undefined,
      });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async mkdir(path: string): Promise<void> {
    this.mkdirSync(path);
  }

  toPrompt(path: string = "/"): string {
    const treeEntries = this.tree(path);
    const lines: string[] = ["```", `AgentFS: ${path}`];

    const renderTree = (entries: TreeEntry[], indent: string = "") => {
      for (let i = 0; i < entries.length; i++) {
        const isLast = i === entries.length - 1;
        const prefix = indent + (isLast ? "└── " : "├── ");
        const childIndent = indent + (isLast ? " " : "│ ");

        let label = entries[i]!.name;
        if (entries[i]!.type === "tool") label += " [tool]";
        if (entries[i]!.type === "symlink") label += " → ...";
        lines.push(`${prefix}${label}`);

        if (entries[i]!.children) renderTree(entries[i]!.children!, childIndent);
      }
    };

    renderTree(treeEntries);
    lines.push("```");
    return lines.join("\n");
  }

  getStats(): FSStats {
    let fileCount = 0;
    const walk = (node: FSNode) => {
      if (node.type === "directory") {
        for (const child of node.children.values()) walk(child);
      } else if (node.type === "file") {
        fileCount++;
      }
    };
    walk(this.root);
    return {
      totalSize: this.totalSize,
      maxSize: this.maxTotalSize,
      usagePercent: Math.round((this.totalSize / this.maxTotalSize) * 100),
      fileCount,
    };
  }

  // ── ToolProvider Implementation ──────────────────────────────────────────

  getTools(): Tool[] {
    if (this.cachedTools) return this.cachedTools;

    const self = this;

    this.cachedTools = [
      buildTool({
        name: "fs_read",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "Path to read" } },
          required: ["path"],
        },
        maxResultChars: 100_000,
        describe: (input) => `Read ${(input as Record<string, unknown>).path}`,
        async call(input: Record<string, unknown>) {
          const content = await self.read(input.path as string);
          return { data: content ?? "[File not found]" };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
      }),

      buildTool({
        name: "fs_write",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to write" },
            content: { type: "string", description: "File content" },
          },
          required: ["path", "content"],
        },
        maxResultChars: 500,
        describe: (input) => `Write to ${(input as Record<string, unknown>).path}`,
        async call(input: Record<string, unknown>) {
          await self.write(input.path as string, input.content as string);
          return { data: { success: true, path: input.path } };
        },
      }),

      buildTool({
        name: "fs_list",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "Directory to list (default: /)" } },
        },
        maxResultChars: 10_000,
        describe: (input) => `List ${(input as Record<string, unknown>).path ?? "/"}`,
        async call(input: Record<string, unknown>) {
          const entries = await self.list((input.path as string) ?? "/");
          return { data: entries };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
      }),

      buildTool({
        name: "fs_tree",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "Root path (default: /)" } },
        },
        maxResultChars: 20_000,
        describe: () => "Show filesystem tree",
        async call(input: Record<string, unknown>) {
          return { data: self.toPrompt((input.path as string) ?? "/") };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
      }),
    ];

    return this.cachedTools;
  }

  // ── ContextProvider Implementation ───────────────────────────────────────

  async getContextSections(
    _query: string,
    _existingContext?: Record<string, string>,
  ): Promise<ContextSection[]> {
    return [
      {
        key: "agentfs_tree",
        content: this.toPrompt("/"),
        placement: "system",
        priority: 5,
      },
    ];
  }

  // ── AgentFS-Specific APIs ────────────────────────────────────────────────

  /** Get a recursive tree starting from path */
  tree(path: string = "/", maxDepth: number = 5): TreeEntry[] {
    const { node } = this.resolve(path);
    if (!node || node.type !== "directory") return [];
    return this.buildTree(node, this.normalizePath(path), 0, maxDepth);
  }

  private buildTree(
    node: FSNode,
    parentPath: string,
    depth: number,
    maxDepth: number,
  ): TreeEntry[] {
    if (node.type !== "directory" || depth >= maxDepth) return [];
    const entries: TreeEntry[] = [];
    for (const [name, child] of node.children) {
      const fullPath = `${parentPath}/${name}`.replace("//", "/");
      const entry: TreeEntry = { name, path: fullPath, type: child.type };
      if (child.type === "tool") entry.description = child.tool.name;
      if (child.type === "directory")
        entry.children = this.buildTree(child, fullPath, depth + 1, maxDepth);
      entries.push(entry);
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Mount a tool at a path in the virtual filesystem */
  mountTool(path: string, tool: Tool): void {
    const normalized = this.normalizePath(path);
    const parentPath = this.getParentPath(normalized);
    const name = this.getBasename(normalized);
    this.mkdirSync(parentPath);
    const { node: parent } = this.resolve(parentPath);
    if (!parent || parent.type !== "directory") {
      throw new Error(`Cannot mount tool at ${path}: parent is not a directory`);
    }
    parent.children.set(name, {
      type: "tool",
      tool,
      metadata: { inputSchema: tool.inputSchema, isReadOnly: tool.isReadOnly({}) },
    });
    this.cachedTools = null;
  }

  /** Mount multiple tools, auto-generating paths from tool names */
  mountTools(tools: readonly Tool[], basePath: string = "/tools"): void {
    for (const tool of tools) this.mountTool(`${basePath}/${tool.name}`, tool);
  }

  /** Get a tool by its mounted path */
  getTool(path: string): Tool | null {
    const { node } = this.resolve(path);
    return node?.type === "tool" ? node.tool : null;
  }

  /** Execute a mounted tool by path */
  async executeTool(
    path: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult | null> {
    const tool = this.getTool(path);
    if (!tool) return null;
    return await tool.call(input, context);
  }

  /** Discover all mounted tools */
  discoverTools(basePath: string = "/tools"): Array<{
    path: string;
    name: string;
    description: string;
    isReadOnly: boolean;
  }> {
    const entries = this.tree(basePath, 1);
    const tools: Array<{ path: string; name: string; description: string; isReadOnly: boolean }> =
      [];
    for (const entry of entries) {
      if (entry.type === "tool") {
        const tool = this.getTool(entry.path);
        if (tool) {
          tools.push({
            path: entry.path,
            name: tool.name,
            description: tool.userFacingName(undefined),
            isReadOnly: tool.isReadOnly({}),
          });
        }
      }
    }
    return tools;
  }

  /** Create a symlink */
  symlink(source: string, target: string): void {
    const normalized = this.normalizePath(source);
    const parentPath = this.getParentPath(normalized);
    const name = this.getBasename(normalized);
    this.mkdirSync(parentPath);
    const { node: parent } = this.resolve(parentPath);
    if (!parent || parent.type !== "directory") return;
    parent.children.set(name, { type: "symlink", target });
  }

  /** Get recent changes, optionally filtered by agent */
  getChanges(agentId?: string, since?: number): FSChange[] {
    let filtered = this.changes;
    if (agentId) filtered = filtered.filter((c) => c.agentId === agentId);
    if (since) filtered = filtered.filter((c) => c.timestamp >= since);
    return filtered;
  }

  /** Clear change history */
  clearChanges(): void {
    this.changes = [];
  }

  /**
   * Ring-buffer push for change records.
   * Evicts the oldest half when the array reaches maxChanges to bound memory usage.
   */
  private pushChange(change: FSChange): void {
    if (this.changes.length >= this.maxChanges) {
      // Evict oldest half to amortize the cost of the splice over many pushes.
      this.changes = this.changes.slice(Math.floor(this.maxChanges / 2));
    }
    this.changes.push(change);
  }
}
