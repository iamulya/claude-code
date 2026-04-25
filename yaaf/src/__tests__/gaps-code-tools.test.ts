/**
 * Tests for Gap #4: Built-in Code Tools
 *
 * Tests cover:
 * - readFile: basic read, line ranges, binary detection
 * - writeFile: create file, create directories
 * - editFile: search-and-replace, replaceAll, missing search text
 * - bash: execution, timeout handling
 * - glob: pattern matching, limit
 * - grep: literal search, regex, case-insensitive, file extension filter
 * - webFetch: SSRF protection (private IPs, file://, loopback)
 * - codeToolset: factory, disable option
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";
import { readFileTool } from "../tools/code/readFile.js";
import { writeFileTool } from "../tools/code/writeFile.js";
import { editFileTool } from "../tools/code/editFile.js";
import { bashTool } from "../tools/code/bash.js";
import { globTool } from "../tools/code/glob.js";
import { grepTool } from "../tools/code/grep.js";
import { webFetchTool } from "../tools/code/webFetch.js";
import { codeToolset } from "../tools/code/index.js";
import type { ToolContext } from "../tools/tool.js";

// ── Test Helpers ─────────────────────────────────────────────────────────────

let testDir: string;

/** Minimal ToolContext for testing */
const ctx: ToolContext = {
  model: "test-model",
  tools: [],
  signal: new AbortController().signal,
  messages: [],
};

function testFile(name: string): string {
  return path.join(testDir, name);
}

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `yaaf-code-tools-test-${Date.now()}`);
  await fsp.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await fsp.rm(testDir, { recursive: true, force: true });
});

// ── readFile ─────────────────────────────────────────────────────────────────

describe("readFile tool", () => {
  it("reads file contents", async () => {
    await fsp.writeFile(testFile("hello.txt"), "hello world\nsecond line\n");
    const result = await readFileTool.call(
      { path: testFile("hello.txt") },
      ctx,
    );
    expect(result.data).toContain("hello world");
    expect(result.data).toContain("second line");
  });

  it("supports line range (startLine/endLine)", async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n");
    await fsp.writeFile(testFile("lines.txt"), lines);

    const result = await readFileTool.call(
      { path: testFile("lines.txt"), startLine: 3, endLine: 5 },
      ctx,
    );
    // Should only contain lines 3-5 with line numbers
    expect(result.data).toContain("3: line 3");
    expect(result.data).toContain("5: line 5");
    expect(result.data).not.toContain("line 1");
    expect(result.data).not.toContain("line 6");
  });

  it("detects binary files", async () => {
    await fsp.writeFile(testFile("binary.bin"), Buffer.from([0x00, 0x01, 0x02]));
    const result = await readFileTool.call(
      { path: testFile("binary.bin") },
      ctx,
    );
    expect(result.data).toContain("[Binary file:");
  });

  it("isReadOnly returns true", () => {
    expect(readFileTool.isReadOnly({} as never)).toBe(true);
  });

  it("delegates to sandbox readFile when available", async () => {
    const sandboxCtx: ToolContext = {
      ...ctx,
      readFile: async (p: string) => `sandbox content from ${path.basename(p)}`,
    };

    const result = await readFileTool.call(
      { path: "/sandbox/test.txt" },
      sandboxCtx,
    );
    expect(result.data).toContain("sandbox content from test.txt");
  });
});

// ── writeFile ────────────────────────────────────────────────────────────────

describe("writeFile tool", () => {
  it("creates a new file", async () => {
    await writeFileTool.call(
      { path: testFile("new.txt"), content: "Hello\nWorld\n" },
      ctx,
    );
    const content = await fsp.readFile(testFile("new.txt"), "utf8");
    expect(content).toBe("Hello\nWorld\n");
  });

  it("auto-creates parent directories", async () => {
    const deepPath = testFile("a/b/c/deep.txt");
    await writeFileTool.call(
      { path: deepPath, content: "deep content" },
      ctx,
    );
    const content = await fsp.readFile(deepPath, "utf8");
    expect(content).toBe("deep content");
  });

  it("returns line count in result", async () => {
    const result = await writeFileTool.call(
      { path: testFile("counted.txt"), content: "line1\nline2\nline3" },
      ctx,
    );
    expect(result.data).toContain("3 lines");
  });

  it("isReadOnly returns false", () => {
    expect(writeFileTool.isReadOnly({} as never)).toBe(false);
  });
});

// ── editFile ─────────────────────────────────────────────────────────────────

describe("editFile tool", () => {
  it("replaces first occurrence by default", async () => {
    await fsp.writeFile(testFile("edit.txt"), "foo bar foo baz");
    const result = await editFileTool.call(
      { path: testFile("edit.txt"), search: "foo", replace: "qux" },
      ctx,
    );
    expect(result.data).toContain("Replaced 1 occurrence");
    const content = await fsp.readFile(testFile("edit.txt"), "utf8");
    expect(content).toBe("qux bar foo baz"); // Only first "foo" replaced
  });

  it("replaces all occurrences when replaceAll is true", async () => {
    await fsp.writeFile(testFile("edit2.txt"), "foo bar foo baz foo");
    const result = await editFileTool.call(
      {
        path: testFile("edit2.txt"),
        search: "foo",
        replace: "qux",
        replaceAll: true,
      },
      ctx,
    );
    expect(result.data).toContain("Replaced 3 occurrence");
    const content = await fsp.readFile(testFile("edit2.txt"), "utf8");
    expect(content).toBe("qux bar qux baz qux");
  });

  it("returns error when search text not found", async () => {
    await fsp.writeFile(testFile("edit3.txt"), "hello world");
    const result = await editFileTool.call(
      { path: testFile("edit3.txt"), search: "nonexistent", replace: "x" },
      ctx,
    );
    expect(result.data).toContain("Search text not found");
  });

  it("treats $ literally in replacement (M-2 fix)", async () => {
    await fsp.writeFile(testFile("edit4.txt"), "price: PLACEHOLDER");
    await editFileTool.call(
      { path: testFile("edit4.txt"), search: "PLACEHOLDER", replace: "$100" },
      ctx,
    );
    const content = await fsp.readFile(testFile("edit4.txt"), "utf8");
    // Must be literally "$100", not the regex-expanded value of $1 + "00"
    expect(content).toBe("price: $100");
  });
});

// ── bash ─────────────────────────────────────────────────────────────────────

describe("bash tool", () => {
  const bash = bashTool(5000); // 5s timeout for tests

  it("executes a simple command", async () => {
    const result = await bash.call({ command: "echo hello" }, ctx);
    expect(result.data).toContain("hello");
    expect(result.data).toContain("exit code: 0");
  });

  it("captures stderr", async () => {
    const result = await bash.call({ command: "echo error >&2" }, ctx);
    expect(result.data).toContain("stderr:");
    expect(result.data).toContain("error");
  });

  it("reports non-zero exit code", async () => {
    const result = await bash.call({ command: "exit 42" }, ctx);
    expect(result.data).toContain("exit code:");
  });

  it("delegates to sandbox exec when available", async () => {
    const sandboxCtx: ToolContext = {
      ...ctx,
      exec: async (cmd: string) => ({
        stdout: `sandbox executed: ${cmd}`,
        stderr: "",
        exitCode: 0,
      }),
    };

    const result = await bash.call({ command: "ls -la" }, sandboxCtx);
    expect(result.data).toContain("sandbox executed: ls -la");
  });

  it("isDestructive returns true", () => {
    expect(bash.isDestructive({} as never)).toBe(true);
  });
});

// ── glob ─────────────────────────────────────────────────────────────────────

describe("glob tool", () => {
  beforeEach(async () => {
    // Create test file structure
    await fsp.writeFile(testFile("a.ts"), "");
    await fsp.writeFile(testFile("b.ts"), "");
    await fsp.writeFile(testFile("c.js"), "");
    await fsp.mkdir(testFile("sub"), { recursive: true });
    await fsp.writeFile(testFile("sub/d.ts"), "");
    await fsp.writeFile(testFile("sub/e.json"), "");
  });

  it("matches files by pattern", async () => {
    const result = await globTool.call(
      { pattern: "*.ts", cwd: testDir },
      ctx,
    );
    expect(result.data).toContain("a.ts");
    expect(result.data).toContain("b.ts");
    expect(result.data).not.toContain("c.js");
  });

  it("matches files recursively with **", async () => {
    const result = await globTool.call(
      { pattern: "**/*.ts", cwd: testDir },
      ctx,
    );
    // ** recursive match finds files in subdirectories
    expect(result.data).toContain("sub/d.ts");
  });

  it("respects limit", async () => {
    const result = await globTool.call(
      { pattern: "**/*", cwd: testDir, limit: 2 },
      ctx,
    );
    const lines = result.data.split("\n").filter((l: string) => l.trim() && !l.includes("truncated"));
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it("returns message when no matches found", async () => {
    const result = await globTool.call(
      { pattern: "*.xyz", cwd: testDir },
      ctx,
    );
    expect(result.data).toContain("No files found");
  });

  it("isReadOnly returns true", () => {
    expect(globTool.isReadOnly({} as never)).toBe(true);
  });
});

// ── grep ─────────────────────────────────────────────────────────────────────

describe("grep tool", () => {
  beforeEach(async () => {
    await fsp.writeFile(testFile("search.ts"), "const foo = 'bar';\nconst baz = 42;\n");
    await fsp.writeFile(testFile("other.py"), "def hello():\n    return 'world'\n");
    await fsp.mkdir(testFile("nested"), { recursive: true });
    await fsp.writeFile(testFile("nested/deep.ts"), "export const FOO = true;\n");
  });

  it("finds literal string matches", async () => {
    const result = await grepTool.call(
      { pattern: "foo", path: testDir },
      ctx,
    );
    expect(result.data).toContain("search.ts");
    expect(result.data).toContain("const foo");
  });

  it("searches with regex", async () => {
    const result = await grepTool.call(
      { pattern: "const\\s+\\w+\\s*=", path: testDir, isRegex: true },
      ctx,
    );
    expect(result.data).toContain("search.ts");
  });

  it("case-insensitive search", async () => {
    const result = await grepTool.call(
      { pattern: "FOO", path: testDir, caseInsensitive: true },
      ctx,
    );
    // Should match both "foo" in search.ts and "FOO" in nested/deep.ts
    expect(result.data).toContain("search.ts");
    expect(result.data).toContain("deep.ts");
  });

  it("filters by file extension", async () => {
    const result = await grepTool.call(
      { pattern: "return", path: testDir, include: ".py" },
      ctx,
    );
    expect(result.data).toContain("other.py");
    // Should not search .ts files
    expect(result.data).not.toContain("search.ts");
  });

  it("returns message when no matches", async () => {
    const result = await grepTool.call(
      { pattern: "zzzzzzzzz", path: testDir },
      ctx,
    );
    expect(result.data).toContain("No matches found");
  });

  it("rejects invalid regex gracefully", async () => {
    const result = await grepTool.call(
      { pattern: "[invalid(regex", path: testDir, isRegex: true },
      ctx,
    );
    expect(result.data).toContain("Invalid regex");
  });
});

// ── webFetch (SSRF protection) ───────────────────────────────────────────────

describe("webFetch tool (SSRF protection)", () => {
  const fetchTool = webFetchTool();

  it("blocks file:// URLs", async () => {
    const result = await fetchTool.call(
      { url: "file:///etc/passwd" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks loopback (127.0.0.1)", async () => {
    const result = await fetchTool.call(
      { url: "http://127.0.0.1/admin" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks localhost", async () => {
    const result = await fetchTool.call(
      { url: "http://localhost:3000/api" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks private IP 10.x.x.x", async () => {
    const result = await fetchTool.call(
      { url: "http://10.0.0.1/internal" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks private IP 172.16-31.x.x", async () => {
    const result = await fetchTool.call(
      { url: "http://172.16.0.1/internal" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks private IP 192.168.x.x", async () => {
    const result = await fetchTool.call(
      { url: "http://192.168.1.1/admin" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks link-local 169.254.x.x (cloud metadata)", async () => {
    const result = await fetchTool.call(
      { url: "http://169.254.169.254/latest/meta-data/" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks IPv6 loopback [::1]", async () => {
    const result = await fetchTool.call(
      { url: "http://[::1]:8080/api" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks FTP protocol", async () => {
    const result = await fetchTool.call(
      { url: "ftp://example.com/file" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks non-HTTP protocols", async () => {
    const result = await fetchTool.call(
      { url: "gopher://example.com" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("domain allowlist restricts to listed domains only", async () => {
    const restricted = webFetchTool(["api.github.com"]);
    const result = await restricted.call(
      { url: "https://evil.com/steal" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
    expect(result.data).toContain("not in the allowlist");
  });

  it("domain allowlist allows subdomains", async () => {
    const restricted = webFetchTool(["github.com"]);

    // Sub-domain should be allowed
    const resultSub = await restricted.call(
      { url: "https://api.github.com/repos" },
      ctx,
    );
    // This will fail with a network error (not "Blocked") since it's allowed through
    // the allowlist check but can't actually fetch in tests. That's fine —
    // the important thing is it's NOT blocked by the allowlist.
    expect(resultSub.data).not.toContain("not in the allowlist");
  });

  // ── SSRF bypass vectors (C-1 fix validation) ──

  it("blocks decimal IP (2130706433 = 127.0.0.1)", async () => {
    const result = await fetchTool.call(
      { url: "http://2130706433/" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks IPv4-mapped IPv6 (::ffff:127.0.0.1)", async () => {
    const result = await fetchTool.call(
      { url: "http://[::ffff:127.0.0.1]/" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks IPv4-mapped IPv6 private (::ffff:10.0.0.1)", async () => {
    const result = await fetchTool.call(
      { url: "http://[::ffff:10.0.0.1]/" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });

  it("blocks 0.0.0.0", async () => {
    const result = await fetchTool.call(
      { url: "http://0.0.0.0/" },
      ctx,
    );
    expect(result.data).toContain("Blocked");
  });
});

// ── codeToolset factory ──────────────────────────────────────────────────────

describe("codeToolset factory", () => {
  it("returns all 7 tools by default", () => {
    const tools = codeToolset();
    expect(tools.length).toBe(7);
    const names = tools.map((t) => t.name);
    expect(names).toContain("read_file");
    expect(names).toContain("write_file");
    expect(names).toContain("edit_file");
    expect(names).toContain("bash");
    expect(names).toContain("glob");
    expect(names).toContain("grep");
    expect(names).toContain("web_fetch");
  });

  it("disabled option removes specific tools", () => {
    const tools = codeToolset({ disabled: ["bash", "write_file", "edit_file"] });
    expect(tools.length).toBe(4);
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("bash");
    expect(names).not.toContain("write_file");
    expect(names).not.toContain("edit_file");
    expect(names).toContain("read_file"); // Still present
  });

  it("read-only toolset excludes destructive tools", () => {
    const tools = codeToolset({ disabled: ["bash", "write_file", "edit_file"] });
    for (const tool of tools) {
      // All remaining tools should be read-only
      expect(tool.isReadOnly({} as never)).toBe(true);
    }
  });
});
