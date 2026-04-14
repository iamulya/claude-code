/**
 * Structured Output Example
 *
 * Demonstrates:
 *   - structuredAgent(model, config): force the LLM to return validated JSON
 *     matching a JSON Schema — returns a typed T (no parsing step needed)
 *   - parseStructuredOutput(): manual JSON extraction + validation on any string
 *     (handles markdown fences, embedded JSON, whitespace)
 *   - ParseResult: .ok / .data / .error discriminated union
 *   - Real-world use cases: review analysis, meeting note extraction
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import {
  Agent,
  structuredAgent,
  parseStructuredOutput,
  resolveModel,
  type OutputSchema,
} from 'yaaf'

// ─── schemas ─────────────────────────────────────────────────────────────────

// Schema for a product review analysis
const ReviewSchema: OutputSchema = {
  type: 'object',
  properties: {
    sentiment:  { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
    score:      { type: 'number', description: 'Overall score from 1-10' },
    pros:       { type: 'array', items: { type: 'string' } },
    cons:       { type: 'array', items: { type: 'string' } },
    summary:    { type: 'string', description: 'One-sentence summary' },
    recommend:  { type: 'boolean' },
  },
  required: ['sentiment', 'score', 'pros', 'cons', 'summary', 'recommend'],
}

type ReviewResult = {
  sentiment:  'positive' | 'negative' | 'neutral' | 'mixed'
  score:      number
  pros:       string[]
  cons:       string[]
  summary:    string
  recommend:  boolean
}

// Schema for meeting action items
const ActionItemsSchema: OutputSchema = {
  type: 'object',
  properties: {
    meeting_title: { type: 'string' },
    action_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task:     { type: 'string' },
          owner:    { type: 'string' },
          due:      { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['task', 'owner', 'priority'],
      },
    },
    decisions: { type: 'array', items: { type: 'string' } },
  },
  required: ['meeting_title', 'action_items', 'decisions'],
}

type ActionItemsResult = {
  meeting_title: string
  action_items:  { task: string; owner: string; due?: string; priority: string }[]
  decisions:     string[]
}

// ─── helper ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // Resolve the model from environment variables (same logic as `new Agent`)
  // structuredAgent() needs a ChatModel directly
  const model = resolveModel({})

  // ── 1. Review sentiment analysis ─────────────────────────────────────────
  banner('1. Product Review Analysis (structuredAgent)')

  const reviewText = `
    I bought this wireless keyboard 3 months ago and have mixed feelings.
    The typing experience is fantastic — quiet, responsive, and the key travel
    is perfect. Battery life is incredible, lasting almost 6 months on a charge.
    However, the Bluetooth connection drops randomly every few hours which is
    really frustrating during video calls. Also, the software for remapping keys
    is clunky and Windows-only. Price point is fair at $89.
  `

  // structuredAgent returns T directly — no JSON.parse needed
  const reviewAgent = structuredAgent<ReviewResult>(model, {
    name: 'ReviewAnalyst',
    systemPrompt: 'You are a product review analyst. Analyse the review and return structured JSON.',
    schema: ReviewSchema,
  })

  console.log('\nAnalysing product review...')
  const data = await reviewAgent.run(
    `Analyse this product review:\n\n${reviewText}`
  )

  console.log('\n✅ Typed result (no parsing step required):')
  console.log(`  Sentiment:  ${data.sentiment}`)
  console.log(`  Score:      ${data.score}/10`)
  console.log(`  Recommend:  ${data.recommend ? 'Yes' : 'No'}`)
  console.log(`  Summary:    ${data.summary}`)
  console.log(`  Pros:       ${data.pros.join(', ')}`)
  console.log(`  Cons:       ${data.cons.join(', ')}`)

  // ── 2. Meeting notes → action items ──────────────────────────────────────
  banner('2. Meeting Notes → Action Items (structuredAgent)')

  const meetingNotes = `
    Q2 Planning Meeting — April 14, 2026
    Attendees: Sarah (PM), Tom (Eng), Lisa (Design)

    We agreed to launch the dark mode feature by end of April. Tom will lead
    the implementation and needs to finish the toggle component by this Friday.
    Lisa will deliver final Figma specs by Wednesday. Sarah writes the release notes
    by next Monday. We decided NOT to delay the launch even if some edge cases remain.
    We also agreed to sunset the legacy export format in Q3. Tom to create a migration
    guide — low priority, no deadline set.
  `

  const meetingAgent = structuredAgent<ActionItemsResult>(model, {
    name: 'MeetingProcessor',
    systemPrompt: 'Extract structured action items and decisions from meeting notes.',
    schema: ActionItemsSchema,
  })

  console.log('\nProcessing meeting notes...')
  const meeting = await meetingAgent.run(
    `Extract action items and decisions:\n\n${meetingNotes}`
  )

  console.log(`\n✅ Meeting: "${meeting.meeting_title}"`)
  console.log('\n  Action Items:')
  for (const item of meeting.action_items) {
    const due = item.due ? ` (due: ${item.due})` : ''
    console.log(`    [${item.priority.toUpperCase()}] ${item.owner}: ${item.task}${due}`)
  }
  console.log('\n  Decisions:')
  meeting.decisions.forEach(d => console.log(`    • ${d}`))

  // ── 3. Manual parseStructuredOutput on any Agent's response ───────────────
  banner('3. parseStructuredOutput on a Regular Agent Response')

  // Use a regular Agent and validate the response post-hoc
  const rawAgent = new Agent({
    systemPrompt: 'Return JSON only. No markdown fences. No explanation.',
  })

  const raw = await rawAgent.run(
    'Return a JSON object with: language (string), year (number), typed (boolean). ' +
    'Values for TypeScript. Raw JSON only.'
  )

  const SimpleSchema: OutputSchema = {
    type: 'object',
    properties: {
      language: { type: 'string' },
      year:     { type: 'number' },
      typed:    { type: 'boolean' },
    },
    required: ['language', 'year', 'typed'],
  }

  // ParseResult is a discriminated union: { ok: true, data } | { ok: false, error, raw }
  const parsed = parseStructuredOutput<{ language: string; year: number; typed: boolean }>(raw, SimpleSchema)

  if (parsed.ok) {
    console.log('\n✅ Parsed from raw text:')
    console.log(`  Language: ${parsed.data.language}`)
    console.log(`  Year:     ${parsed.data.year}`)
    console.log(`  Typed:    ${parsed.data.typed}`)
  } else {
    // parseStructuredOutput handles markdown fences, embedded JSON, etc.
    // but if the model completely ignores instructions it can still fail
    console.log('\n⚠ Parse failed:', (parsed as { ok: false; error: string }).error)
    console.log('  Raw response:', raw.slice(0, 100))
  }
}

main().catch(console.error)
