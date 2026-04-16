# YAAF Developer Playground

An interactive agent with **five real tools**, served through the YAAF **Dev UI** — point
your browser at `http://localhost:3456` and start chatting.

## What it demonstrates

| Feature | How it shows up |
|---|---|
| **Dev UI** | Full browser-based chat interface at `GET /` |
| **Tool calling** | Inspector panel shows every tool call with timing |
| **Streaming** | Characters appear as they are generated |
| **Multi-turn context** | Conversation history is sent with every request |
| **Markdown rendering** | Code blocks, tables, lists — all syntax-highlighted |
| **Token usage** | Prompt / completion / cache tokens in the inspector |

## Tools

| Tool | Description |
|---|---|
| `calculate` | Evaluate any math expression (`Math.sqrt(2) ** 10`) |
| `get_system_info` | Live Node.js version, platform, memory, uptime |
| `fetch_npm_info` | Real metadata from the npm registry |
| `list_yaaf_examples` | Enumerate every example in this repo |
| `convert_units` | Temperature, length, weight, data, speed |

## Quick start

```bash
# From this directory
GEMINI_API_KEY=your_key npm start

# Or with Anthropic
ANTHROPIC_API_KEY=your_key npm start

# Or with OpenAI
OPENAI_API_KEY=your_key npm start
```

Then open **http://localhost:3456** in your browser.

## Example prompts to try

```
What is 2 ** 32?
Look up the zod npm package — is it well maintained?
Show me my system info
Convert 100 mph to km/h and m/s
What YAAF examples are in this repo?
What is sin(45 degrees) in radians? Use Math constants.
Compare the size of 1 petabyte in gigabytes
```

## Changing the port

```bash
PORT=8080 GEMINI_API_KEY=your_key npm start
```

## How it works

```ts
import { Agent, buildTool, createServer } from 'yaaf'

const agent = new Agent({
  name:   'playground-agent',
  tools:  [calculate, getSystemInfo, fetchNpmInfo, listExamples, convertUnits],
})

createServer(agent, {
  devUi:        true,   // ← serves the browser UI at GET /
  model:        MODEL,
  systemPrompt: SYSTEM_PROMPT,
  multiTurn:    true,   // ← sends conversation history with each request
})
```

The Dev UI is a zero-dependency, single-file HTML page inlined in the server binary.
No build step, no CDN, no npm packages required in the browser.
