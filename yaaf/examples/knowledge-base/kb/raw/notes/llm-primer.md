---
title: "Large Language Models — A Primer"
type: notes
tags: [llm, transformers, pretraining, alignment]
---

# Large Language Models (LLMs)

A **Large Language Model (LLM)** is a neural network trained on massive text corpora to predict the next token in a sequence. At sufficient scale, these models exhibit emergent capabilities — reasoning, code generation, instruction following — that were not explicitly trained for.

## What Makes a Model "Large"?

Scale refers to three axes (Kaplan et al., 2020 — the "Scaling Laws" paper):
- **Parameters** — Model weights, ranging from billions to hundreds of billions
- **Data** — Training tokens; GPT-4 is estimated at ~13T tokens
- **Compute** — FLOPs used during training

Typical divisions (rough thresholds):
| Model size | Examples |
|------------|---------|
| ~7B params | Llama 3.1 7B, Mistral 7B |
| ~70B params | Llama 3.1 70B, Gemma 2 27B |
| ~400B+ params | GPT-4, Gemini Ultra, Claude 3 Opus |

## Architecture

All major LLMs use the **Transformer** architecture (Vaswani et al., 2017), predominantly the decoder-only variant (GPT-style):

```
Input → Embeddings + Positional Encoding
  → N × [Multi-Head Self-Attention → FFN → LayerNorm]
  → Linear → Softmax → Next Token Probability
```

### Key architectural choices in modern LLMs:
- **Rotary Positional Embeddings (RoPE)** instead of sinusoidal
- **Grouped Query Attention (GQA)** to reduce KV-cache memory
- **SwiGLU activation** in the FFN block
- **RMSNorm** instead of LayerNorm (simpler, faster)

## Pre-Training

LLMs are trained on the **next-token prediction** objective (also called causal language modeling):

```
Loss = -sum[ log P(token_t | token_1, ..., token_{t-1}) ]
```

Training data typically includes:
- Web crawls (Common Crawl, C4, etc.)
- Books (Project Gutenberg, Books3)
- Code (GitHub, Stack Overflow)
- Scientific articles (ArXiv, PubMed)

## Instruction Tuning & Alignment

Raw pretrained LLMs are not useful assistants — they continue text rather than follow instructions. Alignment makes them helpful:

### Supervised Fine-Tuning (SFT)
Fine-tune on human-written instruction/response pairs.

### Reinforcement Learning from Human Feedback (RLHF)
1. Collect model outputs and rank them by human preference
2. Train a **reward model** on the ranked outputs
3. Use PPO (Proximal Policy Optimization) to optimize the LLM against the reward model

### Direct Preference Optimization (DPO)
A simpler alternative to RLHF that directly optimizes on preference pairs without a separate reward model.

## Emergent Capabilities

At large scale, LLMs show capabilities that appear suddenly rather than gradually:
- **In-context learning** — learning from examples in the prompt
- **Chain-of-thought reasoning** — step-by-step problem solving
- **Code generation** — writing functional programs
- **Instruction following** — executing novel tasks from natural language

## Context Window & Memory

LLMs have a fixed **context window** — the maximum number of tokens they can process at once:

| Model | Context Window |
|-------|---------------|
| GPT-4o | 128K tokens |
| Claude 3.5 Sonnet | 200K tokens |
| Gemini 2.5 Pro | 1M tokens |
| Llama 3.1 70B | 128K tokens |

Memory is a hard limit: the model cannot "remember" anything outside its context window unless external memory (RAG, vector stores, compiled KB) is used.

## Retrieval-Augmented Generation (RAG)

Rather than fine-tuning the model on domain data, RAG retrieves relevant documents at inference time and appends them to the prompt. This allows the model to answer questions about content it wasn't trained on.

Flow: `query → embedding → vector search → retrieved docs → LLM → answer`

Limitation: retrieval is chunk-based, so cross-document reasoning is difficult.

## Key Models (as of early 2025)

| Model | Provider | Parameters | Open |
|-------|----------|-----------|------|
| GPT-4o | OpenAI | ~220B | ❌ |
| Claude 3.5 Sonnet | Anthropic | Unknown | ❌ |
| Gemini 2.5 Pro | Google | Unknown | ❌ |
| Llama 3.1 405B | Meta | 405B | ✅ |
| Mistral Large | Mistral | Unknown | ❌ |
| Qwen 2.5 72B | Alibaba | 72B | ✅ |
