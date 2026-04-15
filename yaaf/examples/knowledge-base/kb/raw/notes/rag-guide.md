---
title: "RAG — Retrieval-Augmented Generation"
source: "https://arxiv.org/abs/2005.11401"
tags: [rag, retrieval, knowledge, grounding]
---

# Retrieval-Augmented Generation (RAG)

**Retrieval-Augmented Generation (RAG)** is a technique for grounding LLM outputs in a specific knowledge corpus without retraining. The model retrieves relevant documents at inference time and uses them as context.

## The Core Problem RAG Solves

LLMs are trained on static snapshots of the internet. They cannot:
- Answer questions about events after their training cutoff
- Access proprietary or private knowledge (company docs, internal wikis)
- Guarantee factual accuracy on specific, verifiable facts

RAG addresses this by dynamically supplying the model with relevant information at query time.

## How RAG Works

```
Query → Embedding Model → Vector Search → Retrieved Chunks
                                               ↓
                          [Query + Context] → LLM → Grounded Answer
```

### Step 1: Indexing (offline)
1. Split documents into chunks (e.g., 512 tokens with overlap)
2. Embed each chunk using an embedding model (e.g., `text-embedding-3-small`)
3. Store vectors in a vector database (Pinecone, Weaviate, pgvector, Chroma)

### Step 2: Retrieval (online, per query)
1. Embed the user's query with the same embedding model
2. Perform approximate nearest-neighbor search (ANN) in the vector index
3. Retrieve top-k most similar chunks (typically k=3–10)

### Step 3: Generation
1. Format retrieved chunks + original query into a prompt
2. Pass to LLM with instructions to answer from context
3. Return the grounded response

## Simple RAG Example (with LangChain)

```python
from langchain.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# Index documents
loader = DirectoryLoader("./docs/", glob="**/*.md")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)
chunks = splitter.split_documents(docs)

vectorstore = Chroma.from_documents(chunks, OpenAIEmbeddings())

# Create RAG chain
qa_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
)

answer = qa_chain.run("What is the attention mechanism?")
```

## Limitations of RAG

| Limitation | Description |
|------------|-------------|
| **Chunking artifacts** | Long-range dependencies across chunk boundaries are lost |
| **Top-k sensitivity** | Answers depend heavily on the retrieved k; irrelevant chunks hurt quality |
| **Embedding model quality** | Poor embeddings → poor retrieval → hallucinations |
| **No structured reasoning** | The model sees disconnected chunks, not a coherent knowledge graph |
| **Latency** | Each query requires embedding + ANN search + LLM call |
| **Stale index** | Adding new documents requires re-indexing (or incremental updates) |

## Advanced RAG Variants

### Hybrid Search
Combine dense (embedding) + sparse (BM25/TF-IDF) retrieval and merge results (Reciprocal Rank Fusion):
```python
# Weaviate hybrid search
results = client.query.get("Document", ["content"]).with_hybrid(
    query="attention mechanism", alpha=0.5  # 0=BM25, 1=embedding
).with_limit(5).do()
```

### HyDE (Hypothetical Document Embeddings)
Generate a hypothetical ideal answer first, then use its embedding for retrieval. Improves recall on complex queries.

### RAPTOR (Recursive Abstractive Processing)
Build a tree of document summaries at multiple granularities. Retrieve from the most appropriate level.

### Knowledge Graph RAG
Extract entities and relationships into a graph database. Enable structured traversal alongside vector retrieval for complex multi-hop queries.

## RAG vs Compiled KB (the YAAF approach)

| Aspect | RAG | Compiled KB |
|--------|-----|-------------|
| Setup | Embed + index | Compile (LLM-authored articles) |
| Query time | Embed + ANN + LLM | Direct context injection |
| Knowledge structure | Flat chunks | Cross-linked wiki |
| Human readable | ❌ (raw chunks) | ✅ (Markdown articles) |
| Cross-document reasoning | Difficult | Natural (via wikilinks) |
| Update frequency | Continuous | Batch compile |
| Ideal for | Large, heterogeneous corpora | Deep, structured domains |
