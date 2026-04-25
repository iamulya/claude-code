/**
 * WikilinkGraphPlugin — Default KBGraphAdapter implementation.
 *
 * Builds an in-memory bidirectional adjacency list from `[[wikilinks]]`
 * in compiled article bodies. Relationship labels are inferred from the
 * ontology's `relationship_types` by matching (from.entityType, to.entityType).
 *
 * This is the zero-dependency default. Users with Neo4j, Memgraph, or any
 * other graph backend can implement `KBGraphAdapter` and register it via
 * `PluginHost` to replace this entirely.
 *
 * @module knowledge/store/wikilinkGraph
 */

import type {
  KBGraphAdapter,
  KBGraphEdge,
  KBGraphQueryOptions,
  KBGraphQueryResult,
  KBSearchDocument,
  PluginCapability,
} from "../../plugin/types.js";
import type { KBOntology, RelationshipType } from "../ontology/types.js";

// ── Wikilink extraction (same regex as linter/checks.ts) ──────────────────────

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

function extractWikilinks(body: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(body)) !== null) {
    results.push(match[1]!);
  }
  return results;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GraphNode = {
  docId: string;
  title: string;
  entityType: string;
  outgoing: GraphEdgeInternal[];
  incoming: GraphEdgeInternal[];
};

type GraphEdgeInternal = {
  targetDocId: string;
  relationship?: string;
};

// ── Plugin ────────────────────────────────────────────────────────────────────

export class WikilinkGraphPlugin implements KBGraphAdapter {
  readonly name = "wikilink-graph";
  readonly version = "1.0.0";
  readonly capabilities: readonly PluginCapability[] = ["kb_graph"] as const;

  /** Adjacency list: docId → GraphNode */
  private graph = new Map<string, GraphNode>();

  /**
   * Build the graph from compiled documents.
   *
   * Steps:
   * 1. Index all documents by docId, title (lowercase), and aliases (lowercase)
   * 2. Extract [[wikilinks]] from each article body
   * 3. Resolve each wikilink to a docId via the index
   * 4. Infer relationship labels from ontology.relationshipTypes
   */
  async buildGraph(
    documents: KBSearchDocument[],
    ontology: KBOntology,
  ): Promise<void> {
    this.graph.clear();

    // Build lookup index: lowercased key → docId
    const titleIndex = new Map<string, string>();
    for (const doc of documents) {
      titleIndex.set(doc.docId.toLowerCase(), doc.docId);
      titleIndex.set(doc.title.toLowerCase(), doc.docId);
      for (const alias of doc.aliases) {
        titleIndex.set(alias.toLowerCase(), doc.docId);
      }
    }

    // Build (fromType, toType) → relationship name lookup
    const relLookup = new Map<string, string>();
    for (const rel of ontology.relationshipTypes) {
      relLookup.set(`${rel.from}->${rel.to}`, rel.name);
    }

    // Initialize nodes
    for (const doc of documents) {
      this.graph.set(doc.docId, {
        docId: doc.docId,
        title: doc.title,
        entityType: doc.entityType,
        outgoing: [],
        incoming: [],
      });
    }

    // Build edges from wikilinks
    for (const doc of documents) {
      const node = this.graph.get(doc.docId)!;
      const links = extractWikilinks(doc.body);
      const seen = new Set<string>(); // deduplicate links within one article

      for (const linkText of links) {
        const targetDocId = titleIndex.get(linkText.toLowerCase());
        if (!targetDocId || targetDocId === doc.docId || seen.has(targetDocId)) continue;
        seen.add(targetDocId);

        const targetNode = this.graph.get(targetDocId);
        if (!targetNode) continue;

        // Infer relationship from (fromType, toType) pair
        const relName = relLookup.get(`${doc.entityType}->${targetNode.entityType}`);

        node.outgoing.push({ targetDocId, relationship: relName });
        targetNode.incoming.push({ targetDocId: doc.docId, relationship: relName });
      }
    }
  }

  /**
   * Query relationships for a document.
   */
  async query(
    docId: string,
    options?: KBGraphQueryOptions,
  ): Promise<KBGraphQueryResult[]> {
    const node = this.graph.get(docId);
    if (!node) return [];

    const direction = options?.direction ?? "both";
    const maxResults = options?.maxResults ?? 20;
    const relFilter = options?.relationship;

    const results: KBGraphQueryResult[] = [];

    // Outgoing edges
    if (direction === "outgoing" || direction === "both") {
      for (const edge of node.outgoing) {
        if (relFilter && edge.relationship !== relFilter) continue;
        const target = this.graph.get(edge.targetDocId);
        if (!target) continue;
        results.push({
          docId: target.docId,
          title: target.title,
          entityType: target.entityType,
          relationship: edge.relationship,
          direction: "outgoing",
        });
      }
    }

    // Incoming edges
    if (direction === "incoming" || direction === "both") {
      for (const edge of node.incoming) {
        if (relFilter && edge.relationship !== relFilter) continue;
        const source = this.graph.get(edge.targetDocId);
        if (!source) continue;
        results.push({
          docId: source.docId,
          title: source.title,
          entityType: source.entityType,
          relationship: edge.relationship,
          direction: "incoming",
        });
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * Return all edges in the graph (for debugging / visualization).
   */
  allEdges(): KBGraphEdge[] {
    const edges: KBGraphEdge[] = [];
    for (const [docId, node] of this.graph) {
      for (const edge of node.outgoing) {
        edges.push({
          from: docId,
          to: edge.targetDocId,
          relationship: edge.relationship,
        });
      }
    }
    return edges;
  }
}
