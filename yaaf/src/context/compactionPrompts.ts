/**
 * Structured Compaction Prompts — production-quality summarization prompts
 * with analysis scratchpad and anti-tool preamble.
 *
 * Inspired by the main repo's compact/prompt.ts (376 lines). Provides
 * carefully engineered prompts that produce high-quality conversation
 * summaries with 9 required sections.
 *
 * @example
 * ```ts
 * import { buildCompactionPrompt, stripAnalysisBlock } from './compactionPrompts.js';
 *
 * const prompt = buildCompactionPrompt({ partial: false });
 * const summary = await model.complete({ messages: [...msgs, { role: 'user', content: prompt }] });
 * const clean = stripAnalysisBlock(summary.content);
 * ```
 */

// ── Configuration ────────────────────────────────────────────────────────────

export type CompactionPromptConfig = {
  /**
   * If true, generates a "partial" prompt that only summarizes recent messages
   * (used when old messages are preserved and only the middle is compacted).
   * If false, generates a "full" prompt that summarizes the entire conversation.
   */
  partial?: boolean
  /**
   * Custom sections to include in the summary. If omitted, uses all 9 defaults.
   */
  sections?: string[]
  /**
   * Extra instructions appended to the prompt.
   */
  additionalInstructions?: string
}

// ── No-Tools Preamble ────────────────────────────────────────────────────────

const NO_TOOLS_PREAMBLE = `CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.

- Do NOT use Read, Bash, Grep, Glob, Edit, Write, or ANY other tool.
- You already have all the context you need in the conversation above.
- Tool calls will be REJECTED and will waste your only turn — you will fail the task.
- Your entire response must be plain text: an <analysis> block followed by a <summary> block.

`

// ── Analysis Block Instructions ──────────────────────────────────────────────

const ANALYSIS_FULL = `Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts. In your analysis:

1. Chronologically analyze each message and section. For each section identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details: file names, code snippets, function signatures, file edits
   - Errors encountered and how they were fixed
   - Specific user feedback, especially if the user told you to do something differently
2. Double-check for technical accuracy and completeness.`

const ANALYSIS_PARTIAL = `Before providing your final summary, wrap your analysis in <analysis> tags. In your analysis:

1. Analyze the recent messages chronologically. For each section identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details: file names, code snippets, function signatures
   - Errors encountered and fixes applied
   - User feedback (especially corrections)
2. Double-check for accuracy and completeness.`

// ── Default Section Prompts ──────────────────────────────────────────────────

const DEFAULT_SECTIONS = [
  `1. **Primary Request and Intent**: Capture all of the user's explicit requests and intents in detail.`,
  `2. **Key Technical Concepts**: List all important technical concepts, technologies, and frameworks discussed.`,
  `3. **Files and Code Sections**: Enumerate specific files and code sections examined, modified, or created. Include full code snippets where applicable and include a summary of why the file read or edit is important.`,
  `4. **Errors and Fixes**: List all errors encountered and how they were fixed. Pay special attention to user feedback about corrections.`,
  `5. **Problem Solving**: Document problems solved and ongoing troubleshooting efforts.`,
  `6. **All User Messages**: List ALL user messages that are not tool results. These are critical for understanding intent changes.`,
  `7. **Pending Tasks**: Outline any pending tasks that have explicitly been asked for.`,
  `8. **Current Work**: Describe in detail what was being worked on immediately before this summary. Include file names and code snippets.`,
  `9. **Next Step**: List the next step that is directly in line with the user's most recent explicit request. Include direct quotes showing exactly what task you were working on. If the last task was concluded, only list next steps if explicitly requested.`,
]

// ── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Build a structured compaction prompt with analysis scratchpad,
 * anti-tool preamble, and 9 required sections.
 */
export function buildCompactionPrompt(config: CompactionPromptConfig = {}): string {
  const { partial = false, sections, additionalInstructions } = config

  const analysisBlock = partial ? ANALYSIS_PARTIAL : ANALYSIS_FULL
  const sectionList = sections ?? DEFAULT_SECTIONS
  const scope = partial
    ? 'the recent messages (the older messages will be preserved)'
    : 'the entire conversation so far'

  return `${NO_TOOLS_PREAMBLE}Your task is to create a detailed summary of ${scope}, paying close attention to the user's explicit requests and your previous actions. This summary should be thorough in capturing technical details, code patterns, and architectural decisions essential for continuing development without losing context.

${analysisBlock}

Your summary should include the following sections:

${sectionList.join('\n')}

${additionalInstructions ?? ''}

Wrap your final output in <summary></summary> tags. The <analysis> block is a scratchpad — only the <summary> block will be kept.`.trim()
}

// ── Output Parsing ───────────────────────────────────────────────────────────

/**
 * Extract the <summary> block from the model's output, stripping the
 * <analysis> scratchpad.
 */
export function stripAnalysisBlock(text: string): string {
  // Try to extract <summary> block
  const summaryMatch = text.match(/<summary>([\s\S]*?)<\/summary>/i)
  if (summaryMatch) {
    return summaryMatch[1]!.trim()
  }

  // If no <summary> tags, strip <analysis> block and return the rest
  const stripped = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').trim()
  return stripped || text
}

/**
 * Extract the <analysis> block (useful for debugging compaction quality).
 */
export function extractAnalysisBlock(text: string): string | null {
  const match = text.match(/<analysis>([\s\S]*?)<\/analysis>/i)
  return match ? match[1]!.trim() : null
}
