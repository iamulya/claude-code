/**
 * InputAnomalyDetector — Statistical Anomaly Detection on LLM Inputs
 *
 * Detects unusual input patterns that correlate with prompt injection attempts
 * but cannot be caught by regex alone:
 *
 * - **Token entropy spikes** — unusually high/low Shannon entropy (encoded payloads)
 * - **Length anomalies** — inputs far exceeding normal length distributions
 * - **Language mixing** — sudden script/language switches within a message
 * - **Repetition patterns** — repeated character sequences (padding attacks)
 * - **Invisible character density** — high ratio of non-printable chars
 *
 * Works as a secondary layer after PromptGuard for defense-in-depth.
 *
 * @module security/inputAnomalyDetector
 */

import type { ChatMessage } from "../agents/runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type InputAnomalyConfig = {
  /**
   * Maximum input length in characters before flagging.
   * Default: 50_000.
   */
  maxInputLength?: number;

  /**
   * Maximum input length in characters before hard-blocking.
   * Default: 200_000.
   */
  hardMaxInputLength?: number;

  /**
   * Minimum Shannon entropy (bits per character) to flag as suspiciously low.
   * Very low entropy = repetitive padding attacks.
   * Default: 1.5.
   */
  minEntropy?: number;

  /**
   * Maximum Shannon entropy (bits per character) to flag as suspiciously high.
   * Very high entropy = encoded/encrypted payloads.
   * Default: 5.5.
   */
  maxEntropy?: number;

  /**
   * Maximum ratio of invisible/non-printable characters.
   * Default: 0.05 (5%).
   */
  maxInvisibleRatio?: number;

  /**
   * Maximum ratio of repeated 3-grams (subsequences).
   * Default: 0.4 (40%).
   */
  maxRepetitionRatio?: number;

  /**
   * Called on anomaly detection.
   */
  onAnomaly?: (event: InputAnomalyEvent) => void;
};

export type AnomalyType =
  | "length_warning"
  | "length_blocked"
  | "low_entropy"
  | "high_entropy"
  | "invisible_chars"
  | "repetition"
  | "mixed_scripts";

export type InputAnomalyEvent = {
  type: AnomalyType;
  messageIndex: number;
  messageRole: string;
  detail: string;
  /** Severity: warning or block */
  severity: "warning" | "block";
  timestamp: Date;
};

export type InputAnomalyResult = {
  /** Whether any anomalies were detected */
  detected: boolean;
  /** Whether any anomalies are severe enough to block */
  blocked: boolean;
  /** Anomaly events */
  events: InputAnomalyEvent[];
  /** Block reason if blocked */
  blockReason?: string;
};

// ── InputAnomalyDetector ─────────────────────────────────────────────────────

export class InputAnomalyDetector {
  readonly name = "input-anomaly-detector";
  private readonly maxInputLength: number;
  private readonly hardMaxInputLength: number;
  private readonly minEntropy: number;
  private readonly maxEntropy: number;
  private readonly maxInvisibleRatio: number;
  private readonly maxRepetitionRatio: number;
  private readonly onAnomaly?: (event: InputAnomalyEvent) => void;

  constructor(config: InputAnomalyConfig = {}) {
    this.maxInputLength = config.maxInputLength ?? 50_000;
    this.hardMaxInputLength = config.hardMaxInputLength ?? 200_000;
    this.minEntropy = config.minEntropy ?? 1.5;
    this.maxEntropy = config.maxEntropy ?? 5.5;
    this.maxInvisibleRatio = config.maxInvisibleRatio ?? 0.05;
    this.maxRepetitionRatio = config.maxRepetitionRatio ?? 0.4;
    this.onAnomaly = config.onAnomaly;
  }

  /**
   * Analyze messages for statistical anomalies.
   */
  analyze(messages: ChatMessage[]): InputAnomalyResult {
    const events: InputAnomalyEvent[] = [];
    let blocked = false;
    let blockReason: string | undefined;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]!;
      if (msg.role !== "user" && msg.role !== "tool") continue;

      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

      if (!content || content.length === 0) continue;

      // 1. Length checks
      if (content.length > this.hardMaxInputLength) {
        const event = this.createEvent(
          "length_blocked",
          i,
          msg.role,
          "block",
          `Input length ${content.length.toLocaleString()} exceeds hard limit of ${this.hardMaxInputLength.toLocaleString()}`,
        );
        events.push(event);
        blocked = true;
        blockReason = event.detail;
        continue; // no point checking more
      }

      if (content.length > this.maxInputLength) {
        events.push(
          this.createEvent(
            "length_warning",
            i,
            msg.role,
            "warning",
            `Input length ${content.length.toLocaleString()} exceeds recommended limit of ${this.maxInputLength.toLocaleString()}`,
          ),
        );
      }

      // 2. Entropy analysis (only for meaningful-length inputs)
      if (content.length > 100) {
        const entropy = shannonEntropy(content);

        if (entropy < this.minEntropy) {
          events.push(
            this.createEvent(
              "low_entropy",
              i,
              msg.role,
              "warning",
              `Low entropy (${entropy.toFixed(2)} bits) suggests repetitive padding attack`,
            ),
          );
        }

        if (entropy > this.maxEntropy) {
          events.push(
            this.createEvent(
              "high_entropy",
              i,
              msg.role,
              "warning",
              `High entropy (${entropy.toFixed(2)} bits) suggests encoded/encrypted payload`,
            ),
          );
        }
      }

      // 3. Invisible character density
      const invisibleCount = countInvisibleChars(content);
      const invisibleRatio = invisibleCount / content.length;
      if (invisibleRatio > this.maxInvisibleRatio) {
        events.push(
          this.createEvent(
            "invisible_chars",
            i,
            msg.role,
            "warning",
            `${(invisibleRatio * 100).toFixed(1)}% invisible characters (${invisibleCount} chars)`,
          ),
        );
      }

      // 4. Repetition detection (trigram analysis)
      if (content.length > 200) {
        const repRatio = trigramRepetitionRatio(content);
        if (repRatio > this.maxRepetitionRatio) {
          events.push(
            this.createEvent(
              "repetition",
              i,
              msg.role,
              "warning",
              `${(repRatio * 100).toFixed(1)}% trigram repetition suggests padding/flooding`,
            ),
          );
        }
      }

      // 5. Mixed script detection (Latin + CJK + Cyrillic + Arabic in same message)
      if (content.length > 20) {
        const scripts = detectScripts(content);
        if (scripts.size >= 3) {
          events.push(
            this.createEvent(
              "mixed_scripts",
              i,
              msg.role,
              "warning",
              `${scripts.size} different writing scripts detected: ${[...scripts].join(", ")}`,
            ),
          );
        }
      }
    }

    return {
      detected: events.length > 0,
      blocked,
      events,
      blockReason,
    };
  }

  /**
   * Create a `beforeLLM` hook.
   */
  hook(): (messages: ChatMessage[]) => ChatMessage[] | void {
    return (messages: ChatMessage[]) => {
      const result = this.analyze(messages);
      if (result.blocked) {
        // Replace blocked messages
        const blockedIndices = new Set(
          result.events.filter((e) => e.severity === "block").map((e) => e.messageIndex),
        );
        return messages.map((msg, i) =>
          blockedIndices.has(i)
            ? { ...msg, content: "[Message blocked: input anomaly detected]" }
            : msg,
        );
      }
      return undefined;
    };
  }

  private createEvent(
    type: AnomalyType,
    idx: number,
    role: string,
    severity: "warning" | "block",
    detail: string,
  ): InputAnomalyEvent {
    const event: InputAnomalyEvent = {
      type,
      messageIndex: idx,
      messageRole: role,
      detail,
      severity,
      timestamp: new Date(),
    };
    this.onAnomaly?.(event);
    return event;
  }
}

// ── Statistical Helpers ──────────────────────────────────────────────────────

/** Shannon entropy in bits per character */
function shannonEntropy(text: string): number {
  const freq = new Map<string, number>();
  for (const ch of text) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / text.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Count invisible/non-printable characters */
function countInvisibleChars(text: string): number {
  let count = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    // Zero-width chars, control chars (except newline/tab), bidirectional overrides
    if (
      (code >= 0x200b && code <= 0x200f) || // zero-width
      (code >= 0x2028 && code <= 0x202f) || // line/paragraph separators, bidi
      (code >= 0x2060 && code <= 0x206f) || // word joiner, invisible operators
      code === 0xfeff || // BOM
      (code < 0x20 && code !== 0x0a && code !== 0x0d && code !== 0x09) // control chars
    ) {
      count++;
    }
  }
  return count;
}

/** Calculate trigram repetition ratio */
function trigramRepetitionRatio(text: string): number {
  if (text.length < 6) return 0;
  const trigrams = new Map<string, number>();
  for (let i = 0; i <= text.length - 3; i++) {
    const tri = text.slice(i, i + 3);
    trigrams.set(tri, (trigrams.get(tri) ?? 0) + 1);
  }
  let repeated = 0;
  let total = 0;
  for (const count of trigrams.values()) {
    total += count;
    if (count > 1) repeated += count;
  }
  return total > 0 ? repeated / total : 0;
}

/** Detect Unicode script families present in text */
function detectScripts(text: string): Set<string> {
  const scripts = new Set<string>();
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0041 && code <= 0x024f) scripts.add("Latin");
    else if (code >= 0x0400 && code <= 0x04ff) scripts.add("Cyrillic");
    else if (code >= 0x0600 && code <= 0x06ff) scripts.add("Arabic");
    else if (code >= 0x3040 && code <= 0x30ff) scripts.add("Japanese");
    else if (code >= 0x4e00 && code <= 0x9fff) scripts.add("CJK");
    else if (code >= 0xac00 && code <= 0xd7af) scripts.add("Korean");
    else if (code >= 0x0900 && code <= 0x097f) scripts.add("Devanagari");
    else if (code >= 0x0590 && code <= 0x05ff) scripts.add("Hebrew");
    else if (code >= 0x0e00 && code <= 0x0e7f) scripts.add("Thai");
  }
  return scripts;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function inputAnomalyDetector(config?: InputAnomalyConfig): InputAnomalyDetector {
  return new InputAnomalyDetector(config);
}
