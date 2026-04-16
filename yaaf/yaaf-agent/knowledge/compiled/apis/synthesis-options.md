---
title: SynthesisOptions
entity_type: api
summary: Configuration options for the knowledge synthesis process.
export_name: SynthesisOptions
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:26:36.206Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
confidence: 1
---

## Overview
`SynthesisOptions` is a configuration object used to define the behavior of the knowledge synthesis process. It allows developers to control performance parameters, such as concurrency, and operational modes, such as incremental builds or dry runs. This type is primarily consumed by the synthesizer during the compilation of raw source material into structured markdown articles.

## Signature
```typescript
export type SynthesisOptions = {
  concurrency?: number;
  dryRun?: boolean;
  stubConfidenceThreshold?: number;
  onProgress?: (event: SynthesisProgressEvent) => void;
  incrementalMode?: boolean;
};
```

## Methods & Properties
- **concurrency**: (Optional) The maximum number of articles to synthesize concurrently. Increasing this value can speed up the compilation process but may consume more LLM API quota. Defaults to `3`.
- **dryRun**: (Optional) When set to `true`, the synthesizer will generate the compilation plan and content but will not write any files to the disk. This is used for previewing changes before a real run.
- **stubConfidenceThreshold**: (Optional) The minimum confidence score (between 0 and 1) required to automatically create a stub article for a candidate new concept identified during extraction. Defaults to `0.7`.
- **onProgress**: (Optional) A callback function invoked after each article is written or processed. It receives a `SynthesisProgressEvent` which is typically used by CLI tools to display real-time progress.
- **incrementalMode**: (Optional) When enabled, the synthesizer compares the modification time (mtime) of source files against existing compiled articles. If the source files are older than the compiled output, synthesis for that article is skipped. Defaults to `false`.

## Examples

### Basic Configuration
```typescript
import { SynthesisOptions } from './types';

const options: SynthesisOptions = {
  concurrency: 5,
  incrementalMode: true,
  onProgress: (event) => {
    if (event.type === 'article:started') {
      console.log(`Synthesizing: ${event.title} (${event.action})`);
    }
  }
};
```

### Dry Run for Preview
```typescript
const previewOptions: SynthesisOptions = {
  dryRun: true,
  stubConfidenceThreshold: 0.85
};
```