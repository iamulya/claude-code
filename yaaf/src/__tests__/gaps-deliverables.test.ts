/**
 * Tests for Gap #6 (Files API / Deliverables)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Deliverables } from "../agents/deliverables.js";

let testDir: string;
let deliverables: Deliverables;

describe("Gap #6: Deliverables", () => {
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `yaaf-deliverables-test-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
    deliverables = new Deliverables("test-session", testDir);
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("add() creates a deliverable from string content", async () => {
    const d = await deliverables.add("report.csv", "col1,col2\na,b\n", {
      description: "Test report",
      mimeType: "text/csv",
    });

    expect(d.id).toBeDefined();
    expect(d.filename).toBe("report.csv");
    expect(d.mimeType).toBe("text/csv");
    expect(d.sizeBytes).toBeGreaterThan(0);
    expect(d.description).toBe("Test report");
    expect(d.createdAt).toBeDefined();

    // File actually exists
    const content = await fsp.readFile(d.path, "utf8");
    expect(content).toBe("col1,col2\na,b\n");
  });

  it("add() creates a deliverable from Buffer content", async () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const d = await deliverables.add("image.png", buf);

    expect(d.filename).toBe("image.png");
    expect(d.mimeType).toBe("image/png");
    expect(d.sizeBytes).toBe(4);
  });

  it("auto-detects MIME type from extension", async () => {
    const d1 = await deliverables.add("data.json", "{}");
    expect(d1.mimeType).toBe("application/json");

    const d2 = await deliverables.add("styles.css", "body {}");
    expect(d2.mimeType).toBe("text/css");

    const d3 = await deliverables.add("readme.md", "# Hello");
    expect(d3.mimeType).toBe("text/markdown");

    const d4 = await deliverables.add("unknown.xyz", "data");
    expect(d4.mimeType).toBe("application/octet-stream");
  });

  it("list() returns all deliverables", async () => {
    await deliverables.add("file1.txt", "content1");
    await deliverables.add("file2.txt", "content2");
    await deliverables.add("file3.txt", "content3");

    const list = deliverables.list();
    expect(list.length).toBe(3);
    expect(list.map((d) => d.filename)).toEqual([
      "file1.txt",
      "file2.txt",
      "file3.txt",
    ]);
  });

  it("get() returns a specific deliverable by ID", async () => {
    const d = await deliverables.add("target.txt", "target content");

    const found = deliverables.get(d.id);
    expect(found).toBeDefined();
    expect(found!.filename).toBe("target.txt");
  });

  it("get() returns undefined for unknown ID", () => {
    expect(deliverables.get("unknown-id")).toBeUndefined();
  });

  it("read() returns file content as Buffer", async () => {
    const d = await deliverables.add("data.txt", "hello world");
    const content = await deliverables.read(d.id);
    expect(content.toString("utf8")).toBe("hello world");
  });

  it("readText() returns file content as string", async () => {
    const d = await deliverables.add("text.txt", "text content");
    const content = await deliverables.readText(d.id);
    expect(content).toBe("text content");
  });

  it("read() throws for unknown ID", async () => {
    await expect(deliverables.read("unknown")).rejects.toThrow("Deliverable not found");
  });

  it("remove() deletes a deliverable", async () => {
    const d = await deliverables.add("to-delete.txt", "temporary");
    expect(deliverables.count).toBe(1);

    const removed = await deliverables.remove(d.id);
    expect(removed).toBe(true);
    expect(deliverables.count).toBe(0);

    // File is actually deleted
    await expect(fsp.access(d.path)).rejects.toThrow();
  });

  it("remove() returns false for unknown ID", async () => {
    const removed = await deliverables.remove("unknown");
    expect(removed).toBe(false);
  });

  it("addFile() copies an existing file", async () => {
    const sourcePath = path.join(testDir, "source.txt");
    await fsp.writeFile(sourcePath, "source content");

    const d = await deliverables.addFile(sourcePath, {
      description: "Copied file",
    });

    expect(d.filename).toBe("source.txt");
    expect(d.description).toBe("Copied file");

    // Content matches
    const content = await deliverables.readText(d.id);
    expect(content).toBe("source content");

    // Source file is not modified (it's a copy, not a move)
    const sourceContent = await fsp.readFile(sourcePath, "utf8");
    expect(sourceContent).toBe("source content");
  });

  it("count and totalSizeBytes track correctly", async () => {
    expect(deliverables.count).toBe(0);
    expect(deliverables.totalSizeBytes).toBe(0);

    await deliverables.add("a.txt", "aaaa"); // 4 bytes
    await deliverables.add("b.txt", "bb"); // 2 bytes

    expect(deliverables.count).toBe(2);
    expect(deliverables.totalSizeBytes).toBe(6);
  });

  it("manifest persists across instances", async () => {
    // Add deliverables
    await deliverables.add("persist.txt", "persistent content");

    // Create a new Deliverables instance for the same session
    // Note: we need to call init() by doing an operation
    const deliverables2 = new Deliverables("test-session", testDir);
    // Force init by listing
    await deliverables2.add("second.txt", "more content");

    expect(deliverables2.count).toBe(2);
    const names = deliverables2.list().map((d) => d.filename);
    expect(names).toContain("persist.txt");
    expect(names).toContain("second.txt");
  });

  it("rejects sessionId with path traversal", () => {
    expect(() => new Deliverables("../../../etc")).toThrow("Invalid sessionId");
    expect(() => new Deliverables("test/../../bad")).toThrow("Invalid sessionId");
    expect(() => new Deliverables("test\\bad")).toThrow("Invalid sessionId");
  });

  it("sessionId is exposed as readonly", () => {
    const d = new Deliverables("my-session");
    expect(d.sessionId).toBe("my-session");
  });
});
