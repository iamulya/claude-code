---
title: ElementInfo
entity_type: api
summary: Represents metadata and state of a DOM element captured during browser automation.
export_name: ElementInfo
source_file: src/integrations/camoufox.ts
category: type
stub: false
compiled_at: 2026-04-16T14:21:27.579Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/camoufox.ts
confidence: 0.95
---

## Overview
`ElementInfo` is a TypeScript type used within the Camoufox integration to represent the state and properties of a specific DOM element. It provides a structured snapshot of an element's identity, content, and visibility, which is typically used by agents to reason about web page structures or by tools that perform web extraction and interaction.

## Signature
```typescript
export type ElementInfo = {
  selector: string
  tagName: string
  textContent: string
  attributes: Record<string, string>
  isVisible: boolean
  boundingBox?: { x: number; y: number; width: number; height: number }
}
```

## Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `selector` | `string` | The CSS selector used to uniquely identify or locate the element. |
| `tagName` | `string` | The HTML tag name of the element (e.g., "DIV", "BUTTON", "A"). |
| `textContent` | `string` | The raw text content contained within the element. |
| `attributes` | `Record<string, string>` | A key-value map of the element's HTML attributes (e.g., `id`, `class`, `href`). |
| `isVisible` | `boolean` | Indicates whether the element is currently visible in the browser's viewport. |
| `boundingBox` | `object` | (Optional) The spatial coordinates and dimensions of the element. |
| `boundingBox.x` | `number` | The x-coordinate of the element's top-left corner. |
| `boundingBox.y` | `number` | The y-coordinate of the element's top-left corner. |
| `boundingBox.width` | `number` | The width of the element in pixels. |
| `boundingBox.height` | `number` | The height of the element in pixels. |

## Examples
### Basic Usage
This example demonstrates a populated `ElementInfo` object as it might be returned by a web extraction tool.

```typescript
const loginButton: ElementInfo = {
  selector: "button#login-submit",
  tagName: "BUTTON",
  textContent: "Log In",
  attributes: {
    id: "login-submit",
    class: "btn btn-primary",
    type: "submit"
  },
  isVisible: true,
  boundingBox: {
    x: 450,
    y: 300,
    width: 120,
    height: 40
  }
};
```

## See Also
- `CamoufoxPlugin`
- `CamoufoxConfig`