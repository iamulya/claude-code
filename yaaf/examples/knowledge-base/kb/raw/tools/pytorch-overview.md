---
title: "PyTorch — Deep Learning Framework"
source: "https://pytorch.org/docs/stable/index.html"
tags: [tool, deep-learning, python, autograd]
---

# PyTorch

**PyTorch** is an open-source deep learning framework developed by Meta AI (formerly Facebook AI Research). It is the most widely used framework in ML research as of 2024, with dominant adoption in academic publications and a large portion of production deployments.

## Key Design Philosophy

PyTorch centers on two ideas:
1. **Define-by-run (dynamic computation graphs)** — The computation graph is built as operations execute, making debugging with standard Python tools natural
2. **Pythonic API** — Tensors behave like NumPy arrays but on GPU; no special graph compilation step

Compare with TensorFlow 1.x which required `tf.Session.run()` to execute static graphs — PyTorch's dynamic approach was a major reason for its adoption in research.

## Core Abstractions

### `torch.Tensor`
The fundamental data structure — an n-dimensional array stored in RAM or VRAM:

```python
import torch

x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
x = x.cuda()          # Move to GPU
x = x.requires_grad_()  # Track gradients
```

### `torch.nn.Module`
Base class for all neural network components:

```python
import torch.nn as nn

class TransformerBlock(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, n_heads, batch_first=True)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_model * 4),
            nn.GELU(),
            nn.Linear(d_model * 4, d_model),
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)

    def forward(self, x):
        attn_out, _ = self.attn(x, x, x)
        x = self.norm1(x + attn_out)
        x = self.norm2(x + self.ffn(x))
        return x
```

### Autograd
PyTorch tracks all operations on tensors with `requires_grad=True` and computes gradients automatically via `loss.backward()`:

```python
model = TransformerBlock(512, 8)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

outputs = model(inputs)
loss = criterion(outputs, targets)
loss.backward()          # Compute all gradients
optimizer.step()         # Update weights
optimizer.zero_grad()    # Clear gradients for next step
```

## Multi-Head Attention in PyTorch

The attention mechanism from "Attention Is All You Need" is a first-class citizen:

```python
import torch
import torch.nn as nn

# Batch-first attention (recommended modern usage)
attn = nn.MultiheadAttention(
    embed_dim=512,
    num_heads=8,
    dropout=0.1,
    batch_first=True,  # (batch, seq, feature) ordering
)

# Self-attention
x = torch.randn(32, 128, 512)  # (batch=32, seq_len=128, d_model=512)
attn_output, attn_weights = attn(query=x, key=x, value=x)
```

## Ecosystem

| Package | Purpose |
|---------|---------|
| `torchvision` | Image datasets, transforms, pretrained CNNs/ViTs |
| `torchaudio` | Audio processing and speech models |
| `torchtext` | Text datasets and tokenization |
| `torch.distributed` | Multi-GPU and multi-node training |
| `torch.compile` | JIT compilation with Triton (PyTorch 2.0+) |
| `torch.ao` | Quantization and hardware optimization |

## PyTorch vs JAX vs TensorFlow

| Aspect | PyTorch | JAX | TensorFlow 2 |
|--------|---------|-----|--------------|
| Computation graph | Dynamic | Functional + XLA | Dynamic (Eager) |
| Debugging | Easy (native Python) | Hard (functional, no mutation) | Moderate |
| Research adoption | **Dominant** | Growing | Declining |
| Production | Strong | Growing (via Flax) | Strong (TFX) |
| TPU support | Via XLA bridge | Native | Native |
| Automatic differentiation | Autograd | `jax.grad` (functional) | `tf.GradientTape` |

## PyTorch 2.0 — `torch.compile`

PyTorch 2.0 introduced `torch.compile`, which JIT-compiles model graphs using the Triton GPU compiler:

```python
model = TransformerBlock(512, 8)
model = torch.compile(model)  # 1.5–3x speedup on A100/H100

# Works with all existing PyTorch code — drop-in optimization
output = model(input_tensor)
```

## License

BSD-style license — permissive for both academic and commercial use.

## Installation

```bash
# CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# CPU-only
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```
