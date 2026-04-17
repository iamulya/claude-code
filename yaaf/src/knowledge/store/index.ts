/**
 * KB Store barrel — runtime read API, tools, and top-level KnowledgeBase class.
 */

export { KBStore } from "./store.js";
export type { CompiledDocument, KBIndex, KBIndexEntry, SearchResult } from "./store.js";

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
