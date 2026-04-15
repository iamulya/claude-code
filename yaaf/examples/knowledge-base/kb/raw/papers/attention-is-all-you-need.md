---
title: "Attention Is All You Need"
source: "https://arxiv.org/abs/1706.03762"
authors: ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki", "Uszkoreit, Jakob", "Jones, Llion", "Gomez, Aidan N.", "Kaiser, Łukasz", "Polosukhin, Illia"]
year: 2017
venue: "NeurIPS 2017"
---

# Attention Is All You Need

Vaswani et al. (2017) introduce the **Transformer**, a novel architecture for sequence-to-sequence tasks that relies entirely on attention mechanisms — dispensing with recurrence and convolutions altogether.

## Abstract

The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.

## Core Contribution: The Transformer

The Transformer model consists of an **encoder** and a **decoder**, each made up of a stack of identical layers.

### Encoder
- 6 identical layers
- Each layer: multi-head self-attention + feed-forward network
- Residual connections around each sub-layer followed by layer normalization

### Decoder
- 6 identical layers  
- Each layer: masked multi-head self-attention + encoder-decoder attention + feed-forward network
- Masking ensures auto-regressive generation

## The Attention Mechanism

The core building block is **Scaled Dot-Product Attention**:

```
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
```

Where:
- Q = Query matrix
- K = Key matrix  
- V = Value matrix
- d_k = dimension of keys (used for scaling to prevent vanishing gradients)

### Multi-Head Attention

Instead of performing a single attention function, multi-head attention projects queries, keys, and values h times with different learned projections, runs attention in parallel, then concatenates and projects the results:

```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W_O
where head_i = Attention(Q * W_Q_i, K * W_K_i, V * W_V_i)
```

With h=8 attention heads in the paper and d_k = d_v = 64.

### Positional Encoding

Since the model contains no recurrence or convolution, positional encodings are added to the input embeddings using sine and cosine functions of different frequencies:

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

## Results

On WMT 2014 English-to-German translation:
- **28.4 BLEU** — new state of the art, surpassing previous best by 2+ BLEU
- Training cost: ~$300 on 8 P100 GPUs for 3.5 days

On WMT 2014 English-to-French:
- **41.0 BLEU** — outperforms all previously published single models
- Only 1/4 of the training cost of the prior best model

## Impact

The Transformer architecture became the foundation for:
- BERT (bidirectional encoder representations)
- GPT series (autoregressive generation)
- T5, BART (sequence-to-sequence pre-training)
- Vision Transformers (ViT)
- Every major large language model as of 2024

## Citation

```bibtex
@article{vaswani2017attention,
  title={Attention Is All You Need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and ...},
  journal={NeurIPS},
  year={2017}
}
```
