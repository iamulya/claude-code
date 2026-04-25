---
summary: Provides an opt-in premium terminal interface for YAAF agents using the Ink framework.
primary_files:
 - src/cli-ink.ts
title: Ink CLI Runtime
entity_type: subsystem
search_terms:
 - premium terminal interface
 - rich CLI for agents
 - Ink framework integration
 - React for terminal
 - how to use Ink with YAAF
 - yaaf/cli-ink
 - interactive agent CLI
 - command line interface
 - terminal UI
 - ink-text-input
 - ink-spinner
stub: false
compiled_at: 2026-04-24T18:13:18.605Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-ink.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Ink [CLI](./cli.md) Runtime is an optional subsystem that provides a "premium" terminal interface for YAAF agents [Source 1]. It allows developers to create rich, interactive command-line applications for their agents, moving beyond simple text input and output. This is achieved by leveraging the Ink framework, which enables building terminal UIs with React [Source 1].

## Architecture

This subsystem is built upon the Ink framework and its ecosystem. It requires several external dependencies to function, including `react`, `ink`, `ink-text-input`, and `ink-spinner` [Source 1]. These dependencies suggest an architecture composed of React components designed for the terminal, providing features like styled text input fields and loading spinners for a more polished user experience. The primary source file is `src/cli-ink.ts`, which serves as the integration layer between YAAF and the Ink framework [Source 1].

## Key APIs

The main entry point for this subsystem is exposed through the `yaaf/cli-ink` module. The primary function for activating this runtime is `createInkCLI` [Source 1].

Developers can import and use this function as shown below:
```ts
import { createInkCLI } from 'yaaf/cli-ink';
```

## Configuration

The Ink [CLI Runtime](./cli-runtime.md) is an opt-in feature and requires manual installation of its peer dependencies. To use this subsystem, a developer must add the following packages to their project [Source 1]:

*   `ink`
*   `react`
*   `ink-text-input`
*   `ink-spinner`

These can be installed via a package manager like npm:
```bash
npm install ink react ink-text-input ink-spinner
```

## Sources

[Source 1]: src/cli-ink.ts