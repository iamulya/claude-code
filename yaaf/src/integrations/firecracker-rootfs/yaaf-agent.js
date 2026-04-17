#!/usr/bin/env node
/**
 * YAAF Guest Execution Agent — runs INSIDE the Firecracker microVM.
 *
 * This script is the counterpart to FirecrackerSandboxBackend on the host.
 * It receives serialized tool functions over stdin (bridged from vsock by socat),
 * executes them, and writes results to stdout (bridged back to the host).
 *
 * ## Deployment
 * Copy this file to `/usr/local/bin/yaaf-agent.js` inside the rootfs image.
 * Your init system (or `/etc/rc.local`) should run:
 *
 *   socat VSOCK-LISTEN:{VSOCK_PORT},fork EXEC:"node /usr/local/bin/yaaf-agent.js"
 *
 * Where {VSOCK_PORT} matches FirecrackerSandboxConfig.vsockPort (default: 52).
 *
 * ## Security behaviour
 * - Network: not configured (no NIC attached to the VM) → all net calls hang/fail
 * - Filesystem: rootfs is read-only → persistent writes fail silently
 * - Memory: limited to VM's memSizeMib → OOM kill on excessive allocation
 * - CPU: limited to VM's vcpuCount → no host CPU starvation
 *
 * @see src/integrations/sandbox.firecracker.ts (host-side backend)
 */

'use strict'

// ── Globals ──────────────────────────────────────────────────────────────────

process.stdin.setEncoding('utf8')
process.stdout.setDefaultEncoding('utf8')

// Prevent the process from exiting before each call completes.
// socat's fork mode gives each connection a fresh child process, so we only
// ever handle one call per process lifetime.
let buf = ''

// ── Message handler ───────────────────────────────────────────────────────────

process.stdin.on('data', (chunk) => {
  buf += chunk

  // Messages are newline-delimited JSON.
  // Buffer until we receive a complete message (ends with '\n').
  const nl = buf.indexOf('\n')
  if (nl === -1) return   // incomplete — keep buffering

  const jsonStr = buf.slice(0, nl).trim()
  buf = buf.slice(nl + 1)

  handleMessage(jsonStr)
})

process.stdin.on('end', () => {
  // Host closed the channel — nothing more to do.
  process.exit(0)
})

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Parse a message, execute the tool function, and write the result to stdout.
 *
 * @param {string} jsonStr - Raw JSON string from the host.
 */
async function handleMessage(jsonStr) {
  let msg
  try {
    msg = JSON.parse(jsonStr)
  } catch (e) {
    writeError('__unknown__', `Failed to parse message: ${e.message}`)
    return
  }

  const { id, fnSrc, args } = msg

  if (!id || typeof fnSrc !== 'string' || typeof args !== 'object') {
    writeError(id ?? '__unknown__', 'Invalid message format: expected { id, fnSrc, args }')
    return
  }

  try {
    // Reconstruct the tool function from its source text.
    // new Function() is intentional here — this is the execution sandbox.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${fnSrc})`)()

    if (typeof fn !== 'function') {
      writeError(id, `fnSrc did not evaluate to a function (got ${typeof fn})`)
      return
    }

    const result = await fn(args)
    writeSuccess(id, result)
  } catch (e) {
    writeError(id, e?.message ?? String(e))
  }
}

// ── Response writers ──────────────────────────────────────────────────────────

/**
 * Write a success response to stdout.
 * @param {string} id
 * @param {unknown} result
 */
function writeSuccess(id, result) {
  const response = JSON.stringify({ id, ok: true, result })
  process.stdout.write(response + '\n')
}

/**
 * Write an error response to stdout.
 * @param {string} id
 * @param {string} error
 */
function writeError(id, error) {
  const response = JSON.stringify({ id, ok: false, error })
  process.stdout.write(response + '\n')
}
