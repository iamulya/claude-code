# Building the YAAF Firecracker rootfs

This directory contains the guest-side agent (`yaaf-agent.js`) that runs inside
each Firecracker microVM. You need to build a rootfs image once before using
`FirecrackerSandboxBackend`.

## Prerequisites (Linux only)

```bash
# Packages needed on the build host (Ubuntu/Debian)
sudo apt-get install -y debootstrap e2fsprogs qemu-utils curl

# Or on Fedora/RHEL:
sudo dnf install -y debootstrap e2fsprogs qemu-img curl
```

## Step 1 — Download Firecracker artifacts

```bash
# Firecracker binary (x86_64)
FCVER=v1.9.0
curl -Lo /usr/local/bin/firecracker \
  https://github.com/firecracker-microvm/firecracker/releases/download/${FCVER}/firecracker-${FCVER}-x86_64.tgz
# (extract and move to PATH)

# Kernel image (tested with Firecracker CI kernel)
curl -Lo /images/vmlinux.bin \
  https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin
```

## Step 2 — Build the rootfs image

```bash
# Create a 512MB ext4 image
IMAGE=/images/yaaf-rootfs.ext4
dd if=/dev/zero of=$IMAGE bs=1M count=512
mkfs.ext4 $IMAGE

# Mount and populate with Alpine Linux
MNTDIR=$(mktemp -d)
sudo mount -o loop $IMAGE $MNTDIR

# Bootstrap Alpine Linux minimal system
# Option A: download from Alpine CDN
sudo mkdir -p $MNTDIR/var/cache/apk
sudo curl -Lo /tmp/alpine-minirootfs.tar.gz \
  https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-minirootfs-3.20.0-x86_64.tar.gz
sudo tar -xzf /tmp/alpine-minirootfs.tar.gz -C $MNTDIR

# Install packages inside the chroot
sudo chroot $MNTDIR /bin/sh -c "
  apk update &&
  apk add --no-cache nodejs socat &&
  echo 'nameserver 8.8.8.8' > /etc/resolv.conf
"

# Copy the YAAF guest agent
sudo cp yaaf-agent.js $MNTDIR/usr/local/bin/yaaf-agent.js
sudo chmod +x $MNTDIR/usr/local/bin/yaaf-agent.js

# Install a minimal init that starts the vsock agent
# (Firecracker boots the kernel with init=/sbin/init by default)
sudo tee $MNTDIR/etc/rc.local > /dev/null <<'EOF'
#!/bin/sh
# Start the YAAF vsock agent on port 52
# socat forks a new process per connection, executing yaaf-agent.js via stdio
exec socat VSOCK-LISTEN:52,fork,reuseaddr EXEC:"node /usr/local/bin/yaaf-agent.js"
EOF
sudo chmod +x $MNTDIR/etc/rc.local

# Cleanup
sudo umount $MNTDIR
rmdir $MNTDIR

echo "rootfs image created at: $IMAGE"
```

## Step 3 (optional) — Take a snapshot for fast resume

Taking a snapshot after the VM has fully booted (and `socat` is listening) allows
`FirecrackerSandboxBackend` to restore in ~5ms instead of cold-booting in ~125ms.

```bash
APIDIR=/tmp
SNAP_DIR=/images/snapshots/node22
mkdir -p $SNAP_DIR

# Start Firecracker, configure, boot (see sandbox.firecracker.ts for the API calls)
# Then, while the VM is running, take the snapshot:
curl --unix-socket $APIDIR/yaaf-fc-0.api.sock -X PUT http://localhost/snapshot/create \
  -H 'Content-Type: application/json' \
  -d "{
    \"snapshot_type\": \"Full\",
    \"snapshot_path\": \"$SNAP_DIR/snapshot_file\",
    \"mem_file_path\": \"$SNAP_DIR/mem_file\"
  }"

echo "Snapshot saved to: $SNAP_DIR"
echo "Set snapshotDir: '$SNAP_DIR' in FirecrackerSandboxConfig for fast resume"
```

## Step 4 — Verify

```bash
# Quick smoke test: boot one VM and send a test call
# (requires a running YAAF process with FirecrackerSandboxBackend initialized)
node -e "
  const { FirecrackerSandboxBackend } = require('./dist/integrations/sandbox.firecracker.js')
  const { Sandbox } = require('./dist/sandbox.js')
  async function main() {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: '/images/vmlinux.bin',
      rootfsImagePath: '/images/yaaf-rootfs.ext4',
      poolSize: 1,
    })
    await backend.initialize()
    const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend })
    const result = await sandbox.execute('test', { x: 21 }, async (args) => args.x * 2)
    console.log('Result:', result.value)  // → 42
    await backend.dispose()
  }
  main().catch(console.error)
"
```

## Architecture reference

```
Host process (YAAF)
└── FirecrackerSandboxBackend
    ├── slot-0: Firecracker process (PID X)
    │   ├── API socket:   /tmp/yaaf-fc-0.api.sock   (HTTP REST → VM config)
    │   └── vsock socket: /tmp/yaaf-fc-0.vsock       (AF_UNIX → AF_VSOCK bridge)
    │
    └── slot-1: Firecracker process (PID Y)
        ├── API socket:   /tmp/yaaf-fc-1.api.sock
        └── vsock socket: /tmp/yaaf-fc-1.vsock

Per call:
  host: createConnection('/tmp/yaaf-fc-0.vsock')
  host → fc: "CONNECT 52\n"
  fc  → host: "OK {port}\n"                     (vsock channel established)
  host → guest: '{"id":"...","fnSrc":"...","args":{}}\n'
  guest (socat forks yaaf-agent.js via stdio)
  guest → host: '{"id":"...","ok":true,"result":42}\n'
  host: VM slot marked dirty, hard-killed, rebooted from snapshot
```
