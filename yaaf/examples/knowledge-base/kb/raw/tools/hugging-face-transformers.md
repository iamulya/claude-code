---
title: "Hugging Face Transformers — Overview"
source: "https://huggingface.co/docs/transformers/index"
tags: [tool, nlp, transformers, pretrained-models]
---

# Hugging Face Transformers

The `transformers` library by Hugging Face is the de-facto standard for working with pretrained language models. It provides a unified API to download, fine-tune, and deploy thousands of models from the Hugging Face Hub — supporting PyTorch, JAX, and TensorFlow backends.

## Core Concepts

### Model Hub
The Hugging Face Hub (huggingface.co/models) hosts over 400,000 public model checkpoints. Access any model with two lines:

```python
from transformers import AutoModel, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("google-bert/bert-base-uncased")
model = AutoModel.from_pretrained("google-bert/bert-base-uncased")
```

The `Auto*` classes automatically detect the correct architecture and configuration.

### Pipelines — Zero-Config Inference

The highest-level API — pick a task and get a working inference pipeline in one line:

```python
from transformers import pipeline

# Text generation
gen = pipeline("text-generation", model="meta-llama/Llama-3.1-8B-Instruct")
result = gen("The transformer architecture was introduced in", max_new_tokens=50)

# Sentiment analysis (default: distilbert fine-tuned on SST-2)
classifier = pipeline("sentiment-analysis")
classifier("I love PyTorch!")
# → [{'label': 'POSITIVE', 'score': 0.9998}]

# Named Entity Recognition
ner = pipeline("ner", aggregation_strategy="simple")
ner("Andrej Karpathy worked at OpenAI and Tesla.")

# Question Answering
qa = pipeline("question-answering")
qa(question="Who introduced the Transformer?", context="Vaswani et al. introduced the Transformer in 2017 at Google Brain.")

# Text embeddings for semantic search
embedder = pipeline("feature-extraction", model="sentence-transformers/all-MiniLM-L6-v2")
```

### Tokenizers

Transformers separates tokenization from modeling. The `tokenizers` library (Rust-based, very fast) handles text → tokens → model input:

```python
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")

encoded = tokenizer("Hello, Transformer!", return_tensors="pt")
# → {'input_ids': tensor(...), 'attention_mask': tensor(...)}

decoded = tokenizer.decode(encoded["input_ids"][0])
```

### Training with `Trainer`

The `Trainer` class wraps PyTorch training loops for supervised fine-tuning:

```python
from transformers import Trainer, TrainingArguments

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    learning_rate=2e-5,
    fp16=True,                  # Mixed precision
    save_strategy="epoch",
    evaluation_strategy="epoch",
    load_best_model_at_end=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_val,
    compute_metrics=compute_metrics,
)

trainer.train()
```

## Supported Tasks

| Task | Pipeline tag | Example models |
|------|-------------|----------------|
| Text generation (causal LM) | `text-generation` | GPT-2, LLaMA 3, Mistral |
| Chat / instruction following | `text-generation` | Llama 3.1 Instruct, Qwen2.5 |
| Token classification (NER) | `token-classification` | BERT-NER, RoBERTa-NER |
| Text classification | `text-classification` | DistilBERT-SST2 |
| Question answering | `question-answering` | BERT, ELECTRA |
| Summarization | `summarization` | BART, T5, Pegasus |
| Translation | `translation` | MarianMT, M2M-100 |
| Embeddings | `feature-extraction` | Sentence-BERT, E5 |
| Image classification | `image-classification` | ViT, ConvNeXT |
| Zero-shot classification | `zero-shot-classification` | BART-MNLI |

## PEFT — Parameter-Efficient Fine-Tuning

Hugging Face's `peft` library enables fine-tuning large models without updating all weights:

```python
from peft import LoraConfig, get_peft_model

# LoRA: update only low-rank adapter matrices
lora_config = LoraConfig(
    r=8,               # Rank of adapter matrices
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],  # Which layers to adapt
    lora_dropout=0.1,
    task_type="CAUSAL_LM",
)

model = get_peft_model(base_model, lora_config)
model.print_trainable_parameters()
# trainable params: 4,194,304 || all params: 6,742,609,920 || trainable%: 0.0622
```

LoRA lets you fine-tune a 7B model on a single consumer GPU.

## Accelerate — Device Management

```python
from accelerate import Accelerator

accelerator = Accelerator()
model, optimizer, train_loader = accelerator.prepare(model, optimizer, train_loader)
# Automatically handles: single GPU, multi-GPU, CPU offloading, mixed precision
```

## License

Apache 2.0 — commercial use permitted.
