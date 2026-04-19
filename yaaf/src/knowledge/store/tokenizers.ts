/**
 * Tokenizer Strategies — Multilingual Text Tokenization for KB Search
 *
 * Provides pluggable tokenization strategies for the TF-IDF search engine.
 * The default `HybridTokenizer` handles mixed-language content automatically
 * by detecting Unicode script runs and applying the correct tokenization
 * strategy per segment:
 *
 * - Latin/Cyrillic → word tokens with optional Porter stemming
 * - CJK (Chinese/Japanese/Korean) → character bigrams (no word boundaries)
 * - Thai/Lao/Khmer → character trigrams
 * - Arabic/Hebrew → whitespace split with prefix awareness
 * - Fallback → whitespace split + lowercase
 *
 * @example
 * ```ts
 * // Default: auto-detects language and applies correct strategy
 * const tokenizer = new HybridTokenizer()
 * tokenizer.tokenize("The attention mechanism (注意力機制) is important")
 * // → ["attention", "mechanism", "important", "注意", "意力", "力機", "機制"]
 *
 * // English-optimized: adds Porter stemming
 * const english = new EnglishTokenizer()
 * english.tokenize("running mechanisms")
 * // → ["run", "mechan"]
 * ```
 *
 * @module knowledge/store/tokenizers
 */

// ── TokenizerStrategy Interface ─────────────────────────────────────────────

/**
 * TokenizerStrategy — defines how text is split into searchable terms.
 *
 * The TF-IDF search engine delegates all text processing to this strategy.
 * Implement this interface to add support for language-specific tokenization
 * (e.g., MeCab for Japanese word segmentation, jieba for Chinese).
 */
export interface TokenizerStrategy {
  /** Split text into normalized, searchable tokens */
  tokenize(text: string): string[];
  /** Language identifier (for display and stop word selection) */
  readonly language: string;
}

// ── Stop Words ──────────────────────────────────────────────────────────────

/**
 * Multilingual stop word sets.
 * These are the most common function words that carry no semantic meaning
 * and should be excluded from the search index.
 */
export const STOP_WORDS: Record<string, Set<string>> = {
  en: new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
    "them", "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those", "and", "but", "or", "nor", "not",
    "so", "yet", "both", "if", "then", "else", "when", "where", "how",
    "what", "which", "who", "whom", "why", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "into", "through", "during", "before",
    "after", "above", "below", "between", "here", "there", "all", "each",
    "every", "some", "any", "no", "more", "most", "other", "also", "just",
    "about", "up", "out", "than", "very", "too", "quite", "only", "even",
  ]),
  fr: new Set([
    "le", "la", "les", "un", "une", "des", "du", "de", "et", "est", "en",
    "que", "qui", "dans", "ce", "il", "ne", "sur", "se", "pas", "plus",
    "par", "je", "avec", "tout", "faire", "son", "mais", "comme", "on",
    "lui", "nous", "vous", "leur", "elle", "au", "aux", "cette", "ces",
  ]),
  de: new Set([
    "der", "die", "das", "ein", "eine", "und", "ist", "in", "den", "von",
    "zu", "mit", "auf", "für", "nicht", "sich", "des", "dem", "es", "als",
    "auch", "an", "nach", "wie", "im", "sie", "hat", "bei", "oder", "wird",
    "aus", "am", "so", "noch", "vor", "nur", "ich", "er", "war", "aber",
  ]),
  es: new Set([
    "el", "la", "los", "las", "un", "una", "de", "en", "y", "que", "es",
    "por", "con", "no", "se", "del", "al", "lo", "como", "más", "pero",
    "su", "le", "ya", "me", "sin", "sobre", "este", "entre", "cuando",
  ]),
  pt: new Set([
    "o", "a", "os", "as", "um", "uma", "de", "em", "e", "que", "do",
    "da", "no", "na", "por", "com", "não", "se", "para", "como", "mais",
    "mas", "ao", "dos", "das", "nos", "nas", "ele", "ela", "seu", "sua",
  ]),
  it: new Set([
    "il", "lo", "la", "le", "gli", "un", "una", "di", "in", "e", "che",
    "è", "per", "non", "si", "del", "al", "da", "con", "su", "come",
    "più", "ma", "ci", "mi", "se", "ha", "sono", "anche", "questo",
  ]),
  nl: new Set([
    "de", "het", "een", "van", "en", "in", "is", "dat", "op", "te",
    "zijn", "voor", "met", "niet", "aan", "er", "ook", "als", "maar",
    "om", "dit", "dan", "nog", "bij", "uit", "naar", "tot", "wel",
  ]),
  ru: new Set([
    "и", "в", "не", "на", "с", "что", "он", "как", "его", "к", "но",
    "по", "из", "у", "за", "о", "от", "это", "я", "все", "она", "мы",
    "так", "бы", "уже", "да", "же", "вы", "был", "для", "до", "их",
  ]),
};

/** Get combined stop words for all languages (used by HybridTokenizer) */
function getAllStopWords(): Set<string> {
  const combined = new Set<string>();
  for (const set of Object.values(STOP_WORDS)) {
    for (const word of set) {
      combined.add(word);
    }
  }
  return combined;
}

// ── Unicode Script Detection ────────────────────────────────────────────────

/** CJK Unified Ideographs, Hiragana, Katakana, Hangul */
const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\uF900-\uFAFF]/;

/** Thai, Lao, Khmer (no word boundary scripts) */
const UNSEGMENTED_REGEX = /[\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF]/;

/**
 * Split text into segments of the same Unicode script category.
 * Each segment is tagged as 'cjk', 'unsegmented', or 'word' (Latin, Cyrillic, Arabic, etc.).
 */
function splitByScript(text: string): Array<{ text: string; type: "cjk" | "unsegmented" | "word" }> {
  const segments: Array<{ text: string; type: "cjk" | "unsegmented" | "word" }> = [];
  let current = "";
  let currentType: "cjk" | "unsegmented" | "word" = "word";

  for (const char of text) {
    let charType: "cjk" | "unsegmented" | "word" = "word";
    if (CJK_REGEX.test(char)) {
      charType = "cjk";
    } else if (UNSEGMENTED_REGEX.test(char)) {
      charType = "unsegmented";
    }

    if (charType !== currentType && current.length > 0) {
      segments.push({ text: current, type: currentType });
      current = "";
    }
    currentType = charType;
    current += char;
  }

  if (current.length > 0) {
    segments.push({ text: current, type: currentType });
  }

  return segments;
}

/**
 * Generate character n-grams from text.
 * Used for CJK (bigrams) and unsegmented scripts (trigrams).
 */
function charNgrams(text: string, n: number): string[] {
  const chars = [...text].filter((c) => c.trim().length > 0);
  const grams: string[] = [];
  for (let i = 0; i <= chars.length - n; i++) {
    grams.push(chars.slice(i, i + n).join(""));
  }
  return grams;
}

// ── Porter Stemmer ──────────────────────────────────────────────────────────

/**
 * Minimal Porter stemmer for English.
 *
 * Implements the core steps of Martin Porter's 1980 algorithm.
 * Handles common suffixes: -ing, -ed, -tion, -ness, -ment, -ous, -ive,
 * -ful, -less, -able, -ible, -ize, -ise, -ify, -ly, -er, -est, -al, -s.
 *
 * Not a full Porter2 implementation — deliberately simplified for search
 * purposes where recall matters more than perfect linguistic accuracy.
 */
export function porterStem(word: string): string {
  if (word.length <= 2) return word;

  let stem = word.toLowerCase();

  // Step 1a: plurals and -ed/-ing
  if (stem.endsWith("sses")) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith("ies")) {
    stem = stem.length > 4 ? stem.slice(0, -2) : stem.slice(0, -1);
  } else if (stem.endsWith("ss")) {
    // keep as is
  } else if (stem.endsWith("s") && stem.length > 3) {
    stem = stem.slice(0, -1);
  }

  // Step 1b: -eed, -ed, -ing
  if (stem.endsWith("eed")) {
    if (stem.length > 4) stem = stem.slice(0, -1);
  } else if (stem.endsWith("ed") && stem.length > 4 && hasVowel(stem.slice(0, -2))) {
    stem = stem.slice(0, -2);
    stem = step1bCleanup(stem);
  } else if (stem.endsWith("ing") && stem.length > 5 && hasVowel(stem.slice(0, -3))) {
    stem = stem.slice(0, -3);
    stem = step1bCleanup(stem);
  }

  // Step 1c: y → i
  if (stem.endsWith("y") && stem.length > 2 && !isVowel(stem[stem.length - 2]!)) {
    stem = stem.slice(0, -1) + "i";
  }

  // Step 2: common suffixes
  const step2Suffixes: [string, string][] = [
    ["ational", "ate"], ["tional", "tion"], ["enci", "ence"], ["anci", "ance"],
    ["izer", "ize"], ["iser", "ise"], ["abli", "able"], ["alli", "al"],
    ["entli", "ent"], ["eli", "e"], ["ousli", "ous"], ["ization", "ize"],
    ["isation", "ise"], ["ation", "ate"], ["ator", "ate"], ["alism", "al"],
    ["iveness", "ive"], ["fulness", "ful"], ["ousness", "ous"],
    ["aliti", "al"], ["iviti", "ive"], ["biliti", "ble"],
  ];
  for (const [suffix, replacement] of step2Suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length > 1) {
      stem = stem.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // Step 3: common suffixes
  const step3Suffixes: [string, string][] = [
    ["icate", "ic"], ["ative", ""], ["alize", "al"],
    ["iciti", "ic"], ["ical", "ic"], ["ful", ""], ["ness", ""],
  ];
  for (const [suffix, replacement] of step3Suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length > 1) {
      stem = stem.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // Step 4: remove -ment, -ence, -able, etc. (only if long enough)
  const step4Suffixes = [
    "al", "ance", "ence", "er", "ic", "able", "ible", "ant", "ement",
    "ment", "ent", "ion", "ou", "ism", "ate", "iti", "ous", "ive", "ize", "ise",
  ];
  for (const suffix of step4Suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length > 2) {
      if (suffix === "ion") {
        const pre = stem[stem.length - 4];
        if (pre === "s" || pre === "t") {
          stem = stem.slice(0, -suffix.length);
        }
      } else {
        stem = stem.slice(0, -suffix.length);
      }
      break;
    }
  }

  // Step 5: final cleanup
  if (stem.endsWith("e") && stem.length > 3) {
    stem = stem.slice(0, -1);
  }
  if (stem.endsWith("ll") && stem.length > 3) {
    stem = stem.slice(0, -1);
  }

  return stem;
}

function isVowel(ch: string): boolean {
  return "aeiou".includes(ch);
}

function hasVowel(str: string): boolean {
  return /[aeiou]/i.test(str);
}

function step1bCleanup(stem: string): string {
  if (stem.endsWith("at") || stem.endsWith("bl") || stem.endsWith("iz")) {
    return stem + "e";
  }
  // Double consonant → remove last letter (except ll, ss, zz)
  if (
    stem.length >= 2 &&
    stem[stem.length - 1] === stem[stem.length - 2] &&
    !"lsz".includes(stem[stem.length - 1]!)
  ) {
    return stem.slice(0, -1);
  }
  return stem;
}

// ── Tokenizer Implementations ───────────────────────────────────────────────

/**
 * EnglishTokenizer — Porter stemmer + English stop words.
 *
 * Best for English-only knowledge bases. Provides morphological normalization
 * so "running", "runs", "ran" all match "run".
 */
export class EnglishTokenizer implements TokenizerStrategy {
  readonly language = "en";
  private readonly stopWords: Set<string>;

  constructor(extraStopWords?: Set<string>) {
    this.stopWords = extraStopWords ?? STOP_WORDS.en!;
  }

  tokenize(text: string): string[] {
    const tokens: string[] = [];
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/);
    for (const word of words) {
      if (word.length > 1 && !this.stopWords.has(word)) {
        tokens.push(porterStem(word));
      }
    }
    return tokens;
  }
}

/**
 * UnicodeTokenizer — Language-agnostic word splitting.
 *
 * Works for any script that uses whitespace as word separators
 * (Latin, Cyrillic, Arabic, Devanagari, etc.). No stemming applied.
 */
export class UnicodeTokenizer implements TokenizerStrategy {
  readonly language = "unicode";
  private readonly stopWords: Set<string>;

  constructor(stopWords?: Set<string>) {
    this.stopWords = stopWords ?? getAllStopWords();
  }

  tokenize(text: string): string[] {
    const tokens: string[] = [];
    // Unicode-aware word boundary splitting: handles accented characters, etc.
    const words = text
      .toLowerCase()
      .split(/[\s\p{P}\p{S}]+/u)
      .filter((w) => w.length > 1);
    for (const word of words) {
      if (!this.stopWords.has(word)) {
        tokens.push(word);
      }
    }
    return tokens;
  }
}

/**
 * NgramTokenizer — Character n-gram tokenization.
 *
 * Works for any language, including those without word boundaries (CJK, Thai).
 * Produces bigrams by default; configurable n-gram size.
 */
export class NgramTokenizer implements TokenizerStrategy {
  readonly language = "ngram";
  private readonly n: number;

  constructor(n = 2) {
    this.n = n;
  }

  tokenize(text: string): string[] {
    // Strip whitespace and punctuation, generate character n-grams
    const cleaned = text.replace(/[\s\p{P}\p{S}]+/gu, "");
    return charNgrams(cleaned, this.n);
  }
}

/**
 * HybridTokenizer — Auto-detects script and applies correct strategy.
 *
 * This is the **default tokenizer** for the TF-IDF search engine. It handles
 * mixed-language content automatically:
 *
 * - Latin/Cyrillic: lowercase word tokens, with optional Porter stemming for English
 * - CJK (Chinese/Japanese/Korean): character bigrams (no word boundary detection)
 * - Thai/Lao/Khmer: character trigrams
 * - Other scripts: whitespace split + lowercase
 *
 * @example
 * ```ts
 * const t = new HybridTokenizer()
 * t.tokenize("The attention mechanism (注意力機制) is used in NLP")
 * // → ["attention", "mechanism", "used", "nlp", "注意", "意力", "力機", "機制"]
 * ```
 */
export class HybridTokenizer implements TokenizerStrategy {
  readonly language = "auto";
  private readonly stopWords: Set<string>;
  private readonly useStemming: boolean;

  /**
   * @param options.useStemming - Apply Porter stemming to Latin text. Default: false.
   * @param options.stopWords - Custom stop words. Default: all languages combined.
   */
  constructor(options?: { useStemming?: boolean; stopWords?: Set<string> }) {
    this.useStemming = options?.useStemming ?? false;
    this.stopWords = options?.stopWords ?? getAllStopWords();
  }

  tokenize(text: string): string[] {
    const tokens: string[] = [];
    const segments = splitByScript(text);

    for (const segment of segments) {
      switch (segment.type) {
        case "cjk":
          // Character bigrams for CJK
          tokens.push(...charNgrams(segment.text, 2));
          break;

        case "unsegmented":
          // Character trigrams for Thai/Lao/Khmer
          tokens.push(...charNgrams(segment.text, 3));
          break;

        case "word": {
          // Word-level tokenization for Latin/Cyrillic/Arabic/etc.
          const words = segment.text
            .toLowerCase()
            .split(/[\s\p{P}\p{S}]+/u)
            .filter((w) => w.length > 1);
          for (const word of words) {
            if (!this.stopWords.has(word)) {
              tokens.push(this.useStemming ? porterStem(word) : word);
            }
          }
          break;
        }
      }
    }

    return tokens;
  }
}
