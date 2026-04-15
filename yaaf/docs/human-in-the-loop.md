# Human-in-the-Loop Agents

YAAF implements the [12 Factor Agents](https://humanlayer.dev/blog/12-factor-agents) **stateless reducer** pattern (Factors 5, 6, 7 & 12) through three primitives:

```ts
agent.step(thread)          // one LLM turn → updated thread
agent.resume(thread, res)   // inject human resolution → continue
agent.runThread(thread)     // step loop to completion (no suspension)
```

---

## Core Concepts

### AgentThread

A thread is a plain JSON object that captures the complete state of an agent conversation. It is the **single source of truth** — there is no separate "execution state".

```ts
import { createThread, serializeThread, deserializeThread } from 'yaaf'

// Create
const thread = createThread('Deploy v1.2.3 to production')

// Step
const { thread: updated, done, suspended } = await agent.step(thread)

// Serialize → store anywhere (Redis, DynamoDB, file, queue)
const json = serializeThread(updated)

// Deserialize → resume from any process / serverless function
const restored = deserializeThread(json)
```

```ts
type AgentThread = {
  id: string               // unique thread ID
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
  step: number             // increments with each agent.step() call
  messages: ChatMessage[]  // full conversation history — the source of truth
  done: boolean            // true when final response is ready
  finalResponse?: string   // set when done === true
  suspended?: SuspendReason // set when agent needs external input
  metadata?: Record<string, unknown>
}
```

---

## Step Loop Pattern

The simplest usage — run to completion with no human involvement:

```ts
import { createThread } from 'yaaf'

let thread = createThread('Summarise the Q4 report')
let { thread: t, done, suspended } = await agent.step(thread)

while (!t.done && !t.suspended) {
  ;({ thread: t } = await agent.step(t))
}

console.log(t.finalResponse)
```

Or use the convenience wrapper:

```ts
const { thread, response } = await agent.runThread(createThread('Summarise Q4'))
console.log(response)
```

---

## Human Approval (requiresApproval)

Mark any tool with `requiresApproval: true` (or a function `(args) => boolean`). When the LLM calls that tool, `step()` **suspends** before execution and returns the pending call for your approval logic.

```ts
import { buildTool } from 'yaaf'

const deployTool = buildTool({
  name: 'deploy_to_production',
  description: 'Deploy a version to production – irreversible',
  inputSchema: {
    type: 'object',
    properties: {
      version: { type: 'string' },
      reason:  { type: 'string' },
    },
    required: ['version', 'reason'],
  },
  // Static: always requires approval
  requiresApproval: true,

  // Or dynamic: only require approval for production
  // requiresApproval: (args) => args.environment === 'production',

  async call({ version }) {
    return { status: 'deployed', version }
  },
})
```

### Approve / Reject

```ts
const { thread, suspended } = await agent.step(createThread('deploy v1.3.0'))

if (suspended?.type === 'awaiting_approval') {
  console.log(`Pending: ${suspended.pendingToolCall.name}`)
  console.log(`Args:`, suspended.args)
  console.log(`Message:`, suspended.message)

  // Serialize and save — agent process can die here safely
  await db.save(serializeThread(thread))
  await slack.send(`Approve deployment?`, { threadId: thread.id })

  // ... later, on webhook/button click:
  const saved = deserializeThread(await db.load(threadId))

  // Approve — tool executes now, then step() continues
  const { thread: resumed } = await agent.resume(saved, { type: 'approved' })

  // Or reject with a reason — LLM sees the rejection and can plan an alternative
  const { thread: resumed } = await agent.resume(saved, {
    type: 'rejected',
    reason: 'Not during business hours',
  })
}
```

---

## Human Input (request_human_input)

The LLM can ask the human a question mid-task by calling the built-in `request_human_input` (or `ask_human`) tool name. This suspends the agent waiting for a text response.

```ts
// The agent can call this tool by name — no registration needed
// Suspension fires automatically when detected

const { thread, suspended } = await agent.step(createThread('Plan the deployment'))

if (suspended?.type === 'awaiting_human_input') {
  console.log('Agent asks:', suspended.question)
  // urgency: 'low' | 'medium' | 'high' (optional hint)

  const response = await getUserInput(suspended.question)

  const { thread: continued } = await agent.resume(thread, {
    type: 'human_input',
    response,
  })
}
```

---

## Async Job Results (awaiting_async_result)

For long-running jobs (CI pipelines, ML training, batch ETL):

```ts
// After kicking off a job, manually construct the suspension:
const thread: AgentThread = {
  ...createThread('run training job'),
  suspended: {
    type: 'awaiting_async_result',
    jobId: 'job_abc123',
    toolName: 'run_training',
  },
}
await db.save(serializeThread(thread))

// When job completes (webhook, polling, queue):
const saved = deserializeThread(await db.load(threadId))
const { thread: resumed } = await agent.resume(saved, {
  type: 'async_result',
  result: { accuracy: 0.94, loss: 0.12 },
})
```

---

## Thread Forking

Branch a thread at any point for "what-if" testing or A/B agent paths:

```ts
import { forkThread } from 'yaaf'

const original = createThread('Review and deploy PR #42')
const { thread: atStep3 } = await agent.step(original)
const { thread: atStep4 } = await agent.step(atStep3)

// Fork here — try two different approval paths
const branchA = forkThread(atStep4, { scenario: 'approve' })
const branchB = forkThread(atStep4, { scenario: 'reject' })

const [resultA, resultB] = await Promise.all([
  agent.resume(branchA, { type: 'approved' }),
  agent.resume(branchB, { type: 'rejected', reason: 'Too risky' }),
])
```

---

## Multi-Process / Serverless Resume

Because threads are plain JSON, they survive process boundaries:

```ts
// Lambda A — handles incoming request
export const handler = async (event) => {
  const thread = createThread(event.body.message)
  const { thread: t, suspended } = await agent.step(thread)

  if (suspended?.type === 'awaiting_approval') {
    await dynamodb.put({ Item: { id: t.id, thread: serializeThread(t) } })
    await ses.send(`Action required: ${suspended.message}`, { threadId: t.id })
    return { statusCode: 202, body: JSON.stringify({ threadId: t.id }) }
  }

  return { statusCode: 200, body: t.finalResponse }
}

// Lambda B — handles /resume/:threadId from approval webhook
export const resumeHandler = async (event) => {
  const { threadId, approved, reason } = JSON.parse(event.body)
  const item = await dynamodb.get({ Key: { id: threadId } })
  let thread = deserializeThread(item.thread)

  const resolution = approved
    ? { type: 'approved' as const }
    : { type: 'rejected' as const, reason }

  let result = await agent.resume(thread, resolution)
  thread = result.thread

  while (!thread.done && !thread.suspended) {
    result = await agent.step(thread)
    thread = result.thread
  }

  if (thread.done) await dynamodb.delete({ Key: { id: threadId } })
  return { statusCode: 200, body: thread.finalResponse }
}
```

---

## API Reference

### `createThread(message, metadata?)`
Create a new thread from an initial user message.

### `forkThread(thread, metadata?)`
Clone a thread at its current state with a new ID. The original is not modified.

### `serializeThread(thread)`
Convert thread to a JSON string for storage.

### `deserializeThread(json)`
Restore a thread from a JSON string.

### `agent.step(thread, options?)`
Execute one LLM turn. Returns `{ thread, done, response?, suspended? }`.
- `done: true` → `response` contains the final text
- `suspended` set → serialize and call `agent.resume()` when ready
- Neither → call `step()` again

### `agent.resume(thread, resolution, options?)`
Inject a resolution into a suspended thread and execute one more step.

| Resolution type | When to use |
|----------------|-------------|
| `{ type: 'approved', result? }` | Approve an `awaiting_approval` suspension |
| `{ type: 'rejected', reason? }` | Reject an `awaiting_approval` suspension |
| `{ type: 'human_input', response }` | Answer an `awaiting_human_input` suspension |
| `{ type: 'async_result', result, error? }` | Resolve an `awaiting_async_result` suspension |

### `agent.runThread(thread, options?)`
Run a thread fully to completion using the internal step loop. Throws if the agent suspends — use `step()` + `resume()` for human-in-the-loop.

---

## Example

See [`examples/human-in-the-loop/`](../examples/human-in-the-loop/) for a complete deployment agent with:
- Safe tools (no approval) — `list_versions`, `get_deployment_status`, `run_preflight_checks`
- High-stakes tools (approval required) — `deploy_to_production`, `rollback_production`
- Thread persistence to disk
- CLI-based human approval prompt
- Resume on restart from serialized thread

```bash
# Run with Gemini
GEMINI_API_KEY=xxx npx tsx examples/human-in-the-loop/src/index.ts

# Run with OpenAI
OPENAI_API_KEY=xxx npx tsx examples/human-in-the-loop/src/index.ts

# Custom task
GEMINI_API_KEY=xxx npx tsx examples/human-in-the-loop/src/index.ts \
  "Check the current state and deploy v1.3.0 to production if checks pass"
```
