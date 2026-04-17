/**
 * FirecrackerSandboxBackend — Firecracker microVM sandbox for YAAF tool execution.
 *
 * Provides maximum isolation for tool execution:
 * - Separate Linux kernel (KVM guest) — no shared address space with host
 * - No NIC by default — all network is blocked at the hypervisor level (UDP included)
 * - Ephemeral rootfs — guest filesystem changes are discarded after each call
 * - Hard kill on timeout — `dmesg` and process state cannot leak back
 *
 * ## Communication
 * Tool functions are serialized via `fn.toString()` and sent to a tiny Node.js agent
 * running inside the guest VM. Communication uses Firecracker's vsock device, which
 * maps a `AF_UNIX` socket on the host to an `AF_VSOCK` port inside the guest.
 * No network TAP device is required.
 *
 * ## Isolation tiers achieved
 * | Threat | This backend | Worker thread | Inline |
 * |--------------------------|:---:|:---:|:---:|
 * | TCP bypass | ✅ | ✅ | ⚠️ |
 * | UDP bypass | ✅ | ❌ | ❌ |
 * | Native addon bypass | ✅ | ❌ | ❌ |
 * | Kernel escape → host | ✅ | ❌ | ❌ |
 * | Filesystem access | ✅ | ❌ | ❌ |
 *
 * ## Requirements (Linux only)
 * - x86_64 or aarch64 CPU with hardware virtualization
 * - `/dev/kvm` readable (user in `kvm` group, or use `jailer`)
 * - `firecracker` binary on PATH or at `config.firecrackerBin`
 * - A pre-built rootfs image (ext4) with Node.js + socat + `yaaf-agent.js`
 * - A Linux kernel image (`vmlinux.bin` or `bzImage`)
 * - Optional: a pre-taken snapshot dir for ~5ms resume vs ~125ms cold boot
 *
 * @see https://github.com/firecracker-microvm/firecracker
 * @see rootfs/README.md for instructions on building the rootfs image
 *
 * @module integrations/sandbox.firecracker
 */

import { spawn, type ChildProcess } from "child_process";
import { createConnection, type Socket } from "net";
import { access, constants, unlink, rm } from "fs/promises";
import { existsSync } from "fs";
import { request as httpRequest, type RequestOptions } from "http";
import { PluginBase } from "../plugin/base.js";
import type { SandboxExternalBackend } from "../sandbox.js";

// ── Config ────────────────────────────────────────────────────────────────────

export type FirecrackerSandboxConfig = {
  /**
   * Path to the `firecracker` binary. Default: `'firecracker'` (on PATH).
   * Download from https://github.com/firecracker-microvm/firecracker/releases
   */
  firecrackerBin?: string;

  /**
   * Path to the Linux kernel image (`vmlinux.bin` or `bzImage`).
   * Firecracker CI provides a tested image:
   * https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin
   */
  kernelImagePath: string;

  /**
   * Path to the ext4 rootfs image containing:
   * - Node.js (musl build for Alpine, or glibc)
   * - socat ≥ 1.7.4 (vsock bridge)
   * - `/usr/local/bin/yaaf-agent.js` (the guest execution agent)
   * See `rootfs/Makefile` in the YAAF repo for build instructions.
   */
  rootfsImagePath: string;

  /**
   * If set, resume VMs from a pre-taken Firecracker snapshot directory instead of
   * cold-booting. Reduces startup time from ~125ms to ~5ms.
   * The directory must contain `snapshot_file` and `mem_file`.
   */
  snapshotDir?: string;

  /**
   * Number of virtual CPUs per microVM. Default: `1`.
   * Increase for CPU-bound tools. Each vCPU maps to one host thread.
   */
  vcpuCount?: number;

  /**
   * RAM per microVM in MiB. Default: `128`.
   * Node.js needs at least 64 MiB. Increase for memory-intensive tools.
   */
  memSizeMib?: number;

  /**
   * Number of pre-warmed VM slots in the pool. Default: `2`.
   * Requests that arrive while all slots are busy are queued in FIFO order.
   * Setting poolSize=0 means VMs are booted on-demand (no pre-warming).
   */
  poolSize?: number;

  /**
   * Per-call timeout in ms. Default: `30_000`.
   * The VM is hard-killed via SIGKILL if this elapses.
   */
  timeoutMs?: number;

  /**
   * vsock port the guest `yaaf-agent.js` listens on. Default: `52`.
   * Must match the port in your rootfs agent script.
   */
  vsockPort?: number;

  /**
   * Directory for Firecracker API sockets and vsock UDS files. Default: `'/tmp'`.
   * Must be writable by the current user.
   */
  socketDir?: string;

  /**
   * Optional path to the `jailer` binary for extra process isolation.
   * When set, each Firecracker process is started via `jailer` with
   * cgroup resource limits applied before the VMM starts.
   * See: https://github.com/firecracker-microvm/firecracker/blob/main/docs/jailer.md
   */
  jailerBin?: string;
};

// ── Internal types ────────────────────────────────────────────────────────────

type VmSlot = {
  readonly id: number;
  process: ChildProcess;
  /** Host-side path to Firecracker's API Unix socket */
  readonly apiSockPath: string;
  /** Host-side Unix socket path for vsock device */
  readonly vsockSockPath: string;
  /** CID assigned to this VM (3 + id) */
  readonly cid: number;
  busy: boolean;
  /** Set to true if the VM encountered an error and should not be reused */
  dirty: boolean;
};

type GuestMessage = {
  id: string;
  fnSrc: string;
  args: Record<string, unknown>;
};

type GuestResponse =
  | {
      id: string;
      ok: true;
      result: unknown;
    }
  | {
      id: string;
      ok: false;
      error: string;
    };

// ── FirecrackerSandboxBackend ─────────────────────────────────────────────────

/**
 * Sandbox backend that executes tool functions inside Firecracker microVMs.
 *
 * Implements both `SandboxExternalBackend` (for injection into `Sandbox`) and
 * `PluginBase` (for optional lifecycle management via `PluginHost`). This follows
 * the same dual-nature pattern used throughout YAAF: the caller chooses whether to
 * register it with `PluginHost` or use it standalone.
 *
 * @example Standalone (no PluginHost)
 * ```ts
 * const backend = new FirecrackerSandboxBackend({
 * kernelImagePath: '/images/vmlinux.bin',
 * rootfsImagePath: '/images/yaaf-rootfs.ext4',
 * snapshotDir: '/images/snapshots/node22',
 * })
 * await backend.initialize() // boots the VM pool
 *
 * const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend })
 * const result = await sandbox.execute('myTool', args, myToolFn)
 *
 * await backend.dispose()
 * ```
 *
 * @example Via PluginHost (lifecycle + /health integration)
 * ```ts
 * const backend = new FirecrackerSandboxBackend({ ... })
 * await host.register(backend) // calls initialize() automatically
 * sandbox.setBackend(backend)
 * // host.destroyAll() will call backend.destroy() at shutdown
 * ```
 */
export class FirecrackerSandboxBackend extends PluginBase implements SandboxExternalBackend {
  override readonly capabilities = ["sandbox_backend" as const] as const;

  private readonly cfg: Required<Omit<FirecrackerSandboxConfig, "snapshotDir" | "jailerBin">> &
    Pick<FirecrackerSandboxConfig, "snapshotDir" | "jailerBin">;

  private readonly pool: VmSlot[] = [];
  private readonly waitQueue: Array<(slot: VmSlot) => void> = [];
  private _started = false;

  constructor(config: FirecrackerSandboxConfig) {
    super("sandbox:firecracker", ["sandbox_backend"]);
    this.cfg = {
      firecrackerBin: "firecracker",
      vcpuCount: 1,
      memSizeMib: 128,
      poolSize: 2,
      timeoutMs: 30_000,
      vsockPort: 52,
      socketDir: "/tmp",
      snapshotDir: config.snapshotDir,
      jailerBin: config.jailerBin,
      ...config,
    };
  }

  // ── PluginBase lifecycle ────────────────────────────────────────────────────

  /**
   * Pre-warm the VM pool. Boots `config.poolSize` microVMs (or restores from
   * snapshot if `config.snapshotDir` is set).
   *
   * Called automatically by `PluginHost.register()`, or manually when used standalone.
   *
   * @throws Error if the `firecracker` binary or `/dev/kvm` is not available.
   */
  override async initialize(): Promise<void> {
    await this._assertPrerequisites();

    this._started = true;
    const boots: Promise<void>[] = [];
    for (let i = 0; i < this.cfg.poolSize; i++) {
      boots.push(this._bootSlot(i));
    }
    await Promise.all(boots);
  }

  /**
   * Gracefully shut down all microVMs.
   * Terminates Firecracker processes and removes socket files.
   */
  override async destroy(): Promise<void> {
    this._started = false;
    await Promise.all(this.pool.map((slot) => this._killSlot(slot)));
    this.pool.length = 0;
  }

  /**
   * Health check: verifies at least one non-dirty VM is in the pool.
   * Called periodically by `PluginHost.healthCheckAll()`.
   */
  override async healthCheck(): Promise<boolean> {
    if (!this._started) return false;
    return this.pool.some((s) => !s.dirty && s.process.exitCode === null);
  }

  /** Alias for `destroy()` — called by `Sandbox` when it is no longer needed. */
  async dispose(): Promise<void> {
    return this.destroy();
  }

  // ── SandboxExternalBackend ──────────────────────────────────────────────────

  /**
   * Execute a serialized tool function inside a Firecracker microVM.
   *
   * Acquires a VM slot from the pool, dispatches the call via the vsock channel,
   * and releases the slot on completion. After each call, the VM is considered dirty:
   * it is hard-killed and replaced with a fresh boot (or snapshot restore), so
   * guest state from one call can never contaminate a future call.
   */
  async execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T> {
    const slot = await this._acquireSlot();
    try {
      const result = await this._dispatchVsock<T>(slot, toolName, fnSrc, args);
      return result;
    } finally {
      // Always hard-kill and replace — guest state must not persist between calls
      slot.dirty = true;
      this._releaseAndRefresh(slot);
    }
  }

  // ── VM lifecycle ─────────────────────────────────────────────────────────

  private async _assertPrerequisites(): Promise<void> {
    // Check /dev/kvm accessible
    await access("/dev/kvm", constants.R_OK | constants.W_OK).catch(() => {
      throw new Error(
        "[yaaf/firecracker] /dev/kvm is not accessible. " +
          "Ensure you are on a Linux host and the current user is in the `kvm` group. " +
          "Run: sudo usermod -aG kvm $USER && newgrp kvm",
      );
    });

    // Check firecracker binary
    const { firecrackerBin } = this.cfg;
    const isAbsolute = firecrackerBin.startsWith("/");
    if (isAbsolute) {
      await access(firecrackerBin, constants.X_OK).catch(() => {
        throw new Error(`[yaaf/firecracker] Firecracker binary not executable: ${firecrackerBin}`);
      });
    }
    // If not absolute, trust PATH resolution at spawn time

    // Check rootfs and kernel
    for (const [label, p] of [
      ["kernelImagePath", this.cfg.kernelImagePath],
      ["rootfsImagePath", this.cfg.rootfsImagePath],
    ] as const) {
      await access(p, constants.R_OK).catch(() => {
        throw new Error(`[yaaf/firecracker] ${label} not readable: ${p}`);
      });
    }
  }

  private async _bootSlot(id: number): Promise<void> {
    const apiSockPath = `${this.cfg.socketDir}/yaaf-fc-${id}.api.sock`;
    const vsockSockPath = `${this.cfg.socketDir}/yaaf-fc-${id}.vsock`;

    // Clean up stale sockets from a previous run
    for (const p of [apiSockPath, vsockSockPath]) {
      if (existsSync(p)) await unlink(p).catch(() => {});
    }

    const proc = this._spawnFirecracker(id, apiSockPath);

    const slot: VmSlot = {
      id,
      process: proc,
      apiSockPath,
      vsockSockPath,
      cid: 3 + id,
      busy: false,
      dirty: false,
    };
    this.pool[id] = slot;

    // Wait for the API socket to appear (Firecracker creates it on startup)
    await this._waitForSocket(apiSockPath, 5_000);

    // Configure the VM via the Firecracker REST API (HTTP over Unix socket)
    if (this.cfg.snapshotDir) {
      await this._restoreSnapshot(slot);
    } else {
      await this._configureVm(slot);
      await this._startVm(slot);
    }
  }

  private _spawnFirecracker(id: number, apiSockPath: string): ChildProcess {
    const args = ["--api-sock", apiSockPath];
    const bin = this.cfg.jailerBin ?? this.cfg.firecrackerBin;
    const proc = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    proc.stderr?.on("data", (d: Buffer) => {
      // Firecracker logs to stderr in JSON; only surface errors in verbose mode
      const line = d.toString().trim();
      if (line.includes('"level":"Error"')) {
        console.warn(`[yaaf/firecracker] vm-${id} error:`, line);
      }
    });
    proc.on("exit", (code, signal) => {
      const slot = this.pool[id];
      if (slot) slot.dirty = true;
      if (this._started && code !== null && code !== 0) {
        console.warn(
          `[yaaf/firecracker] vm-${id} exited unexpectedly (code=${code}, signal=${signal}). Rebooting slot.`,
        );
        this._bootSlot(id).catch((e) =>
          console.error(`[yaaf/firecracker] vm-${id} reboot failed:`, e),
        );
      }
    });
    return proc;
  }

  private async _configureVm(slot: VmSlot): Promise<void> {
    // Set boot source (kernel)
    await this._fcApi(slot, "PUT", "/boot-source", {
      kernel_image_path: this.cfg.kernelImagePath,
      boot_args: "console=ttyS0 reboot=k panic=1 pci=off",
    });

    // Attach rootfs as read-only — guest cannot modify the image
    await this._fcApi(slot, "PUT", "/drives/rootfs", {
      drive_id: "rootfs",
      path_on_host: this.cfg.rootfsImagePath,
      is_root_device: true,
      is_read_only: true,
    });

    // Configure machine (vCPU + RAM)
    await this._fcApi(slot, "PUT", "/machine-config", {
      vcpu_count: this.cfg.vcpuCount,
      mem_size_mib: this.cfg.memSizeMib,
    });

    // Attach vsock device — maps AF_UNIX on host ↔ AF_VSOCK in guest
    // Guest agent listens on AF_VSOCK port cfg.vsockPort.
    // Host connects to vsockSockPath, sends "CONNECT {port}\n".
    await this._fcApi(slot, "PUT", "/vsock", {
      guest_cid: slot.cid,
      uds_path: slot.vsockSockPath,
    });
  }

  private async _startVm(slot: VmSlot): Promise<void> {
    await this._fcApi(slot, "PUT", "/actions", { action_type: "InstanceStart" });
    // Wait for the guest agent to become ready by opening a test vsock connection
    await this._waitForGuestAgent(slot, 10_000);
  }

  private async _restoreSnapshot(slot: VmSlot): Promise<void> {
    const snapDir = this.cfg.snapshotDir!;
    await this._fcApi(slot, "PUT", "/snapshot/load", {
      snapshot_path: `${snapDir}/snapshot_file`,
      mem_backend: {
        backend_path: `${snapDir}/mem_file`,
        backend_type: "File",
      },
      vsock_override: { uds_path: slot.vsockSockPath },
    });
    await this._waitForGuestAgent(slot, 5_000);
  }

  private async _killSlot(slot: VmSlot): Promise<void> {
    try {
      slot.process.kill("SIGKILL");
    } catch {
      /* already dead */
    }
    for (const p of [slot.apiSockPath, slot.vsockSockPath]) {
      await unlink(p).catch(() => {});
    }
    // Also clean up any port-specific vsock sockets the guest may have created
    await rm(`${slot.vsockSockPath}_${this.cfg.vsockPort}`, { force: true }).catch(() => {});
  }

  // ── Pool management ─────────────────────────────────────────────────────────

  private _acquireSlot(): Promise<VmSlot> {
    // Find a free, non-dirty, alive slot
    const free = this.pool.find((s) => !s.busy && !s.dirty && s.process.exitCode === null);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }

    // All busy or pool empty — enqueue
    return new Promise<VmSlot>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  private _releaseAndRefresh(slot: VmSlot): void {
    // Hard-kill the dirty VM and reboot the slot (fire-and-forget)
    this._killSlot(slot)
      .then(() => this._bootSlot(slot.id))
      .then(() => {
        const fresh = this.pool[slot.id];
        if (!fresh) return;
        // If there are queued callers, hand the new slot to the next waiter
        const next = this.waitQueue.shift();
        if (next) {
          fresh.busy = true;
          next(fresh);
        }
      })
      .catch((e) => console.error(`[yaaf/firecracker] Failed to refresh slot ${slot.id}:`, e));
  }

  // ── vsock dispatch ──────────────────────────────────────────────────────────

  /**
   * Send a tool call to the guest and wait for the response.
   *
   * vsock host-to-guest protocol (Firecracker docs):
   * 1. Connect to `slot.vsockSockPath` (AF_UNIX)
   * 2. Send `"CONNECT {port}\n"` (text)
   * 3. Receive `"OK {assignedPort}\n"` (acknowledgement)
   * 4. Send JSON message
   * 5. Read newline-delimited JSON response
   */
  private _dispatchVsock<T>(
    slot: VmSlot,
    toolName: string,
    fnSrc: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const msg: GuestMessage = { id, fnSrc, args };

      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const sock: Socket = createConnection(slot.vsockSockPath);

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (!sock.destroyed) sock.destroy();
      };

      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          new Error(
            `[yaaf/firecracker] Tool "${toolName}" timed out after ${this.cfg.timeoutMs}ms`,
          ),
        );
      }, this.cfg.timeoutMs);

      let phase: "connect" | "response" = "connect";
      let buf = "";

      sock.on("connect", () => {
        // Step 2: send vsock connect command
        sock.write(`CONNECT ${this.cfg.vsockPort}\n`);
      });

      sock.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8");

        if (phase === "connect") {
          // Step 3: wait for "OK {port}\n"
          const nl = buf.indexOf("\n");
          if (nl === -1) return; // incomplete — keep buffering
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);

          if (!line.startsWith("OK")) {
            settled = true;
            cleanup();
            reject(
              new Error(`[yaaf/firecracker] vsock handshake failed for "${toolName}": ${line}`),
            );
            return;
          }

          // Step 4: channel established — send the tool call as JSON
          phase = "response";
          sock.write(JSON.stringify(msg) + "\n");
          return;
        }

        // Phase: response — accumulate until we have a complete newline-terminated JSON
        const nl = buf.indexOf("\n");
        if (nl === -1) return; // still waiting for full response

        const jsonStr = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);

        if (settled) return;
        settled = true;
        cleanup();

        let parsed: GuestResponse;
        try {
          parsed = JSON.parse(jsonStr) as GuestResponse;
        } catch {
          reject(
            new Error(
              `[yaaf/firecracker] Invalid JSON response from guest for "${toolName}": ${jsonStr}`,
            ),
          );
          return;
        }

        if (parsed.id !== id) {
          reject(new Error(`[yaaf/firecracker] Response ID mismatch for "${toolName}"`));
          return;
        }

        if (parsed.ok) {
          resolve(parsed.result as T);
        } else {
          reject(new Error(parsed.error));
        }
      });

      sock.on("error", (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      });

      sock.on("close", () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          new Error(`[yaaf/firecracker] vsock connection closed unexpectedly for "${toolName}"`),
        );
      });
    });
  }

  // ── Firecracker API ─────────────────────────────────────────────────────────

  /** Send a request to the Firecracker management API (HTTP over Unix socket). */
  private _fcApi(
    slot: VmSlot,
    method: "PUT" | "GET" | "PATCH",
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const opts: RequestOptions = {
        socketPath: slot.apiSockPath,
        path,
        method,
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      };

      const req = httpRequest(opts, (res) => {
        let data = "";
        res.on("data", (d: Buffer) => {
          data += d.toString();
        });
        res.on("end", () => {
          const sc = res.statusCode ?? 0;
          if (sc >= 400) {
            reject(new Error(`[yaaf/firecracker] API ${method} ${path} → HTTP ${sc}: ${data}`));
          } else {
            try {
              resolve(data ? JSON.parse(data) : undefined);
            } catch {
              resolve(data);
            }
          }
        });
      });

      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  /**
   * Poll for a Unix socket to appear on the filesystem.
   * Firecracker creates its API socket asynchronously after starting.
   */
  private _waitForSocket(sockPath: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (existsSync(sockPath)) {
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error(`[yaaf/firecracker] Timed out waiting for socket: ${sockPath}`));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  /**
   * Verify the guest agent is ready by sending a connect probe via vsock.
   * The agent script starts immediately on boot, but vsock takes a moment
   * to register. We retry until the handshake succeeds or the timeout elapses.
   */
  private _waitForGuestAgent(slot: VmSlot, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    const probe = (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const sock = createConnection(slot.vsockSockPath);
        let done = false;

        const cleanup = () => {
          if (!sock.destroyed) sock.destroy();
        };

        sock.on("connect", () => {
          sock.write(`CONNECT ${this.cfg.vsockPort}\n`);
        });

        sock.on("data", (chunk: Buffer) => {
          if (done) return;
          done = true;
          cleanup();
          // Any response (OK or error) means the vsock channel is alive
          chunk.toString().startsWith("OK")
            ? resolve()
            : reject(new Error("vsock probe: unexpected response"));
        });

        sock.on("error", (err) => {
          if (done) return;
          done = true;
          cleanup();
          reject(err);
        });

        setTimeout(() => {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("vsock probe timeout"));
        }, 1_000);
      });

    const retry = (): Promise<void> =>
      probe().catch(async () => {
        if (Date.now() >= deadline) {
          throw new Error(
            `[yaaf/firecracker] Guest agent on slot ${slot.id} did not become ready within ${timeoutMs}ms`,
          );
        }
        await new Promise((r) => setTimeout(r, 100));
        return retry();
      });

    return retry();
  }
}
