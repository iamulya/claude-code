/**
 * C3 — Vision Pass
 *
 * Auto-generates alt-text and captions for images referenced in compiled
 * articles that lack meaningful descriptions.
 *
 * Runs at compile time (after synthesis). For each image reference:
 * 1. Parse `![alt](path)` patterns from article bodies
 * 2. If alt-text is missing/generic → read the image from disk
 * 3. Send it to a vision-capable LLM for description
 * 4. Rewrite the image reference with the generated alt-text
 *
 * This ensures agents using text-only models can still understand
 * diagram/figure content via rich descriptions.
 */

import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join, relative, dirname, resolve, extname } from "path";
import type { VisionCallFn } from "./llmClient.js";
import { atomicWriteFile } from "./atomicWrite.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisionPassOptions = {
  /** Max images to process per run. Default: 50 */
  maxImages?: number;
  /** Skip images smaller than this (bytes). Default: 1024 (skip tiny icons) */
  minImageBytes?: number;
  /** Only process, don't write changes. Default: false */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: (event: VisionProgressEvent) => void;
};

export type VisionProgressEvent =
  | { type: "vision:start"; totalImages: number }
  | { type: "vision:processing"; image: string; index: number; total: number }
  | { type: "vision:described"; image: string; altText: string }
  | { type: "vision:skipped"; image: string; reason: string }
  | { type: "vision:complete"; result: VisionPassResult };

export type VisionPassResult = {
  /** Images that got new alt-text */
  described: number;
  /** Images skipped (already have good alt-text, too small, etc.) */
  skipped: number;
  /** Images that failed (unreadable, LLM error) */
  failed: number;
  /** Number of vision LLM calls made */
  llmCalls: number;
  /** Per-image details */
  details: VisionDetail[];
  /** Total elapsed time (ms) */
  durationMs: number;
};

export type VisionDetail = {
  /** Article docId containing the image */
  docId: string;
  /** Image path/reference */
  imagePath: string;
  /** Action taken */
  action: "described" | "skipped" | "failed";
  /** Alt-text (if described) */
  altText?: string;
  /** Reason for skip/failure */
  message?: string;
};

// ── Image reference detection ─────────────────────────────────────────────────

type ImageRef = {
  /** Full match: ![alt](path) */
  fullMatch: string;
  /** Current alt text (may be empty) */
  altText: string;
  /** Image path from the reference */
  imagePath: string;
  /** Line number in the article */
  lineNumber: number;
};

const IMAGE_REF_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** Generic/placeholder alt texts that should be replaced */
const GENERIC_ALT_TEXTS = new Set([
  "",
  "image",
  "img",
  "figure",
  "diagram",
  "photo",
  "screenshot",
  "picture",
  "illustration",
  "graphic",
  "chart",
]);

function isGenericAlt(alt: string): boolean {
  return (
    GENERIC_ALT_TEXTS.has(alt.trim().toLowerCase()) ||
    /^figure\s*\d*$/i.test(alt.trim()) ||
    /^image\s*\d*$/i.test(alt.trim())
  );
}

function extractImageRefs(body: string): ImageRef[] {
  const refs: ImageRef[] = [];
  const lines = body.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpExecArray | null;
    const re = new RegExp(IMAGE_REF_RE.source, "g");
    while ((match = re.exec(line)) !== null) {
      refs.push({
        fullMatch: match[0],
        altText: match[1] ?? "",
        imagePath: match[2] ?? "",
        lineNumber: i + 1,
      });
    }
  }

  return refs;
}

// ── Image MIME type detection ─────────────────────────────────────────────────

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

function getImageMimeType(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return IMAGE_EXTENSIONS[ext] ?? null;
}

// ── Vision Pass Engine ────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are an image description expert for a technical knowledge base.
Given an image from a KB article, generate a concise but informative alt-text description.

Rules:
1. Describe WHAT the image shows (diagram, chart, screenshot, etc.)
2. Include key technical details visible in the image
3. For architecture diagrams: name the components and data flow
4. For charts/graphs: describe the axes, trend, and key data points
5. For code screenshots: describe the language and what the code does
6. For mathematical figures: describe the equation or relationship shown
7. Keep it under 2 sentences (max ~150 characters)
8. Do NOT start with "This image shows" — just describe the content directly
9. Output ONLY the alt-text, nothing else`;

/**
 * Run the vision pass over all compiled articles.
 *
 * @example
 * ```ts
 * const vision = makeKBVisionClient()
 * const result = await runVisionPass(vision, compiledDir)
 * console.log(`Described ${result.described} images`)
 * ```
 */
export async function runVisionPass(
  visionFn: VisionCallFn,
  compiledDir: string,
  options: VisionPassOptions = {},
): Promise<VisionPassResult> {
  const startMs = Date.now();
  const maxImages = options.maxImages ?? 50;
  const minBytes = options.minImageBytes ?? 1024;
  const emit = options.onProgress ?? (() => {});

  // Collect all image references needing descriptions
  const mdFiles = await scanMarkdownFiles(compiledDir);
  const candidates: Array<{ docId: string; filePath: string; ref: ImageRef }> = [];

  for (const filePath of mdFiles) {
    const raw = await readFile(filePath, "utf-8");
    const relPath = relative(compiledDir, filePath);
    const docId = relPath.replace(/\\/g, "/").replace(/\.md$/, "");

    const refs = extractImageRefs(raw);
    for (const ref of refs) {
      if (isGenericAlt(ref.altText)) {
        candidates.push({ docId, filePath, ref });
      }
    }
  }

  emit({ type: "vision:start", totalImages: candidates.length });

  const details: VisionDetail[] = [];
  let llmCalls = 0;
  let imageIndex = 0;

  // Process up to maxImages
  const toProcess = candidates.slice(0, maxImages);

  // Group by file for batch writing
  const changesByFile = new Map<string, Array<{ ref: ImageRef; newAlt: string }>>();

  for (const candidate of toProcess) {
    imageIndex++;
    emit({
      type: "vision:processing",
      image: candidate.ref.imagePath,
      index: imageIndex,
      total: toProcess.length,
    });

    // Resolve image path relative to the article
    const articleDir = dirname(candidate.filePath);
    let imagePath: string;

    if (
      candidate.ref.imagePath.startsWith("http://") ||
      candidate.ref.imagePath.startsWith("https://")
    ) {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "skipped",
        message: "Remote images not supported — only local files",
      });
      emit({ type: "vision:skipped", image: candidate.ref.imagePath, reason: "remote URL" });
      continue;
    }

    imagePath = resolve(articleDir, candidate.ref.imagePath);

    // Check MIME type
    const mimeType = getImageMimeType(imagePath);
    if (!mimeType || mimeType === "image/svg+xml") {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "skipped",
        message:
          mimeType === "image/svg+xml"
            ? "SVG images need text extraction, not vision"
            : "Unsupported image format",
      });
      emit({
        type: "vision:skipped",
        image: candidate.ref.imagePath,
        reason: "unsupported format",
      });
      continue;
    }

    // P3: path traversal guard — image path comes from article markup content.
    // An article containing ![img](../../../etc/passwd) would exfiltrate the
    // file via base64 encoding to the vision LLM API without this check.
    if (!imagePath.startsWith(compiledDir + "/") && !imagePath.startsWith(compiledDir + "\\")) {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "skipped",
        message: `Image path escapes compiledDir: ${candidate.ref.imagePath}`,
      });
      continue;
    }

    // P4: check image size BEFORE reading — cap at 10MB to prevent OOM and
    // oversized base64 payloads being sent to the vision API.
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    let imageSize: number;
    try {
      imageSize = (await stat(imagePath)).size;
    } catch {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "failed",
        message: `Image file not found: ${imagePath}`,
      });
      continue;
    }
    if (imageSize > MAX_IMAGE_BYTES) {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "skipped",
        message: `Image too large (${imageSize} bytes > ${MAX_IMAGE_BYTES} limit)`,
      });
      emit({ type: "vision:skipped", image: candidate.ref.imagePath, reason: "too large" });
      continue;
    }

    // Read and check minimum size
    let imageBuffer: Buffer;
    try {
      imageBuffer = await readFile(imagePath);
    } catch {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "failed",
        message: `Could not read image: ${imagePath}`,
      });
      continue;
    }

    if (imageBuffer.length < minBytes) {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "skipped",
        message: `Image too small (${imageBuffer.length} bytes < ${minBytes} minimum)`,
      });
      emit({ type: "vision:skipped", image: candidate.ref.imagePath, reason: "too small" });
      continue;
    }

    // Call vision LLM
    try {
      const altText = await visionFn({
        system: VISION_SYSTEM_PROMPT,
        user: `Describe this image from a knowledge base article titled "${candidate.docId}". Generate a concise alt-text.`,
        imageBase64: imageBuffer.toString("base64"),
        imageMimeType: mimeType,
        temperature: 0.2,
        maxTokens: 256,
      });

      llmCalls++;

      const cleanAlt = altText
        .trim()
        .replace(/^["']|["']$/g, "")
        .slice(0, 300);

      if (cleanAlt && !isGenericAlt(cleanAlt)) {
        const changes = changesByFile.get(candidate.filePath) ?? [];
        changes.push({ ref: candidate.ref, newAlt: cleanAlt });
        changesByFile.set(candidate.filePath, changes);

        details.push({
          docId: candidate.docId,
          imagePath: candidate.ref.imagePath,
          action: "described",
          altText: cleanAlt,
        });
        emit({ type: "vision:described", image: candidate.ref.imagePath, altText: cleanAlt });
      } else {
        details.push({
          docId: candidate.docId,
          imagePath: candidate.ref.imagePath,
          action: "skipped",
          message: "LLM returned generic/empty alt-text",
        });
      }
    } catch (err) {
      details.push({
        docId: candidate.docId,
        imagePath: candidate.ref.imagePath,
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Apply changes
  if (!options.dryRun) {
    for (const [filePath, changes] of changesByFile) {
      let content = await readFile(filePath, "utf-8");
      for (const { ref, newAlt } of changes) {
        const newRef = `![${newAlt}](${ref.imagePath})`;
        // P5a: split/join replaces ALL occurrences of the same image ref.
        // String.replace(str, str) only replaces the first — identical images
        // appearing twice would keep their generic alt-text and re-trigger
        // the vision pass on every subsequent run.
        content = content.split(ref.fullMatch).join(newRef);
      }
      // P5b: atomicWriteFile instead of writeFile to prevent half-written
      // articles on crash (same fix as heal.ts/N3 and fixer.ts/M1).
      await atomicWriteFile(filePath, content);
    }
  }

  const result: VisionPassResult = {
    described: details.filter((d) => d.action === "described").length,
    skipped: details.filter((d) => d.action === "skipped").length,
    failed: details.filter((d) => d.action === "failed").length,
    llmCalls,
    details,
    durationMs: Date.now() - startMs,
  };

  emit({ type: "vision:complete", result });
  return result;
}

// ── File system helpers ───────────────────────────────────────────────────────

async function scanMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const s = await stat(full);
      if (s.isDirectory()) files.push(...(await scanMarkdownFiles(full)));
      else if (s.isFile() && entry.endsWith(".md")) files.push(full);
    }
  } catch {
    /* dir may not exist */
  }
  return files.sort();
}
