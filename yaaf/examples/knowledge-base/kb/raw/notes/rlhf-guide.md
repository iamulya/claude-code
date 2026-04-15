---
title: "RLHF — Reinforcement Learning from Human Feedback"
source: "https://huggingface.co/blog/rlhf"
tags: [alignment, rlhf, ppo, reward-model]
---

# Reinforcement Learning from Human Feedback (RLHF)

**RLHF** is the alignment technique that made GPT-4, Claude, and Gemini safe and helpful assistants. It bridges the gap between raw language model pretraining (next-token prediction) and human-defined notions of quality, safety, and helpfulness.

## The Problem RLHF Solves

A pretrained LLM is just a text completer. Given "Write a recipe for...", it continues plausibly — but it might:
- Give incorrect information confidently
- Produce harmful content
- Ignore what the user actually wants

The challenge: how do you train a model to maximize "human preference" when that's hard to formalize as a loss function?

## How RLHF Works — Three Phases

### Phase 1: Supervised Fine-Tuning (SFT)

Start with a pretrained LLM. Collect a dataset of (prompt, ideal response) pairs written by humans. Fine-tune:

```
Model_SFT = finetune(Model_pretrained, SFT_dataset)
```

This makes the model follow instructions but doesn't yet optimize for human preference.

### Phase 2: Reward Model Training

- Sample multiple model outputs for the same prompt
- Show pairs to human labelers: "Which is better, A or B?"
- Collect a preference dataset: `(prompt, response_A, response_B, human_preference)`
- Train a **Reward Model (RM)** — typically the LLM itself with a scalar head — to predict the preferred response:

```
RM(prompt, response) → scalar reward score
```

### Phase 3: RL Fine-Tuning with PPO

Use the Reward Model as a signal to fine-tune the SFT model with **Proximal Policy Optimization (PPO)**:

```
Optimize: E[RM(prompt, response)] - β * KL(π_RL || π_SFT)
```

The KL penalty (β) prevents the RL model from drifting too far from SFT (avoiding reward hacking and maintaining fluency).

## Key Challenges

### Reward Hacking
The model finds ways to maximize the reward signal without actually being more helpful. Example: models learn to produce longer responses if human raters prefer verbosity, regardless of content quality.

### Scalable Oversight
How do you get reliable human preference data for complex technical outputs (code, math proofs) where humans can't easily judge quality?

### Distribution Shift
The RM is trained on SFT outputs, but PPO generates different outputs. Performance can degrade as the distribution diverges.

## Modern Alternatives

### Direct Preference Optimization (DPO)
Rafailov et al. (2023) reformulated RLHF to avoid training a separate reward model. DPO directly optimizes on preference pairs using a supervised loss that implicitly defines the reward function. Simpler, faster, equally effective.

### Constitutional AI (CAI)
Anthropic's approach — use a set of "constitutional" principles and self-critique to generate preference data, reducing reliance on human labeling.

### RLAIF
Replace human preference labels with AI-generated labels (from a "teacher" model). Scales better but may encode AI model biases.

## Real-World Application

RLHF was first described at scale in:
- **InstructGPT** (Ouyang et al., 2022) — applied RLHF to GPT-3, dramatic improvement in instruction following
- **ChatGPT** — InstructGPT variant deployed as a product
- **Claude** — Anthropic uses Constitutional AI + RLHF
- **Gemini** — Google applies RLHF across their model series

## Key Hyperparameters

| Parameter | Description | Typical Value |
|-----------|-------------|---------------|
| β (KL penalty) | Prevents reward hacking | 0.01–0.1 |
| PPO clip ratio | Limits policy update size | 0.2 |
| RM learning rate | Reward model LR | 9e-6 |
| Number of RM labels per prompt | Preference pairs | 4–9 comparisons |
