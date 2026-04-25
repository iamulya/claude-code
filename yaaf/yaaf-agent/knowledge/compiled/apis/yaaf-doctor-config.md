---
summary: The `YaafDoctorConfig` type specifies configuration options for initializing and running the `YaafDoctor` agent.
export_name: YaafDoctorConfig
source_file: src/doctor/index.ts
category: type
title: YaafDoctorConfig
entity_type: api
search_terms:
 - doctor agent configuration
 - configure YaafDoctor
 - YaafDoctor options
 - set project root for doctor
 - specify LLM for doctor
 - add tools to doctor agent
 - daemon interval setting
 - doctor agent API key
 - how to configure the YAAF doctor
 - YaafDoctor constructor options
 - pass chat model to doctor
 - customize doctor system prompt
stub: false
compiled_at: 2026-04-24T17:50:05.664Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `YaafDoctorConfig` type defines the structure of the configuration object used to initialize the `YaafDoctor` class. This object allows for customization of the doctor agent's behavior, including the target project directory, the Large Language Model ([LLM](../concepts/llm.md)) to use, custom [Tools](../subsystems/tools.md), and operational parameters for its daemon mode.

This configuration is passed to the `YaafDoctor` constructor. Most properties are optional and have sensible defaults, allowing for minimal configuration for common use cases.

## Signature

`YaafDoctorConfig` is a TypeScript type alias with the following properties:

```typescript
export type YaafDoctorConfig = {
  /** Project root to inspect (default: process.cwd()) */
  projectRoot?: string;

  /** LLM model to use (default: auto-detect from env) */
  model?: string;

  /** LLM provider (default: auto-detect from env) */
  provider?: ModelProvider;

  /** API key override (default: from environment) */
  apiKey?: string;

  /** Pre-configured ChatModel instance (bypasses provider/apiKey resolution) */
  chatModel?: ChatModel;

  /** Additional tools to give the doctor */
  extraTools?: Tool[];

  /** Extra instructions appended to the [[[[[[[[System Prompt]]]]]]]] */
  extraInstructions?: string;

  /** Daemon check interval in seconds (default: 30) */
  daemonIntervalSec?: number;

  /** Max LLM iterations per question (default: 20) */
  maxIterations?: number;
};
```

### Properties

| Property            | Type            | Description                                                              |
| ------------------- | --------------- | ------------------------------------------------------------------------ |
| `projectRoot`       | `string`        | The root directory of the project for the doctor to inspect. Defaults to `process.cwd()`. |
| `model`             | `string`        | The specific LLM model to use. Defaults to a model auto-detected from environment variables. |
| `provider`          | `ModelProvider` | The LLM provider to use. Defaults to a provider auto-detected from environment variables. |
| `apiKey`            | `string`        | An API key for the LLM provider, overriding any key found in environment variables. |
| `chatModel`         | `ChatModel`     | A pre-configured `ChatModel` instance. If provided, it bypasses the `model`, `provider`, and `apiKey` resolution logic. |
| `extraTools`        | `Tool[]`        | An array of additional tools to make available to the doctor agent. |
| `extraInstructions` | `string`        | A string of extra instructions to be appended to the doctor's System Prompt. |
| `daemonIntervalSec` | `number`        | The interval in seconds at which the daemon performs its checks. Defaults to 30. |
| `maxIterations`     | `number`        | The maximum number of LLM iterations allowed for answering a single question. Defaults to 20. |

## Examples

### Basic Configuration

This example creates a `YaafDoctor` instance that inspects a specific project directory and uses a custom check interval for its daemon mode.

```typescript
import { YaafDoctor, type YaafDoctorConfig } from 'yaaf';
import * as path from 'path';

const config: YaafDoctorConfig = {
  projectRoot: path.resolve('../my-other-project'),
  daemonIntervalSec: 60, // Check every minute
};

const doctor = new YaafDoctor(config);
```

### Advanced Configuration with a Custom Model

This example configures the doctor to use a specific LLM model and provides it with extra instructions.

```typescript
import { YaafDoctor, type YaafDoctorConfig } from 'yaaf';

const config: YaafDoctorConfig = {
  model: 'gpt-4-turbo',
  provider: 'openai',
  apiKey: process.env.MY_CUSTOM_OPENAI_KEY,
  maxIterations: 15,
  extraInstructions: 'When analyzing code, pay special attention to dependency injection patterns.'
};

const doctor = new YaafDoctor(config);

async function diagnose() {
  const answer = await doctor.ask('What are the most complex parts of my agent?');
  console.log(answer);
}

diagnose();
```

## Sources

[Source 1]: src/doctor/index.ts