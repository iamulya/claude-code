---
summary: Defines the event types emitted by the SkillRegistry for lifecycle notifications.
export_name: SkillRegistryEvents
source_file: src/skills.ts
category: type
title: SkillRegistryEvents
entity_type: api
search_terms:
 - skill registry events
 - skill lifecycle hooks
 - on skill load
 - on skill remove
 - skill error handling
 - how to listen for skill changes
 - skill registry notifications
 - dynamic skill loading events
 - skill update callback
 - skill removal callback
 - skill file watch errors
 - skill registry listeners
stub: false
compiled_at: 2026-04-24T17:38:05.056Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `SkillRegistryEvents` type defines a set of optional callback functions that can be provided to a `SkillRegistry` instance. These callbacks serve as event listeners, allowing an application to react to the lifecycle of [Skills](../concepts/skills.md) managed by the registry. This is particularly useful for logging, debugging, or triggering custom logic [when](./when.md) Skills are loaded, updated, removed, or when an error occurs during the file-watching and reloading process [Source 1].

## Signature

`SkillRegistryEvents` is a type alias for an object with the following optional properties [Source 1]:

```typescript
export type SkillRegistryEvents = {
  /** Called when a Skill is loaded or updated */
  onLoad?: ([[Skill]]: Skill) => void;
  /** Called when a [[Skill]] is removed */
  onRemove?: (name: string) => void;
  /** Called when an error occurs during watch/reload */
  onError?: (error: Error, filePath: string) => void;
};
```

### Properties

- **`onLoad?: ([[Skill]]: Skill) => void`**
  An optional callback function that is invoked whenever a [Skill](./skill.md) is successfully loaded or reloaded (updated). It receives the complete `Skill` object as its only argument [Source 1].

- **`onRemove?: (name: string) => void`**
  An optional callback function that is invoked when a skill is removed from the registry. It receives the `name` of the removed skill as its only argument [Source 1].

- **`onError?: (error: Error, filePath: string) => void`**
  An optional callback function that is invoked when an error occurs while watching or reloading a skill file from disk. It receives the `Error` object and the `filePath` of the file that caused the error [Source 1].

## Examples

The following example demonstrates how to provide an `SkillRegistryEvents` object when creating a `SkillRegistry` to log skill lifecycle events to the console.

```typescript
import { SkillRegistry, SkillRegistryEvents } from 'yaaf';

// Define event handlers
const skillEvents: SkillRegistryEvents = {
  onLoad: (skill) => {
    console.log(`Skill loaded/updated: ${skill.name} from ${skill.filePath || 'memory'}`);
  },
  onRemove: (name) => {
    console.warn(`Skill removed: ${name}`);
  },
  onError: (error, filePath) => {
    console.error(`Error processing skill file ${filePath}:`, error.message);
  },
};

// The SkillRegistry is not shown here, but this is how you would use the events
// const registry = new SkillRegistry({
//   directory: './skills',
//   watch: true,
//   events: skillEvents,
// });

// await registry.loadAll();
```

## See Also

- `SkillRegistry`: The class that consumes the `SkillRegistryEvents` type to manage and watch skill files.
- `Skill`: The type representing a skill, which is passed to the `onLoad` event handler.

## Sources

[Source 1]: src/skills.ts