---
summary: Learn how to programmatically clip web pages and save them as structured Markdown files using YAAF's `KBClipper`.
title: Clipping Web Pages with KBClipper
entity_type: guide
difficulty: beginner
search_terms:
 - how to clip web pages
 - programmatic web clipper
 - save website as markdown
 - YAAF web scraping
 - KBClipper usage
 - Mozilla Readability in YAAF
 - download website content
 - convert HTML to Markdown
 - Obsidian Web Clipper alternative
 - ingest URL into knowledge base
 - fetch and parse web article
 - extract article from URL
stub: false
compiled_at: 2026-04-24T18:06:01.904Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide demonstrates how to use the `[[[[[[[[KBClipper]]]]]]]]` utility to programmatically fetch, parse, and save web articles as clean Markdown files. `KBClipper` acts as a code-based equivalent of browser extensions like the Obsidian Web Clipper [Source 1].

The process involves:
1. Fetching the HTML content from a given URL.
2. Using the Mozilla Readability library (the same engine behind Firefox's Reader Mode) to extract the core article content, stripping away ads, navigation, and other non-essential elements.
3. Downloading all images from the article and saving them locally.
4. Converting the cleaned HTML into Markdown.
5. Saving the final Markdown file and its associated images to a specified directory.

By the end of this guide, you will be able to clip any public article URL and save it into a local, structured format suitable for ingestion into a YAAF knowledge base.

## Prerequisites

The `KBClipper` relies on several external libraries for HTML parsing, content extraction, and Markdown conversion. These are optional peer dependencies and must be installed in your project to use the clipper [Source 1].

Install the required libraries using your package manager:

```bash
# Using npm
npm install @mozilla/readability jsdom turndown

# Using yarn
yarn add @mozilla/readability jsdom turndown
```

If these dependencies are not installed, YAAF will throw a descriptive error message indicating which packages are missing [Source 1].

## Step-by-Step

This section walks through the process of instantiating and using `KBClipper`.

### 1. Import KBClipper

First, import the `KBClipper` class from the appropriate YAAF module.

```typescript
import { KBClipper } from 'yaaf/knowledge'; // Note: Actual import path may vary
```

### 2. Instantiate the Clipper

Create a new instance of `KBClipper`, passing the path to the output directory where you want the clipped files to be saved. This directory will be created if it does not exist.

```typescript
const outputDirectory = '/path/to/my-knowledge-base/raw/web-clips';
const clipper = new KBClipper(outputDirectory);
```

### 3. Clip a URL

Call the asynchronous `clip` method with the URL of the article you wish to save. The method returns an object containing the path to the saved Markdown file.

```typescript
import { KBClipper } from 'yaaf/knowledge'; // Note: Actual import path may vary

async function main() {
  const outputDirectory = './my-clips';
  const clipper = new KBClipper(outputDirectory);

  try {
    const articleUrl = 'https://example.com/some-interesting-article';
    const { savedPath } = await clipper.clip(articleUrl);

    console.log(`Article successfully clipped and saved to: ${savedPath}`);
  } catch (error) {
    console.error('Failed to clip the article:', error);
  }
}

main();
```

### 4. Review the Output

After the script runs, `KBClipper` creates a directory structure similar to that used by the Obsidian Web Clipper. For an article titled "Some Interesting Article", the output would be [Source 1]:

```
./my-clips/
└── Some Interesting Article/
    ├── assets/
    │   ├── image1.jpg
    │   └── image2.png
    └── index.md
```

The `index.md` file contains the clean article text in Markdown format, with image links pointing to the local files in the `assets` directory.

## Common Mistakes

1.  **Missing [Optional Dependencies](../concepts/optional-dependencies.md)**: The most common issue is forgetting to install `@mozilla/readability`, `jsdom`, and `turndown`. If `KBClipper` fails with a module-not-found error, ensure these three packages are present in your `node_modules` directory [Source 1].

2.  **Clipping Non-Article Pages**: `KBClipper` is optimized for pages with a clear [Article Structure](../concepts/article-structure.md) (e.g., blog posts, news articles). If you attempt to clip a homepage, a product listing, or another page without a single dominant block of text, the Mozilla Readability algorithm may fail to extract content. In this case, the [Ingester](../apis/ingester.md) falls back to extracting the raw text content of the entire page, which may be noisy or incomplete [Source 1]. The resulting metadata will include a `_readability_failed: true` flag.

3.  **URL Accessibility Issues**: The clipper must be able to publicly access the URL. It will fail on pages behind a login, content blocked by firewalls, or URLs that are malformed. YAAF also includes security measures to prevent Server-Side Request Forgery (SSRF) attacks, which may block requests to certain IP ranges [Source 1].

## Next Steps

Once a web page has been clipped and saved as a Markdown file, it is ready to be processed by the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). The output format of `KBClipper` is designed to be directly compatible with YAAF's standard Markdown ingester.

You can now point the knowledge base compiler to the output directory (`./my-clips` in the example) to have the clipped articles indexed and embedded.

## Sources

[Source 1] src/knowledge/compiler/ingester/html.ts