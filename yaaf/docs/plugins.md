# Plugin & Adapter Architecture

Every external YAAF capability — memory, browser, filesystem, MCP — is a plugin implementing a typed adapter interface. No integration is hardcoded into the core. Swap, compose, or mock any capability without changing agent code.

---

## Architecture

```
                    PluginHost
              ┌──────────────────────────┐
              │  register(plugin)         │
              │  getAdapter<T>(capability)│
              │  getAllTools()            │
              │  gatherContext(query)     │
              │  destroyAll()            │
              └──────┬───────────────────┘
                     │ holds
        ┌────────────┼─────────────┐
        ▼            ▼             ▼
   HonchoPlugin  AgentFSPlugin  CamoufoxPlugin
   (memory)      (fs + tools)   (browser + tools)
        │            │             │
        ▼            ▼             ▼
  MemoryAdapter  FileSystemAdapter + ToolProvider
                                BrowserAdapter + ToolProvider
```

**Capability interfaces:**

| Interface | Provided by | What it unlocks |
|---|---|---|
| `MemoryAdapter` | `MemoryStore`, `HonchoPlugin` | `save`, `get`, `search`, `buildPrompt` |
| `BrowserAdapter` | `CamoufoxPlugin` | `navigate`, `click`, `extract`, `screenshot` |
| `FileSystemAdapter` | `AgentFSPlugin` | `read`, `write`, `list`, `tree` |
| `ToolProvider` | `AgentFSPlugin`, `CamoufoxPlugin`, `McpPlugin` | Exposes native YAAF tools to agents |
| `ContextProvider` | `HonchoPlugin`, `AgentFSPlugin` | Injects context into prompt assembly |

---

## Using the Plugin Host

```typescript
import {
  PluginHost,
  HonchoPlugin,
  AgentFSPlugin,
  CamoufoxPlugin,
  type MemoryAdapter,
  type BrowserAdapter,
  type FileSystemAdapter,
} from 'yaaf';

const host = new PluginHost();

await host.register(new HonchoPlugin({
  apiKey:      process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
}));
await host.register(new AgentFSPlugin());
await host.register(new CamoufoxPlugin({ headless: true }));

// Get adapters by capability type
const memory  = host.getAdapter<MemoryAdapter>('memory')!;
const browser = host.getAdapter<BrowserAdapter>('browser')!;
const fs      = host.getAdapter<FileSystemAdapter>('filesystem')!;

// Collect ALL tools from ALL registered ToolProvider plugins
const tools = host.getAllTools();
// → [agentfs_read, agentfs_write, browser_navigate, browser_click, ...]

// Gather context sections from all ContextProvider plugins
const context = await host.gatherContext('current user query');

await host.destroyAll(); // graceful shutdown (close connections, flush state)
```

---

## Built-in Plugins

### HonchoPlugin — Cloud memory + user modeling

```typescript
import { HonchoPlugin } from 'yaaf';

const honcho = new HonchoPlugin({
  apiKey:      process.env.HONCHO_API_KEY!,
  workspaceId: 'my-workspace',
  userId:      'user-123',          // optional, defaults to 'default'
  sessionId:   'session-abc',       // optional, auto-generated if omitted
});

await honcho.initialize();

// Use as MemoryAdapter
await honcho.save({
  key:     'api_design',
  content: 'RESTful endpoints following OpenAPI 3.1',
  type:    'learning',
});

const results = await honcho.search('API patterns');
// Also returns a generated user representation paragraph
```

### AgentFSPlugin — Virtual filesystem

```typescript
import { AgentFSPlugin } from 'yaaf';

const agentFS = new AgentFSPlugin({
  rootDir:   './agent-workspace',
  vfsPrefix: 'vfs://',     // optional URI prefix for virtual paths
});

await agentFS.initialize();

// Use as FileSystemAdapter
const content = await agentFS.read('vfs://notes/session.md');
await agentFS.write('vfs://notes/draft.md', '# Draft\n...');
const entries  = await agentFS.list('vfs://notes/');
const tree     = await agentFS.tree('vfs://', { depth: 3 });

// AgentFSPlugin also exposes tools
const tools = agentFS.getTools();
// → [agentfs_read_file, agentfs_write_file, agentfs_list_dir, agentfs_tree]
```

### CamoufoxPlugin — Anti-detect browser automation

Uses [Camoufox](https://camoufox.com) (headless Firefox with fingerprint spoofing) for web automation that bypasses bot detection.

```typescript
import { CamoufoxPlugin } from 'yaaf';

const browser = new CamoufoxPlugin({
  headless:      true,
  humanizeInput: true,       // realistic typing and mouse movement
  geoip:         true,       // spoof geolocation from IP
  screen:        { maxWidth: 1920, maxHeight: 1080 },
});

await browser.initialize();

// Use as BrowserAdapter
await browser.navigate('https://example.com');
await browser.click('#submit-button');
const text = await browser.extract('main article');
const img  = await browser.screenshot();

// Also exposes tools
const tools = browser.getTools();
// → [browser_navigate, browser_click, browser_type, browser_extract, browser_screenshot]
```

### McpPlugin — Model Context Protocol

Connects to any [MCP](https://modelcontextprotocol.io) server and exposes its tools as native YAAF tools.

```typescript
import { McpPlugin, filesystemMcp, sseMcp } from 'yaaf';

// Shorthand factories
const fsMcp     = filesystemMcp([process.cwd()]);
const remoteMcp = sseMcp({ url: 'https://my-mcp-server.com/sse', name: 'remote' });

// Full configuration
const plugin = new McpPlugin({
  servers: [
    {
      name:      'filesystem',
      transport: 'stdio',
      command:   'npx',
      args:      ['@modelcontextprotocol/server-filesystem', '.'],
    },
    {
      name:      'github',
      transport: 'stdio',
      command:   'npx',
      args:      ['@modelcontextprotocol/server-github'],
      env:       { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
    {
      name:      'myapi',
      transport: 'sse',
      url:       'http://localhost:3001/sse',
    },
  ],
  prefixNames: false,  // add "serverName__" prefix on collision
  timeoutMs:   10_000,
});

const mcpTools = await plugin.connect();
// → [fs_read, fs_write, github_create_pr, github_search_code, ...]

const agent = new Agent({
  tools: [...myTools, ...mcpTools],
  systemPrompt: '...',
});
```

---

## Writing Your Own Plugin

Implement one or more capability interfaces and the base `Plugin` interface:

```typescript
import type {
  Plugin,
  MemoryAdapter,
  MemoryEntry,
  PluginCapability,
} from 'yaaf';

class RedisMemoryPlugin implements Plugin, MemoryAdapter {
  readonly name         = 'redis-memory';
  readonly version      = '1.0.0';
  readonly capabilities: readonly PluginCapability[] = ['memory'];

  private redis!: RedisClient;

  async initialize() {
    this.redis = await createClient().connect();
  }

  async destroy() {
    await this.redis.quit();
  }

  async save(entry: MemoryEntry) {
    await this.redis.set(
      `mem:${entry.key}`,
      JSON.stringify(entry),
      { EX: 60 * 60 * 24 * 30 }, // 30-day TTL
    );
  }

  async get(id: string) {
    const raw = await this.redis.get(`mem:${id}`);
    return raw ? JSON.parse(raw) : null;
  }

  async list() {
    const keys = await this.redis.keys('mem:*');
    return keys.map(k => k.replace('mem:', ''));
  }

  async search(query: string) {
    // Use RediSearch FTS or fallback to SCAN + filter
    const keys = await this.redis.keys('mem:*');
    const entries = await Promise.all(keys.map(k => this.redis.get(k)));
    return entries
      .filter(Boolean)
      .map(e => JSON.parse(e!))
      .filter((e: MemoryEntry) =>
        e.content.toLowerCase().includes(query.toLowerCase())
      );
  }

  buildPrompt(entries: MemoryEntry[]) {
    if (entries.length === 0) return '';
    return `## Memory\n${entries.map(e => `- ${e.key}: ${e.content}`).join('\n')}`;
  }
}

// Drop-in replacement — no other agent code changes needed
const host = new PluginHost();
await host.register(new RedisMemoryPlugin());

const memory = host.getAdapter<MemoryAdapter>('memory')!;
// → RedisMemoryPlugin, fully transparent
```

**Capability checklist for your plugin:**

| Capability | Required methods |
|---|---|
| `memory` | `save`, `get`, `list`, `search`, `buildPrompt` |
| `browser` | `navigate`, `click`, `type`, `extract`, `screenshot` |
| `filesystem` | `read`, `write`, `list`, `tree` |
| `tools` | `getTools()` → `Tool[]` |
| `context` | `gatherContext(query)` → `string` |
