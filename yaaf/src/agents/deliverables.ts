/**
 * Deliverables — Structured output artifacts API (Gap #6)
 *
 * A session-scoped filesystem for agent output artifacts with metadata.
 * Each deliverable has an ID, filename, MIME type, and description.
 *
 * Deliverables are stored in `.yaaf/deliverables/{sessionId}/` with a
 * manifest file for metadata. Files persist across interactions within
 * a session.
 *
 * @example
 * ```ts
 * const deliverables = new Deliverables('my-session');
 *
 * // Add a deliverable by content
 * await deliverables.add('report.csv', csvContent, {
 *   description: 'Q1 revenue report',
 *   mimeType: 'text/csv',
 * });
 *
 * // Add a deliverable from an existing file
 * await deliverables.addFile('/tmp/chart.png', {
 *   description: 'Revenue chart',
 * });
 *
 * // List all deliverables
 * console.log(deliverables.list());
 *
 * // Read content back
 * const content = await deliverables.read(deliverables.list()[0].id);
 * ```
 *
 * @module agents/deliverables
 */

import * as crypto from "crypto";
import * as fsp from "fs/promises";
import * as path from "path";
import { Logger } from "../utils/logger.js";

const logger = new Logger("deliverables");

// ── Types ────────────────────────────────────────────────────────────────────

/** Metadata for a single deliverable */
export type Deliverable = {
  /** Unique deliverable ID */
  id: string;
  /** Human-readable filename (e.g., 'report.csv') */
  filename: string;
  /** MIME type (auto-detected or explicitly specified) */
  mimeType: string;
  /** Size in bytes */
  sizeBytes: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** Optional human-readable description */
  description?: string;
  /** Agent that produced this deliverable */
  agentName?: string;
  /** Absolute path to the stored file */
  path: string;
};

/** Options for adding a deliverable */
export type AddDeliverableOptions = {
  /** MIME type (auto-detected from extension if not provided) */
  mimeType?: string;
  /** Description of the deliverable */
  description?: string;
  /** Agent name that produced this */
  agentName?: string;
};

// ── MIME detection ───────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
};

function detectMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

// ── Deliverables ─────────────────────────────────────────────────────────────

/**
 * Session-scoped deliverables store.
 *
 * Manages output artifacts with metadata, stored in a session-scoped
 * directory. Each deliverable gets a unique ID and is tracked in a
 * manifest for listing and retrieval.
 */
export class Deliverables {
  private readonly baseDir: string;
  private manifest: Deliverable[] = [];
  private _initialized = false;

  /**
   * Create a deliverables store for a specific session.
   *
   * @param sessionId The session this store belongs to
   * @param baseDir Base directory for all deliverables
   *        (default: `{cwd}/.yaaf/deliverables`)
   */
  constructor(
    readonly sessionId: string,
    baseDir?: string,
  ) {
    // Validate sessionId to prevent path traversal
    if (!sessionId || /[/\\]/.test(sessionId) || sessionId.includes("..")) {
      throw new Error(
        `Invalid sessionId "${sessionId}": must not contain path separators or ".."`,
      );
    }
    this.baseDir = path.join(
      baseDir ?? path.join(process.cwd(), ".yaaf", "deliverables"),
      sessionId,
    );
  }

  /**
   * Ensure the base directory exists.
   */
  private async init(): Promise<void> {
    if (this._initialized) return;
    await fsp.mkdir(this.baseDir, { recursive: true });
    // Load existing manifest if present
    try {
      const raw = await fsp.readFile(
        path.join(this.baseDir, "manifest.json"),
        "utf8",
      );
      this.manifest = JSON.parse(raw) as Deliverable[];
    } catch {
      // No existing manifest — start fresh
    }
    this._initialized = true;
  }

  /**
   * Persist the manifest to disk.
   */
  private async saveManifest(): Promise<void> {
    await fsp.writeFile(
      path.join(this.baseDir, "manifest.json"),
      JSON.stringify(this.manifest, null, 2),
      "utf8",
    );
  }

  /**
   * Add a deliverable by content (string or Buffer).
   *
   * @param filename Human-readable filename for the deliverable
   * @param content The content to store
   * @param options Additional metadata
   * @returns The created Deliverable record
   */
  async add(
    filename: string,
    content: string | Buffer,
    options?: AddDeliverableOptions,
  ): Promise<Deliverable> {
    await this.init();

    // Sanitize filename — strip path components, reject null bytes
    filename = path.basename(filename);
    if (!filename || filename.includes("\0")) {
      throw new Error(`Invalid filename: must be a non-empty basename without null bytes`);
    }

    const id = crypto.randomUUID();
    const ext = path.extname(filename);
    const storedName = `${id}${ext}`;
    const storedPath = path.join(this.baseDir, storedName);

    // Write the content
    if (typeof content === "string") {
      await fsp.writeFile(storedPath, content, "utf8");
    } else {
      await fsp.writeFile(storedPath, content);
    }

    const stat = await fsp.stat(storedPath);

    const deliverable: Deliverable = {
      id,
      filename,
      mimeType: options?.mimeType ?? detectMimeType(filename),
      sizeBytes: stat.size,
      createdAt: new Date().toISOString(),
      description: options?.description,
      agentName: options?.agentName,
      path: storedPath,
    };

    this.manifest.push(deliverable);
    await this.saveManifest();

    logger.info(`Added deliverable: ${filename} (${id})`);
    return deliverable;
  }

  /**
   * Add a deliverable by copying an existing file.
   *
   * @param sourcePath Path to the source file
   * @param options Additional metadata (filename defaults to source basename)
   * @returns The created Deliverable record
   */
  async addFile(
    sourcePath: string,
    options?: AddDeliverableOptions & { filename?: string },
  ): Promise<Deliverable> {
    await this.init();

    const resolvedSource = path.resolve(sourcePath);

    // Security: validate the source path exists and is a regular file.
    // (We don't restrict to a project root because the framework may
    // legitimately need to copy from temp directories, but we do reject
    // nonexistent paths and directories.)
    const stat = await fsp.stat(resolvedSource);
    if (!stat.isFile()) {
      throw new Error(`Source path is not a regular file: ${resolvedSource}`);
    }

    let filename = options?.filename ?? path.basename(resolvedSource);

    // Sanitize filename
    filename = path.basename(filename);
    if (!filename || filename.includes("\0")) {
      throw new Error(`Invalid filename: must be a non-empty basename without null bytes`);
    }
    const id = crypto.randomUUID();
    const ext = path.extname(filename);
    const storedName = `${id}${ext}`;
    const storedPath = path.join(this.baseDir, storedName);

    // Copy the file
    await fsp.copyFile(resolvedSource, storedPath);
    const fileStat = await fsp.stat(storedPath);

    const deliverable: Deliverable = {
      id,
      filename,
      mimeType: options?.mimeType ?? detectMimeType(filename),
      sizeBytes: fileStat.size,
      createdAt: new Date().toISOString(),
      description: options?.description,
      agentName: options?.agentName,
      path: storedPath,
    };

    this.manifest.push(deliverable);
    await this.saveManifest();

    logger.info(`Added deliverable from file: ${filename} (${id})`);
    return deliverable;
  }

  /**
   * List all deliverables in this session.
   */
  list(): readonly Deliverable[] {
    return [...this.manifest];
  }

  /**
   * Get a deliverable by ID.
   *
   * @param id Deliverable ID
   * @returns The Deliverable record, or undefined if not found
   */
  get(id: string): Deliverable | undefined {
    return this.manifest.find((d) => d.id === id);
  }

  /**
   * Read deliverable content as a Buffer.
   *
   * @param id Deliverable ID
   * @returns The file content as a Buffer
   * @throws If the deliverable is not found
   */
  async read(id: string): Promise<Buffer> {
    const deliverable = this.get(id);
    if (!deliverable) {
      throw new Error(`Deliverable not found: ${id}`);
    }
    return fsp.readFile(deliverable.path);
  }

  /**
   * Read deliverable content as a string (UTF-8).
   *
   * @param id Deliverable ID
   * @returns The file content as a string
   * @throws If the deliverable is not found
   */
  async readText(id: string): Promise<string> {
    const deliverable = this.get(id);
    if (!deliverable) {
      throw new Error(`Deliverable not found: ${id}`);
    }
    return fsp.readFile(deliverable.path, "utf8");
  }

  /**
   * Remove a deliverable.
   *
   * @param id Deliverable ID to remove
   * @returns true if found and removed, false if not found
   */
  async remove(id: string): Promise<boolean> {
    const idx = this.manifest.findIndex((d) => d.id === id);
    if (idx === -1) return false;

    const deliverable = this.manifest[idx]!;

    // Remove the file
    try {
      await fsp.unlink(deliverable.path);
    } catch {
      /* already gone */
    }

    // Remove from manifest
    this.manifest.splice(idx, 1);
    await this.saveManifest();

    logger.info(`Removed deliverable: ${deliverable.filename} (${id})`);
    return true;
  }

  /** Total number of deliverables */
  get count(): number {
    return this.manifest.length;
  }

  /** Total size of all deliverables in bytes */
  get totalSizeBytes(): number {
    return this.manifest.reduce((sum, d) => sum + d.sizeBytes, 0);
  }
}
