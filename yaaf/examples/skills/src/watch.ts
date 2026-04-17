/**
 * Skills Hot-Reload Example — SkillRegistry.watch()
 *
 * This example demonstrates the SkillRegistry's file-watching capability.
 * When a skill file is created, modified, or deleted in the watched directory,
 * the registry automatically hot-reloads it — no restart required.
 *
 * Run:
 *   npm run watch
 *
 * Then in another terminal:
 *   echo '---\nname: test-skill\n---\n# Hello\nI am a test.' > skills/test-skill.md
 *   # → Watch output: "✅ Loaded: test-skill"
 *
 *   rm skills/test-skill.md
 *   # → Watch output: "❌ Removed: test-skill"
 */

import { SkillRegistry } from 'yaaf';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

console.log('╔════════════════════════════════════════════════════╗');
console.log('║  Skills Hot-Reload Watcher                        ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const registry = new SkillRegistry({
  onLoad: (skill) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`  [${timestamp}] ✅ Loaded/Updated: "${skill.name}"  (${skill.instructions.length} chars)`);
    if (skill.description) console.log(`              ${skill.description}`);
  },
  onRemove: (name) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`  [${timestamp}] ❌ Removed: "${name}"`);
  },
  onError: (error, filePath) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`  [${timestamp}] ⚠️  Error: ${error.message} (${path.basename(filePath)})`);
  },
});

// Load initial skills
await registry.loadDir(SKILLS_DIR);
console.log(`Loaded ${registry.list().length} initial skills.\n`);

// Start watching
await registry.watch([SKILLS_DIR]);
console.log(`Watching ${SKILLS_DIR} for changes...`);
console.log('Create, modify, or delete .md files in that directory.\n');
console.log('Examples:');
console.log(`  echo '---\\nname: test\\n---\\n# Test' > ${path.relative(process.cwd(), SKILLS_DIR)}/test.md`);
console.log(`  rm ${path.relative(process.cwd(), SKILLS_DIR)}/test.md\n`);
console.log('Press Ctrl+C to stop.\n');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\nStopping watcher...');
  registry.stopWatching();
  console.log(`Final skill count: ${registry.list().length}`);
  process.exit(0);
});

// Periodic status
setInterval(() => {
  const names = registry.list().map(s => s.name).join(', ');
  console.log(`  [status] ${registry.list().length} skills: ${names}`);
}, 15_000);
