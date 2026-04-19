/**
 * Markdown Ingester
 *
 * Handles: .md, .mdx
 *
 * This is the primary ingester — the format Obsidian Web Clipper produces.
 * Every web page clipped via OWC or Joplin Web Clipper arrives as markdown
 * with locally downloaded images. This ingester:
 *
 * 1. Reads the markdown file
 * 2. Extracts the title (from frontmatter or first H1)
 * 3. Resolves all ![]() image references to local absolute paths
 * 4. Returns normalized IngestedContent
 *
 * Zero optional dependencies. Highest-fidelity ingestion path.
 */

import { readFile } from "fs/promises";
import { dirname, join } from "path";
import type { Ingester, IngestedContent, IngesterOptions } from "./types.js";
import { resolveAllMarkdownImages } from "./images.js";

// ── Frontmatter extraction ────────────────────────────────────────────────────

function extractFrontmatterYaml(markdown: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  // R1: CRLF normalization -- Windows Obsidian Web Clipper exports use \r\n.
  // Without this, frontmatter is silently parsed as {} and body = full raw file.
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: markdown };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2]?.trim() ?? "" };
}

function extractTitle(markdown: string, frontmatter: Record<string, string>): string | undefined {
  // Priority: frontmatter title > first H1 > first H2
  if (frontmatter["title"]) return frontmatter["title"];

  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1]!.trim();

  const h2Match = markdown.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1]!.trim();

  return undefined;
}

// ── Ingester implementation ───────────────────────────────────────────────────

export const markdownIngester: Ingester = {
  supportedMimeTypes: ["text/markdown"],
  supportedExtensions: ["md", "mdx"],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const raw = await readFile(filePath, "utf-8");
    const { frontmatter, body } = extractFrontmatterYaml(raw);
    const title = extractTitle(body, frontmatter);

    const imageOutputDir = options.imageOutputDir ?? join(dirname(filePath), "assets");

    const { images, unresolved } = await resolveAllMarkdownImages(body, filePath, {
      ...options,
      imageOutputDir,
    });

    // Merge all frontmatter as metadata
    const metadata: Record<string, unknown> = { ...frontmatter };
    if (unresolved.length > 0) metadata["_unresolved_images"] = unresolved;

    return {
      text: body,
      images,
      mimeType: "text/markdown",
      sourceFile: filePath,
      title,
      metadata,
      lossy: false,
      sourceUrl: options.sourceUrl ?? frontmatter["source"] ?? frontmatter["url"],
    };
  },
};
