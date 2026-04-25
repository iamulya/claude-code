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
 * 1. Main thread creates worker with workerData = { blockNetwork, allowedNetworkDomains }
 * 2. Worker installs network proxies (if blockNetwork)
 * 3. Worker posts { type: 'ready' } when patching is complete
 * 4. Main thread posts { id, fnSrc, args } via parentPort
 * 5. Worker eval's fnSrc, calls fn(args), posts { id, ok, result } or { id, ok: false, error }
 * 6. Main thread resolves the corresponding Promise
 *
 * @module sandbox.worker
 */

import { workerData, parentPort } from "worker_threads";

// ── Domain matching ──────────────────────────────────────────────────────────

const allowedDomains: string[] = (workerData?.allowedNetworkDomains ?? []).map(
  (d: string) => d.toLowerCase(),
);

function isDomainAllowed(domain: string): boolean {
  if (allowedDomains.length === 0) return false;
  const d = domain.toLowerCase();
  for (const pattern of allowedDomains) {
    if (pattern === d) return true;
    if (pattern.startsWith(".") && (d.endsWith(pattern) || d === pattern.slice(1))) return true;
    if (pattern.startsWith("*.") && (d.endsWith(pattern.slice(1)) || d === pattern.slice(2)))
      return true;
  }
  return false;
}

function extractHostFromUrl(urlStr: string): string | undefined {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

// ── Network blocking (runs before any user code) ──────────────────────────────

async function installNetworkBlocking(): Promise<void> {
  if (!workerData?.blockNetwork) return;

  // Patch http/https — block request/get unless domain is allowed
  for (const moduleName of ["http", "https"]) {
    try {
      const mod = await import(moduleName);
      for (const method of ["request", "get"]) {
        const original = mod[method];
        try {
          Object.defineProperty(mod, method, {
            value: function blockedByYaafSandbox(...args: unknown[]) {
              // Check domain allowlist
              if (allowedDomains.length > 0) {
                let host: string | undefined;
                for (const arg of args) {
                  if (typeof arg === "string") {
                    host = extractHostFromUrl(arg);
                    break;
                  }
                  if (arg instanceof URL) {
                    host = arg.hostname.toLowerCase();
                    break;
                  }
                  if (arg && typeof arg === "object" && "hostname" in arg) {
                    host = (arg as { hostname?: string }).hostname?.toLowerCase();
                    break;
                  }
                  if (arg && typeof arg === "object" && "host" in arg) {
                    const h = (arg as { host?: string }).host;
                    if (h) {
                      host = h.split(":")[0]?.toLowerCase();
                      break;
                    }
                  }
                }
                if (host && isDomainAllowed(host)) {
                  return original.apply(mod, args);
                }
              }

              throw new Error(
                `[yaaf/sandbox] Network access blocked (${moduleName}.${method}) — ` +
                  `tool is running in a worker sandbox with blockNetwork: true.`,
              );
            },
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch {
          console.warn(`[yaaf/sandbox.worker] Could not block ${moduleName}.${method}`);
        }
      }
    } catch {
      // Module not available
    }
  }

  // Patch net — block connect/createConnection unless domain is allowed
  try {
    const net = await import("net");
    for (const method of ["createConnection", "connect"]) {
      const original = (net as Record<string, unknown>)[method] as (...args: unknown[]) => unknown;
      try {
        Object.defineProperty(net, method, {
          value: function blockedByYaafSandbox(...args: unknown[]) {
            // Check domain allowlist
            if (allowedDomains.length > 0) {
              let host: string | undefined;
              if (typeof args[0] === "number" && typeof args[1] === "string") {
                host = args[1].toLowerCase();
              } else if (args[0] && typeof args[0] === "object") {
                const opts = args[0] as { host?: string; path?: string };
                if (opts.host) host = opts.host.toLowerCase();
                // Unix socket — allow
                if (opts.path) return original.apply(net, args);
              }
              if (host && isDomainAllowed(host)) {
                return original.apply(net, args);
              }
            }

            throw new Error(
              `[yaaf/sandbox] Network access blocked (net.${method}) — ` +
                `tool is running in a worker sandbox with blockNetwork: true.`,
            );
          },
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch {
        console.warn(`[yaaf/sandbox.worker] Could not block net.${method}`);
      }
    }
  } catch {
    // net not available
  }

  // Patch globalThis.fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function blockedFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    if (allowedDomains.length > 0) {
      let urlStr: string | undefined;
      if (typeof input === "string") urlStr = input;
      else if (input instanceof URL) urlStr = input.toString();
      else if (input instanceof Request) urlStr = input.url;

      if (urlStr) {
        const host = extractHostFromUrl(urlStr);
        if (host && isDomainAllowed(host)) {
          return originalFetch(input, init);
        }
      }
    }

    throw new Error(
      `[yaaf/sandbox] Network access blocked (fetch) — ` +
        `tool is running in a worker sandbox with blockNetwork: true.`,
    );
  } as typeof globalThis.fetch;
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

// Install blocking FIRST, then signal readiness
installNetworkBlocking().then(() => {
  // Signal that the worker is ready to accept messages
  parentPort!.postMessage({ type: "ready" });

  parentPort!.on("message", async (req: WorkerRequest) => {
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
});
