/**
 * WikilinkGraphPlugin tests — Fix 3 (Finding O-3)
 *
 * Tests the default KBGraphAdapter implementation that builds an in-memory
 * adjacency list from [[wikilinks]] in compiled article bodies and infers
 * relationship labels from the ontology's relationship_types.
 */

import { describe, it, expect } from "vitest";
import { WikilinkGraphPlugin } from "../knowledge/store/wikilinkGraph.js";
import type { KBSearchDocument } from "../plugin/types.js";
import type { KBOntology } from "../knowledge/ontology/types.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDoc(overrides: Partial<KBSearchDocument>): KBSearchDocument {
  return {
    docId: "test/default",
    title: "Default",
    entityType: "concept",
    body: "",
    aliases: [],
    isStub: false,
    wordCount: 100,
    frontmatter: {},
    ...overrides,
  };
}

const MINIMAL_ONTOLOGY: KBOntology = {
  domain: "Test graph domain",
  entityTypes: {
    concept: {
      description: "A concept",
      frontmatter: { fields: {} },
      articleStructure: [],
      linkableTo: ["tool"],
      indexable: true,
    },
    tool: {
      description: "A tool",
      frontmatter: { fields: {} },
      articleStructure: [],
      linkableTo: ["concept"],
      indexable: true,
    },
  },
  relationshipTypes: [
    {
      name: "IMPLEMENTS",
      from: "tool",
      to: "concept",
      description: "A tool that implements a concept",
      reciprocal: "IMPLEMENTED_BY",
    },
    {
      name: "IMPLEMENTED_BY",
      from: "concept",
      to: "tool",
      description: "A concept implemented by a tool",
      reciprocal: "IMPLEMENTS",
    },
  ],
  vocabulary: {},
  budget: { textDocumentTokens: 4096, imageTokens: 1200, maxImagesPerFetch: 3 },
  compiler: { extractionModel: "gemini-2.5-flash", synthesisModel: "gemini-2.5-pro" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WikilinkGraphPlugin", () => {
  it("builds graph from wikilinks in article bodies", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "Uses [[tools/pytorch]] for computation." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "A deep learning framework." }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    // Outgoing from attention → pytorch
    const outgoing = await plugin.query("concepts/attention", { direction: "outgoing" });
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]!.docId).toBe("tools/pytorch");

    // Incoming to pytorch ← attention
    const incoming = await plugin.query("tools/pytorch", { direction: "incoming" });
    expect(incoming).toHaveLength(1);
    expect(incoming[0]!.docId).toBe("concepts/attention");
  });

  it("infers relationship type from ontology", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "Implements [[concepts/attention]]." }),
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "" }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const results = await plugin.query("tools/pytorch", { direction: "outgoing" });
    expect(results).toHaveLength(1);
    expect(results[0]!.relationship).toBe("IMPLEMENTS");
  });

  it("resolves wikilinks by title (case-insensitive)", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention Mechanism", entityType: "concept", body: "Implemented by [[PyTorch]]." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "" }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const results = await plugin.query("concepts/attention", { direction: "outgoing" });
    expect(results).toHaveLength(1);
    expect(results[0]!.docId).toBe("tools/pytorch");
  });

  it("resolves wikilinks by alias", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "Uses [[torch]] internally." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "", aliases: ["torch", "pytorch"] }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const results = await plugin.query("concepts/attention", { direction: "outgoing" });
    expect(results).toHaveLength(1);
    expect(results[0]!.docId).toBe("tools/pytorch");
  });

  it("filters by relationship type", async () => {
    const ontology: KBOntology = {
      ...MINIMAL_ONTOLOGY,
      relationshipTypes: [
        ...MINIMAL_ONTOLOGY.relationshipTypes,
        { name: "DEPENDS_ON", from: "concept", to: "concept", description: "Depends on" },
      ],
    };

    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/transformer", title: "Transformer", entityType: "concept", body: "Based on [[concepts/attention]] and uses [[tools/pytorch]]." }),
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "" }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "" }),
    ];

    await plugin.buildGraph(docs, ontology);

    // Without filter — both results
    const all = await plugin.query("concepts/transformer", { direction: "outgoing" });
    expect(all).toHaveLength(2);

    // Filter to DEPENDS_ON — only concept→concept
    const depsOnly = await plugin.query("concepts/transformer", { direction: "outgoing", relationship: "DEPENDS_ON" });
    expect(depsOnly).toHaveLength(1);
    expect(depsOnly[0]!.docId).toBe("concepts/attention");
  });

  it("handles bidirectional query (both)", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "Uses [[tools/pytorch]]." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "Implements [[concepts/attention]]." }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    // Both directions: attention → pytorch (outgoing) + pytorch → attention (incoming)
    const results = await plugin.query("concepts/attention", { direction: "both" });
    expect(results).toHaveLength(2);
    expect(results.some(r => r.direction === "outgoing")).toBe(true);
    expect(results.some(r => r.direction === "incoming")).toBe(true);
  });

  it("returns empty array for unknown docId", async () => {
    const plugin = new WikilinkGraphPlugin();
    await plugin.buildGraph([], MINIMAL_ONTOLOGY);

    const results = await plugin.query("nonexistent");
    expect(results).toHaveLength(0);
  });

  it("deduplicates multiple wikilinks to the same target", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "Uses [[tools/pytorch]] a lot. Really loves [[tools/pytorch]]." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "" }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const results = await plugin.query("concepts/attention", { direction: "outgoing" });
    expect(results).toHaveLength(1); // Not 2
  });

  it("does not create self-referencing edges", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "See [[concepts/attention]] for more." }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const results = await plugin.query("concepts/attention", { direction: "both" });
    expect(results).toHaveLength(0);
  });

  it("allEdges returns complete edge list", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "concepts/attention", title: "Attention", entityType: "concept", body: "Uses [[tools/pytorch]]." }),
      makeDoc({ docId: "tools/pytorch", title: "PyTorch", entityType: "tool", body: "Implements [[concepts/attention]]." }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const edges = plugin.allEdges();
    expect(edges).toHaveLength(2);
    expect(edges.some(e => e.from === "concepts/attention" && e.to === "tools/pytorch")).toBe(true);
    expect(edges.some(e => e.from === "tools/pytorch" && e.to === "concepts/attention")).toBe(true);
  });

  it("respects maxResults limit", async () => {
    const plugin = new WikilinkGraphPlugin();
    const docs = [
      makeDoc({ docId: "hub", title: "Hub", entityType: "concept", body: "Links to [[a]], [[b]], [[c]], [[d]], [[e]]." }),
      makeDoc({ docId: "a", title: "a", entityType: "concept", body: "" }),
      makeDoc({ docId: "b", title: "b", entityType: "concept", body: "" }),
      makeDoc({ docId: "c", title: "c", entityType: "concept", body: "" }),
      makeDoc({ docId: "d", title: "d", entityType: "concept", body: "" }),
      makeDoc({ docId: "e", title: "e", entityType: "concept", body: "" }),
    ];

    await plugin.buildGraph(docs, MINIMAL_ONTOLOGY);

    const limited = await plugin.query("hub", { direction: "outgoing", maxResults: 3 });
    expect(limited).toHaveLength(3);

    const all = await plugin.query("hub", { direction: "outgoing", maxResults: 20 });
    expect(all).toHaveLength(5);
  });
});
