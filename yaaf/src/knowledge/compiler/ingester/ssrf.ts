/**
 * Sprint 3.2: SSRF Prevention Utilities
 *
 * Shared URL validation for all network-facing ingester components
 * (KBClipper, image downloader, etc.). Prevents Server-Side Request
 * Forgery by blocking requests to private/internal addresses.
 *
 * Coverage:
 * - RFC 1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Loopback (127.0.0.0/8, ::1)
 * - Link-local (169.254.0.0/16)
 * - Cloud metadata endpoints (AWS, GCP, Azure)
 * - Non-HTTP protocols (file://, ftp://, etc.)
 * - Localhost aliases and internal TLDs
 * - IPv6-mapped IPv4 addresses (::ffff:127.0.0.1)
 * - Octal/hex IP encoding (0x7f000001, 0177.0.0.1)
 * - Decimal-encoded IPs (2130706433 = 127.0.0.1)
 *
 * KNOWN LIMITATION: DNS rebinding and HTTP redirects are NOT blocked at this
 * layer. For full SSRF protection in production, deploy behind a proxy that
 * validates resolved IPs (e.g., ssrf-req-filter, or an egress proxy).
 * See: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
 */

import { lookup } from "dns/promises";

/**
 * Check if a hostname resolves to a private/internal IP address.
 * Blocks RFC 1918, loopback, link-local, and cloud metadata endpoints.
 */
export function isPrivateHost(hostname: string): boolean {
  // IPv6 loopback
  if (hostname === "[::1]" || hostname === "::1") return true;
  // Cloud metadata endpoints (AWS, GCP, Azure)
  if (hostname === "169.254.169.254") return true;
  if (hostname === "metadata.google.internal") return true;
  if (hostname === "metadata.internal") return true;

  // IPv6-mapped IPv4 — Node.js normalizes [::ffff:127.0.0.1] to [::ffff:7f00:1]
  // We need to handle BOTH forms:
  //   1. Dotted-decimal: ::ffff:127.0.0.1
  //   2. Compressed hex:  ::ffff:7f00:1
  const stripped = hostname.replace(/^\[|\]$/g, "");

  // Form 1: Dotted-decimal (::ffff:10.0.0.1)
  const v4MappedDotted = stripped.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (v4MappedDotted) {
    return isPrivateIPv4(v4MappedDotted[1]!);
  }

  // Form 2: Compressed hex (::ffff:7f00:1) — convert to dotted-decimal
  const v4MappedHex = stripped.match(/^::ffff:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/i);
  if (v4MappedHex) {
    const hi = parseInt(v4MappedHex[1]!, 16);
    const lo = parseInt(v4MappedHex[2]!, 16);
    const dotted = `${(hi >> 8) & 0xFF}.${hi & 0xFF}.${(lo >> 8) & 0xFF}.${lo & 0xFF}`;
    return isPrivateIPv4(dotted);
  }

  // IPv4 private ranges (dotted-decimal)
  if (isPrivateIPv4(hostname)) return true;

  // Localhost aliases
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  // Internal TLDs
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return true;

  return false;
}

/**
 * Check if a dotted-decimal IPv4 address is in a private range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 127 ||                              // Loopback (127.0.0.0/8)
    a === 10 ||                               // Class A private (10.0.0.0/8)
    (a === 172 && b! >= 16 && b! <= 31) ||    // Class B private (172.16.0.0/12)
    (a === 192 && b === 168) ||               // Class C private (192.168.0.0/16)
    (a === 169 && b === 254) ||               // Link-local (169.254.0.0/16)
    a === 0                                   // Current network (0.0.0.0/8)
  );
}

/**
 * Normalize an IP that may use octal (0177.0.0.1), hex (0x7f.0.0.1),
 * or decimal-encoded (2130706433) form into dotted-decimal for
 * isPrivateIPv4 checking.
 *
 * Returns null if not an IP-like hostname.
 */
function normalizeIPv4(hostname: string): string | null {
  // Decimal-encoded IP (single integer, e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    const n = parseInt(hostname, 10);
    if (n >= 0 && n <= 0xFFFFFFFF) {
      return [
        (n >>> 24) & 0xFF,
        (n >>> 16) & 0xFF,
        (n >>> 8) & 0xFF,
        n & 0xFF,
      ].join(".");
    }
  }

  // Octal/hex dot-notation (e.g., 0177.0.0.1, 0x7f.0.0.1)
  const parts = hostname.split(".");
  if (parts.length === 4) {
    const parsed = parts.map((p) => {
      if (/^0x[0-9a-fA-F]+$/.test(p)) return parseInt(p, 16);
      if (/^0[0-7]+$/.test(p) && p.length > 1) return parseInt(p, 8);
      if (/^\d+$/.test(p)) return parseInt(p, 10);
      return NaN;
    });
    if (parsed.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
      return parsed.join(".");
    }
  }

  return null;
}

/**
 * Validate a URL against SSRF attack vectors.
 * Used by KBClipper (html.ts), image downloader (images.ts), and any
 * future network-facing ingester component.
 *
 * Security checks (in order):
 * 1. Protocol must be http: or https:
 * 2. Hostname string checked against private ranges + metadata endpoints
 * 3. Normalized IP checked (catches octal/hex/decimal encoding bypasses)
 * 4. DNS resolution checked (catches DNS-based bypasses where hostname
 *    resolves to a private IP)
 *
 * @throws {Error} If the URL targets a private/internal resource.
 */
export async function validateUrlForSSRF(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // 1. Only allow HTTP/HTTPS protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `SSRF blocked: protocol "${parsed.protocol}" not allowed. ` +
        `Only http: and https: are permitted.`,
    );
  }

  // 2. Check hostname string against known private patterns
  if (isPrivateHost(parsed.hostname)) {
    throw new Error(
      `SSRF blocked: hostname "${parsed.hostname}" resolves to a private/internal address. ` +
        `Only public URLs are permitted.`,
    );
  }

  // 3. Check for IP encoding bypasses (octal, hex, decimal)
  const normalized = normalizeIPv4(parsed.hostname);
  if (normalized && isPrivateIPv4(normalized)) {
    throw new Error(
      `SSRF blocked: hostname "${parsed.hostname}" decodes to private address ${normalized}. ` +
        `Only public URLs are permitted.`,
    );
  }

  // 4. DNS resolution check — catches DNS rebinding where a public hostname
  // resolves to a private IP (e.g., evil.com → 169.254.169.254)
  try {
    const { address } = await lookup(parsed.hostname);
    if (isPrivateIPv4(address)) {
      throw new Error(
        `SSRF blocked: hostname "${parsed.hostname}" resolves to private address ${address}. ` +
          `Only public URLs are permitted.`,
      );
    }
  } catch (err) {
    // If our SSRF error, rethrow
    if (err instanceof Error && err.message.startsWith("SSRF blocked:")) throw err;
    // DNS resolution failure for other reasons (NXDOMAIN, etc.) — let fetch handle it
  }
}

/**
 * Create a fetch wrapper that blocks redirects to private/internal URLs.
 * Use this instead of raw `fetch()` for untrusted URLs.
 *
 * This addresses the redirect-based SSRF bypass where a public URL
 * returns HTTP 302 to http://169.254.169.254/latest/meta-data/.
 */
export async function ssrfSafeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  // Validate the initial URL
  await validateUrlForSSRF(url);

  // Disable automatic redirects so we can validate each hop
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
  });

  // If it's a redirect, validate the target before following
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`SSRF blocked: redirect with no Location header from ${url}`);
    }

    // Resolve relative URLs against the original
    const redirectUrl = new URL(location, url).href;
    await validateUrlForSSRF(redirectUrl);

    // Follow the validated redirect (with auto-redirect for subsequent hops)
    return fetch(redirectUrl, {
      ...init,
      redirect: "follow",
    });
  }

  return response;
}
