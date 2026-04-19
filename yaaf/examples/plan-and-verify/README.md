# Plan-and-Verify Example

Demonstrates three YAAF features for safer, auditable agentic workflows:

| Feature | What it solves |
|---------|---------------|
| `planMode.plannerTools` | Planner can explore the codebase before writing a plan (instead of reasoning blindly) |
| `session.setPlan()` / `.getPlan()` | Approved plan survives context compaction, crashes, and process restarts |
| Verification agent recipe | Adversarially checks the implementation — tries to *break* it, not just confirm it works |

---

## Run

```sh
# Non-interactive (auto-approve plan)
GEMINI_API_KEY=... npx tsx src/main.ts --auto

# Interactive (you approve/reject the plan)
GEMINI_API_KEY=... npx tsx src/main.ts

# Works with OpenAI too
OPENAI_API_KEY=sk-... npx tsx src/main.ts --auto
```

No API key? Run without one to see a feature walkthrough.

---

## Feature 1: `planMode.plannerTools`

Previously, YAAF's plan phase ran with `tools: []` — the planner had no way to explore the codebase before generating its plan. This means it had to reason entirely from the user message and system prompt, often producing generic or misaligned plans.

With `plannerTools`, you can pass a **read-only subset** of your tools so the planner can search files, read documents, and query APIs before writing the plan:

```ts
const agent = new Agent({
  systemPrompt: 'You are a careful engineer.',
  tools: [searchTool, readFileTool, writeFileTool, runTestsTool],
  planMode: {
    // Read-only tools for the planning phase.
    // Write tools (writeFileTool, runTestsTool) are withheld until after approval.
    plannerTools: [searchTool, readFileTool],

    onPlan: async (plan) => {
      console.log(plan)
      return await askUserApproval()
    },
  },
})
```

**Why it matters:** The planner has no file access by default — it reasons only from the user message and system prompt, which often produces generic or misaligned plans. Giving the planner read-only tools grounds the plan in the actual codebase before any code is written.

**Security:** Write tools are withheld until after the approval gate. Only tools passed in `plannerTools` are available during planning. The planner inherits the same security hooks, sandbox, and access policy as the main runner.

---

## Feature 2: `session.setPlan()` / `session.getPlan()`

Previously, the approved plan was an ephemeral string — lost after context compaction or process restart. This made it impossible to:
- Audit what plan the agent was executing
- Resume an interrupted session with an already-approved plan
- Reference the plan from outside the agent loop

Now, `Session` stores the plan as a `{ type: "plan" }` record in the JSONL stream. It survives:

| Event | Before | After |
|-------|--------|-------|
| Context compaction | Plan lost | Re-written into compact file |
| Process crash | Plan lost | Restored from JSONL on resume |
| Session resume | No plan | `session.getPlan()` → plan string |
| Adapter backend | Not supported | Via `saveMeta({ plan })` |

```ts
// The plan is persisted automatically inside runWithPlanMode
// when onPlan returns true. You don't need to call it manually.
const result = await agent.run(task)

// Retrieve the persisted plan at any time:
const plan = session.getPlan()  // → string | null

// Or set it manually (e.g., for externally-generated plans):
await session.setPlan(externalPlan)
```

### JSONL record format

```json
{ "type": "plan", "plan": "1. Search auth module\n2. Add bcrypt\n3. Run tests", "timestamp": "2026-04-18T15:30:00.000Z" }
```

---

## Feature 3: Verification Agent Recipe

The `buildVerificationAgent()` factory creates an adversarial YAAF Agent that tries to **break** the implementation rather than confirm it works.

### Philosophy

> Standard verification asks: "does this work?"
> Adversarial verification asks: "how do I break this?"

The difference is qualitative. Standard LLM code review finds confirmation — it interprets ambiguous results charitably, stops at the happy path, and calls it done. An adversarial verifier actively probes:
- **Boundary values**: empty inputs, very long strings, unicode, MAX_INT
- **Idempotency**: same mutating request twice
- **Concurrency**: parallel requests to shared state
- **Orphan operations**: referencing IDs that don't exist

### Usage

```ts
import { buildVerificationAgent, parseVerdict } from './verificationAgent.js'

const verifier = buildVerificationAgent()

const report = await verifier.run(`
  Task: replaced plain-text password comparison with bcrypt
  Files changed: src/auth/login.ts
  Approach: used bcrypt.compare() + bcrypt.hash() on registration
`)

const { verdict, report: output } = parseVerdict(report)
// verdict → 'PASS' | 'FAIL' | 'PARTIAL' | null
```

### Structured evidence format

Every check must have:
```
### Check: [what you're verifying]
**Command run:**
  [exact command executed]
**Output observed:**
  [actual output]
**Result: PASS** (or FAIL)
```

A check without a `Command run:` is a **skip**, not a verification. The verifier knows a caller may re-run its commands to spot-check evidence.

### Customisation

```ts
const verifier = buildVerificationAgent({
  // Replace the simulated shell with a real one in production
  tools: [bashTool, playwrightTool],

  // Focus the verifier on your specific attack surface
  extraInstructions: 'Focus on SQL injection and timing attacks.',

  // Use a stronger model for complex verification tasks
  model: 'gemini-2.5-pro',

  // More turns for deep exploration
  maxIterations: 20,
})
```

### Verdicts

| Verdict | Meaning |
|---------|---------|
| `PASS` | Implementation is correct; adversarial probes found no issues |
| `FAIL` | At least one check failed with evidence — includes exact commands and output to reproduce |
| `PARTIAL` | Environmental limitation prevented full verification (no test framework, required service unavailable) |

---

## Architecture

```
User Request
  │
  ▼
Planning Phase  ─── plannerTools (search + read) ──→ grounded plan
  │
  ▼
Approval Gate  ─── onPlan callback + session.setPlan() ──→ plan persisted
  │
  ▼
Execution Phase  ─── full tools (read + write) ──→ implementation
  │
  ▼
Verification Phase  ─── adversarial agent ──→ PASS / FAIL / PARTIAL verdict
```

---

## Files

| File | Description |
|------|-------------|
| `src/main.ts` | Full end-to-end demo: plan → approve → execute → verify |
| `src/verificationAgent.ts` | Reusable factory: `buildVerificationAgent()` + `parseVerdict()` |
