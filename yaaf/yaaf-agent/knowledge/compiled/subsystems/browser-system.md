---
title: Browser System
entity_type: subsystem
summary: The logical subsystem responsible for web automation, browser lifecycle management, and web-based tool execution.
primary_files:
  - src/integrations/camoufox.ts
exports:
  - CamoufoxPlugin
  - CamoufoxConfig
  - ElementInfo
stub: false
compiled_at: 2026-04-16T14:21:33.406Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/camoufox.ts
confidence: 0.9
---

## Purpose
The Browser System provides YAAF agents with the capability to interact with the World Wide Web. It handles the complexities of browser lifecycle management, stealth automation to avoid detection, and the translation of web-based actions into discrete tools that agents can execute. Its primary goal is to provide a stable, programmable interface for navigating websites, extracting data, and performing user-like interactions (clicking, typing) within a browser environment.

## Architecture
The subsystem is built around a provider-agnostic architecture, primarily implemented through the `CamoufoxPlugin`. This plugin serves as a bridge between the YAAF framework and the underlying browser engine.

### Key Components
- **CamoufoxPlugin**: The central class that implements multiple framework interfaces. It manages the lifecycle of the browser process (via `child_process.spawn`) and coordinates communication between the agent and the web page.
- **BrowserAdapter Interface**: Defines the standard contract for browser operations such as navigation and page management.
- **ToolProvider Interface**: Enables the subsystem to dynamically generate and register tools that agents can use to perform web actions.
- **ContextProvider Interface**: Allows the browser's state or findings to be injected into the agent's operational context.

The subsystem utilizes a stealth-focused approach, supporting features like fingerprinting, proxy rotation, and geolocation spoofing to ensure that agent activities remain indistinguishable from human browsing patterns.

## Integration Points
The Browser System integrates with the framework through the `PluginHost`. When a browser plugin is registered, it:
1.  **Registers Tools**: Automatically populates the agent's toolset with web-specific capabilities (e.g., `web_browse`, `web_click`).
2.  **Provides Adapters**: Makes the `BrowserAdapter` available to other subsystems or custom code requiring direct browser control.
3.  **Lifecycle Hooks**: Hooks into the framework's initialization and shutdown sequences to manage the browser process.

## Key APIs
The subsystem exposes several critical APIs for both internal framework use and developer extension:

### Browser Operations
- `navigate(url: string)`: Directs the browser to a specific URL.
- `evaluate(script: string)`: Executes arbitrary JavaScript within the context of the current page.
- `queryElements(selector: string)`: Returns detailed information about DOM elements matching a selector, encapsulated in `ElementInfo` objects.

### Tool Generation
The system automatically generates a suite of tools for agents. By default, these are prefixed with `web_`:
- `web_browse`: Navigate to a URL.
- `web_screenshot`: Capture the current visual state of the page.
- `web_click`: Interact with specific elements.
- `web_type`: Input text into form fields.
- `web_extract`: Retrieve structured data from the page.

### Data Structures
- **ElementInfo**: A structure containing metadata about a DOM element, including its selector, tag name, text content, visibility status, and bounding box coordinates.

## Configuration
The subsystem is configured via the `CamoufoxConfig` object during plugin registration. Key configuration parameters include:

| Parameter | Description |
|-----------|-------------|
| `headless` | Whether to run the browser without a visible GUI. |
| `pythonPath` | Path to the Python executable required for the underlying stealth engine. |
| `proxy` | Configuration for proxy servers, including authentication. |
| `fingerprint` | Custom browser fingerprinting settings to mimic specific devices. |
| `geolocation` | Latitude and longitude coordinates for the browser context. |
| `toolPrefix` | Custom prefix for generated tools (defaults to `web`). |
| `autoStart` | Whether to launch the browser immediately upon plugin initialization. |

```ts
const host = new PluginHost();
await host.register(new CamoufoxPlugin({ 
  headless: true,
  toolPrefix: 'search' 
}));
```

## Extension Points
Developers can extend the Browser System in the following ways:
- **Custom Tool Prefixes**: By modifying the `toolPrefix`, developers can namespace web tools to avoid conflicts or categorize them for specific agents.
- **Addons**: The system supports loading browser extensions via the `addons` configuration array.
- **Direct Adapter Access**: Developers can bypass the high-level tools and interact directly with the `BrowserAdapter` for complex automation scenarios that require fine-grained control over the browser instance.