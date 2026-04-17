/**
 * AgentTool — Wrap any AgentRunner as a Tool for another agent.
 *
 * This is the fundamental composition primitive for multi-agent systems.
 * It allows a "parent" agent to invoke a "child" agent as if it were a
 * regular tool — the parent stays in control and receives the child's
 * output as a tool result.
 *
 * Equivalent to ADK's `AgentTool(specialist_agent)`.
 *
 * @example
 * ```ts
 * const researcher = new AgentRunner({
 * model: myModel,
 * tools: [searchTool, readUrlTool],
 * systemPrompt: 'You are a research assistant. Find accurate information.',
 * });
 *
 * // Wrap the researcher as a tool for the coordinator
 * const researchTool = agentTool(researcher, {
 * name: 'research',
 * description: 'Research a topic using web search and URL reading',
 * });
 *
 * const coordinator = new AgentRunner({
 * model: myModel,
 * tools: [researchTool, writeTool, reviewTool],
 * systemPrompt: 'You coordinate writing tasks. Use research for facts.',
 * });
 * ```
 *
 * @module tools/agentTool
 */

import { buildTool, type Tool } from "./tool.js";
import type { WorkflowStep } from "../agents/workflow.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentToolConfig = {
  /** Tool name the parent agent will use to invoke this agent */
  name: string;
  /**
   * Description sent to the parent LLM so it knows WHEN to invoke this agent.
   * Be specific — "Research a topic" is better than "Call an agent".
   */
  description: string;
  /**
   * Maximum result length (characters) before truncation.
   * Default: 50,000.
   */
  maxResultChars?: number;
  /**
   * Whether this agent-tool can run concurrently with other tools.
   * Default: true (agent invocations are self-contained).
   */
  concurrent?: boolean;
  /**
   * Custom input schema. Default: `{ query: string }`.
   * Override if your agent expects structured input.
   */
  inputSchema?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /**
   * Transform the agent's raw output before returning to the parent.
   * Useful for summarization or extraction.
   */
  transformResult?: (output: string) => string | Promise<string>;
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Wrap any agent (AgentRunner or WorkflowAgent) as a Tool.
 *
 * The parent agent invokes this tool with a `query` parameter.
 * The query is passed to the wrapped agent as a user message.
 * The agent's final response becomes the tool result.
 *
 * @param agent - The agent to wrap (AgentRunner or any WorkflowStep)
 * @param config - Tool name, description, and options
 * @returns A Tool that the parent agent can use
 */
export function agentTool(
  agent: WorkflowStep,
  config: AgentToolConfig,
): Tool<{ query: string }, { result: string }> {
  const inputSchema = config.inputSchema ?? {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The query or instruction to send to the agent",
      },
    },
    required: ["query"],
  };

  return buildTool({
    name: config.name,
    aliases: [],
    inputSchema,
    maxResultChars: config.maxResultChars ?? 50_000,

    describe(input: { query: string }) {
      return `Invoking agent "${config.name}": ${input.query.slice(0, 100)}${input.query.length > 100 ? "..." : ""}`;
    },

    async call(input: { query: string }, context) {
      const output = await agent.run(input.query, context.signal);

      const result = config.transformResult ? await config.transformResult(output) : output;

      return { data: { result } };
    },

    isReadOnly: () => false,
    isConcurrencySafe: () => config.concurrent ?? true,
    isDestructive: () => false,
    isEnabled: () => true,
    checkPermissions: async () => ({ behavior: "allow" as const }),
    userFacingName: () => config.name,

    getActivityDescription(input) {
      if (input?.query) {
        const q = input.query.slice(0, 60);
        return `Running ${config.name}: ${q}${input.query.length > 60 ? "..." : ""}`;
      }
      return `Running ${config.name}`;
    },

    prompt() {
      return config.description;
    },
  });
}

/**
 * Create multiple agent-tools from a registry of named agents.
 *
 * @example
 * ```ts
 * const tools = agentTools({
 * research: { agent: researcher, description: 'Research a topic' },
 * code: { agent: coder, description: 'Write or fix code' },
 * review: { agent: reviewer, description: 'Review code quality' },
 * });
 *
 * const coordinator = new AgentRunner({
 * model: myModel,
 * tools: [...tools, ...directTools],
 * systemPrompt: 'You coordinate tasks between specialists.',
 * });
 * ```
 */
export function agentTools(
  registry: Record<string, { agent: WorkflowStep } & Omit<AgentToolConfig, "name">>,
): Tool[] {
  return Object.entries(registry).map(([name, { agent, ...config }]) =>
    agentTool(agent, { ...config, name }),
  );
}
