---
title: ElementInfo
entity_type: api
summary: Type definition for detailed information about a web page element, used by the Camoufox Plugin.
export_name: ElementInfo
source_file: src/integrations/camoufox.ts
category: type
search_terms:
 - web element details
 - DOM element information
 - Camoufox element type
 - browser automation data structure
 - web scraping element properties
 - selector and attributes
 - bounding box of element
 - textContent of HTML element
 - isVisible property
 - tagName of element
 - web element metadata
 - how to get element info
stub: false
compiled_at: 2026-04-24T17:03:56.050Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/camoufox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ElementInfo` type is a data structure that represents detailed information about a single HTML element on a web page [Source 1]. It is used by the `CamoufoxPlugin` to return structured data about elements queried during browser automation tasks. This type provides a comprehensive snapshot of an element's state, including its content, attributes, visibility, and position, which is essential for agents performing web-based actions like scraping or interaction [Source 1].

## Signature

`ElementInfo` is a TypeScript type alias for an object with the following structure [Source 1]:

```typescript
export type ElementInfo = {
  selector: string;
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  isVisible: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
};
```

## Properties

- **`selector`**: `string`
  The CSS selector that can be used to uniquely identify this element on the page [Source 1].

- **`tagName`**: `string`
  The HTML tag name of the element, such as `'DIV'`, `'A'`, or `'INPUT'` [Source 1].

- **`textContent`**: `string`
  The combined text content of the element and all its descendants [Source 1].

- **`attributes`**: `Record<string, string>`
  A key-value map of the element's HTML attributes, such as `href`, `id`, or `class` [Source 1].

- **`isVisible`**: `boolean`
  A boolean indicating whether the element is currently visible within the browser's viewport [Source 1].

- **`boundingBox`**: `{ x: number; y: number; width: number; height: number }` (optional)
  An object describing the position and dimensions of the element on the page in pixels. This property may be omitted if the element is not visible or has no dimensions [Source 1].

## Examples

The `ElementInfo` type is typically returned by functions within the `CamoufoxPlugin` that query the DOM. The following example shows how an agent might process an array of `ElementInfo` objects to find a specific link.

```typescript
import type { ElementInfo } from 'yaaf';

// This is a hypothetical function that returns ElementInfo objects.
// In a real scenario, this data would come from a CamoufoxPlugin method.
async function findClickableLoginButton(elements: ElementInfo[]): Promise<ElementInfo | null> {
  for (const element of elements) {
    const text = element.textContent.toLowerCase();
    const isLoginButton = text.includes('log in') || text.includes('sign in');

    if (element.tagName === 'A' && isLoginButton && element.isVisible) {
      console.log(`Found login button with selector: ${element.selector}`);
      console.log(`URL: ${element.attributes.href}`);
      return element;
    }
  }
  return null;
}

// Example usage with mock data:
const mockElements: ElementInfo[] = [
  {
    selector: '#main-nav > li:nth-child(3) > a',
    tagName: 'A',
    textContent: 'Sign In',
    attributes: { href: '/login', class: 'nav-link' },
    isVisible: true,
    boundingBox: { x: 800, y: 20, width: 80, height: 30 }
  },
  {
    selector: 'footer > a.login-link',
    tagName: 'A',
    textContent: 'Log In',
    attributes: { href: '/login' },
    isVisible: false, // Not visible
  }
];

findClickableLoginButton(mockElements).then(button => {
  if (button) {
    // Agent would now use the selector to perform a click action.
    // e.g., browser.click(button.selector);
  }
});
```

## See Also

- `CamoufoxPlugin`: The plugin that utilizes the `ElementInfo` type for browser automation and tool provision.

## Sources

[Source 1] `src/integrations/camoufox.ts`