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
import { parseFrontmatter } from "../../utils/frontmatter.js";

// ── Frontmatter extraction ────────────────────────────────────────────────────
// Replaced hand-rolled YAML parser with shared yaml-library-based implementation.
// See utils/frontmatter.ts for details.

function extractTitle(markdown: string, frontmatter: Record<string, unknown>): string | undefined {
  // Priority: frontmatter title > first H1 > first H2
  if (frontmatter["title"]) return String(frontmatter["title"]);

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
    const { frontmatter, body } = parseFrontmatter(raw);
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
      sourceUrl: options.sourceUrl ?? (frontmatter["source"] as string | undefined) ?? (frontmatter["url"] as string | undefined),
    };
  },
};
