/**
 * KB Store barrel — runtime read API, tools, and top-level KnowledgeBase class.
 */

export { KBStore } from "./store.js";
export type { CompiledDocument, DocumentMeta, KBIndex, KBIndexEntry, SearchResult, KBStoreOptions } from "./store.js";

export { createKBTools } from "./tools.js";
export type { KBToolOptions } from "./tools.js";

export { KnowledgeBase } from "./knowledgeBase.js";
export type { KnowledgeBaseOptions } from "./knowledgeBase.js";

export { FederatedKnowledgeBase } from "./federation.js";
export type {
  FederatedKBConfig,
  FederatedKBEntry,
  FederatedKBOptions,
  FederatedIndex,
  NamespacedDocument,
  NamespacedSearchResult,
  NamespacedIndexEntry,
} from "./federation.js";

// ── Search engine ────────────────────────────────────────────────────────────

export { TfIdfSearchPlugin } from "./tfidfSearch.js";
export type { TfIdfSearchPluginOptions } from "./tfidfSearch.js";

// ── Relationship graph ──────────────────────────────────────────────────────

export { WikilinkGraphPlugin } from "./wikilinkGraph.js";

export {
  HybridTokenizer,
  EnglishTokenizer,
  UnicodeTokenizer,
  NgramTokenizer,
  porterStem,
  STOP_WORDS,
} from "./tokenizers.js";
export type { TokenizerStrategy } from "./tokenizers.js";

// ── Utilities ────────────────────────────────────────────────────────────────

export { LRUCache } from "./lruCache.js";
