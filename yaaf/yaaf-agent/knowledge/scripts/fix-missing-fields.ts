#!/usr/bin/env tsx
/**
 * Backfill missing required frontmatter fields in compiled articles.
 * Reads the lint report, patches articles in-place, and reports stats.
 */
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const kbDir = join(import.meta.dirname!, "..");
const compiledDir = join(kbDir, "compiled");

// Simple frontmatter parser
function parseFm(content: string): { fm: Record<string, string>, body: string, raw: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: content, raw: content };
  const fm: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (kv) fm[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, "").trim();
  }
  return { fm, body: match[2] ?? "", raw: content };
}

// Insert a field before the closing --- in frontmatter
function insertField(content: string, field: string, value: string): string {
  // Find the second --- (closing delimiter)
  const firstEnd = content.indexOf("\n---");
  if (firstEnd === -1) return content;
  const insertPos = firstEnd;
  return content.slice(0, insertPos) + `\n${field}: ${value}` + content.slice(insertPos);
}

async function main() {
  const lintReport = JSON.parse(await readFile(join(kbDir, ".kb-lint-report.json"), "utf-8"));
  const issues = lintReport.issues.filter((i: any) => i.code === "MISSING_REQUIRED_FIELD");
  
  // Group by docId
  const byDoc = new Map<string, string[]>();
  for (const issue of issues) {
    const list = byDoc.get(issue.docId) ?? [];
    list.push(issue.field);
    byDoc.set(issue.docId, list);
  }

  let fixed = 0;
  let skipped = 0;

  for (const [docId, fields] of byDoc) {
    const filePath = join(compiledDir, `${docId}.md`);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      skipped++;
      continue;
    }
    const { fm, body } = parseFm(content);
    let modified = content;

    for (const field of fields) {
      // Check if field already exists (might have been added)
      if (fm[field] && fm[field] !== "") continue;

      let value: string;
      switch (field) {
        case "summary": {
          // Extract first meaningful sentence from body
          const firstLine = body
            .split("\n")
            .map(l => l.trim())
            .filter(l => l && !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("-") && !l.startsWith("|"))
            [0] ?? "";
          value = firstLine.slice(0, 200).replace(/"/g, "'");
          if (!value) value = `API reference for ${fm.title ?? docId}`;
          // Quote the value
          value = `"${value}"`;
          break;
        }
        case "export_name": {
          value = fm.title ?? docId.split("/").pop() ?? "";
          break;
        }
        case "source_file": {
          // Infer from title: AgentRunner -> src/agent-runner.ts
          const title = fm.title ?? "";
          const slug = title
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          value = `src/${slug}.ts`;
          break;
        }
        case "category": {
          // Default to type for unknown, infer from export_name patterns
          const title = fm.title ?? "";
          if (/^(I[A-Z]|[A-Z][a-z]+able)/.test(title)) value = "interface";
          else if (/^(create|make|build|parse|load|extract|generate|init|with)/.test(title)) value = "function";
          else if (/^[A-Z][a-z]+[A-Z]/.test(title) && /Config|Options|Result|Event|Context|Params|Response|Request|Payload/.test(title)) value = "type";
          else if (/^[A-Z][a-z]+[A-Z]/.test(title)) value = "class";
          else value = "type";
          break;
        }
        case "primary_files": {
          value = "[]";
          break;
        }
        default:
          continue;
      }

      modified = insertField(modified, field, value);
      fixed++;
    }

    if (modified !== content) {
      await writeFile(filePath, modified);
    }
  }

  console.log(`Fixed ${fixed} missing fields across ${byDoc.size} articles (${skipped} files not found)`);
}

main().catch(console.error);
