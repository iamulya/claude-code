# Changelog

All notable changes to `yaaf` are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **`DistributedRateLimitBackend` interface** (`security/rateLimiter`) — pluggable backend for cross-replica rate limiting (Redis, Memcached, or any atomic counter). `PerUserRateLimiter` now accepts an optional `backend` config key. Default behaviour (in-memory) is unchanged.
- **`InMemoryRateLimitBackend`** — explicit exported class that implements `DistributedRateLimitBackend` using a local Map; useful for testing distributed-backend code paths without an external store.
- **`utils/deprecation`** — `deprecated(message, alternative, removedIn?)` utility that emits exactly-once `DeprecationWarning` events via `process.emitWarning`. Import from `yaaf/utils/deprecation`.
- **Sandbox: `net.createConnection` / `net.connect` interception** (`sandbox`) — closes the TCP and WebSocket bypass that existed when `blockNetwork: true`. Libraries using `net.createConnection` directly (e.g., `ws`, undici in native-TCP mode) are now blocked within sandboxed tool executions. Falls back gracefully with a `console.warn` if the Node.js runtime makes `net` exports non-configurable. Remaining gap: native addons using `uv_tcp_connect` and UDP (`node:dgram`) still bypass this layer — use Docker `--network=none` for complete isolation.
- **Performance benchmarks** (`src/__tests__/bench/performance.test.ts`) — seven timer-based SLA tests covering VectorMemory search latency (warm + cold IDF), upsert throughput, IPC send throughput, AuditLog logging throughput, RateLimiter check throughput, and GroundingValidator keyword-path latency.
- **`VectorMemoryConfig` exported type** — config object for `VectorMemoryPlugin` is now a public `export type` rather than an inferred constructor argument.
- **`McpPlugin.resetCircuit(serverName)`** — public method to manually reopen a tripped circuit breaker.

### Fixed
- **VectorMemory persistence (V2)** was silently broken: `upsert()` called `MemoryStore.save()` with wrong field names (`agentId`/`filename` instead of `name`/`description`/`content`), and `initialize()` called non-existent `scanAll()`/`load()` methods. Both are now corrected and covered by integration tests.

### Changed
- **Sandbox `blockNetwork: true`** now intercepts three layers: `globalThis.fetch`, `node:http` request methods, and `node:net` connection methods. Previously only `fetch` was intercepted at the ALS level.
- **MCP circuit breaker** is now complete: `initialize()` short-circuits (skips connection attempt) when the circuit is open, instead of only incrementing the failure counter.

---

## [0.4.0] — 2026-04-17

### Added
- **`SecurityAuditLog`** — centralized NDJSON audit log with `filePath`, `maxQueueDepth` backpressure, and `onSinkError` observability.
- **`VectorMemoryPlugin`** — `maxDocuments` eviction cap (V1), `persistTo` MemoryStore integration (V2), `onSearch` observability callback (V3).
- **`InProcessIPCPlugin`** — `maxInboxSize` + `fullPolicy` backpressure (I1), `onEvent` observability (I2), `allowedSenders` whitelist (I3).
- **`McpPlugin`** — `connectTimeoutMs` + `maxConnectFailures` circuit breaker (M1), structured SSE `auth` field (M2).
- **`GroundingValidator.assess()`** — refactored to `async`, `llmScorer` semantic fallback, `scoredBy` metadata.
- **`PerUserRateLimiter.checkAndAcquire()`** — atomic check + slot acquire (replaces race-prone `check` → `acquireRunSlot` pattern).
- **`Sandbox`** — ALS-scoped `blockNetwork` now intercepts `globalThis.fetch` and `node:http`/`node:https` request methods.
- Integration tests (`integration-io.test.ts`) — 7 cross-subsystem real-I/O tests.
- Load tests (`load/subsystem-stress.test.ts`) — 5 sustained-throughput tests.
- API surface contract (`api-surface.test.ts`) — 38 shape assertions across 7 public modules.

### Fixed
- `AgentRunner` concurrency: replaced run-duration mutex with commit sequencer to eliminate cross-run message interleaving.
- `Session`: TOCTOU race in `resumeOrCreate()` resolved with atomic file creation.
- `TrustPolicy`: fail-closed when `unknownEntityPolicy` is `'deny'`.
- `GroundingValidator.llmScorer`: was dead code in synchronous `assess()`. Now properly awaited in async path.

---

## [0.3.x] — earlier

Initial public release series. No formal changelog was maintained.

---

## Deprecation Policy

- Deprecated symbols are annotated with `@deprecated` in JSDoc and emit a
  `DeprecationWarning` via `process.emitWarning` on first use (import `deprecated`
  from `yaaf/utils/deprecation`).
- Deprecated symbols are retained for **two minor versions** before removal.
- Removal always bumps the **major** version.
- Breaking changes to configuration shapes or event payloads will be caught by
  the `api-surface.test.ts` suite and documented in this file before release.

---

## Semver Contract

| Change type | Version bump |
|-------------|-------------|
| New exported symbol | minor |
| New optional config key | minor (backward-compatible) |
| New required config key | **major** |
| Rename / remove exported symbol | **major** |
| Change event payload shape | **major** |
| Bug fix to internal logic | patch |
| Performance improvement | patch |
