/**
 * Gateway — Opt-in entry point for channel/transport features.
 *
 * These are NOT included in the main `yaaf` barrel export by design.
 * Import explicitly when you need multi-channel message routing:
 *
 * @example
 * ```ts
 * import { Gateway, ConsoleChannel, ApprovalManager } from 'yaaf/gateway';
 * ```
 *
 * @module gateway
 */

// ── Channel Gateway (OpenClaw Parity — O1 + O7) ─────────────────────────────
export {
  Gateway,
  ConsoleChannel,
  chunkResponse,
  CHANNEL_LIMITS,
  type Channel,
  type InboundMessage,
  type OutboundMessage,
  type Attachment,
  type MessageHandler,
  type GatewayConfig,
  type ChannelLimits,
} from './gateway/channel.js'

// ── Async Approvals (OpenClaw Parity — O5) ──────────────────────────────────
export {
  ApprovalManager,
  type ApprovalRequest,
  type ApprovalDecision,
  type ApprovalRecord,
  type ApprovalTransport,
  type ApprovalManagerConfig,
} from './gateway/approvals.js'

// ── SOUL.md Personality (OpenClaw Parity — O3) ──────────────────────────────
export {
  loadSoul,
  parseSoulMd,
  createSoul,
  applySoul,
  type Soul,
} from './agents/soul.js'
