---
title: Camoufox Plugin
entity_type: plugin
summary: Stealth browser automation plugin for agent web actions, implementing BrowserAdapter and ToolProvider capabilities.
capabilities:
  - browser
  - tool-provider
  - context-provider
stub: false
compiled_at: 2026-04-16T14:10:32.204Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/camoufox.ts
confidence: 1
---

---
title: "Camoufox Plugin"
entity_type: "plugin"
summary: "Stealth browser automation plugin for agent web actions, implementing BrowserAdapter and ToolProvider capabilities."
capabilities: ["browser", "tool-provider", "context-provider"]
built_in: true

## Overview
The Camoufox Plugin provides YAAF agents with stealth browser automation capabilities. It utilizes [Camoufox](https://camoufox.com), a headless Firefox-based browser designed with fingerprint spoofing to bypass bot detection. The plugin implements the `BrowserAdapter` for programmatic control, the `ToolProvider` to expose web actions to LLMs, and the `ContextProvider` to inject web content into the agent's prompt assembly.

## Installation
The Camoufox Plugin is included in the core `yaaf` package. However, it requires a working Python environment and the Camoufox library as external dependencies.

```bash
npm install yaaf
# Ensure python and camoufox are installed in the environment
pip install camoufox
```

## Configuration
The plugin is configured via the `CamoufoxConfig` object. It supports settings for stealth (fingerprinting, proxying), performance (blocking images), and agent interaction (tool prefixes).

```typescript
import { PluginHost, CamoufoxPlugin } from 'yaaf';

const host = new PluginHost();

const camoufox = new CamoufoxPlugin({
  headless: true,
  pythonPath: '/usr/bin/python3',
  toolPrefix: 'web',           // Prefix for generated tool names
  autoStart: true,             // Start browser on plugin initialization
  humanizeInput: true,         // Realistic typing and mouse movement
  blockImages: true,           // Optimize bandwidth
  geolocation: { 
    latitude: 37.7749, 
    longitude: -122.4194 
  },
  screen: { 
    maxWidth: 1920, 
    maxHeight: 1080 
  }
});

await host.register(camoufox);
```

### Configuration Parameters
| Parameter | Type | Description |
|---|---|---|
| `pythonPath` | `string` | Path to the Python executable. |
| `headless` | `boolean` | Whether to run the browser without a GUI. |
| `proxy` | `object` | Proxy server details (server, username, password). |
| `fingerprint` | `Record` | Custom fingerprint spoofing configuration. |
| `toolPrefix` | `string` | Prefix for agent tools (default: 'web'). |
| `blockImages` | `boolean` | If true, prevents images from loading to save resources. |
| `startupTimeoutMs` | `number` | Timeout for the browser process to start. |

## Capabilities

### BrowserAdapter
The plugin provides a standard interface for programmatic web interaction. This allows developers to control the browser directly through the `PluginHost`.
*   `navigate(url)`: Directs the browser to a specific URL.
*   `click(selector)`: Performs a mouse click on the specified element.
*   `type(selector, text)`: Simulates keyboard input into a field.
*   `extract(selector)`: Retrieves text or structural data from the page.
*   `screenshot()`: Captures the current viewport as an image.

### ToolProvider
The plugin automatically generates a set of tools that can be consumed by LLM-powered agents. By default, these tools use the `web_` prefix (e.g., `web_browse`, `web_click`, `web_type`, `web_extract`, `web_screenshot`). These tools allow the agent to perform autonomous web research and interaction.

### ContextProvider
As a `ContextProvider`, the plugin can gather information from the current browser state—such as the page title, URL, or visible text—and inject it into the agent's prompt context during the `gatherContext` phase of the `PluginHost` lifecycle.

## Limitations
*   **Environment Dependency**: Requires a Python runtime and the `camoufox` Python package to be installed on the host system.
*   **Resource Intensive**: Running a full browser instance (even headless) consumes significantly more CPU and memory than standard API-based plugins.
*   **Startup Latency**: Initializing the browser process and spoofing fingerprints may introduce a delay during the `initialize()` phase compared to other adapters.