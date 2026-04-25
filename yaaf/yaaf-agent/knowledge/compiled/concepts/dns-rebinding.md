---
summary: A network attack technique that bypasses security controls by changing the IP address a domain resolves to after an initial check, often used to facilitate Server-Side Request Forgery (SSRF) attacks.
title: DNS rebinding
entity_type: concept
related_subsystems:
 - SSRF Protection
see_also:
 - Server-Side Request Forgery (SSRF)
search_terms:
 - TOCTOU attack
 - SSRF bypass
 - time of check time of use
 - malicious DNS server
 - how to prevent dns rebinding
 - internal network access exploit
 - bypassing firewalls with DNS
 - same-origin policy bypass
 - RFC 1918 attack
 - egress traffic filtering
stub: false
compiled_at: 2026-04-25T00:18:30.264Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is
DNS rebinding is a network attack technique used to bypass security controls by changing the IP address a domain name resolves to over a short period. An attacker controls a malicious DNS server. When a system first requests to resolve a domain, the server returns a public, safe IP address that passes initial validation checks. After a very short Time-To-Live (TTL) on that DNS record expires, a subsequent request to the same domain name causes the system to perform another DNS lookup. This time, the attacker's server returns a private, internal IP address (e.g., `127.0.0.1` or an RFC 1918 address).

This exploits a Time-of-Check to Time-of-Use (TOCTOU) vulnerability. The security check is performed on the safe IP, but the actual, later network operation is performed against the malicious internal IP. In the context of YAAF, this is a significant threat vector for [Server-Side Request Forgery (SSRF)](./server-side-request-forgery-ssrf.md) attacks, allowing an agent to potentially access internal network resources it should not have access to.

## How It Works in YAAF
YAAF's [SSRF Protection](../subsystems/ssrf-protection.md) subsystem contains utilities designed to prevent agents from making requests to internal or private network resources [Source 1]. For example, the `validateUrlForSSRF` function performs several checks, including a DNS resolution check to see if a given hostname resolves to a private IP address [Source 1].

However, this one-time check is vulnerable to a DNS rebinding attack. The source code for the SSRF utilities explicitly notes this as a "KNOWN LIMITATION" [Source 1]. While the initial validation may pass with a safe, public IP, a subsequent `fetch` operation could be "rebound" to a private IP if the DNS record changes between the check and the actual request.

To mitigate this vulnerability in production environments, YAAF deployments should be placed behind a dedicated network proxy that validates the final resolved IP address of all outgoing requests immediately before the connection is established. This closes the TOCTOU window that DNS rebinding exploits [Source 1].

## See Also
- [Server-Side Request Forgery (SSRF)](./server-side-request-forgery-ssrf.md)
- [SSRF Protection](../subsystems/ssrf-protection.md)

## Sources
[Source 1]: src/knowledge/compiler/ingester/ssrf.ts