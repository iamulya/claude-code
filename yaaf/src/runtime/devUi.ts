/**
 * YAAF Dev UI — Phase 3
 *
 * Generates a self-contained HTML page served at GET / by createServer()
 * when `devUi: true` is set. Zero dependencies — everything is inlined.
 *
 * Phase 3 features (on top of Phases 1 & 2):
 * - Syntax highlighting: inline single-pass sticky-regex tokenizer for
 * JS/TS, Python, JSON, Bash/Shell, CSS (< 4KB JS)
 * - Welcome / empty state with prompt chips
 * - Jump-to-bottom floating button
 * - Mobile inspector: slide-up drawer (full overlay on narrow viewports)
 * - Export conversation as Markdown (download .md file)
 * - Improved streaming: partial markdown preview during streaming
 *
 * Architecture note:
 * CSS and JS are stored in separate files (devUi.styles.css and
 * devUi.client.js) to avoid the escaping nightmare of embedding
 * JavaScript inside a TypeScript template literal. They are read
 * once at module load time and inlined into the HTML.
 *
 * @module runtime/devUi
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── Load client assets at module init (once, not per-request) ─────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(__dir, "devUi.styles.css"), "utf-8");
const JS = readFileSync(join(__dir, "devUi.client.js"), "utf-8");

// ── Types ─────────────────────────────────────────────────────────────────────

export type DevUiOptions = {
  /** Agent display name */
  name: string;
  /** Agent version */
  version: string;
  /** Whether the agent supports runStream() */
  streaming: boolean;
  /** Model identifier (shown in inspector). Null = not known. */
  model: string | null;
  /** Whether server-side multi-turn history formatting is active */
  multiTurn: boolean;
  /** System prompt to show read-only in Settings. Null = not exposed. */
  systemPrompt: string | null;
};

/**
 * Build the full Dev UI HTML string.
 * Called once at server startup; cached and served at GET /.
 */
export function buildDevUiHtml(opts: DevUiOptions): string {
  const { name, version, streaming, multiTurn, systemPrompt } = opts;
  const model = opts.model ?? version;
  const storageKey = `yaaf-devui-history:${name}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${escHtml(name)} — YAAF Dev UI</title>
 <style>
${CSS}
 </style>
</head>
<body>

<!-- ── Top Bar ──────────────────────────────────────────────────────────── -->
<header id="top-bar">
 <div class="bar-left">
 <div class="logo" aria-label="YAAF">
 <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
 <polygon points="10,1 19,6 19,14 10,19 1,14 1,6" fill="#6c5ce7"/>
 <text x="10" y="14" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="system-ui">Y</text>
 </svg>
 </div>
 <span class="bar-name">YAAF</span>
 <span class="bar-sep">/</span>
 <span class="bar-agent" title="${escHtml(name)}">${escHtml(name)}</span>
 </div>
 <div class="bar-right">
 <span class="model-chip" id="model-chip">${escHtml(model)}</span>
 <span class="status-wrap">
 <span class="status-dot" id="status-dot"></span>
 <span class="status-label" id="status-label">Connecting…</span>
 </span>
 <button class="bar-btn" id="inspector-toggle-btn" title="Toggle Inspector" aria-label="Toggle Inspector">
 <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
 <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" stroke-width="1.5"/>
 <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
 </svg>
 </button>
 <button class="bar-btn" id="settings-btn" title="Settings" aria-label="Settings">
 <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
 <path d="M5.7 1h2.6l.35 1.65a4.5 4.5 0 0 1 1.1.64l1.6-.55 1.3 2.25-1.25 1.1a4.6 4.6 0 0 1 0 1.28l1.25 1.1-1.3 2.25-1.6-.55a4.5 4.5 0 0 1-1.1.64L8.3 13H5.7l-.35-1.65a4.5 4.5 0 0 1-1.1-.64l-1.6.55-1.3-2.25 1.25-1.1a4.6 4.6 0 0 1 0-1.28l-1.25-1.1 1.3-2.25 1.6.55a4.5 4.5 0 0 1 1.1-.64L5.7 1Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
 <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.2"/>
 </svg>
 </button>
 <button class="bar-btn" id="clear-btn" title="Clear conversation">Clear</button>
 </div>
</header>

<!-- ── Settings Drawer ──────────────────────────────────────────────────── -->
<div id="settings-overlay" class="hidden" aria-hidden="true"></div>
<aside id="settings-drawer" class="settings-closed" role="dialog" aria-label="Settings">
 <div class="settings-header">
 <span>Settings</span>
 <button class="settings-close" id="settings-close" aria-label="Close settings">✕</button>
 </div>
 <div class="settings-section">
 <div class="settings-label">Conversation</div>
 <label class="toggle-row">
 <span class="toggle-text">Persist history across reloads</span>
 <button class="toggle" id="toggle-history" role="switch" aria-checked="true"></button>
 </label>
 <label class="toggle-row">
 <span class="toggle-text">Multi-turn context</span>
 <button class="toggle" id="toggle-multiturn" role="switch" aria-checked="${multiTurn}"></button>
 </label>
 <button class="settings-action-btn" id="clear-history-btn">Clear saved history</button>
 <button class="settings-action-btn success" id="export-btn">Export as Markdown</button>
 </div>
 <div class="settings-section">
 <div class="settings-label">Appearance</div>
 <label class="toggle-row">
 <span class="toggle-text">Dark mode</span>
 <button class="toggle" id="toggle-dark" role="switch" aria-checked="false"></button>
 </label>
 </div>
${
  systemPrompt
    ? ` <div class="settings-section">
 <div class="settings-label">System Prompt</div>
 <pre class="system-prompt-pre">${escHtml(systemPrompt)}</pre>
 </div>`
    : ""
}
 <div class="settings-section">
 <div class="settings-label">Layout</div>
 <label class="toggle-row">
 <span class="toggle-text">Show Inspector panel</span>
 <button class="toggle" id="toggle-inspector" role="switch" aria-checked="true"></button>
 </label>
 </div>
 <div class="settings-section">
 <div class="settings-label">Keyboard shortcuts</div>
 <div class="kbd-row"><kbd>Enter</kbd><span>Send message</span></div>
 <div class="kbd-row"><kbd>Shift+Enter</kbd><span>New line</span></div>
 <div class="kbd-row"><kbd>↑</kbd><span>Recall last message</span></div>
 <div class="kbd-row"><kbd>Esc</kbd><span>Stop generation</span></div>
 </div>
 <div class="settings-section settings-footer">
 <p>YAAF Dev UI — for local development only.<br>
 Disable <code>devUi</code> before deploying to production.</p>
 </div>
</aside>

<!-- ── Mobile inspector overlay ─────────────────────────────────────────── -->
<div id="mobile-inspector-overlay" class="hidden" aria-hidden="true"></div>

<!-- ── Main Layout ──────────────────────────────────────────────────────── -->
<main id="layout">

 <!-- Chat panel -->
 <section id="chat-panel">
 <!-- Welcome / empty state -->
 <div id="empty-state">
 <div class="empty-logo">
 <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
 <polygon points="26,3 49,16 49,36 26,49 3,36 3,16" fill="#6c5ce7" opacity=".15"/>
 <polygon points="26,3 49,16 49,36 26,49 3,36 3,16" fill="none" stroke="#6c5ce7" stroke-width="1.5"/>
 <text x="26" y="33" text-anchor="middle" fill="#6c5ce7" font-size="22" font-weight="700" font-family="system-ui">Y</text>
 </svg>
 </div>
 <h2 class="empty-title">${escHtml(name)}</h2>
 <p class="empty-sub">Ask anything to get started</p>
 <div class="empty-chips" id="empty-chips">
 <button class="chip" data-prompt="What can you help me with?">What can you help me with?</button>
 <button class="chip" data-prompt="What tools do you have available?">What tools do you have?</button>
 <button class="chip" data-prompt="Give me a quick overview of your capabilities.">Give me an overview</button>
 </div>
 <div class="empty-meta">
 <span class="empty-badge">${escHtml(version)}</span>
 <span class="empty-badge ${streaming ? "badge-success" : ""}">${streaming ? "⚡ Streaming" : "No streaming"}</span>
 </div>
 </div>

 <div id="messages" role="log" aria-live="polite" aria-label="Conversation"></div>

 <!-- Jump to bottom -->
 <button id="jump-btn" class="jump-btn hidden" aria-label="Scroll to bottom" title="Scroll to bottom">
 <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
 <path d="M7 2v10M7 12L3 8M7 12l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
 </button>

 <!-- Input bar -->
 <div id="input-bar">
 <div id="input-wrap">
 <textarea
 id="input"
 rows="1"
 placeholder="Ask the agent…"
 aria-label="Message input"
 autocomplete="off"
 spellcheck="true"
 ></textarea>
 <button id="send-btn" aria-label="Send message">
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
 <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg>
 </button>
 </div>
 <div id="input-hints">
 <span>Enter to send · Shift+Enter for new line</span>
 <button id="stop-btn" class="stop-btn hidden" aria-label="Stop generation">⏹ Stop</button>
 </div>
 </div>
 <p id="footer-note">YAAF Dev UI — for local development only</p>

 <!-- Mobile inspector button (bottom of chat on mobile) -->
 <button id="mobile-inspector-btn" class="mobile-inspector-btn hidden" aria-label="Open inspector">
 <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
 <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" stroke-width="1.5"/>
 <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
 </svg>
 Inspector
 </button>
 </section>

 <!-- Inspector panel -->
 <aside id="inspector">
 <div class="inspector-header">
 <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
 <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5"/>
 <path d="M9 9L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
 </svg>
 INSPECTOR
 <button class="inspector-close hidden" id="inspector-mobile-close" aria-label="Close inspector">✕</button>
 </div>

 <!-- LATENCY -->
 <div class="card" id="card-latency">
 <div class="card-label">Latency</div>
 <div id="latency-grid" class="latency-grid hidden">
 <div class="latency-col">
 <span class="latency-label">TTFT</span>
 <span class="latency-val" id="lat-ttft">—</span>
 </div>
 <div class="latency-col">
 <span class="latency-label">Total</span>
 <span class="latency-val" id="lat-total">—</span>
 </div>
 </div>
 <p class="card-empty" id="latency-empty">Send a message to see latency.</p>
 </div>

 <!-- REQUEST -->
 <div class="card" id="card-request">
 <div class="card-label">Request</div>
 <div id="req-method" class="method-pill hidden">POST /chat/stream</div>
 <pre id="req-body" class="code-mini hidden"></pre>
 <p class="card-empty">Send a message to see the request.</p>
 </div>

 <!-- TOOL CALLS -->
 <div class="card" id="card-tools">
 <div class="card-label">Tool Calls</div>
 <div id="tool-list"></div>
 <p class="card-empty" id="tools-empty">No tool calls yet.</p>
 </div>

 <!-- LLM TURNS -->
 <div class="card" id="card-turns">
 <div class="card-label">LLM Turns</div>
 <div id="turn-list"></div>
 <p class="card-empty" id="turns-empty">No LLM calls yet.</p>
 </div>

 <!-- TOKEN USAGE -->
 <div class="card" id="card-tokens">
 <div class="card-label">Token Usage</div>
 <div id="token-stats" class="token-grid hidden">
 <div class="token-col">
 <span class="token-label">prompt</span>
 <span class="token-val" id="tok-prompt">—</span>
 </div>
 <div class="token-col">
 <span class="token-label">completion</span>
 <span class="token-val" id="tok-completion">—</span>
 </div>
 <div class="token-col">
 <span class="token-label">cache read</span>
 <span class="token-val" id="tok-cache">—</span>
 </div>
 </div>
 <div id="token-bar-wrap" class="tok-bar-wrap hidden">
 <div class="tok-bar-track">
 <div class="tok-bar-fill" id="tok-bar-fill"></div>
 </div>
 </div>
 <p class="card-empty" id="tokens-empty">Send a message to see token usage.</p>
 </div>

 <!-- AGENT INFO -->
 <div class="card" id="card-info">
 <div class="card-label">Agent Info</div>
 <div class="info-rows">
 <div class="info-row"><span class="info-key">name</span><span class="info-val">${escHtml(name)}</span></div>
 <div class="info-row"><span class="info-key">version</span><span class="info-val">${escHtml(version)}</span></div>
 <div class="info-row"><span class="info-key">streaming</span><span class="info-val ${streaming ? "val-success" : "val-muted"}">${streaming ? "enabled" : "disabled"}</span></div>
 <div class="info-row"><span class="info-key">model</span><span class="info-val val-accent" id="info-model">${escHtml(model)}</span></div>
 <div class="info-row"><span class="info-key">multiTurn</span><span class="info-val" id="info-multiturn">—</span></div>
 </div>
 </div>
 </aside>

</main>

<script>
const STORAGE_KEY = ${JSON.stringify(storageKey)};
const INIT_MULTI_TURN = ${JSON.stringify(multiTurn)};
${JS}
</script>
</body>
</html>`;
}

// ── HTML escaping ─────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
