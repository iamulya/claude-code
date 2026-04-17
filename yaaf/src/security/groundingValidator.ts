/**
 * GroundingValidator — Anti-Hallucination Cross-Reference Check
 *
 * Validates LLM responses against the evidence (tool results) in the
 * conversation. Detects when the LLM makes claims that aren't grounded
 * in any tool output, reducing the risk of hallucination.
 *
 * Three modes:
 * - `warn` — log ungrounded claims, pass response through
 * - `annotate` — append `[ungrounded]` markers to suspicious claims
 * - `strict` — override response if grounding score is below threshold
 *
 * Grounding uses a two-layer scoring model:
 *
 * 1. **TF-IDF keyword overlap** (always active) — fast, zero-cost signal.
 * A sentence is grounded if it overlaps ≥ `minOverlapTokens` significant
 * words with any tool result.
 *
 * 2. **Embedding similarity** (opt-in via `embedFn`) — semantic signal for
 * paraphrased or summarized claims that share few exact tokens.
 * The evidence corpus is embedded once per `assess()` call and cached.
 * A sentence is grounded if `cosineSimilarity(sentence, evidence) ≥ embeddingThreshold`.
 *
 * 3. **LLM semantic scorer** (opt-in via `llmScorer`) — last-resort human-quality
 * evaluation for borderline sentences (keyword overlap > 0 but < threshold).
 * Only invoked when the faster layers are inconclusive.
 *
 * When an `llmScorer` is provided, borderline sentences (some overlap but below
 * minOverlapTokens) are escalated to the scorer for semantic evaluation.
 *
 * @example
 * ```ts
 * import { GroundingValidator } from 'yaaf';
 *
 * const validator = new GroundingValidator({
 * mode: 'warn',
 * minCoverage: 0.3,
 * });
 *
 * const agent = new Agent({
 * hooks: {
 * afterLLM: validator.hook(),
 * },
 * });
 * ```
 *
 * @module security/groundingValidator
 */

import type { ChatMessage, ChatResult } from "../agents/runner.js";
import type { LLMHookResult } from "../hooks.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type GroundingMode = "warn" | "annotate" | "strict";

export type GroundingValidatorConfig = {
  /**
   * Validation mode:
   * - `warn` — log warning, pass response through (default)
   * - `annotate` — add [⚠️ ungrounded] markers to unverified sentences
   * - `strict` — override response if below threshold
   */
  mode?: GroundingMode;

  /**
   * Minimum fraction of response sentences that must be grounded (0-1).
   * Only used in `strict` mode.
   * Default: 0.3 (30% of factual sentences must be backed by tool results).
   */
  minCoverage?: number;

  /**
   * Minimum number of token overlap to consider a sentence "grounded".
   * Default: 3 (at least 3 significant words must overlap with tool evidence).
   */
  minOverlapTokens?: number;

  /**
   * Message to use when overriding in strict mode.
   */
  overrideMessage?: string;

  /**
   * Called on every grounding assessment.
   */
  onAssessment?: (event: GroundingAssessment) => void;

  /**
   * Minimum words for a sentence to be considered a "factual claim"
   * worth checking. Shorter sentences (greetings, acknowledgments)
   * are skipped.
   * Default: 5
   */
  minSentenceWords?: number;

  /**
   * S3-B FIX: Optional LLM-based semantic scorer for borderline sentences.
   *
   * When a sentence's keyword overlap is between 0 and minOverlapTokens
   * (i.e., it has SOME evidence but not enough for a definitive keyword match),
   * the LLM scorer is invoked to produce a 0-1 semantic similarity score.
   * A sentence is "grounded" if the LLM score >= llmGroundingThreshold.
   *
   * This provides a semantic fallback for paraphrased or summarized claims that
   * shared vocabulary-based overlap would mark as ungrounded.
   *
   * The scorer is model-agnostic — pass any async function that calls your
   * preferred model (GPT-4o, Gemini, Claude, etc.).
   *
   * @example
   * ```ts
   * import { openai } from '@openai/agents'
   * const validator = new GroundingValidator({
   * mode: 'annotate',
   * llmScorer: async ({ sentence, evidenceSnippets }) => {
   * const resp = await openai.chat.completions.create({
   * model: 'gpt-4o-mini',
   * messages: [{
   * role: 'user',
   * content: `Score 0-1 how well this claim is supported by evidence:\nClaim: ${sentence}\nEvidence: ${evidenceSnippets.join(' | ')}`
   * }],
   * })
   * return parseFloat(resp.choices[0]?.message.content ?? '0')
   * },
   * })
   * ```
   */
  llmScorer?: (opts: {
    /** The sentence being evaluated */
    sentence: string;
    /** Up to 3 most-relevant evidence snippets */
    evidenceSnippets: string[];
  }) => Promise<number>; // 0 = ungrounded, 1 = fully grounded

  /**
   * Minimum LLM scorer confidence to mark a sentence as grounded.
   * Default: 0.5
   */
  llmGroundingThreshold?: number;

  /**
   * Optional embedding function for **semantic grounding** without an LLM call.
   *
   * When provided, the evidence corpus is embedded once per `assess()` call and
   * cached. Each response sentence is then compared against the aggregated evidence
   * embedding via cosine similarity. If the similarity is ≥ `embeddingThreshold`,
   * the sentence is considered grounded — even if keyword overlap is zero.
   *
   * This closes the keyword-ceiling limitation: paraphrased or translated claims
   * (e.g. "the server returned 200" when tool output says "status code: 200") are
   * now detectable without an LLM scorer round-trip.
   *
   * Mirrors `VectorMemoryConfig.embedFn` exactly — pass the same function:
   *
   * @example
   * ```ts
   * import { pipeline } from '@xenova/transformers'
   * const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
   *
   * const validator = new GroundingValidator({
   * mode: 'annotate',
   * embedFn: async (text) => {
   * const out = await embed(text, { pooling: 'mean', normalize: true })
   * return Array.from(out.data as Float32Array)
   * },
   * })
   * ```
   *
   * **Constraint**: All embeddings must have the same dimensionality.
   * The first embedding establishes the expected dimension; mismatches fall back to 0.
   */
  embedFn?: (text: string) => Promise<number[]>;

  /**
   * Minimum cosine similarity (0–1) to consider a sentence grounded via embedding.
   * Default: `0.75` (deliberately higher than `llmGroundingThreshold` since
   * embedding similarity is more reliable than LLM zero-shot scoring).
   */
  embeddingThreshold?: number;
};

export type GroundingSentence = {
  /** The sentence text */
  text: string;
  /** Whether this sentence is grounded in tool evidence */
  grounded: boolean;
  /** Number of overlapping tokens with tool evidence */
  overlapCount: number;
  /** Which tool result provided the best evidence (if any) */
  bestSource?: string;
  /**
   * Which method determined grounding.
   * 'keyword' = TF-IDF overlap; 'embedding' = cosine similarity; 'llm' = LLM scorer.
   */
  scoredBy?: "keyword" | "embedding" | "llm";
};

export type GroundingAssessment = {
  /** Overall grounding score (0-1) */
  score: number;
  /** Number of factual sentences checked */
  totalSentences: number;
  /** Number of grounded sentences */
  groundedSentences: number;
  /** Per-sentence breakdown */
  sentences: GroundingSentence[];
  /** Action taken */
  action: "passed" | "warned" | "annotated" | "overridden";
  /** Timestamp */
  timestamp: Date;
};

// ── Stop words (excluded from overlap comparison) ────────────────────────────

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "must",
  "ought",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "and",
  "but",
  "or",
  "nor",
  "not",
  "so",
  "yet",
  "both",
  "if",
  "then",
  "else",
  "when",
  "where",
  "how",
  "what",
  "which",
  "who",
  "whom",
  "why",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "here",
  "there",
  "all",
  "each",
  "every",
  "some",
  "any",
  "no",
  "more",
  "most",
  "other",
  "also",
  "just",
  "about",
  "up",
  "out",
  "than",
  "very",
  "too",
  "quite",
  "only",
  "even",
]);

// ── GroundingValidator ───────────────────────────────────────────────────────

export class GroundingValidator {
  readonly name = "grounding-validator";
  private readonly mode: GroundingMode;
  private readonly minCoverage: number;
  private readonly minOverlapTokens: number;
  private readonly minSentenceWords: number;
  private readonly overrideMessage: string;
  private readonly onAssessment?: (event: GroundingAssessment) => void;
  private readonly llmScorer?: GroundingValidatorConfig["llmScorer"];
  private readonly llmGroundingThreshold: number;
  private readonly embedFn?: GroundingValidatorConfig["embedFn"];
  private readonly embeddingThreshold: number;

  constructor(config: GroundingValidatorConfig = {}) {
    this.mode = config.mode ?? "warn";
    this.minCoverage = config.minCoverage ?? 0.3;
    this.minOverlapTokens = config.minOverlapTokens ?? 3;
    this.minSentenceWords = config.minSentenceWords ?? 5;
    this.overrideMessage =
      config.overrideMessage ??
      "I wasn't able to fully verify my response against the available evidence. Please verify the claims independently.";
    this.onAssessment = config.onAssessment;
    this.llmScorer = config.llmScorer;
    this.llmGroundingThreshold = config.llmGroundingThreshold ?? 0.5;
    this.embedFn = config.embedFn;
    this.embeddingThreshold = config.embeddingThreshold ?? 0.75;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Assess how well a response is grounded in tool evidence.
   *
   * Now async. When an `llmScorer` is configured, borderline sentences
   * (those with some keyword overlap but below `minOverlapTokens`) are escalated
   * to the scorer for semantic evaluation. A scorer failure degrades gracefully
   * to the keyword result — it never crashes the validation pipeline.
   *
   * @param response - The LLM response text
   * @param messages - Conversation messages (to extract tool results)
   */
  async assess(response: string, messages: readonly ChatMessage[]): Promise<GroundingAssessment> {
    // 1. Extract tool result evidence from conversation
    const evidence = this.extractEvidence(messages);

    // If no tool results in conversation, skip grounding (nothing to check against)
    if (evidence.length === 0) {
      const assessment: GroundingAssessment = {
        score: 1.0,
        totalSentences: 0,
        groundedSentences: 0,
        sentences: [],
        action: "passed",
        timestamp: new Date(),
      };
      this.onAssessment?.(assessment);
      return assessment;
    }

    // 2. Tokenize evidence into sets of significant words per source
    const evidenceSets = evidence.map((e) => ({
      name: e.name,
      content: e.content,
      tokens: tokenize(e.content),
    }));

    // 3. Pre-compute evidence embedding (once per assess() call, cached locally)
    // Concatenate all evidence into a single corpus for a single embedding call.
    let evidenceEmbedding: number[] | null = null;
    if (this.embedFn && evidence.length > 0) {
      const corpus = evidence.map((e) => e.content).join(" ");
      try {
        evidenceEmbedding = await this.embedFn(corpus);
      } catch {
        // embedFn failed — operate without embedding layer
      }
    }

    // 4. Split response into sentences and check each
    const sentences = splitSentences(response);
    const checkedSentences: GroundingSentence[] = [];

    for (const sentence of sentences) {
      // Skip short sentences (greetings, acknowledgments, etc.)
      const words = sentence.split(/\s+/).filter((w) => w.length > 0);
      if (words.length < this.minSentenceWords) continue;

      const sentenceTokens = tokenize(sentence);
      let bestOverlap = 0;
      let bestSource: string | undefined;

      for (const ev of evidenceSets) {
        const overlap = countOverlap(sentenceTokens, ev.tokens);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestSource = ev.name;
        }
      }

      let grounded = bestOverlap >= this.minOverlapTokens;
      let scoredBy: GroundingSentence["scoredBy"] = "keyword";

      // Layer 2: Embedding similarity — runs if keyword didn't pass and embedFn is set.
      // Catches paraphrased/translated claims with zero token overlap.
      if (!grounded && evidenceEmbedding && this.embedFn) {
        try {
          const sentEmbedding = await this.embedFn(sentence);
          if (sentEmbedding.length === evidenceEmbedding.length) {
            const sim = cosineSimilarity(sentEmbedding, evidenceEmbedding);
            if (sim >= this.embeddingThreshold) {
              grounded = true;
              scoredBy = "embedding";
            }
          }
        } catch {
          // embedFn failed for this sentence — fall through to LLM scorer
        }
      }

      // LLM scorer for borderline sentences
      // Borderline = has SOME overlap but not enough for a definitive keyword pass.
      // Only invoked when keyword + embedding layers are inconclusive.
      if (!grounded && bestOverlap > 0 && this.llmScorer) {
        // Pick up to 3 most-relevant evidence snippets for the scorer.
        // BUG FIX: Previously sent e.name (tool name like "search") instead
        // of actual evidence content, making the LLM scorer non-functional.
        const evidenceSnippets = evidenceSets
          .filter((e) => countOverlap(sentenceTokens, e.tokens) > 0)
          .slice(0, 3)
          .map((e) => e.content.slice(0, 500));

        try {
          const llmScore = await this.llmScorer({ sentence, evidenceSnippets });
          // Sanitize: NaN, < 0, > 1 are all treated as 0 (ungrounded)
          const safeScore = Number.isFinite(llmScore) ? Math.max(0, Math.min(1, llmScore)) : 0;
          if (safeScore >= this.llmGroundingThreshold) {
            grounded = true;
            scoredBy = "llm";
          }
        } catch {
          // Scorer failed — fall back to keyword result.
          // This is a degraded-but-operational path, not an error for the user.
        }
      }

      checkedSentences.push({
        text: sentence,
        grounded,
        overlapCount: bestOverlap,
        bestSource: grounded ? bestSource : undefined,
        scoredBy,
      });
    }

    // 4. Calculate score
    const total = checkedSentences.length;
    const grounded = checkedSentences.filter((s) => s.grounded).length;
    const score = total > 0 ? grounded / total : 1.0;

    // 5. Determine action
    let action: GroundingAssessment["action"] = "passed";
    if (total > 0 && score < this.minCoverage) {
      action =
        this.mode === "strict" ? "overridden" : this.mode === "annotate" ? "annotated" : "warned";
    } else if (total > 0 && score < 1.0) {
      action = this.mode === "annotate" ? "annotated" : "warned";
      // If score is above threshold, only warn (don't override)
      if (score >= this.minCoverage) action = this.mode === "warn" ? "warned" : "annotated";
    }

    // If everything is grounded or no factual sentences, pass
    if (score >= 1.0 || total === 0) action = "passed";

    const assessment: GroundingAssessment = {
      score,
      totalSentences: total,
      groundedSentences: grounded,
      sentences: checkedSentences,
      action,
      timestamp: new Date(),
    };
    this.onAssessment?.(assessment);
    return assessment;
  }

  /**
   * Create an `afterLLM` hook that validates response grounding.
   *
   *  This method previously had a dead `currentMessages` variable
   * that was never populated, making grounding validation silently non-functional.
   *
   * Now returns a paired `{ beforeLLM, afterLLM }` object for the full API,
   * or use `hook()` which wraps `hooks()` and returns just the afterLLM.
   *
   * @deprecated Use `hooks()` instead for the full beforeLLM + afterLLM pair.
   * The single `hook()` method only returns afterLLM and requires `beforeLLM`
   * to be wired separately via `hooksPair.beforeLLM`.
   */
  hook(): {
    beforeLLM: (messages: ChatMessage[]) => void;
    afterLLM: (response: ChatResult, iteration: number) => Promise<LLMHookResult | void>;
  } {
    // Delegate to hooks() which correctly captures messages
    return this.hooks();
  }

  /**
   * Create hooks that capture conversation messages for grounding validation.
   *
   * Returns `{ beforeLLM, afterLLM }` hooks that work together.
   */
  hooks(): {
    beforeLLM: (messages: ChatMessage[]) => void;
    afterLLM: (response: ChatResult, iteration: number) => Promise<LLMHookResult | void>;
  } {
    let currentMessages: ChatMessage[] = [];

    return {
      beforeLLM: (messages: ChatMessage[]) => {
        currentMessages = messages;
      },
      // afterLLM is now async so it can await the llmScorer
      afterLLM: async (response: ChatResult) => {
        if (!response.content) return { action: "continue" as const };

        const assessment = await this.assess(response.content, currentMessages);

        switch (assessment.action) {
          case "annotated": {
            let annotated = response.content;
            for (const s of assessment.sentences) {
              if (!s.grounded) {
                annotated = annotated.replace(s.text, `${s.text} [⚠️ ungrounded]`);
              }
            }
            return { action: "override" as const, content: annotated };
          }
          case "overridden":
            return {
              action: "override" as const,
              content: `${this.overrideMessage}\n\nOriginal response (${Math.round(assessment.score * 100)}% grounded):\n${response.content}`,
            };
          default:
            return { action: "continue" as const };
        }
      },
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private extractEvidence(
    messages: readonly ChatMessage[],
  ): Array<{ name: string; content: string }> {
    const evidence: Array<{ name: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === "tool") {
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        // Use tool_call_id or generic name
        const name =
          ((msg as Record<string, unknown>).name as string) ??
          ((msg as Record<string, unknown>).tool_call_id as string) ??
          `tool_result_${evidence.length}`;
        evidence.push({ name, content });
      }
    }

    return evidence;
  }
}

// ── Text Processing Helpers ──────────────────────────────────────────────────

/** Split text into significant tokens (lowercase, no stop words, no punctuation) */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

/** Count token overlap between two sets */
function countOverlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count++;
  }
  return count;
}

/**
 * Compute cosine similarity between two equal-length numeric vectors.
 * Returns 0 if either vector is zero-length or has zero magnitude.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Split text into sentences */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a grounding validator with production defaults.
 */
export function groundingValidator(config?: GroundingValidatorConfig): GroundingValidator {
  return new GroundingValidator(config);
}

/**
 * Create a strict grounding validator.
 */
export function strictGroundingValidator(
  config?: Omit<GroundingValidatorConfig, "mode">,
): GroundingValidator {
  return new GroundingValidator({ ...config, mode: "strict" });
}
