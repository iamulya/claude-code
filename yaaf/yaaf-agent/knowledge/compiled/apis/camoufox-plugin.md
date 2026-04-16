---
title: CamoufoxPlugin
entity_type: api
summary: The primary class for Camoufox integration, providing stealth browser operations and automated web tools.
export_name: CamoufoxPlugin
source_file: src/integrations/camoufox.ts
category: class
stub: false
compiled_at: 2026-04-16T14:21:24.157Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/camoufox.ts
confidence: 1
---

## Overview
`CamoufoxPlugin` is a specialized integration class that provides stealth browser automation capabilities to YAAF agents. It serves as a bridge to the Camoufox browser, implementing multiple internal interfaces to allow agents to interact with the web while minimizing detection.

The plugin functions as a `BrowserAdapter` for direct programmatic control, a `ToolProvider` that automatically exposes web-interaction tools (like clicking and typing) to LLM agents, and a `ContextProvider` for managing session state.

## Signature / Constructor

```typescript
export class CamoufoxPlugin extends PluginBase implements BrowserAdapter, ToolProvider, ContextProvider {
  constructor(config?: CamoufoxConfig);
}
```

### CamoufoxConfig
The configuration object allows for fine-grained control over the browser instance and stealth features:

| Property | Type | Description |
| :--- | :--- | :--- |
| `pythonPath` | `string` | Path to the Python executable if required for the Camoufox backend. |
| `host` | `string` | Host address for the browser service. |
| `port` | `number` | Port for the browser service. |
| `headless` | `boolean` | Whether to run the browser in headless mode. |
| `virtualDisplay` | `boolean` | Whether to use a virtual display (useful for Linux environments). |
| `proxy` | `object` | Proxy configuration including `server`, `username`, and `password`. |
| `fingerprint` | `Record<string, unknown>` | Custom browser fingerprint settings. |
| `geolocation` | `object` | Latitude and longitude coordinates. |
| `locale` | `string` | Browser locale setting (e.g., 'en-US'). |
| `blockImages` | `boolean` | If true, prevents images from loading to save bandwidth. |
| `blockWebRTC` | `boolean` | If true, disables WebRTC to prevent IP leaks. |
| `addons` | `string[]` | List of browser extensions to load. |
| `startupTimeoutMs` | `number` | Timeout for the browser startup process. |
| `toolPrefix` | `string` | Prefix for generated tool names (defaults to 'web'). |
| `autoStart` | `boolean` | If true, starts the browser immediately upon plugin initialization. |

## Methods & Properties

### Tool Management
As a `ToolProvider`, the plugin automatically generates and exposes the following tools to the agent:
*   `web_browse`: Navigate to a URL.
*   `web_screenshot`: Capture the current page view.
*   `web_click`: Interact with elements.
*   `web_type`: Input text into fields.
*   `web_extract`: Retrieve structured data or text from the page.

### Browser Operations
The class exposes several APIs for direct browser manipulation:
*   **Cookies**: Methods for getting and setting browser cookies.
*   **JS Evaluation**: Execute arbitrary JavaScript within the page context.
*   **Element Querying**: Query elements to retrieve `ElementInfo` (selector, tag name, visibility, bounding box, etc.).

## Examples

### Basic Registration and Usage
This example demonstrates how to register the plugin and use it via the `BrowserAdapter` interface.

```typescript
import { PluginHost } from 'yaaf';
import { CamoufoxPlugin } from 'yaaf/integrations';

const host = new PluginHost();
await host.register(new CamoufoxPlugin({ 
  headless: true,
  locale: 'en-US'
}));

// Access via the BrowserAdapter interface
const browser = host.getAdapter<BrowserAdapter>('browser')!;
const page = await browser.navigate('https://example.com');
```

### Agent Tool Integration
When registered, the plugin automatically provides tools that agents can use to perform web tasks.

```typescript
const host = new PluginHost();
await host.register(new CamoufoxPlugin());

// Tools are now available for agents in the host
const tools = host.getAllTools();
// Resulting tools: [web_browse, web_screenshot, web_click, web_type, web_extract]
```

## See Also
* `PluginBase`
* `BrowserAdapter`
* `ToolProvider`