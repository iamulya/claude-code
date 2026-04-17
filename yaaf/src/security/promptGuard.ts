/**
 * PromptGuard — Prompt Injection Detection Middleware
 *
 * A `beforeLLM` hook that detects common prompt injection patterns:
 *
 * - **Instruction overrides** — "ignore previous instructions", "you are now"
 * - **Role hijacking** — "act as", "pretend you are", "you're a new AI"
 * - **Encoding attacks** — base64-encoded instructions, unicode tricks
 * - **Delimiter escape** — attempts to break out of XML/markdown boundaries
 * - **System prompt extraction** — "repeat your system prompt", "what are your instructions"
 * - **Payload injection** — embedded `<script>`, `javascript:`, SQL injection markers
 * - **Canary token detection** — verifies a hidden canary wasn't extracted
 * - **Homoglyph normalization** — H4 FIX: normalizes visually-similar unicode characters
 * - **Multi-language detection** — H4 FIX: detects injection patterns in non-English text
 *
 * Operates in two modes:
 * - **detect** — flags suspicious messages, logs warning, continues execution
 * - **block** — flags suspicious messages, replaces them with sanitized versions
 *
 * **H4 CAVEAT:** This is a regex-based defense layer. While it provides
 * defense-in-depth, determined attackers with access to the source code can
 * craft inputs that bypass static pattern matching. For high-security
 * applications, layer PromptGuard with:
 * - LLM-based injection classifiers (e.g., a secondary model)
 * - Input/output monitoring and anomaly detection
 * - Strict tool permissions via AccessPolicy
 *
 * @example
 * ```ts
 * import { PromptGuard } from 'yaaf';
 *
 * const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });
 *
 * const agent = new Agent({
 * hooks: {
 * beforeLLM: guard.hook(),
 * },
 * });
 * ```
 *
 * @module security/promptGuard
 */

import type { ChatMessage } from "../agents/runner.js";
import { createHash, randomBytes } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type PromptGuardSensitivity = "low" | "medium" | "high";

export type PromptGuardMode = "detect" | "block";

export type PromptGuardConfig = {
  /**
   * Detection mode:
   * - `detect` — log warnings, allow messages through (default)
   * - `block` — replace detected injection attempts with a sanitized message
   */
  mode?: PromptGuardMode;

  /**
   * Sensitivity level controls which patterns are checked:
   * - `low` — only obvious injection attempts (instruction overrides)
   * - `medium` — adds role hijacking, encoding attacks, delimiter escapes (default)
   * - `high` — adds extraction attempts, content scanning, multilanguage
   *
   * **Note:** Role hijacking ("act as DAN", "you are now...") is included at
   * `medium` (not just `high`) because it is among the most common real-world
   * attack patterns and should be blocked in any production deployment.
   */
  sensitivity?: PromptGuardSensitivity;

  /**
   * Optional canary token to inject into the system prompt.
   * If the canary appears in a user message, it indicates the system prompt
   * was extracted (prompt leakage attack).
   */
  canaryToken?: string;

  /**
   * Additional custom patterns to detect.
   * Each pattern has a name, regex, and severity.
   */
  customPatterns?: PromptGuardPattern[];

  /**
   * Called when an injection attempt is detected.
   * Use for audit logging, alerting, or custom handling.
   */
  onDetection?: (event: PromptGuardEvent) => void;

  /**
   * Message to substitute when blocking in `block` mode.
   * Default: "[Message blocked: potential prompt injection detected]"
   */
  blockMessage?: string;
};

export type PromptGuardPattern = {
  /** Human-readable name for the pattern */
  name: string;
  /** Regex pattern to match against message content */
  pattern: RegExp;
  /** Severity: how likely this is to be an actual attack */
  severity: "low" | "medium" | "high";
  /** Optional description for audit logs */
  description?: string;
};

export type PromptGuardEvent = {
  /** Type of injection detected */
  patternName: string;
  /** Severity of the detection */
  severity: "low" | "medium" | "high";
  /** The message role that triggered the detection */
  messageRole: string;
  /** Index of the message in the conversation */
  messageIndex: number;
  /** Excerpt of the matched content (truncated for safety) */
  matchExcerpt: string;
  /** Action taken */
  action: "detected" | "blocked";
  /** Timestamp */
  timestamp: Date;
};

export type PromptGuardResult = {
  /** Whether any injection was detected */
  detected: boolean;
  /** All detections found */
  events: PromptGuardEvent[];
  /** The (potentially modified) messages */
  messages: ChatMessage[];
};

// ── Built-in Patterns ────────────────────────────────────────────────────────

const INSTRUCTION_OVERRIDE_PATTERNS: PromptGuardPattern[] = [
  {
    name: "instruction-override",
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b.{0,30}\b(previous|above|prior|earlier|all|system|original)\b.{0,30}\b(instructions?|prompts?|rules?|guidelines?|directives?|constraints?)\b/i,
    severity: "high",
    description: "Attempts to override system instructions",
  },
  {
    name: "new-instructions",
    pattern:
      /\b(new|updated|revised|actual|real)\b.{0,15}\b(instructions?|prompt|rules?|guidelines?|directives?)\b.{0,5}(:|are|follow)/i,
    severity: "high",
    description: "Injects new instructions",
  },
  {
    name: "do-not-follow",
    pattern:
      /\bdo\s+not\s+(follow|obey|listen\s+to|respect)\b.{0,30}\b(system|original|initial)\b/i,
    severity: "high",
    description: "Instructs to not follow system prompt",
  },
  // SEMANTIC BYPASS FIX: Catch natural-language rephrasing that avoids regex vocabulary.
  // e.g. "Set aside what you've been told...", "From this moment your only purpose is..."
  {
    name: "instruction-override-natural",
    pattern:
      /\b(set\s+aside|put\s+aside|discard|clear)\b.{0,30}\b(told|given|provided|received|heard)/i,
    severity: "high",
    description: "Natural-language instruction override (set aside / put aside)",
  },
  {
    name: "sole-purpose-hijack",
    pattern:
      /\b(from\s+(this\s+)?(moment|now|point)\s+(on)?|henceforth|hereafter)\b.{0,40}\b(your\s+(only|sole|single|one|primary)\s+(purpose|goal|directive|job|task|mission|objective|function|role))/i,
    severity: "high",
    description: "Attempts to replace agent mission with a single directive",
  },
  {
    name: "earlier-guidance",
    pattern:
      /\b(earlier|prior|initial|original|previous)\s+(guidance|direction|context|framing|setup|configuration)\b/i,
    severity: "medium",
    description: "References earlier guidance to dismiss it",
  },
];

const ROLE_HIJACK_PATTERNS: PromptGuardPattern[] = [
  {
    name: "role-hijack",
    pattern:
      /\b(you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+(to\s+be|you\s+are)|imagine\s+you\s+are|roleplay\s+as|switch\s+to)\b/i,
    severity: "medium",
    description: "Attempts to change the AI role",
  },
  {
    name: "jailbreak-DAN",
    pattern:
      /\b(DAN|Do\s+Anything\s+Now|STAN|DUDE|AIM)\b.{0,50}\b(mode|version|personality|character)\b/i,
    severity: "high",
    description: "Known jailbreak persona names",
  },
  {
    name: "developer-mode",
    pattern:
      /\b(developer|debug|admin|root|sudo|maintenance)\s+(mode|access|override|privileges?)\b/i,
    severity: "high",
    description: "Claims special access modes",
  },
];

const ENCODING_ATTACK_PATTERNS: PromptGuardPattern[] = [
  {
    name: "base64-instruction",
    pattern:
      /(?:decode|interpret|execute|follow|read)\s+(?:this|the\s+following)?\s*(?:base64|b64|encoded)/i,
    severity: "medium",
    description: "Instructs to decode encoded content that may contain injections",
  },
  {
    name: "hex-encoded-block",
    pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/i,
    severity: "medium",
    description: "Large hex-encoded payload",
  },
  {
    name: "unicode-smuggling",
    pattern: /[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/,
    severity: "low",
    description: "Zero-width or invisible unicode characters",
  },
];

const DELIMITER_ESCAPE_PATTERNS: PromptGuardPattern[] = [
  {
    name: "xml-escape",
    pattern:
      /<\/?(?:system|assistant|user|human|ai|instructions?|prompt|context|tool_result|function_call)\s*>/i,
    severity: "medium",
    description: "Attempts to inject XML role boundaries",
  },
  {
    name: "markdown-escape",
    pattern: /^#{1,3}\s*(system\s*prompt|instructions?|rules?|context)/im,
    severity: "low",
    description: "Markdown headers mimicking system sections",
  },
];

const EXTRACTION_PATTERNS: PromptGuardPattern[] = [
  {
    name: "prompt-extraction",
    pattern:
      /\b(repeat|show|display|print|output|reveal|tell\s+me)\b.{0,30}\b(system\s*prompt|instructions?|initial\s*prompt|original\s*prompt|full\s*prompt|your\s*rules|your\s*guidelines)\b/i,
    severity: "high",
    description: "Attempts to extract the system prompt",
  },
  {
    name: "prompt-leak-indirect",
    pattern:
      /\b(what\s+(?:are|were)\s+you\s+told|how\s+were\s+you\s+(?:programmed|configured|prompted|instructed))\b/i,
    severity: "medium",
    description: "Indirect prompt extraction attempt",
  },
];

const PAYLOAD_PATTERNS: PromptGuardPattern[] = [
  {
    name: "xss-payload",
    pattern: /<script[\s>]|javascript:|on(?:load|error|click|mouseover)\s*=/i,
    severity: "high",
    description: "Cross-site scripting payload",
  },
  {
    name: "sql-injection",
    pattern: /(?:'\s*(?:OR|AND|UNION)\s+|--\s*$|;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|EXEC\s+xp_)/im,
    severity: "medium",
    description: "SQL injection markers (may propagate to tool queries)",
  },
  {
    name: "command-injection",
    pattern:
      /(?:;\s*(?:cat|curl|wget|nc|bash|sh|python|node|rm|chmod)\s|`[^`]{3,}`|\$\([^)]{3,}\))/i,
    severity: "medium",
    description: "Shell command injection markers",
  },
];

// Multi-language injection patterns to prevent language-switching bypasses
// Extended from 5 to 11 languages for broader coverage.
// Still not exhaustive — for maximum coverage, layer with an LLM-based classifier.
const MULTILANG_PATTERNS: PromptGuardPattern[] = [
  {
    name: "multilang-chinese-override",
    // 忽略=ignore 指令=instructions 系统=system 提示=prompt 角色=role
    pattern: /(?:忽略|不要遵循|无视).{0,20}(?:指令|提示|规则|系统)/,
    severity: "high",
    description: "Chinese-language instruction override attempt",
  },
  {
    name: "multilang-spanish-override",
    pattern: /\b(?:ignora|olvida|descarta)\b.{0,30}\b(?:instrucciones|reglas|sistema|prompt)\b/i,
    severity: "high",
    description: "Spanish-language instruction override attempt",
  },
  {
    name: "multilang-german-override",
    pattern:
      /\b(?:ignoriere|vergiss|\u00fcberschreibe)\b.{0,30}\b(?:anweisungen|regeln|system|prompt)\b/i,
    severity: "high",
    description: "German-language instruction override attempt",
  },
  {
    name: "multilang-french-override",
    pattern:
      /\b(?:ignore[rz]?|oublie[rz]?)\b.{0,30}\b(?:instructions|r\u00e8gles|syst\u00e8me|prompt)\b/i,
    severity: "high",
    description: "French-language instruction override attempt",
  },
  {
    name: "multilang-arabic-override",
    // تجاهل=ignore تعليمات=instructions النظام=system
    pattern: /(?:تجاهل|انس|تخط).{0,30}(?:تعليمات|الأوامر|النظام)/,
    severity: "high",
    description: "Arabic-language instruction override attempt",
  },
  // Additional language coverage
  {
    name: "multilang-japanese-override",
    // 無視=ignore 指示=instructions システム=system プロンプト=prompt
    pattern: /(?:無視|忘れ|従わな).{0,20}(?:指示|命令|システム|プロンプト|ルール)/,
    severity: "high",
    description: "Japanese-language instruction override attempt",
  },
  {
    name: "multilang-korean-override",
    // 무시=ignore 지시=instructions 시스템=system 명령=command
    pattern: /(?:무시|잊어|따르지).{0,20}(?:지시|명령|시스템|프롬프트|규칙)/,
    severity: "high",
    description: "Korean-language instruction override attempt",
  },
  {
    name: "multilang-russian-override",
    // игнорируй=ignore инструкции=instructions система=system
    pattern: /(?:игнорируй|забудь|отбрось).{0,30}(?:инструкции|правила|систем|промпт)/i,
    severity: "high",
    description: "Russian-language instruction override attempt",
  },
  {
    name: "multilang-hindi-override",
    // अनदेखा=ignore निर्देश=instructions सिस्टम=system नियम=rules
    pattern: /(?:अनदेखा|भूल|नज़रअंदाज़).{0,30}(?:निर्देश|नियम|सिस्टम|प्रॉम्प्ट)/,
    severity: "high",
    description: "Hindi-language instruction override attempt",
  },
  {
    name: "multilang-portuguese-override",
    pattern:
      /\b(?:ignore|esque[cç]a|descarte)\b.{0,30}\b(?:instru[cç][oõ]es|regras|sistema|prompt)\b/i,
    severity: "high",
    description: "Portuguese-language instruction override attempt",
  },
  {
    name: "multilang-turkish-override",
    pattern: /\b(?:yok\s*say|unut|g[oö]rmezden\s*gel)\b.{0,30}\b(?:talimat|kural|sistem|prompt)\b/i,
    severity: "high",
    description: "Turkish-language instruction override attempt",
  },
];

// Homoglyph normalization map for common confusable characters
// Maps visually-similar unicode characters to their ASCII equivalents
const HOMOGLYPH_MAP: Record<string, string> = {
  // Latin lookalikes (Cyrillic, etc.)
  "\u0430": "a",
  "\u0435": "e",
  "\u043e": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0443": "y",
  "\u0456": "i",
  "\u0445": "x",
  "\u0455": "s",
  "\u04bb": "h",
  // Full-width Latin
  "\uff41": "a",
  "\uff42": "b",
  "\uff43": "c",
  "\uff44": "d",
  "\uff45": "e",
  "\uff46": "f",
  "\uff47": "g",
  "\uff48": "h",
  "\uff49": "i",
  "\uff4a": "j",
  // Leet-speak digits
  "\u0031": "1",
  "\u0033": "3",
  "\u0030": "0",
  // Mathematical italic
  "\ud835\udc4e": "a",
  "\ud835\udc4f": "b",
  "\ud835\udc50": "c",
};

/**
 * Normalize text to defeat homoglyph and whitespace obfuscation.
 * Applies unicode NFKC normalization, strips zero-width chars, and maps
 * known confusable characters to their ASCII equivalents.
 */
function normalizeText(text: string): string {
  // NFKC normalization (decomposes + composes compatibility forms)
  let normalized = text.normalize("NFKC");

  // Strip zero-width characters (U+200B through U+200F, FEFF, etc.)
  normalized = normalized.replace(/[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, "");

  // Map known homoglyphs
  normalized = normalized.replace(/./g, (char) => HOMOGLYPH_MAP[char] ?? char);

  // Collapse excessive whitespace
  normalized = normalized.replace(/\s{3,}/g, " ");

  return normalized;
}

// ── PromptGuard ──────────────────────────────────────────────────────────────

export class PromptGuard {
  readonly name = "prompt-guard";
  private readonly mode: PromptGuardMode;
  private readonly sensitivity: PromptGuardSensitivity;
  /** Store SHA-256 hash of canary token — never store raw value. */
  private readonly canaryHash?: string;
  private readonly patterns: PromptGuardPattern[];
  private readonly onDetection?: (event: PromptGuardEvent) => void;
  private readonly blockMessage: string;

  /** Running count of detections across all calls */
  private _detectionCount = 0;

  /**
   * PG-2 FIX: Tracks the highest message index fully scanned on a previous hook()
   * call. Used by the hook's delta-scan optimisation: only messages added since the
   * last call are scanned per-message (old messages cannot change between turns).
   * Reset to -1 after any block action so subsequent calls re-scan the full window.
   */
  private _lastScannedIndex = -1;

  constructor(config: PromptGuardConfig = {}) {
    this.mode = config.mode ?? "detect";
    this.sensitivity = config.sensitivity ?? "medium";
    // Store only the SHA-256 hash of the canary token so the raw
    // value can't be read from a running instance (debug dumps, OTel spans, etc.).
    // Uses module-level import (ESM-safe) instead of require('crypto').
    if (config.canaryToken) {
      this.canaryHash = createHash("sha256").update(config.canaryToken).digest("hex");
    }
    this.onDetection = config.onDetection;
    this.blockMessage =
      config.blockMessage ?? "[Content partially redacted: potential prompt injection detected]";

    // Build pattern set based on sensitivity
    this.patterns = this.buildPatternSet(config.customPatterns ?? []);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Scan messages for prompt injection patterns.
   * Returns detection results and (optionally modified) messages.
   */
  scan(messages: ChatMessage[], startIndex = 0): PromptGuardResult {
    const events: PromptGuardEvent[] = [];

    for (let i = startIndex; i < messages.length; i++) {
      const msg = messages[i]!;
      // PG-1 FIX: Only scan 'user' and 'tool' messages — skip 'assistant' and 'system'.
      //
      // Rationale:
      // - 'system' messages are operator-controlled and trusted.
      // - 'assistant' messages are LLM output, not attacker input. Scanning them
      // causes false positives when the model summarises or quotes a detected
      // attack in a safety report. It also creates a DoS vector: a crafted user
      // input can make the assistant's response trigger the guard on subsequent
      // turns, permanently blocking the session.
      // - 'user' and 'tool' messages are the only untrusted input surfaces.
      if (msg.role !== "user" && msg.role !== "tool") continue;

      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

      // Normalize content before pattern matching to defeat
      // homoglyph substitution, zero-width chars, and whitespace obfuscation.
      // We scan both the original AND normalized forms — original catches
      // exact patterns, normalized catches obfuscated variants.
      const normalizedContent = this.normalizeForScan(content);

      // Check canary token using hash comparison (raw token never stored)
      if (this.canaryHash) {
        // Uses module-level import (ESM-safe) instead of require('crypto').
        const rawMatch = this._scanForCanary(content) || this._scanForCanary(normalizedContent);
        if (rawMatch) {
          events.push({
            patternName: "canary-extraction",
            severity: "high",
            messageRole: msg.role,
            messageIndex: i,
            matchExcerpt: "[canary token detected]",
            action: this.mode === "block" ? "blocked" : "detected",
            timestamp: new Date(),
          });
        }
      }

      // Check all patterns (against both original and normalized text)
      for (const pattern of this.patterns) {
        const originalMatch = content.match(pattern.pattern);
        const normalizedMatch = !originalMatch ? normalizedContent.match(pattern.pattern) : null;
        const matchObj = originalMatch ?? normalizedMatch;
        if (matchObj) {
          events.push({
            patternName: pattern.name,
            severity: pattern.severity,
            messageRole: msg.role,
            messageIndex: i,
            matchExcerpt: (matchObj[0] ?? "").slice(0, 80),
            action: this.mode === "block" ? "blocked" : "detected",
            timestamp: new Date(),
          });
        }
      }
    }

    // CROSS-MESSAGE INJECTION FIX: Attackers split injections across adjacent messages
    // so no single message matches any pattern. Scan concatenated adjacent untrusted
    // message pairs to catch split injections.
    //
    // PG-1 FIX: Only cross-scan user+tool pairs (skip assistant messages).
    const untrustedMessages = messages
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => m.role === "user" || m.role === "tool");

    for (let k = 0; k < untrustedMessages.length - 1; k++) {
      const a = untrustedMessages[k]!;
      const b = untrustedMessages[k + 1]!;
      const contentA = typeof a.m.content === "string" ? a.m.content : JSON.stringify(a.m.content);
      const contentB = typeof b.m.content === "string" ? b.m.content : JSON.stringify(b.m.content);
      const combined = contentA + " " + contentB;
      const normalizedCombined = this.normalizeForScan(combined);

      for (const pattern of this.patterns) {
        // Skip if either message ALREADY flagged this pattern (avoid double-counting)
        const alreadyFlagged = events.some(
          (e) =>
            e.patternName === pattern.name &&
            (e.messageIndex === a.idx || e.messageIndex === b.idx),
        );
        if (alreadyFlagged) continue;

        const combinedMatch =
          combined.match(pattern.pattern) ?? normalizedCombined.match(pattern.pattern);
        if (combinedMatch) {
          // PRIMARY event — attributed to the earlier message
          events.push({
            patternName: `${pattern.name}:cross-message`,
            severity: pattern.severity,
            messageRole: "cross-message",
            messageIndex: a.idx,
            matchExcerpt: `[cross-message injection: messages ${a.idx}→${b.idx}]`,
            action: this.mode === "block" ? "blocked" : "detected",
            timestamp: new Date(),
          });
          // CROSS-MESSAGE BLOCK FIX: Also mark the second message for redaction.
          // Previously only a.idx was in the events list, so the block-mode mapper
          // left b.idx unchanged — half the injection still reached the LLM.
          // We add a partner event so both messages are independently redacted.
          events.push({
            patternName: `${pattern.name}:cross-message:partner`,
            severity: pattern.severity,
            messageRole: "cross-message",
            messageIndex: b.idx,
            matchExcerpt: `[cross-message injection: messages ${a.idx}→${b.idx}]`,
            action: this.mode === "block" ? "blocked" : "detected",
            timestamp: new Date(),
          });
        }
      }
    }

    // Fire callbacks
    for (const event of events) {
      this._detectionCount++;
      this.onDetection?.(event);
    }

    // Block mode: replace ALL matched spans, not just the first occurrence.
    // Previously used content.replace(excerpt, ...) which only replaces
    // the first match. An injection phrase repeated multiple times would only
    // have its first occurrence redacted. Now uses replaceAll().
    let outputMessages = messages;
    if (this.mode === "block" && events.length > 0) {
      outputMessages = messages.map((msg, i) => {
        const msgEvents = events.filter((e) => e.messageIndex === i);
        if (msgEvents.length === 0) return msg;
        let content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        // Replace ALL occurrences of each matched span with a redaction marker
        for (const event of msgEvents) {
          const excerpt = event.matchExcerpt;
          if (
            excerpt &&
            excerpt !== "[canary token detected]" &&
            !excerpt.startsWith("[cross-message injection") &&
            content.includes(excerpt)
          ) {
            // replaceAll to catch repeated injection phrases
            content = content.replaceAll(excerpt, `[REDACTED:${event.patternName}]`);
          } else {
            // Canary, cross-message, or complex match — can't pinpoint span; redact full content
            content = this.blockMessage;
            break;
          }
        }
        return { ...msg, content };
      });
    }

    return {
      detected: events.length > 0,
      events,
      messages: outputMessages,
    };
  }

  /**
   * Create a `beforeLLM` hook function.
   *
   * PG-2 FIX: Uses delta scanning — only messages added since the previous call
   * are scanned per-message. Cross-message scanning always covers the full
   * untrusted window to avoid missing split-injection attacks across the boundary.
   *
   * @example
   * ```ts
   * const agent = new Agent({
   * hooks: { beforeLLM: guard.hook() },
   * });
   * ```
   */
  hook(): (messages: ChatMessage[]) => ChatMessage[] | void {
    return (messages: ChatMessage[]) => {
      // PG-2 FIX: Only scan messages that are new since the last hook() call.
      // _lastScannedIndex tracks the highest index fully processed; we start
      // the per-message scan from _lastScannedIndex + 1.
      // Cross-message scanning still covers adjacent pairs that straddle the
      // boundary (we pass startIndex - 1 clamped to 0 for that phase).
      const scanFrom = Math.max(0, this._lastScannedIndex);
      const result = this.scan(messages, scanFrom);

      if (result.detected && this.mode === "block") {
        // Reset watermark so we re-scan everything after a block action,
        // in case the caller removes or replaces messages.
        this._lastScannedIndex = -1;
        return result.messages;
      }

      // Advance watermark: everything up to messages.length - 1 is now scanned.
      this._lastScannedIndex = messages.length - 1;
      return undefined;
    };
  }

  /**
   * Generate a random canary token to embed in system prompts.
   * If this token appears in user messages, the system prompt was extracted.
   * Returns the raw token (embed this in the system prompt), and also
   * a configured PromptGuard with the token's hash registered.
   */
  static generateCanary(): string {
    // Uses module-level import (ESM-safe) instead of require('crypto').
    // Token format: 'YAAF_CANARY_' (12 chars) + 24 hex chars = 36 chars total.
    return "YAAF_CANARY_" + randomBytes(12).toString("hex");
  }

  /**
   * FIX 3.3 + CANARY ROBUSTNESS FIX: Internal — scan content for a substring
   * whose SHA-256 matches the stored canary hash.
   *
   * Improvement over original: tries multiple window sizes to handle cases where
   * the model outputs the canary with inserted spaces, punctuation, or surrounding
   * characters (e.g. "YAAF_CANARY_ abc..." with a space). Strips whitespace from
   * candidates before hashing to catch these variants.
   */
  private _scanForCanary(content: string): boolean {
    if (!this.canaryHash) return false;
    const CANARY_PREFIX = "YAAF_CANARY_";
    // Canonical length: 'YAAF_CANARY_' (12) + randomBytes(12).toString('hex') (24) = 36
    const CANARY_LEN = 36;

    let idx = content.indexOf(CANARY_PREFIX);
    while (idx !== -1) {
      // Try exact-length window first (fast path)
      const candidate = content.slice(idx, idx + CANARY_LEN);
      if (createHash("sha256").update(candidate).digest("hex") === this.canaryHash) return true;

      // CANARY ROBUSTNESS FIX: Try whitespace-stripped variants to handle
      // outputs like "YAAF_CANARY_ abc..." (space inserted by model).
      // Also try slightly wider windows (up to +4 chars) for punctuation variants.
      const stripped = candidate.replace(/\s/g, "");
      if (
        stripped !== candidate &&
        createHash("sha256").update(stripped).digest("hex") === this.canaryHash
      )
        return true;

      for (const extra of [1, 2, 3, 4]) {
        const wider = content.slice(idx, idx + CANARY_LEN + extra).replace(/\s/g, "");
        if (createHash("sha256").update(wider).digest("hex") === this.canaryHash) return true;
      }

      idx = content.indexOf(CANARY_PREFIX, idx + 1);
    }
    return false;
  }

  /** Total detections across all scans */
  get detectionCount(): number {
    return this._detectionCount;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private buildPatternSet(custom: PromptGuardPattern[]): PromptGuardPattern[] {
    const patterns: PromptGuardPattern[] = [];

    // Always include instruction overrides (even at low sensitivity)
    patterns.push(...INSTRUCTION_OVERRIDE_PATTERNS);

    if (this.sensitivity === "medium" || this.sensitivity === "high") {
      // Role hijacking promoted from 'high' to 'medium' because
      // "act as DAN", "you are now", "developer mode" are among the most
      // commonly observed real-world attacks and should be blocked by default.
      patterns.push(...ROLE_HIJACK_PATTERNS);
      patterns.push(...ENCODING_ATTACK_PATTERNS);
      patterns.push(...DELIMITER_ESCAPE_PATTERNS);
      patterns.push(...PAYLOAD_PATTERNS);
    }

    if (this.sensitivity === "high") {
      patterns.push(...EXTRACTION_PATTERNS);
      // Include multi-language patterns at high sensitivity
      patterns.push(...MULTILANG_PATTERNS);
    }

    // Always include custom patterns
    patterns.push(...custom);

    return patterns;
  }

  /**
   * Normalize text before pattern matching to defeat
   * homoglyph substitution and whitespace obfuscation.
   */
  private normalizeForScan(text: string): string {
    return normalizeText(text);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a prompt guard with sensible production defaults.
 *
 * ⚠️ DEFAULT MODE IS 'block' — detected injections are redacted before reaching the LLM.
 * Pass `mode: 'detect'` if you only want logging without blocking (not recommended for production).
 *
 * @example
 * ```ts
 * const guard = promptGuard({
 * onDetection: (e) => auditLog.write(e),
 * });
 *
 * const agent = new Agent({
 * hooks: { beforeLLM: guard.hook() },
 * });
 * ```
 */
export function promptGuard(config?: PromptGuardConfig): PromptGuard {
  return new PromptGuard({
    // DEFAULT CHANGED: was 'detect' (logs only). Changed to 'block' because a
    // security primitive that silently permits the attack it's designed to prevent
    // is worse than no guard at all — it gives a false sense of protection.
    mode: "block",
    sensitivity: "medium",
    ...config,
  });
}

/**
 * Create a strict prompt guard that blocks all detected injections.
 */
export function strictPromptGuard(
  config?: Omit<PromptGuardConfig, "mode" | "sensitivity">,
): PromptGuard {
  return new PromptGuard({
    ...config,
    mode: "block",
    sensitivity: "high",
  });
}
