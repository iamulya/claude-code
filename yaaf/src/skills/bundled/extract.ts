/**
 * Skills — Bundled Skill File Extraction.
 *
 * Extracts reference files packed into bundled skills (via `Skill.files`)
 * to a secure temporary directory. The extracted directory becomes the
 * `${SKILL_DIR}` for variable substitution.
 *
 * Security model:
 * - Uses `O_EXCL` to prevent overwriting existing files (race protection)
 * - Uses restrictive permissions (0o700 dirs, 0o600 files)
 * - Validates against path traversal (`..`, absolute paths)
 * - Uses a random nonce in the temp path to prevent predictable paths
 *
 * @module skills/bundled/extract
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

/**
 * Extract bundled skill files to a secure temporary directory.
 *
 * @param skillName - Name of the skill (used as subdirectory name)
 * @param files - Map of relative paths to file contents
 * @returns Absolute path to the extracted directory (the new SKILL_DIR)
 *
 * @throws Error if any file path contains traversal (`..`) or is absolute
 */
export async function extractBundledSkillFiles(
  skillName: string,
  files: Record<string, string>,
): Promise<string> {
  // Sanitize skill name — remove any path separators or dots
  const safeName = skillName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const nonce = crypto.randomBytes(8).toString("hex");
  const baseDir = path.join(os.tmpdir(), "yaaf-skills", nonce, safeName);

  await fs.promises.mkdir(baseDir, { recursive: true, mode: 0o700 });

  for (const [relativePath, content] of Object.entries(files)) {
    // Validate: no path traversal
    if (relativePath.includes("..")) {
      throw new Error(`Invalid bundled skill file path (traversal): ${relativePath}`);
    }
    // Validate: no absolute paths
    if (path.isAbsolute(relativePath)) {
      throw new Error(`Invalid bundled skill file path (absolute): ${relativePath}`);
    }
    // Validate: no empty paths
    if (!relativePath.trim()) {
      throw new Error("Invalid bundled skill file path (empty)");
    }

    const fullPath = path.join(baseDir, relativePath);

    // Verify the resolved path is still within baseDir (defense in depth)
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(baseDir)) {
      throw new Error(`Invalid bundled skill file path (escape): ${relativePath}`);
    }

    // Create intermediate directories if needed
    const dir = path.dirname(fullPath);
    if (dir !== baseDir) {
      await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    }

    // Write file with O_EXCL to prevent overwriting (race protection)
    const fd = await fs.promises.open(
      fullPath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      0o600,
    );
    try {
      await fd.writeFile(content, "utf8");
    } finally {
      await fd.close();
    }
  }

  return baseDir;
}

/**
 * Clean up an extracted skill directory.
 * Safe to call even if the directory doesn't exist.
 */
export async function cleanupExtractedSkillFiles(extractedDir: string): Promise<void> {
  // Only clean up directories under our expected temp prefix
  const expectedPrefix = path.join(os.tmpdir(), "yaaf-skills");
  if (!path.resolve(extractedDir).startsWith(expectedPrefix)) return;

  try {
    await fs.promises.rm(extractedDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors — these are temp files
  }
}
