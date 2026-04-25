/**
 * Domain-filtering CONNECT proxy for OS-level sandbox network control.
 *
 * Neither bwrap (--unshare-net) nor sandbox-exec (deny network*) can filter
 * by domain name — they only operate at the IP/port level. To achieve
 * domain-level allowlisting, we run a lightweight HTTP/HTTPS proxy:
 *
 * 1. The sandboxed process has ALL network blocked except 127.0.0.1:<proxyPort>.
 * 2. HTTP_PROXY and HTTPS_PROXY env vars route all traffic through this proxy.
 * 3. The proxy checks each outbound domain against the allowlist/denylist.
 * 4. Allowed: proxy forwards the connection. Denied: proxy returns 403.
 *
 * For HTTPS traffic, the proxy handles CONNECT method tunneling —
 * it does NOT MITM/decrypt the traffic. It only inspects the domain
 * from the CONNECT request and either allows or denies the tunnel.
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────┐
 * │ Host (unsandboxed)                                │
 * │                                                    │
 * │  DomainFilterProxy on 127.0.0.1:XXXXX             │
 * │                                                    │
 * │  ┌───────────────────────────────────────────────┐│
 * │  │ Sandboxed Process                              ││
 * │  │  Network: BLOCKED except 127.0.0.1:XXXXX      ││
 * │  │  env HTTP_PROXY=http://127.0.0.1:XXXXX        ││
 * │  │                                                ││
 * │  │  curl https://allowed.com → proxy → ✅         ││
 * │  │  curl https://evil.com → proxy → 403 ❌       ││
 * │  │  nc evil.com 4444 → network blocked → ❌      ││
 * │  └───────────────────────────────────────────────┘│
 * └───────────────────────────────────────────────────┘
 */

import * as http from "http";
import * as net from "net";

export type DomainFilterProxyConfig = {
  /**
   * Domains to allow.
   * Supports exact match ('example.com'), dot-prefix ('.example.com'),
   * and wildcard ('*.example.com').
   *
   * - Empty array = block ALL domains.
   * - undefined = allow ALL domains (proxy only logs, doesn't block).
   */
  allowedDomains: string[];

  /**
   * Domains to deny (takes precedence over allowedDomains).
   * Same matching rules as allowedDomains.
   */
  deniedDomains?: string[];
};

export class DomainFilterProxy {
  private server: http.Server;
  private port = 0;
  private readonly allowedDomains: Set<string>;
  private readonly deniedDomains: Set<string>;

  /** Track domain decisions for violation reporting. */
  private blockedRequests: Array<{ domain: string; timestamp: number }> = [];

  constructor(config: DomainFilterProxyConfig) {
    this.allowedDomains = new Set(config.allowedDomains.map((d) => d.toLowerCase()));
    this.deniedDomains = new Set((config.deniedDomains ?? []).map((d) => d.toLowerCase()));

    // ── Plain HTTP handler ───────────────────────────────────────────
    this.server = http.createServer((req, res) => {
      const host = req.headers.host?.split(":")[0]?.toLowerCase();

      if (!host || !this.isDomainAllowed(host)) {
        this.recordBlock(host ?? "unknown");
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end(`[YAAF sandbox] Domain blocked: ${host}`);
        return;
      }

      this.forwardHttp(req, res);
    });

    // ── HTTPS CONNECT handler ────────────────────────────────────────
    this.server.on("connect", (req, clientSocket, head) => {
      const [host, portStr] = (req.url ?? "").split(":");
      const domain = host?.toLowerCase();

      if (!domain || !this.isDomainAllowed(domain)) {
        this.recordBlock(domain ?? "unknown");
        clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        clientSocket.destroy();
        return;
      }

      const port = parseInt(portStr ?? "443", 10);

      const serverSocket = net.connect(port, domain, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      serverSocket.on("error", (err) => {
        clientSocket.write(`HTTP/1.1 502 Bad Gateway\r\n\r\n`);
        clientSocket.destroy();
      });

      clientSocket.on("error", () => {
        serverSocket.destroy();
      });

      // Timeout for connection establishment
      serverSocket.setTimeout(10_000, () => {
        serverSocket.destroy();
        clientSocket.destroy();
      });
    });

    // ── Error handling ───────────────────────────────────────────────
    this.server.on("error", (err) => {
      // Server-level errors (e.g. EADDRINUSE) — logged but not thrown
      // since the proxy runs in the background.
      console.error("[YAAF sandbox proxy] Server error:", err.message);
    });
  }

  // ── Domain matching ──────────────────────────────────────────────────────

  /**
   * Check if a domain is allowed by the allowlist/denylist.
   *
   * Priority: denylist > allowlist > default (block if allowlist non-empty).
   */
  isDomainAllowed(domain: string): boolean {
    const normalized = domain.toLowerCase();

    // Check denylist first (takes precedence)
    if (this.deniedDomains.has(normalized)) return false;
    for (const denied of Array.from(this.deniedDomains)) {
      if (this.matchesDomainPattern(normalized, denied)) return false;
    }

    // If allowlist is empty, block everything (fail-closed)
    if (this.allowedDomains.size === 0) return false;

    // Check allowlist
    if (this.allowedDomains.has(normalized)) return true;
    for (const allowed of Array.from(this.allowedDomains)) {
      if (this.matchesDomainPattern(normalized, allowed)) return true;
    }

    // Not in allowlist — blocked
    return false;
  }

  /**
   * Check if a domain matches a pattern.
   *
   * Patterns:
   * - '.example.com' matches 'sub.example.com' and 'deep.sub.example.com'
   * - '*.example.com' matches 'sub.example.com' and 'deep.sub.example.com'
   * - 'example.com' matches only 'example.com' (exact)
   */
  private matchesDomainPattern(domain: string, pattern: string): boolean {
    // Dot-prefix: .example.com matches sub.example.com
    if (pattern.startsWith(".") && domain.endsWith(pattern)) {
      return true;
    }
    // Wildcard: *.example.com matches sub.example.com
    if (pattern.startsWith("*.") && domain.endsWith(pattern.slice(1))) {
      return true;
    }
    return false;
  }

  // ── HTTP forwarding ──────────────────────────────────────────────────────

  private forwardHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Reconstruct the target URL
    const targetUrl = req.url!;

    // Parse the URL to extract the target host/port
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("[YAAF sandbox] Invalid URL");
      return;
    }

    const proxyReq = http.request(
      parsedUrl,
      {
        method: req.method,
        headers: { ...req.headers, host: parsedUrl.host },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
      }
      res.end("[YAAF sandbox] Upstream connection failed");
    });

    req.pipe(proxyReq);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Start the proxy on a random available port on 127.0.0.1.
   * @returns The port number the proxy is listening on.
   */
  async start(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server.address();
        if (typeof addr === "object" && addr) {
          this.port = addr.port;
          resolve(this.port);
        } else {
          reject(new Error("Failed to bind proxy to a port"));
        }
      });

      this.server.once("error", reject);
    });
  }

  /**
   * Stop the proxy and close all connections.
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        this.port = 0;
        resolve();
      });
      // Force-close all active connections after 1s grace period
      setTimeout(() => {
        this.server.closeAllConnections?.();
      }, 1000);
    });
  }

  /** Get the port the proxy is listening on. 0 if not started. */
  getPort(): number {
    return this.port;
  }

  /** Get a list of recently blocked domain requests. */
  getBlockedRequests(): ReadonlyArray<{ domain: string; timestamp: number }> {
    return this.blockedRequests;
  }

  /** Clear the blocked requests log. */
  clearBlockedRequests(): void {
    this.blockedRequests = [];
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private recordBlock(domain: string): void {
    this.blockedRequests.push({ domain, timestamp: Date.now() });
    // Keep only last 100 entries to prevent memory leaks
    if (this.blockedRequests.length > 100) {
      this.blockedRequests = this.blockedRequests.slice(-100);
    }
  }
}
