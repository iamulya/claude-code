/**
 * YAAF — A production-grade autonomous agent framework
 *
 * Core subsystems:
 *
 * 1. **State Store** — Immutable, selector-based reactive state management
 * 2. **Tool System** — Schema-validated tool definitions with permission layers
 * 3. **Memory** — Persistent, file-based memory with a 4-type taxonomy
 * 4. **Context Manager** — Token-budget-aware context window management
 * 5. **Agent Spawner** — Multi-agent orchestration with mailbox-based IPC
 * 6. **Plugin System** — Adapter interfaces for swappable backends
 *
 * @module yaaf
 */

// ── State Store ──────────────────────────────────────────────────────────────
export { createStore, type Store, type StoreSubscriber } from "./store/store.js";

// ── Tool System ──────────────────────────────────────────────────────────────
export {
  buildTool,
  findToolByName,
  type Tool,
  type ToolDef,
  type ToolInput,
  type ToolResult,
  type ToolContext,
  type PermissionResult,
  type PermissionBehavior,
  type ValidationResult,
} from "./tools/tool.js";

// ── OpenAPI Toolset ──────────────────────────────────────────────────────────
export {
  OpenAPIToolset,
  type OpenAPIToolsetOptions,
  type AuthConfig as OpenAPIAuthConfig,
  type ParsedOperation,
} from "./tools/openapi/index.js";

// ── Memory ───────────────────────────────────────────────────────────────────

export {
  MemoryStore,
  type MemoryType,
  type MemoryEntry as MemoryStoreEntry,
  type MemoryHeader,
  type MemoryStoreConfig,
  MEMORY_TYPES,
} from "./memory/memoryStore.js";

export { MemoryRelevanceEngine, type RelevantMemory } from "./memory/relevance.js";

// ── Memory Strategies ────────────────────────────────────────────────────────
export {
  // Core interfaces
  type MemoryStrategy,
  type MemoryExtractionStrategy,
  type MemoryRetrievalStrategy,
  type MemoryContext,
  type ExtractionResult,
  type RetrievalResult,
  // Built-in strategies
  SessionMemoryExtractor,
  TopicFileExtractor,
  EphemeralBufferStrategy,
  LLMRetrievalStrategy,
  RecencyRetrievalStrategy,
  CompositeMemoryStrategy,
  HonchoMemoryStrategy,
  // Template
  DEFAULT_SESSION_MEMORY_TEMPLATE,
  // Factory functions
  sessionMemoryStrategy,
  topicMemoryStrategy,
  lightweightMemoryStrategy,
  honchoMemoryStrategy,
  // Config types
  type SessionMemoryExtractorConfig,
  type TopicFileExtractorConfig,
  type EphemeralBufferConfig,
  type LLMRetrievalConfig,
  type RecencyRetrievalConfig,
  type CompositeMemoryConfig,
  type HonchoMemoryStrategyConfig,
} from "./memory/strategies.js";

// ── Context Manager ──────────────────────────────────────────────────────────
export {
  ContextManager,
  type ContextManagerConfig,
  type ContextSection as ContextManagerSection,
  type CompactionResult,
  type MicroCompactionResult,
  type CompactionStrategy,
  type CompactionStrategyName,
  type Message,
  type MessageRole,
} from "./context/contextManager.js";

// ── Compaction Strategies ────────────────────────────────────────────────────
export {
  // Core interface
  type CompactionStrategy as CompactionStrategyPlugin,
  type CompactionContext,
  type StrategyResult,
  // Built-in strategies
  SummarizeStrategy,
  TruncateStrategy,
  SlidingWindowStrategy,
  MicroCompactStrategy,
  TimeBasedMicroCompactStrategy,
  SessionMemoryStrategy,
  CompositeStrategy,
  // Factory functions
  defaultCompactionPipeline,
  lightweightCompactionPipeline,
  // Config types
  type SummarizeStrategyConfig,
  type TruncateStrategyConfig,
  type SlidingWindowStrategyConfig,
  type MicroCompactStrategyConfig,
  type TimeBasedMicroCompactConfig,
  type SessionMemoryStrategyConfig,
  type CompositeStrategyConfig,
} from "./context/strategies.js";

// ── Agent Spawner ────────────────────────────────────────────────────────────
export {
  AgentOrchestrator,
  type AgentDefinition,
  type AgentIdentity,
  type AgentStatus,
  type SpawnConfig,
  type SpawnResult,
} from "./agents/orchestrator.js";

export { Mailbox, type MailboxMessage, type MailboxConfig } from "./agents/mailbox.js";

export {
  TaskManager,
  type TaskState,
  type TaskType,
  type TaskStatus,
} from "./agents/taskManager.js";

export {
  AgentRunner,
  type AgentRunnerConfig,
  type ChatModel,
  type StreamingChatModel,
  type ChatMessage,
  type ChatResult,
  type ChatDelta,
  type ToolCall,
  type ToolSchema,
  type TokenUsage,
  type SessionUsage,
  type RunnerEvents,
  type RunnerEventHandler,
  type RunnerStreamEvent,
} from "./agents/runner.js";

// ── AgentThread (stateless reducer / durable pause-resume) ───────────────────
export {
  type AgentThread,
  type StepResult,
  type SuspendReason,
  type SuspendResolution,
  createThread,
  forkThread,
  serializeThread,
  deserializeThread,
} from "./agents/thread.js";

// ── Streaming Tool Executor (concurrent execution) ───────────────────────────
export { StreamingToolExecutor, type ToolExecutionResult } from "./agents/streamingExecutor.js";

// ── Tool Result Budget ───────────────────────────────────────────────────────
export {
  applyToolResultBudget,
  type ToolResultBudgetConfig,
  type ToolResultBudgetResult,
} from "./utils/toolResultBudget.js";

// ── Agent (high-level abstraction over AgentRunner) ───────────────────────────
export {
  Agent,
  geminiAgent,
  openaiAgent,
  ollamaAgent,
  type AgentConfig,
  type ModelProvider,
  type PlanModeConfig,
  type RunOptions,
} from "./agent.js";

// ── Stream Adapter (bridges Agent → runtime harnesses) ────────────────────────
export {
  adaptStream,
  toStreamableAgent,
  type RuntimeStreamEvent,
  type StreamableAgent,
} from "./runtime/adapter.js";

// ── Models (built-in ChatModel implementations) ───────────────────────────────
export { OpenAIChatModel, type OpenAIModelConfig } from "./models/openai.js";
export { GeminiChatModel, type GeminiModelConfig } from "./models/gemini.js";
export { AnthropicChatModel, type AnthropicModelConfig } from "./models/anthropic.js";

// ── Vigil (Autonomous Agent Mode) ────────────────────────────────────────────
export {
  Vigil,
  vigil,
  type VigilConfig,
  type VigilEvents,
  type VigilEventHandler,
  type ScheduledTask,
} from "./vigil.js";

// ── System Prompt Builder ─────────────────────────────────────────────────────
export {
  SystemPromptBuilder,
  DYNAMIC_BOUNDARY_MARKER,
  // Built-in section factories
  envSection,
  rulesSection,
  identitySection,
  dateSection,
  // Higher-level factories
  defaultPromptBuilder,
  fromSections,
  // Types
  type SectionFn,
  type CacheBehavior,
  type SystemPromptSection,
} from "./prompt/systemPrompt.js";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { type Hooks, type HookContext, type HookResult, type LLMHookResult } from "./hooks.js";

// ── Permission System ─────────────────────────────────────────────────────────
export {
  PermissionPolicy,
  allowAll,
  denyAll,
  cliApproval,
  secureCLIPolicy,
  isDangerousCommand,
  DANGEROUS_PATTERNS,
  type PermissionOutcome,
  type PermissionMode,
  type ApprovalHandler,
} from "./permissions.js";

// ── Identity & Access Management (IAM) ───────────────────────────────────────
export {
  // Authorization strategies
  RoleStrategy,
  AttributeStrategy,
  CompositeStrategy as CompositeAuthStrategy,
  rbac,
  abac,
  when,
  allowAllStrategy,
  denyAllStrategy,
  // Data scoping strategies
  TenantScopeStrategy,
  OwnershipScopeStrategy,
  AttributeScopeStrategy,
  HierarchyScopeStrategy,
  ResolverScopeStrategy,
  CompositeScope,
  systemAwareScope,
  // Types
  type UserContext,
  type UserCredentials,
  type AuthorizationStrategy,
  type AuthorizationContext,
  type AuthorizationDecision,
  type DataScopeStrategy,
  type DataScope,
  type ScopeContext,
  type PermissionResolver,
  type ResolvedPermissions,
  type PermissionGrant,
  type IdentityProvider,
  type IncomingRequest,
  type AccessPolicy,
  type AccessDecisionEvent,
  type RoleStrategyConfig,
  type AttributeRule,
  type AttributeStrategyConfig,
  type TenantScopeConfig,
  type OwnershipScopeConfig,
  type AttributeScopeRule,
  type AttributeScopeConfig,
  type HierarchyNode,
  type HierarchyScopeConfig,
  type ResolverScopeConfig,
  type SystemAwareScopeConfig,
  // Identity providers
  JwtIdentityProvider,
  ApiKeyIdentityProvider,
  OidcIdentityProvider,
  CompositeIdentityProvider,
  AnonymousIdentityProvider,
  type JwtIdentityConfig,
  type ApiKeyIdentityConfig,
  type OidcIdentityConfig,
  type CompositeIdentityConfig,
  // JWT utilities
  verifyJwt,
  verifyJwtWithJwks,
  decodeJwt,
  JwtError,
  type JwtPayload,
  type JwtHeader,
  type JwtVerifyOptions,
} from "./iam/index.js";

// ── Security Middleware (OWASP LLM Top 10) ────────────────────────────────────
export {
  PromptGuard,
  promptGuard,
  strictPromptGuard,
  type PromptGuardConfig,
  type PromptGuardSensitivity,
  type PromptGuardMode,
  type PromptGuardPattern,
  type PromptGuardEvent,
  type PromptGuardResult,
  OutputSanitizer,
  outputSanitizer,
  strictSanitizer,
  type OutputSanitizerConfig,
  type SanitizeEvent,
  type SanitizeResult,
  PiiRedactor,
  piiRedactor,
  strictPiiRedactor,
  type PiiRedactorConfig,
  type PiiRedactorMode,
  type PiiCategory,
  type PiiDetection,
  type PiiEvent,
  type PiiScanResult,
  type CustomPiiPattern,
  TrustPolicy,
  trustPolicy,
  type TrustPolicyConfig,
  type TrustPolicyMode,
  type PluginTrust,
  type McpServerTrust,
  type TrustVerificationEvent,
  type PluginVerificationResult,
  type McpToolFilterResult,
  GroundingValidator,
  groundingValidator,
  strictGroundingValidator,
  type GroundingValidatorConfig,
  type GroundingMode,
  type GroundingSentence,
  type GroundingAssessment,
  PerUserRateLimiter,
  perUserRateLimiter,
  type PerUserRateLimiterConfig,
  type RateLimitEvent,
  type RateLimitCheckResult,
  type UserUsageSummary,
  InputAnomalyDetector,
  inputAnomalyDetector,
  type InputAnomalyConfig,
  type InputAnomalyEvent,
  type InputAnomalyResult,
  type AnomalyType,
  StructuredOutputValidator,
  structuredOutputValidator,
  type OutputValidatorConfig,
  type OutputValidationEvent,
  type OutputValidationViolation,
  type FieldRule,
  type FieldType,
  SecurityAuditLog,
  securityAuditLog,
  type AuditLogConfig,
  type AuditEntry,
  type AuditSeverity,
  type AuditCategory,
  type AuditStats,
  securityHooks,
  type SecurityHooksConfig,
} from "./security/index.js";

// ── Session Persistence ──────────────────────────────────────────────────────
export { Session, listSessions, pruneOldSessions } from "./session.js";

// ── Secure Storage ────────────────────────────────────────────────────────────
export { SecureStorage, type SecureStorageConfig } from "./storage/secureStorage.js";

// ── Sandbox ───────────────────────────────────────────────────────────────────
export {
  Sandbox,
  SandboxError,
  timeoutSandbox,
  strictSandbox,
  projectSandbox,
  type SandboxConfig,
  type SandboxViolation,
} from "./sandbox.js";

// ── Model Router ─────────────────────────────────────────────────────────────
export {
  RouterChatModel,
  alwaysCapable,
  alwaysFast,
  type RouterConfig,
  type RoutingDecision,
} from "./models/router.js";

// ── Team Memory ───────────────────────────────────────────────────────────────
export {
  TeamMemory,
  type TeamMemoryConfig,
  type TeamMemoryEntry,
  type MemoryScope,
} from "./memory/teamMemory.js";

// ── Skills ────────────────────────────────────────────────────────────────────
export {
  loadSkills,
  loadSkill,
  defineSkill,
  buildSkillSection,
  buildSkillSectionFromList,
  discoverSkillEntries,
  deduplicateSkills,
  parseFrontmatter,
  buildSkillFromParsed,
  SkillRegistry,
  MAX_SKILL_BYTES,
  type Skill,
  type SkillFrontmatter,
  type SkillSource,
  type SkillExecutionContext,
  type SkillEntry,
  type SkillToolContext,
  type ContentBlock,
  type SkillRegistryEvents,
  type ParsedSkill,
} from "./skills/index.js";

// ── MCP Integration ───────────────────────────────────────────────────────────
export {
  McpPlugin,
  stdioMcp,
  sseMcp,
  filesystemMcp,
  type McpPluginConfig,
  type McpServerConfig,
  type McpStdioServer,
  type McpSseServer,
} from "./integrations/mcp.js";

// ── Utilities ────────────────────────────────────────────────────────────────────
export { EventBus, type EventHandler } from "./utils/eventBus.js";
export { Logger, type LogLevel, type StructuredLogBackend } from "./utils/logger.js";
export { estimateTokens } from "./utils/tokens.js";
export { validateCron, nextCronRunMs, describeCron } from "./utils/cron.js";
export { withRetry, computeRetryDelay, type RetryConfig } from "./utils/retry.js";

// ── Errors ───────────────────────────────────────────────────────────────────────
export {
  YAAFError,
  APIError,
  RateLimitError,
  OverloadedError,
  AuthError,
  APIConnectionError,
  ContextOverflowError,
  CompactionError,
  ToolExecutionError,
  AbortError,
  RetryExhaustedError,
  MaxIterationsError,
  classifyAPIError,
  parseRetryAfterHeader,
  type ErrorCode,
} from "./errors.js";

// ── Plugin System (Adapter Contracts + Registry) ───────────────────────────────
// PluginBase — shared base class for plugins (extends this, not Plugin interface)
export { PluginBase } from "./plugin/base.js";
// BaseLLMAdapter — shared base class for LLM model implementations
export { BaseLLMAdapter } from "./models/base.js";
// resolveModel — construct a ChatModel from AgentConfig provider settings
export { resolveModel, type ResolverConfig } from "./models/resolver.js";
// Model specs registry — look up or extend per-model context/output token limits
export { resolveModelSpecs, registerModelSpecs, type ModelSpecs } from "./models/specs.js";
export {
  PluginHost,
  type Plugin,
  type PluginCapability,
  type MemoryAdapter,
  type BrowserAdapter,
  type FileSystemAdapter,
  type ToolProvider,
  type ContextProvider,
  type LLMAdapter,
  type LLMPricing,
  // Phase 2: Security Adapter
  type SecurityAdapter,
  type SecurityHookResult,
  // Phase 3: Observability Adapter
  type ObservabilityAdapter,
  type LogEntry,
  type SpanData,
  // Phase 3: Notification Adapter
  type NotificationAdapter,
  type PluginNotification,
  // Phase 4: Ingester Adapter
  type IngesterAdapter,
  type IngesterAdapterOptions,
  type IngesterAdapterResult,
  // Phase 5: Compaction Adapter
  type CompactionAdapter,
  // Phase 5: Skill Provider Adapter
  type SkillProviderAdapter,
  // Phase 5: Session Adapter
  type SessionAdapter,
  // Phase 5: Identity Adapter
  type IdentityAdapter,
  // Phase 5: Linter Rule Adapter
  type LinterRuleAdapter,
  type LinterRuleIssue,
  // Existing types
  type MemoryEntry,
  type MemoryEntryWithContent,
  type MemoryEntryMeta,
  type MemoryFilter,
  type MemorySearchResult,
  type NavigateOptions,
  type PageContent,
  type ScreenshotOptions,
  type ScreenshotData,
  type FSEntryInfo,
  type FSStats,
  type ContextSection,
  type LLMMessage,
  type LLMQueryParams,
  type LLMResponse,
  // MCP adapter interface + types
  type McpAdapter,
  type McpServerInfo,
} from "./plugin/types.js";

// ── Plugins (each is a single class implementing adapter interfaces) ─────────
export {
  HonchoPlugin,
  HonchoSession,
  type HonchoConfig,
  type HonchoSearchResult,
  type HonchoRepresentation,
} from "./integrations/honcho.js";

export {
  AgentFSPlugin,
  type AgentFSConfig,
  type FSEntry,
  type FSNodeType,
  type TreeEntry,
  type FSChange,
} from "./integrations/agentfs.js";

export { CamoufoxPlugin, type CamoufoxConfig, type ElementInfo } from "./integrations/camoufox.js";

// ── Telemetry ─────────────────────────────────────────────────────────────────
// OpenTelemetry integration — mirrors main repo instrumentation.ts + sessionTracing.ts.
// Call initYAAFTelemetry() once at process startup to activate traces, metrics, and logs.
export {
  initYAAFTelemetry,
  flushYAAFTelemetry,
  getYAAFMeter,
  getYAAFOTelLogger,
  parseExporterList,
} from "./telemetry/telemetry.js";

export {
  isTracingEnabled,
  startAgentRunSpan,
  endAgentRunSpan,
  startLLMRequestSpan,
  endLLMRequestSpan,
  startToolCallSpan,
  endToolCallSpan,
  startToolExecutionSpan,
  endToolExecutionSpan,
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
  type Span,
} from "./telemetry/tracing.js";

export {
  getBaseAttributes,
  buildSpanAttributes,
  YAAF_SERVICE_NAME,
  YAAF_TRACER_NAME,
  YAAF_METER_NAME,
  YAAF_LOGGER_NAME,
  type YAAFSpanType,
} from "./telemetry/attributes.js";

// ── Cost Tracker ─────────────────────────────────────────────────
export {
  CostTracker,
  type ModelPricing,
  type UsageRecord,
  type ModelUsage as CostModelUsage,
  type CostSnapshot,
} from "./utils/costTracker.js";

// ── Guardrails ───────────────────────────────────────────────────────
export {
  Guardrails,
  BudgetExceededError,
  type GuardrailConfig,
  type GuardrailResource,
  type GuardrailStatus,
  type GuardrailCheckResult,
  type GuardrailDetail,
  type GuardrailEvent,
  type GuardrailListener,
} from "./utils/guardrails.js";

// ── Coordinator Mode ─────────────────────────────────────────────────
export {
  buildCoordinatorPrompt,
  buildWorkerResult,
  formatTaskNotification,
  parseTaskNotification,
  type TaskNotification,
  type TaskStatus as CoordinatorTaskStatus,
  type WorkerDefinition,
  type CoordinatorPromptConfig,
} from "./agents/coordinator.js";

// ── Agent Summarization ──────────────────────────────────────────────
export {
  startAgentSummarization,
  type AgentSummarizationConfig,
  type SummarizationHandle,
} from "./agents/agentSummary.js";

// ── Notifications ────────────────────────────────────────────────────
export {
  ConsoleNotifier,
  WebhookNotifier,
  CallbackNotifier,
  CompositeNotifier,
  BufferNotifier,
  // bridge factory — wrap any NotificationChannel as a NotificationAdapter plugin
  notificationAdapterFromChannel,
  type NotificationChannel,
  type Notification,
  type NotificationType,
} from "./utils/notifier.js";

// ── Auto Memory Extraction ───────────────────────────────────────────
export { AutoMemoryExtractor, type AutoExtractorConfig } from "./memory/autoExtract.js";

// ── Tool-Use Summaries ───────────────────────────────────────────────
export {
  generateToolUseSummary,
  type ToolInfo,
  type ToolSummaryConfig,
} from "./utils/toolSummary.js";

// ── Structured Compaction Prompts ─────────────────────────────────────
export {
  buildCompactionPrompt,
  stripAnalysisBlock,
  extractAnalysisBlock,
  type CompactionPromptConfig,
} from "./context/compactionPrompts.js";

// ── History Snipping ────────────────────────────────────────────────
export {
  snipHistory,
  deduplicateToolResults,
  type SnipConfig,
  type SnipResult,
} from "./context/historySnip.js";

// ── Auto-Compact Circuit Breaker ────────────────────────────────────
export { CompactionCircuitBreaker, type CircuitBreakerConfig } from "./context/circuitBreaker.js";

// ── Away/Resume Summary ─────────────────────────────────────────────
export { generateAwaySummary, type AwaySummaryConfig } from "./utils/awaySummary.js";

// ── Scratchpad ──────────────────────────────────────────────────────
export { Scratchpad, type ScratchpadConfig, type ScratchpadEntry } from "./agents/scratchpad.js";

// ── Content Replacement State ───────────────────────────────────────
export {
  ContentReplacementTracker,
  type FileEdit,
  type EditType,
  type ContentReplacementSnapshot,
} from "./context/contentReplacement.js";

// ── Workflow Agents () ────────────────────────────────────────
export {
  sequential,
  parallel,
  loop,
  asStep,
  transform,
  conditional,
  type WorkflowAgent,
  type WorkflowStep,
  type SequentialConfig,
  type ParallelConfig,
  type LoopConfig,
} from "./agents/workflow.js";

// ── Agent Tool () ─────────────────────────────────────────────
export { agentTool, agentTools, type AgentToolConfig } from "./tools/agentTool.js";

// ── Structured Output () ──────────────────────────────────────
export {
  structuredAgent,
  parseStructuredOutput,
  buildSchemaPromptSection,
  type OutputSchema,
  type ParseResult,
  type ParseSuccess,
  type ParseFailure,
  type StructuredAgentConfig,
} from "./agents/structuredOutput.js";

// ── Tool Loop Detection () ──────────────────────────────
export {
  ToolLoopDetector,
  type LoopDetectorConfig,
  type ToolCallRecord,
  type LoopInfo,
} from "./tools/loopDetector.js";

// ── Heartbeat / Proactive Scheduling () ─────────────────
export {
  Heartbeat,
  type ScheduledTask as HeartbeatTask,
  type StandingOrder,
  type HeartbeatConfig,
} from "./automation/heartbeat.js";

// ── Context Engine () ────────────────────────────────────
export {
  ContextEngine,
  type ContextSection as ContextEngineSection,
  type ContextEngineConfig,
  type ContextInspection,
  type SoulTransform,
} from "./agents/contextEngine.js";

// ── Delegate Architecture () ────────────────────────────
export {
  AgentRouter,
  type AgentEntry,
  type RoutingRule,
  type RoutableMessage,
  type PresenceInfo,
  type SessionScope,
} from "./agents/delegate.js";

// ── Gateway / Channels / Approvals ───────────────────────────────────────────
// NOT exported from the main barrel by design.
// Import explicitly via: import { Gateway } from 'yaaf/gateway'
// See src/gateway.ts for the opt-in entry point.

// ── Doctor (Embedded Expert Agent) ───────────────────────────────────────────
export {
  YaafDoctor,
  type YaafDoctorConfig,
  type DoctorIssue,
  type WatchOptions,
} from "./doctor/index.js";

// ── A2A Protocol (Agent-to-Agent Interop) ────────────────────────────────────
export {
  A2AClient,
  A2AServer,
  a2aTool,
  serveA2A,
  type AgentCard,
  type AgentSkill,
  type A2AMessage,
  type A2APart,
  type A2ATask,
  type A2ATaskStatus,
  type A2AArtifact,
  type A2AClientConfig,
  type A2AServerConfig,
  type A2AAgent,
} from "./integrations/a2a.js";

// ── MCP OAuth (OAuth 2.0 for MCP Servers) ────────────────────────────────────
export {
  McpOAuthClient,
  FileTokenStore,
  oauthMcpServer,
  type McpOAuthConfig,
  type OAuthTokens,
  type TokenStore,
  type AuthorizationUrlResult,
  type CallbackResult,
} from "./integrations/mcpOAuth.js";

// ── Remote Sessions ──────────────────────────────────────────────────────────
// NOT exported from the main barrel by design (like Gateway).
// Import explicitly via: import { RemoteSessionServer } from 'yaaf/remote'
// See src/remote.ts for the opt-in entry point.

// ── Knowledge Base Store (runtime read API) ───────────────────────────────────
// Compile-time tools (KBCompiler, KBLinter, etc.) are in 'yaaf/knowledge'.
export {
  KBStore,
  createKBTools,
  KnowledgeBase,
  FederatedKnowledgeBase,
  type CompiledDocument,
  type KBIndex,
  type KBIndexEntry,
  type SearchResult,
  type KBToolOptions,
  type KnowledgeBaseOptions,
} from "./knowledge/store/index.js";

// ── Outcome Evaluation (Gap #1) ─────────────────────────────────────────────
export {
  OutcomeRunner,
  type OutcomeConfig,
  type OutcomeResult,
  type OutcomeRubric,
  type RubricCriterion,
  type OutcomeEvents,
} from "./agents/outcome.js";

// ── Built-in Code Tools (Gap #4) ────────────────────────────────────────────
export {
  codeToolset,
  readFileTool,
  writeFileTool,
  editFileTool,
  bashTool,
  globTool,
  grepTool,
  webFetchTool,
  type CodeToolsetOptions,
} from "./tools/code/index.js";

// ── Agent Registry / Versioning (Gap #5) ────────────────────────────────────
export {
  AgentRegistry,
  type VersionedAgentConfig,
  type AgentRegistryEntry,
} from "./agents/registry.js";

// ── Deliverables / Files API (Gap #6) ────────────────────────────────────────
export {
  Deliverables,
  type Deliverable,
  type AddDeliverableOptions,
} from "./agents/deliverables.js";
