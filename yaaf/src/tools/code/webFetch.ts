/**
 * Web Fetch Tool — Fetch URL content with SSRF protection.
 *
 * Includes protections against:
 * - Private/internal IP addresses (RFC 1918)
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Link-local addresses (169.254.0.0/16)
 * - file:// protocol
 *
 * @module tools/code/webFetch
 */

import { buildTool } from "../tool.js";
import type { Tool, ToolResult } from "../tool.js";

type WebFetchInput = {
  /** URL to fetch */
  url: string;
  /** Maximum response size in characters (default: 50000) */
  maxChars?: number;
};

/**
 * Check if a hostname is a blocked internal/private address.
 * Operates on the PARSED hostname, not raw URL strings.
 */
function isBlockedHost(hostname: string): string | null {
  const lower = hostname.toLowerCase();

  // Loopback
  if (lower === "localhost" || lower === "[::1]") {
    return "loopback address";
  }

  // Strip IPv6 brackets for IP analysis
  const bare = lower.startsWith("[") ? lower.slice(1, -1) : lower;

  // IPv4-mapped IPv6 — handles both forms:
  //   dotted-decimal: ::ffff:127.0.0.1  (user input)
  //   hex:            ::ffff:7f00:1     (URL parser normalized)
  const v4MappedDotted = bare.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const v4MappedHex = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  let ip = bare;
  if (v4MappedDotted) {
    ip = v4MappedDotted[1]!;
  } else if (v4MappedHex) {
    // Convert hex pair to dotted-decimal: 7f00:1 → 127.0.0.1
    const hi = parseInt(v4MappedHex[1]!, 16);
    const lo = parseInt(v4MappedHex[2]!, 16);
    ip = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  // Parse dotted-decimal IPv4
  const parts = ip.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const octets = parts.map(Number);
    if (octets.some((o) => o > 255)) return null; // Not a valid IP

    // 127.0.0.0/8 — loopback
    if (octets[0] === 127) return "loopback address (127.x.x.x)";
    // 10.0.0.0/8 — private
    if (octets[0] === 10) return "private address (10.x.x.x)";
    // 172.16.0.0/12 — private
    if (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31)
      return "private address (172.16-31.x.x)";
    // 192.168.0.0/16 — private
    if (octets[0] === 192 && octets[1] === 168) return "private address (192.168.x.x)";
    // 169.254.0.0/16 — link-local / cloud metadata
    if (octets[0] === 169 && octets[1] === 254) return "link-local address (169.254.x.x)";
    // 0.0.0.0/8
    if (octets[0] === 0) return "unspecified address (0.x.x.x)";
  }

  // Decimal IP bypass (e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(ip)) {
    const num = parseInt(ip, 10);
    if (num >= 0 && num <= 0xffffffff) {
      const a = (num >>> 24) & 0xff;
      if (a === 127 || a === 10 || a === 0) return "numeric IP (blocked)";
      if (a === 172 && (((num >>> 16) & 0xff) >= 16 && ((num >>> 16) & 0xff) <= 31))
        return "numeric IP (private)";
      if (a === 192 && ((num >>> 16) & 0xff) === 168) return "numeric IP (private)";
      if (a === 169 && ((num >>> 16) & 0xff) === 254) return "numeric IP (link-local)";
    }
  }

  // IPv6 loopback variants
  if (bare === "::1" || bare === "0:0:0:0:0:0:0:1") return "IPv6 loopback";

  return null;
}

/**
 * Create a web fetch tool with optional domain allowlist.
 *
 * @param allowedDomains If provided, only these domains can be fetched.
 *        If empty/undefined, all non-SSRF domains are allowed.
 */
export function webFetchTool(allowedDomains?: string[]): Tool<WebFetchInput, string> {
  return buildTool<WebFetchInput, string>({
    name: "web_fetch",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to fetch (http:// or https:// only). Private/internal IPs are blocked.",
        },
        maxChars: {
          type: "number",
          description: "Maximum response size in characters (default: 50000)",
        },
      },
      required: ["url"],
    },
    maxResultChars: 50_000,

    describe: (input) => `Fetch ${input.url.slice(0, 60)}`,

    async call(input): Promise<ToolResult<string>> {
      const maxChars = input.maxChars ?? 50_000;

      // ── Protocol validation (before URL parsing) ──
      if (!input.url.startsWith("http://") && !input.url.startsWith("https://")) {
        return {
          data: `Blocked: Only http:// and https:// URLs are allowed`,
        };
      }

      // ── Parse URL ──
      let parsed: URL;
      try {
        parsed = new URL(input.url);
      } catch {
        return { data: `Blocked: Invalid URL` };
      }

      // Redundant protocol check after parsing (defense-in-depth)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { data: `Blocked: Only http:// and https:// protocols are allowed` };
      }

      // ── SSRF: validate parsed hostname ──
      const blockReason = isBlockedHost(parsed.hostname);
      if (blockReason) {
        return {
          data: `Blocked: URL target is a ${blockReason} (SSRF protection)`,
        };
      }

      // ── Domain allowlist ──
      if (allowedDomains && allowedDomains.length > 0) {
        if (!allowedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
          return {
            data: `Blocked: Domain "${parsed.hostname}" is not in the allowlist`,
          };
        }
      }

      try {
        // redirect: "manual" to prevent redirect-based SSRF bypass.
        // We follow redirects ourselves so we can validate each hop.
        let currentUrl = input.url;
        const MAX_REDIRECTS = 5;

        for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
          const response = await fetch(currentUrl, {
            redirect: "manual",
            headers: {
              "User-Agent": "YAAF-Agent/1.0",
              Accept: "text/html, text/plain, application/json, */*",
            },
            signal: AbortSignal.timeout(30_000),
          });

          // Handle redirects — validate each hop
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) {
              return { data: `HTTP ${response.status} redirect with no Location header` };
            }

            // Resolve relative redirects
            let redirectUrl: URL;
            try {
              redirectUrl = new URL(location, currentUrl);
            } catch {
              return { data: `Blocked: Invalid redirect URL` };
            }

            // Validate redirect target
            if (redirectUrl.protocol !== "http:" && redirectUrl.protocol !== "https:") {
              return { data: `Blocked: Redirect to non-HTTP protocol` };
            }
            const redirectBlockReason = isBlockedHost(redirectUrl.hostname);
            if (redirectBlockReason) {
              return {
                data: `Blocked: Redirect target is a ${redirectBlockReason} (SSRF protection)`,
              };
            }

            currentUrl = redirectUrl.href;
            continue;
          }

          if (!response.ok) {
            return { data: `HTTP ${response.status} ${response.statusText}` };
          }

          const contentType = response.headers.get("content-type") ?? "";
          let text = await response.text();

          // Truncate if needed
          if (text.length > maxChars) {
            text = text.slice(0, maxChars) + `\n\n[Truncated at ${maxChars} characters]`;
          }

          // For HTML, do a basic tag-stripping to extract text
          if (contentType.includes("text/html")) {
            text = stripHtmlTags(text);
          }

          return { data: text };
        }

        return { data: "Blocked: Too many redirects (max 5)" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { data: `Fetch error: ${msg}` };
      }
    },

    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    checkPermissions: () => Promise.resolve({ behavior: "ask" }),

    prompt: () =>
      "Fetch the content of a URL. Only http:// and https:// are allowed. " +
      "Private/internal IP addresses are blocked for security.",
  });
}


/** Basic HTML tag stripper — removes tags, scripts, styles, and normalizes whitespace */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
