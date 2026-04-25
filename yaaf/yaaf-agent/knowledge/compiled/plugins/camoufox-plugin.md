---
title: Camoufox Plugin
entity_type: plugin
summary: Stealth browser automation for agent web actions, providing browser capabilities and web interaction tools.
capabilities:
 - BrowserAdapter
 - ToolProvider
 - ContextProvider
search_terms:
 - web browser automation
 - agent web interaction
 - stealth browsing for agents
 - how to browse the web with an agent
 - web scraping tool
 - click element tool
 - screenshot webpage tool
 - headless browser for LLM
 - BrowserAdapter implementation
 - ToolProvider for web
 - Camoufox integration
 - python browser automation
 - web_browse tool
 - web_click tool
 - web_type tool
stub: false
compiled_at: 2026-04-24T18:08:31.261Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/camoufox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The Camoufox Plugin provides stealth browser automation capabilities for agents, enabling them to perform actions on the web [Source 1]. It is a single-class integration that implements multiple capabilities to offer both high-level agent [Tools](../subsystems/tools.md) and low-level browser control [Source 1].

This plugin implements the following capabilities:
*   **[BrowserAdapter](../concepts/browser-adapter.md)**: For generic browser operations like navigating to pages.
*   **[ToolProvider](../concepts/tool-provider.md)**: To automatically expose a suite of web interaction tools to an agent, such as `web_browse`, `web_click`, and `web_screenshot`.
*   **[ContextProvider](../concepts/context-provider.md)**: To provide contextual information to the agent.

In addition to these standard capabilities, the plugin also exposes Camoufox-specific APIs for more advanced control, including managing cookies, evaluating JavaScript, and querying page elements [Source 1].

## Installation

The Camoufox Plugin is part of the core YAAF package. It can be imported directly from the framework's [Integrations](../subsystems/integrations.md) [Source 1].

```typescript
import { CamoufoxPlugin } from 'yaaf'; // Adjust import path based on package structure
```

The plugin relies on a Python backend for its browser automation. The path to the Python executable may need to be configured if it is not in the system's default `PATH` [Source 1].

## Configuration

The plugin is configured by passing a `CamoufoxConfig` object to its constructor. All parameters are optional [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { CamoufoxPlugin, type CamoufoxConfig } from 'yaaf'; // Adjust path

const config: CamoufoxConfig = {
  headless: true,
  autoStart: true,
  pythonPath: '/usr/bin/python3',
  toolPrefix: 'browser',
  startupTimeoutMs: 60000,
  geolocation: {
    latitude: 34.0522,
    longitude: -118.2437
  },
  proxy: {
    server: 'http://myproxy.com:8080'
  }
};

const host = new PluginHost();
await host.register(new CamoufoxPlugin(config));
```

**Configuration Parameters:**

*   `pythonPath` (string): Path to the Python executable.
*   `host` (string): Host for the Camoufox server.
*   `port` (number): Port for the Camoufox server.
*   `headless` (boolean): If `true`, runs the browser in headless mode.
*   `virtualDisplay` (boolean): Use a virtual display for the browser.
*   `proxy` (object): Proxy server configuration with `server`, `username`, and `password` fields.
*   `fingerprint` (object): A key-value map for browser fingerprinting options.
*   `geolocation` (object): Sets the browser's geolocation with `latitude` and `longitude`.
*   `locale` (string): Sets the browser's locale (e.g., 'en-US').
*   `blockImages` (boolean): If `true`, blocks images from loading.
*   `blockWebRTC` (boolean): If `true`, blocks WebRTC connections.
*   `addons` (string[]): An array of paths to browser addons to install.
*   `startupTimeoutMs` (number): Timeout in milliseconds for the browser to start.
*   `toolPrefix` (string): A prefix for the names of all generated tools. Defaults to `'web'`.
*   `autoStart` (boolean): If `true`, automatically starts the browser [when](../apis/when.md) the plugin is initialized. Defaults to `false`.

[Source 1]

## Capabilities

### BrowserAdapter

As a `BrowserAdapter`, the Camoufox Plugin provides a standardized interface for controlling a web browser. This allows other parts of the system to perform generic browser actions, such as navigating to a URL, without needing to know the specifics of the Camoufox implementation [Source 1].

```typescript
const browser = host.getAdapter<BrowserAdapter>('browser')!;
const page = await browser.navigate('https://example.com');
```

### ToolProvider

The plugin implements `ToolProvider` to automatically register a set of pre-built tools with the `PluginHost`. These tools enable an agent to interact with web pages. The default tools provided are:
*   `web_browse`
*   `web_screenshot`
*   `web_click`
*   `web_type`
*   `web_extract`

The `toolPrefix` configuration option can be used to change the prefix from `'web'` to something else (e.g., `'browser'`) [Source 1].

### ContextProvider

The Camoufox Plugin implements the `ContextProvider` interface [Source 1]. The specific context that it provides to the agent is not detailed in the available source material.

## Sources

[Source 1]: src/integrations/camoufox.ts