/**
 * Sandbox Worker — Network-isolated tool execution host.
 *
 * This file runs inside a worker_thread when SandboxConfig.sandboxRuntime = 'worker'.
 * The worker has a FRESH MODULE GRAPH, which means Object.defineProperty succeeds
 * on net/http/https exports BEFORE any user code imports them.
 *
 * This closes the ESM strict-mode limitation of the inline sandbox proxy:
 * In the main thread, Node.js v22+ marks net/http/https exports as non-configurable.
 * In a fresh worker thread, the module graph is rebuilt and the exports ARE configurable.
 *
 * Protocol:
 * 1. Main thread creates worker with workerData = { blockNetwork: boolean }
 * 2. Worker installs network proxies (if blockNetwork)
 * 3. Main thread posts { id, fnSrc, args } via parentPort
 * 4. Worker eval's fnSrc, calls fn(args), posts { id, ok, result } or { id, ok: false, error }
 * 5. Main thread resolves the corresponding Promise
 *
 * @module sandbox.worker
 */

import { workerData, parentPort } from "worker_threads";

// ── Network blocking (runs before any user code) ──────────────────────────────

if (workerData?.blockNetwork) {
  const BLOCKED_METHODS = {
    http: ["request", "get"],
    https: ["request", "get"],
    net: ["createConnection", "connect", "createServer"],
  };

  function makeBlockingFn(module: string, method: string): () => never {
    return function blockedByYaafSandbox() {
      throw new Error(
        `[yaaf/sandbox] Network access blocked (${module}.${method}) — ` +
          `tool is running in a worker sandbox with blockNetwork: true.`,
      );
    };
  }

  // Patch each module synchronously before any user code can import them
  (async () => {
    for (const [moduleName, methods] of Object.entries(BLOCKED_METHODS)) {
      try {
        const mod = await import(moduleName);
        for (const method of methods) {
          try {
            Object.defineProperty(mod, method, {
              value: makeBlockingFn(moduleName, method),
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } catch {
            // Method already non-configurable in this worker context — skip
            console.warn(`[yaaf/sandbox.worker] Could not block ${moduleName}.${method}`);
          }
        }
      } catch {
        // Module not available — skip
      }
    }
  })();
}

// ── Message handler ───────────────────────────────────────────────────────────

if (!parentPort) throw new Error("[yaaf/sandbox.worker] Must be run as a worker_thread");

interface WorkerRequest {
  id: string;
  fnSrc: string; // fn.toString() serialized by the main thread
  args: Record<string, unknown>;
}

interface WorkerResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

parentPort.on("message", async (req: WorkerRequest) => {
  const { id, fnSrc, args } = req;

  try {
    // Reconstruct the function from its source. The pattern fn.toString() produces:
    // "async (_args) => { ... }" or "async function name(_args) { ... }"
    // We wrap it in parentheses so it parses as an expression, not a declaration.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${fnSrc})`)() as (
      args: Record<string, unknown>,
    ) => Promise<unknown>;

    if (typeof fn !== "function") {
      throw new TypeError("[yaaf/sandbox.worker] Deserialized value is not a function");
    }

    const result = await fn(args);
    parentPort!.postMessage({ id, ok: true, result } satisfies WorkerResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    parentPort!.postMessage({ id, ok: false, error } satisfies WorkerResponse);
  }
});
