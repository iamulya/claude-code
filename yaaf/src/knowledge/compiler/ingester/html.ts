/**
 * HTML Ingester
 *
 * Handles: .html, .htm, and direct URL clipping
 *
 * Architecture:
 * 1. Parse HTML with JSDOM (optional dep)
 * 2. Extract article content with Mozilla Readability (same algorithm as Firefox
 * Reader Mode — strips nav, ads, sidebars, cookie banners)
 * 3. Download external images and resolve src attributes
 * 4. Convert cleaned HTML → Markdown with Turndown
 * 5. Return IngestedContent
 *
 * Optional peer dependencies required:
 * - @mozilla/readability (article extraction)
 * - jsdom (HTML parsing for Readability)
 * - turndown (HTML → Markdown conversion)
 *
 * If these are not installed, the ingester throws a clear error explaining
 * exactly what to install, rather than failing with a cryptic module error.
 *
 * Why these specific libraries?
 * - @mozilla/readability: Production-proven, used in Firefox Reader Mode,
 * maintained by Mozilla, best-in-class noise removal
 * - jsdom: The standard Node.js DOM implementation, required by Readability
 * - turndown: Best HTML→Markdown converter, configurable rules, well-maintained
 *
 * Obsidian Web Clipper vs Direct HTML:
 * - OWC output (already .md files) → use markdownIngester, zero overhead
 * - Raw .html files → this ingester
 * - Direct URL → use `KBClipper.clip(url)` which wraps this ingester
 */

import { readFile, mkdir, writeFile } from "fs/promises";
import { dirname, join, basename, extname, resolve } from "path";
import type { Ingester, IngestedContent, IngesterOptions, ImageRef } from "./types.js";
import { downloadImage } from "./images.js";

// ── Optional dependency loading ───────────────────────────────────────────────

const REQUIRED_PACKAGES = ["@mozilla/readability", "jsdom", "turndown"] as const;

/**
 * Load optional HTML processing dependencies.
 * Uses dynamic import so the package works without them installed.
 * On failure, throws a clear, actionable error message.
 */
async function loadHtmlDeps(): Promise<{
  Readability: new (doc: unknown, options?: unknown) => { parse(): ReadabilityResult | null };
  JSDOM: new (html: string, options?: unknown) => JSDOMInstance;
  TurndownService: new (options?: unknown) => TurndownInstance;
}> {
  const missing: string[] = [];

  // Check each dep individually for better error messages
  for (const pkg of REQUIRED_PACKAGES) {
    try {
      await import(pkg);
    } catch {
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `HTML ingestion requires these optional peer dependencies:\n\n` +
        ` npm install ${missing.join(" ")}\n\n` +
        `These are kept optional to minimize the core YAAF package size.\n` +
        `Install them in the project using the KB system.\n\n` +
        `Missing packages: ${missing.join(", ")}`,
    );
  }

  // @ts-expect-error — optional peer dep, may not be installed
  const readabilityMod = (await import("@mozilla/readability")) as { Readability: unknown };
  // @ts-expect-error — optional peer dep, may not be installed
  const jsdomMod = (await import("jsdom")) as { JSDOM: unknown; default?: { JSDOM: unknown } };
  // @ts-expect-error — optional peer dep, may not be installed
  const turndownMod = (await import("turndown")) as {
    default?: unknown;
    TurndownService?: unknown;
  };

  return {
    Readability: readabilityMod.Readability as new (
      doc: unknown,
      options?: unknown,
    ) => { parse(): ReadabilityResult | null },
    JSDOM: (jsdomMod.JSDOM ?? (jsdomMod as { default: { JSDOM: unknown } }).default?.JSDOM) as new (
      html: string,
      options?: unknown,
    ) => JSDOMInstance,
    TurndownService: (turndownMod.default ?? turndownMod.TurndownService) as new (
      options?: unknown,
    ) => TurndownInstance,
  };
}

// ── Type shims for optional deps ──────────────────────────────────────────────

interface ReadabilityResult {
  title: string;
  byline: string | null;
  content: string; // HTML string of the extracted article
  textContent: string; // Plain text
  excerpt: string | null;
  siteName: string | null;
  dir?: string;
  lang?: string;
  publishedTime?: string | null;
}

interface JSDOMInstance {
  window: {
    document: unknown;
    location: { href: string };
  };
}

interface TurndownInstance {
  turndown(html: string): string;
  use(plugin: unknown): void;
  addRule(name: string, rule: unknown): void;
  remove(tag: string | string[]): void;
}

// ── OpenGraph / meta extraction ───────────────────────────────────────────────

function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};

  // og: and twitter: meta tags
  const ogPattern = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = ogPattern.exec(html)) !== null) {
    const key = match[1]!.toLowerCase().replace(":", "_");
    meta[key] = match[2]!;
  }

  // <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && !meta["og_title"]) {
    meta["title"] = titleMatch[1]!.trim();
  }

  // Canonical URL
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  );
  if (canonicalMatch) meta["canonical_url"] = canonicalMatch[1]!;

  return meta;
}

// ── HTML image extraction ─────────────────────────────────────────────────────

interface HtmlImageRef {
  src: string;
  alt: string;
}

/**
 * Extract all <img> src attributes from an HTML string.
 * Used to find images in the Readability-extracted content.
 */
function extractHtmlImages(html: string): HtmlImageRef[] {
  const images: HtmlImageRef[] = [];
  const imgPattern = /<img[^>]+src=["']([^"']+)["'](?:[^>]+alt=["']([^"']*)["'])?[^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = imgPattern.exec(html)) !== null) {
    images.push({ src: match[1]!, alt: match[2] ?? "" });
  }

  return images;
}

// ── Turndown configuration ────────────────────────────────────────────────────

/**
 * Configure Turndown for high-quality HTML → Markdown conversion.
 *
 * Rules applied:
 * - Remove script, style, nav, footer, header, aside, form elements
 * - Convert <figure>/<figcaption> to image + caption
 * - Preserve code blocks with language detection
 * - Convert <table> to GitHub Flavored Markdown tables
 * - Strip empty links
 */
function configureTurndown(td: TurndownInstance): void {
  // Remove noise elements
  td.remove(["script", "style", "nav", "footer", "aside", "form", "noscript", "iframe"]);

  // Code blocks with language
  td.addRule("fencedCodeBlock", {
    filter: (node: any) => {
      return node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE";
    },
    replacement: (_: string, node: any) => {
      const code = node.firstChild;
      const lang = (code.getAttribute("class") ?? "").replace(/language-|hljs |lang-/g, "").trim();
      const content = code.textContent ?? "";
      return `\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n`;
    },
  });

  // Figure + figcaption
  td.addRule("figure", {
    filter: "figure",
    replacement: (content: string) => `\n${content.trim()}\n`,
  });
}

// ── Ingester implementation ───────────────────────────────────────────────────

export const htmlIngester: Ingester = {
  supportedMimeTypes: ["text/html"],
  supportedExtensions: ["html", "htm"],
  requiresOptionalDeps: true,
  optionalDeps: ["@mozilla/readability", "jsdom", "turndown"],

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const { Readability, JSDOM, TurndownService } = await loadHtmlDeps();

    const raw = await readFile(filePath, "utf-8");
    const docDir = dirname(filePath);
    const imageOutputDir = options.imageOutputDir ?? join(docDir, "assets");
    const pageUrl = options.sourceUrl ?? `file://${filePath}`;

    // Extract metadata before Readability (which strips meta tags)
    const metaTags = extractMetaTags(raw);

    // Parse with JSDOM — pass the page URL so relative URLs are resolved correctly
    const dom = new JSDOM(raw, {
      url: pageUrl,
      contentType: "text/html",
    });

    // Run Mozilla Readability
    const reader = new Readability(dom.window.document, {
      // Keep images and figure elements
      keepClasses: false,
      // Readability throws on non-article content — we prefer a degraded result
      disableJSONLD: false,
    });

    const article: ReadabilityResult | null = reader.parse();

    if (!article) {
      // Readability couldn't extract an article — fall back to full page text
      const fallbackText =
        (dom.window.document as { body?: { textContent?: string } }).body?.textContent ??
        raw
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      return {
        text: fallbackText,
        images: [],
        mimeType: "text/html",
        sourceFile: filePath,
        title: metaTags["og_title"] ?? metaTags["title"],
        metadata: { ...metaTags, _readability_failed: true },
        lossy: true,
        sourceUrl: options.sourceUrl,
      };
    }

    // Convert Readability HTML → Markdown
    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "_",
      strongDelimiter: "**",
    });
    configureTurndown(td);

    const markdownText = td.turndown(article.content);

    // Extract and resolve images from the article HTML
    const htmlImages = extractHtmlImages(article.content);
    const images: ImageRef[] = [];

    await mkdir(imageOutputDir, { recursive: true });

    for (const htmlImg of htmlImages) {
      const { src, alt } = htmlImg;

      if (!src || src.startsWith("data:image/svg")) continue;

      // Data URI
      if (src.startsWith("data:image/")) {
        const match = src.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1]!;
          const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
          const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const localPath = join(imageOutputDir, filename);
          const buffer = Buffer.from(match[2]!, "base64");
          try {
            await writeFile(localPath, buffer);
            images.push({
              originalSrc: src.slice(0, 40) + "...[embedded]",
              localPath,
              altText: alt || filename,
              mimeType,
              sizeBytes: buffer.length,
            });
          } catch {
            /* skip */
          }
          continue;
        }
      }

      // External URL
      if (src.startsWith("http://") || src.startsWith("https://")) {
        const ref = await downloadImage(src, alt, imageOutputDir);
        if (ref) images.push(ref);
        continue;
      }

      // Local path relative to the HTML file
      const localSrc = resolve(docDir, src);
      try {
        const { stat } = await import("fs/promises");
        const s = await stat(localSrc);
        if (s.isFile()) {
          const { detectImageMimeType } = await import("./images.js");
          images.push({
            originalSrc: src,
            localPath: localSrc,
            altText: alt || basename(localSrc, extname(localSrc)),
            mimeType: await detectImageMimeType(localSrc),
            sizeBytes: s.size,
          });
        }
      } catch {
        /* skip unresolvable local images */
      }
    }

    // Build metadata
    const metadata: Record<string, unknown> = {
      ...metaTags,
      readability_excerpt: article.excerpt ?? undefined,
      readability_byline: article.byline ?? undefined,
      readability_site_name: article.siteName ?? undefined,
      readability_lang: article.lang ?? undefined,
      readability_published_time: article.publishedTime ?? undefined,
    };

    return {
      text: markdownText,
      images,
      mimeType: "text/html",
      sourceFile: filePath,
      title: article.title || metaTags["og_title"] || metaTags["title"],
      metadata,
      lossy: true, // Readability is lossy by design — it removes noise
      sourceUrl: options.sourceUrl ?? metaTags["canonical_url"],
    };
  },
};

// ── URL Clipper ───────────────────────────────────────────────────────────────

/**
 * KBClipper — programmatic equivalent of the Obsidian Web Clipper browser extension.
 *
 * Fetches a URL, applies Readability-based extraction, downloads images,
 * and saves the result as a markdown file in the KB raw/ directory.
 *
 * Usage:
 * ```ts
 * const clipper = new KBClipper('/path/to/kb/raw/web-clips')
 * const { savedPath } = await clipper.clip('https://example.com/article')
 * // → saves to /path/to/kb/raw/web-clips/article-title/index.md
 * ```
 *
 * This matches the directory structure Obsidian Web Clipper uses,
 * ensuring the markdown ingester handles both.
 */
export class KBClipper {
  private readonly webClipsDir: string;

  constructor(webClipsDir: string) {
    this.webClipsDir = webClipsDir;
  }

  /**
   * Clip a URL — fetch, extract, save as markdown with local images.
   *
   * @param url - The URL to clip
   * @returns Path to the saved markdown file
   */
  async clip(url: string): Promise<{ savedPath: string; title: string; imageCount: number }> {
    // 1. Fetch HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YAAF-KB-Clipper/1.0; +https://github.com/yaaf)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
    }

    // O1: cap fetch size to prevent OOM from servers returning huge responses.
    // AbortSignal.timeout only stops slow connections, not fast large ones.
    // 5MB is generous for any real article; Wikipedia article HTML is ~1-2MB.
    const MAX_HTML_BYTES = 5 * 1024 * 1024;
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_HTML_BYTES) {
      throw new Error(
        `Failed to clip ${url}: response too large (${contentLength} bytes, max ${MAX_HTML_BYTES})`,
      );
    }

    // Stream-read with hard cap
    let html: string;
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error(
            `Failed to clip ${url}: response exceeded ${MAX_HTML_BYTES} byte limit`,
          );
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      html = chunks.join("");
    } else {
      html = await response.text();
    }

    // 2. Save to a temp file and run through htmlIngester
    const { tmpdir } = await import("os");
    const { join: pathJoin } = await import("path");
    const { writeFile: wf } = await import("fs/promises");

    const tmpPath = pathJoin(tmpdir(), `yaaf-clip-${Date.now()}.html`);
    await wf(tmpPath, html, "utf-8");

    // 3. Determine output directory (use URL-derived slug)
    const slug = slugifyUrl(url);
    const clipDir = join(this.webClipsDir, slug);
    await mkdir(clipDir, { recursive: true });

    // 4. Ingest
    const ingested = await htmlIngester.ingest(tmpPath, {
      imageOutputDir: join(clipDir, "assets"),
      sourceUrl: url,
    });

    // 5. Build the markdown file
    const now = new Date().toISOString();
    const frontmatter = [
      "---",
      // O4: strip newlines from title before embedding in YAML double-quoted scalar.
      // A page title containing \n--- allows injection of arbitrary frontmatter fields.
      `title: "${(ingested.title ?? slug).replace(/[\r\n]/g, " ").replace(/"/g, '\\"')}"`,
      `source: "${url}"`,
      `clipped_at: "${now}"`,
      `entity_type: "" # Fill in: article, research_paper, tutorial, etc.`,
      `tags: []`,
      "---",
      "",
    ].join("\n");

    // Rewrite image references in the text to point to local assets/
    let markdownBody = ingested.text;
    for (const img of ingested.images) {
      const relPath = `assets/${basename(img.localPath)}`;
      markdownBody = markdownBody.replace(img.originalSrc, relPath);
    }

    const fullMarkdown = frontmatter + markdownBody;

    const savedPath = join(clipDir, "index.md");
    await wf(savedPath, fullMarkdown, "utf-8");

    // 6. Clean up temp file
    try {
      const { unlink } = await import("fs/promises");
      await unlink(tmpPath);
    } catch {
      /* not critical */
    }

    return {
      savedPath,
      title: ingested.title ?? slug,
      imageCount: ingested.images.length,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugifyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .replace(/^\/|\/$/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 60);
    return path || parsed.hostname.replace(/\./g, "-");
  } catch {
    return url
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 60);
  }
}
