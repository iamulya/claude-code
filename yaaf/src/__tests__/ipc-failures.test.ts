/**
 * InProcessIPCPlugin — Failure-Path Tests ()
 *
 * I1 send() with TTL=0 → message goes to DLQ, never delivered to inbox
 * I2 subscribe() then destroy() → listener is removed, no further callbacks
 * I3 send() to inbox with no subscriber → message buffered in inbox (no error)
 * I4 readUnread() on missing inbox → returns empty array (no throw)
 * I5 deadLetter() → listDeadLetters() returns the entry with DLQ prefix
 * I6 clear() → inbox is empty afterwards; readUnread returns []
 * I7 subscribe() returns unsubscribe fn; calling it stops delivery
 * I8 maxInboxSize exceeded + drop-oldest → oldest in DLQ, new message delivered
 * I9 fullPolicy:'reject' → send() throws when inbox full
 * I10 allowedSenders blocks unauthorized sender → message goes to DLQ
 * I11 onEvent callback fires for ipc:backpressure and ipc:dlq events
 */

import { describe, it, expect, vi } from "vitest";
import { InProcessIPCPlugin } from "../integrations/inProcessIPC.js";
import type { InProcessIPCConfig } from "../integrations/inProcessIPC.js";

function makePlugin(config?: InProcessIPCConfig) {
  return new InProcessIPCPlugin(config);
}

// ── I1: TTL=0 → DLQ, not inbox ───────────────────────────────────────────────

describe("I1: TTL=0 → message routed to dead-letter queue", async () => {
  it("does not deliver to inbox when ttlMs=0", async () => {
    const ipc = makePlugin();

    await ipc.send("agent-a", {
      from: "agent-b",
      to: "agent-a",
      body: "expired-message",
      maxAttempts: 3,
      ttlMs: 0, // already expired
    });

    const unread = await ipc.readUnread("agent-a");
    expect(unread).toHaveLength(0);

    const dlq = await ipc.listDeadLetters("agent-a");
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    expect(dlq[0]!.body).toContain("expired-message");
  });
});

// ── I2: subscribe-then-destroy → callback not called ─────────────────────────

describe("I2: destroy() removes all event listeners", async () => {
  it("does not call handler after destroy()", async () => {
    const ipc = makePlugin();
    const handler = vi.fn();

    ipc.subscribe("agent-c", handler);
    await ipc.destroy();

    // Sending after destroy should not call the handler
    // (EventEmitter listeners are removed by destroy())
    await ipc.send("agent-c", { from: "x", to: "agent-c", body: "after-destroy", maxAttempts: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});

// ── I3: send() to inbox with no subscriber → buffered, no error ──────────────

describe("I3: send() without a subscriber buffers message in inbox", async () => {
  it("delivers to inbox even when no subscriber is attached", async () => {
    const ipc = makePlugin();

    await ipc.send("agent-d", { from: "sender", to: "agent-d", body: "hello", maxAttempts: 1 });

    const msgs = await ipc.readUnread("agent-d");
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.body).toBe("hello");
  });
});

// ── I4: readUnread() on missing inbox → empty array ──────────────────────────

describe("I4: readUnread() on a never-written inbox returns [] not throws", async () => {
  it("returns an empty array for an inbox that has never been written to", async () => {
    const ipc = makePlugin();
    const msgs = await ipc.readUnread("agent-never-written");
    expect(msgs).toEqual([]);
  });
});

// ── I5: deadLetter() → listDeadLetters() ─────────────────────────────────────

describe("I5: deadLetter() stores entry and listDeadLetters() retrieves it", async () => {
  it("adds a DLQ prefix and persists the message", async () => {
    const ipc = makePlugin();

    // Send a valid message first so we can grab the IPCMessage shape
    await ipc.send("dlq-box", { from: "src", to: "dlq-box", body: "real-body", maxAttempts: 3 });
    const [msg] = await ipc.readUnread("dlq-box");

    await ipc.deadLetter("dlq-box", msg!, "handler threw TypeError");

    const dlq = await ipc.listDeadLetters("dlq-box");
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    expect(dlq[0]!.body).toContain("handler threw TypeError");
    expect(dlq[0]!.body).toContain("real-body");
  });
});

// ── I6: clear() → inbox empty ────────────────────────────────────────────────

describe("I6: clear() empties the inbox", async () => {
  it("returns empty readUnread after clear()", async () => {
    const ipc = makePlugin();

    await ipc.send("agent-e", { from: "y", to: "agent-e", body: "msg1", maxAttempts: 1 });
    await ipc.send("agent-e", { from: "y", to: "agent-e", body: "msg2", maxAttempts: 1 });
    expect(await ipc.readUnread("agent-e")).toHaveLength(2);

    await ipc.clear("agent-e");
    expect(await ipc.readUnread("agent-e")).toHaveLength(0);
  });
});

// ── I7: unsubscribe stops delivery ────────────────────────────────────────────

describe("I7: unsubscribe() returned by subscribe() stops event delivery", async () => {
  it("does not call the handler after unsubscribe is invoked", async () => {
    const ipc = makePlugin();
    const calls: string[] = [];

    const unsub = ipc.subscribe("agent-f", (msg) => {
      calls.push(msg.body);
    });

    // First message — handler must be called
    await ipc.send("agent-f", { from: "z", to: "agent-f", body: "first", maxAttempts: 1 });
    expect(calls).toEqual(["first"]);

    // Unsubscribe
    unsub();

    // Second message — handler must NOT be called
    await ipc.send("agent-f", { from: "z", to: "agent-f", body: "second", maxAttempts: 1 });
    expect(calls).toEqual(["first"]); // still just ['first']
  });
});
// ── I8: maxInboxSize exceeded + drop-oldest → DLQ ─────────────────────────────────

describe("I8: maxInboxSize exceeded with drop-oldest policy", async () => {
  it("evicts oldest message to DLQ and delivers new message", async () => {
    const ipc = makePlugin({ maxInboxSize: 2, fullPolicy: "drop-oldest" });

    // Fill inbox to capacity
    await ipc.send("box", { from: "src", to: "box", body: "msg-1", maxAttempts: 1 });
    await ipc.send("box", { from: "src", to: "box", body: "msg-2", maxAttempts: 1 });
    expect(await ipc.readUnread("box")).toHaveLength(2);

    // 3rd message should evict msg-1 to DLQ
    await ipc.send("box", { from: "src", to: "box", body: "msg-3", maxAttempts: 1 });

    const unread = await ipc.readUnread("box");
    expect(unread).toHaveLength(2); // still 2 (oldest dropped, newest added)
    expect(unread.map((m) => m.body)).not.toContain("msg-1");
    expect(unread.map((m) => m.body)).toContain("msg-3");

    const dlq = await ipc.listDeadLetters("box");
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    expect(dlq[0]!.body).toContain("msg-1");
  });
});

// ── I9: fullPolicy:'reject' → send() throws ──────────────────────────────────────

describe('I9: fullPolicy:"reject" throws when inbox is full', async () => {
  it("rejects send() when inbox is at maxInboxSize", async () => {
    const ipc = makePlugin({ maxInboxSize: 1, fullPolicy: "reject" });

    await ipc.send("box2", { from: "src", to: "box2", body: "first", maxAttempts: 1 });

    // Second send should throw
    await expect(
      ipc.send("box2", { from: "src", to: "box2", body: "second", maxAttempts: 1 }),
    ).rejects.toThrow("full");

    // First message still in inbox
    const unread = await ipc.readUnread("box2");
    expect(unread).toHaveLength(1);
    expect(unread[0]!.body).toBe("first");
  });
});

// ── I10: allowedSenders blocks unauthorized sender → DLQ ───────────────────────

describe("I10: allowedSenders blocks unauthorized senders", async () => {
  it("dead-letters messages from senders not in allowedSenders", async () => {
    const ipc = makePlugin();
    const received: string[] = [];

    // Subscribe with allowedSenders whitelist
    ipc.subscribe("secure-box", (msg) => received.push(msg.from), {
      allowedSenders: ["agent-trusted"],
    });

    // Authorized sender — must be delivered
    await ipc.send("secure-box", {
      from: "agent-trusted",
      to: "secure-box",
      body: "auth-msg",
      maxAttempts: 1,
    });

    // Unauthorized sender — must be dead-lettered
    await ipc.send("secure-box", {
      from: "agent-evil",
      to: "secure-box",
      body: "attack-msg",
      maxAttempts: 1,
    });

    // Only the trusted message was delivered to the handler
    expect(received).toEqual(["agent-trusted"]);

    // Unauthorized message is in DLQ
    const dlq = await ipc.listDeadLetters("secure-box");
    expect(dlq.some((m) => m.body.includes("attack-msg"))).toBe(true);
  });
});

// ── I11: onEvent fires for backpressure and DLQ events ───────────────────────

describe("I11: onEvent callback fires for observability events", async () => {
  it("fires ipc:backpressure when inbox overflows with drop-oldest", async () => {
    const events: string[] = [];
    const ipc = makePlugin({
      maxInboxSize: 1,
      fullPolicy: "drop-oldest",
      onEvent: (ev) => events.push(ev.type),
    });

    await ipc.send("ev-box", { from: "src", to: "ev-box", body: "first", maxAttempts: 1 });
    await ipc.send("ev-box", { from: "src", to: "ev-box", body: "overflow", maxAttempts: 1 });

    expect(events).toContain("ipc:backpressure");
    expect(events).toContain("ipc:dlq"); // evicted message goes to DLQ
  });

  it("fires ipc:ttl_expired when ttlMs=0", async () => {
    const events: string[] = [];
    const ipc = makePlugin({ onEvent: (ev) => events.push(ev.type) });

    await ipc.send("ev-box2", {
      from: "src",
      to: "ev-box2",
      body: "expired",
      maxAttempts: 1,
      ttlMs: 0,
    });

    expect(events).toContain("ipc:ttl_expired");
  });
});
