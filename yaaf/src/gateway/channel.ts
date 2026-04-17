/**
 * Channel Gateway — Multi-channel message transport abstraction.
 *
 * Provides a unified interface for receiving and sending messages across
 * multiple chat platforms (WhatsApp, Telegram, Discord, Slack, etc.).
 * Inspired by OpenClaw's gateway architecture.
 *
 * YAAF provides the interfaces and the Gateway router — actual channel
 * implementations are provided by plugins or community packages.
 *
 * @example
 * ```ts
 * const gateway = new Gateway({
 * agent: myAgentRunner,
 * channels: [
 * new ConsoleChannel(), // Built-in for testing
 * new TelegramChannel(token), // Community plugin
 * ],
 * sessionResolver: (msg) => `${msg.channelName}:${msg.senderId}`,
 * });
 *
 * await gateway.start();
 * ```
 *
 * @module gateway/channel
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Inbound message from any channel */
export type InboundMessage = {
  /** Unique message ID */
  id: string;
  /** Channel this message came from */
  channelName: string;
  /** Channel-specific sender identifier */
  senderId: string;
  /** Display name of the sender (if available) */
  senderName?: string;
  /** Text content */
  text: string;
  /** Binary attachments (images, files, audio) */
  attachments?: Attachment[];
  /** If this is a reply, the ID of the original message */
  replyTo?: string;
  /** Group/channel ID (if from a group chat) */
  groupId?: string;
  /** Whether the bot was explicitly mentioned (@bot) */
  isMention?: boolean;
  /** Raw channel-specific metadata */
  meta?: Record<string, unknown>;
};

/** Outbound message to a channel */
export type OutboundMessage = {
  /** Text content to send */
  text: string;
  /** Channel to send to */
  channelName: string;
  /** Recipient (sender of the original message) */
  recipientId: string;
  /** Group ID (if sending to a group) */
  groupId?: string;
  /** Reply to a specific message */
  replyToId?: string;
  /** Binary attachments */
  attachments?: Attachment[];
};

export type Attachment = {
  /** MIME type */
  mimeType: string;
  /** Raw data */
  data: Buffer;
  /** Filename */
  filename?: string;
};

/**
 * Channel interface — implement this to add a new chat platform.
 *
 * Each channel handles the transport layer: connecting to the platform,
 * receiving messages, formatting responses, and sending replies.
 */
export interface Channel {
  /** Channel identifier (e.g., 'telegram', 'discord', 'whatsapp') */
  readonly name: string;

  /**
   * Register a message handler. The gateway calls this during setup.
   * The channel should invoke the handler for every inbound message.
   */
  onMessage(handler: MessageHandler): void;

  /** Send a message through this channel */
  send(message: OutboundMessage): Promise<void>;

  /** Start the channel (connect, listen for messages) */
  start(): Promise<void>;

  /** Stop the channel (disconnect, clean up) */
  stop(): Promise<void>;

  /** Whether the channel is currently connected */
  isConnected(): boolean;
}

export type MessageHandler = (message: InboundMessage) => Promise<void>;

// ── Gateway ──────────────────────────────────────────────────────────────────

export type GatewayConfig = {
  /** The agent to route messages to */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  /** Channels to listen on */
  channels: Channel[];
  /**
   * Resolve a session key from an inbound message.
   * Default: `${channelName}:${senderId}` (per-channel-peer isolation).
   */
  sessionResolver?: (message: InboundMessage) => string;
  /**
   * Filter inbound messages (e.g., only respond to mentions in groups).
   * Return true to process, false to ignore.
   * Default: process all.
   */
  messageFilter?: (message: InboundMessage) => boolean;
  /**
   * Called before the agent processes a message.
   * Can transform the input text.
   */
  beforeProcess?: (message: InboundMessage) => string | Promise<string>;
  /**
   * Called after the agent produces a response.
   * Can transform or chunk the output.
   */
  afterProcess?: (
    response: string,
    message: InboundMessage,
  ) => string | string[] | Promise<string | string[]>;
  /** Error handler for channel/processing errors */
  onError?: (error: Error, context: { channel: string; message?: InboundMessage }) => void;
};

/**
 * Gateway — Routes messages from multiple channels to a single agent.
 *
 * Handles:
 * - Multi-channel message reception
 * - Session resolution (per-sender, per-channel, per-group)
 * - Message filtering (group mentions, DM allowlists)
 * - Response chunking for channel message limits
 * - Error isolation (one channel failure doesn't affect others)
 */
export class Gateway {
  private readonly config: Required<Pick<GatewayConfig, "agent" | "channels">> & GatewayConfig;
  private running = false;
  /**
   * Per-session message serialization queue.
   * Concurrent messages from the same sender race on shared agent state (context
   * manager, message history, abort controller). We serialize them via a per-key
   * promise chain so each turn completes before the next begins.
   */
  private readonly sessionQueues = new Map<string, Promise<void>>();

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  /** Start all channels and begin processing messages. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    for (const channel of this.config.channels) {
      channel.onMessage(async (message) => {
        try {
          await this.handleMessage(channel, message);
        } catch (error) {
          this.config.onError?.(error instanceof Error ? error : new Error(String(error)), {
            channel: channel.name,
            message,
          });
        }
      });

      try {
        await channel.start();
      } catch (error) {
        this.config.onError?.(error instanceof Error ? error : new Error(String(error)), {
          channel: channel.name,
        });
      }
    }
  }

  /** Stop all channels. */
  async stop(): Promise<void> {
    this.running = false;
    await Promise.allSettled(this.config.channels.map((ch) => ch.stop()));
  }

  /** Send a proactive message through a specific channel. */
  async send(message: OutboundMessage): Promise<void> {
    const channel = this.config.channels.find((ch) => ch.name === message.channelName);
    if (!channel) throw new Error(`Channel "${message.channelName}" not found`);
    await channel.send(message);
  }

  /** Get status of all channels. */
  status(): { channel: string; connected: boolean }[] {
    return this.config.channels.map((ch) => ({
      channel: ch.name,
      connected: ch.isConnected(),
    }));
  }

  private async handleMessage(channel: Channel, message: InboundMessage): Promise<void> {
    // Apply message filter
    if (this.config.messageFilter && !this.config.messageFilter(message)) {
      return;
    }

    // Serialize processing per session key.
    // Without this, two rapid messages from the same sender both enter
    // agent.run() concurrently, racing on shared mutable state.
    const sessionKey = this.config.sessionResolver
      ? this.config.sessionResolver(message)
      : `${message.channelName}:${message.senderId}`;

    const previous = this.sessionQueues.get(sessionKey) ?? Promise.resolve();
    const next = previous.then(() => this.processMessage(channel, message));
    // Store the chain; the catch ensures it never rejects so the queue continues.
    this.sessionQueues.set(
      sessionKey,
      next.catch(() => {}),
    );
    await next;
  }

  private async processMessage(channel: Channel, message: InboundMessage): Promise<void> {
    // Pre-process input
    const input = this.config.beforeProcess
      ? await this.config.beforeProcess(message)
      : message.text;

    if (!input.trim()) return;

    // Run through agent
    const response = await this.config.agent.run(input);

    // Post-process output
    const processed = this.config.afterProcess
      ? await this.config.afterProcess(response, message)
      : response;

    // Send response (possibly chunked)
    const chunks = Array.isArray(processed) ? processed : [processed];
    for (const chunk of chunks) {
      if (chunk.trim()) {
        await channel.send({
          text: chunk,
          channelName: channel.name,
          recipientId: message.senderId,
          groupId: message.groupId,
          replyToId: message.id,
        });
      }
    }
  }
}

// ── Response Chunking (Gap O7) ───────────────────────────────────────────────

export type ChannelLimits = {
  /** Maximum message length in characters */
  maxLength: number;
  /** Supported markdown features */
  markdown?: boolean;
};

/** Known channel limits */
export const CHANNEL_LIMITS: Record<string, ChannelLimits> = {
  telegram: { maxLength: 4096, markdown: true },
  whatsapp: { maxLength: 4096, markdown: false },
  discord: { maxLength: 2000, markdown: true },
  slack: { maxLength: 4000, markdown: true },
  imessage: { maxLength: 20000, markdown: false },
  signal: { maxLength: 8000, markdown: false },
  console: { maxLength: Infinity, markdown: true },
};

/**
 * Split a long response into channel-appropriate chunks.
 * Splits at paragraph or sentence boundaries, not mid-word.
 */
export function chunkResponse(text: string, channelName: string): string[] {
  const limits = CHANNEL_LIMITS[channelName] ?? { maxLength: 4000 };
  if (text.length <= limits.maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= limits.maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find the best split point within the limit
    const slice = remaining.slice(0, limits.maxLength);

    // Try paragraph break first
    let splitAt = slice.lastIndexOf("\n\n");
    if (splitAt < limits.maxLength * 0.3) {
      // Try single newline
      splitAt = slice.lastIndexOf("\n");
    }
    if (splitAt < limits.maxLength * 0.3) {
      // Try sentence break
      splitAt = slice.lastIndexOf(". ");
      if (splitAt > 0) splitAt += 1; // Include the period
    }
    if (splitAt < limits.maxLength * 0.3) {
      // Last resort: break at max length
      splitAt = limits.maxLength;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

// ── Console Channel (Built-in for testing) ───────────────────────────────────

/**
 * A simple console-based channel for testing.
 * Reads from stdin and writes to stdout.
 */
export class ConsoleChannel implements Channel {
  readonly name = "console";
  private handler: MessageHandler | null = null;
  private connected = false;
  private msgCounter = 0;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(message: OutboundMessage): Promise<void> {
    const chunks = chunkResponse(message.text, "console");
    for (const chunk of chunks) {
      console.log(`\n🤖 ${chunk}`);
    }
  }

  async start(): Promise<void> {
    this.connected = true;
    console.log("🎮 Console channel ready. Type messages below:");
  }

  async stop(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Simulate an inbound message (for testing).
   * In a real interactive mode, this would read from stdin.
   */
  async simulateMessage(text: string, senderId = "console-user"): Promise<void> {
    if (!this.handler) throw new Error("No handler registered");
    this.msgCounter++;
    await this.handler({
      id: `console-${this.msgCounter}`,
      channelName: "console",
      senderId,
      text,
    });
  }
}
