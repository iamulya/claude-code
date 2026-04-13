#!/usr/bin/env node

// YAAF CLI entry point
// This file is the bin target for `npx yaaf` / `yaaf` commands.
// It loads the compiled CLI from dist/cli/index.js

import('../dist/cli/index.js').catch((err) => {
  // If dist doesn't exist, try loading from src with tsx
  import('node:child_process').then(({ execSync }) => {
    const args = process.argv.slice(2).join(' ')
    try {
      execSync(`npx tsx src/cli/index.ts ${args}`, {
        cwd: new URL('..', import.meta.url).pathname,
        stdio: 'inherit',
      })
    } catch {
      console.error('Failed to start YAAF CLI. Run `npm run build` first, or install tsx.')
      process.exit(1)
    }
  })
})
