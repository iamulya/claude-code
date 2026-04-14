/**
 * OpenAPI Tools Example
 *
 * Demonstrates:
 *   - Loading an OpenAPI 3.x spec and auto-generating tools
 *   - Agent interacting with a real REST API (httpbin.org)
 *   - Operation filtering (only expose specific endpoints)
 *   - Streaming tool call events while hitting live endpoints
 *   - Error handling (non-existent endpoints return error data, not crashes)
 *
 * httpbin.org is used as a real, publicly available echo API that needs no auth.
 * The agent can GET, POST, and DELETE against it — every response echoes back
 * exactly what was sent, proving the HTTP layer works end-to-end.
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import { Agent, OpenAPIToolset } from 'yaaf'

// ── OpenAPI Spec ─────────────────────────────────────────────────────────────

/**
 * A working OpenAPI 3.0 spec that targets httpbin.org.
 * httpbin echoes back requests — perfect for testing tool calling end-to-end.
 */
const HTTPBIN_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'HTTPBin Echo API',
    version: '1.0.0',
    description: 'A subset of httpbin.org endpoints for testing HTTP operations.',
  },
  servers: [{ url: 'https://httpbin.org' }],
  paths: {
    '/get': {
      get: {
        operationId: 'echoGet',
        summary: 'Echo GET request — returns all query parameters and headers sent',
        description: 'Send a GET request with any query parameters. The API echoes back everything it received.',
        parameters: [
          {
            name: 'message',
            in: 'query',
            description: 'A message to include in the request',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'count',
            in: 'query',
            description: 'A number parameter to include',
            required: false,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'Echoed GET request data',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/post': {
      post: {
        operationId: 'echoPost',
        summary: 'Echo POST request — returns the JSON body, headers, and URL sent',
        description: 'Send a POST request with a JSON body. The API echoes back the body, headers, and meta info.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Name to include in the payload' },
                  data: { type: 'string', description: 'Any data to include' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional list of tags',
                  },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Echoed POST request data including body',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/status/{code}': {
      get: {
        operationId: 'getStatus',
        summary: 'Return a specific HTTP status code',
        description: 'Requests a response with the given HTTP status code. Useful for testing error handling.',
        parameters: [
          {
            name: 'code',
            in: 'path',
            description: 'HTTP status code to return (e.g., 200, 404, 500)',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'Success response' },
          '404': { description: 'Not found response' },
          '500': { description: 'Server error response' },
        },
      },
    },
    '/headers': {
      get: {
        operationId: 'getHeaders',
        summary: 'Return the request headers as JSON',
        description: 'Returns all headers sent with the request. Useful for verifying auth and custom headers.',
        responses: {
          '200': {
            description: 'JSON object of all request headers',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/delay/{seconds}': {
      get: {
        operationId: 'delayedResponse',
        summary: 'Return a delayed response after the specified number of seconds',
        description: 'Waits the specified number of seconds before responding. Max is 10.',
        parameters: [
          {
            name: 'seconds',
            in: 'path',
            description: 'Number of seconds to delay (max 10)',
            required: true,
            schema: { type: 'integer', minimum: 0, maximum: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'Delayed response with timing info',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/ip': {
      get: {
        operationId: 'getMyIp',
        summary: 'Return the caller\'s IP address',
        description: 'Returns the origin IP address of the caller as JSON.',
        responses: {
          '200': {
            description: 'JSON with origin IP',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/user-agent': {
      get: {
        operationId: 'getUserAgent',
        summary: 'Return the caller\'s User-Agent string',
        description: 'Returns the User-Agent header value of the caller.',
        responses: {
          '200': {
            description: 'JSON with user-agent',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Generate tools from OpenAPI spec ────────────────────────────────────
  banner('1. Generating Tools from OpenAPI Spec')

  const toolset = OpenAPIToolset.fromSpec(HTTPBIN_SPEC)

  console.log(`\nSpec: ${HTTPBIN_SPEC.info.title} v${HTTPBIN_SPEC.info.version}`)
  console.log(`Server: ${HTTPBIN_SPEC.servers[0].url}`)
  console.log(`\nGenerated ${toolset.tools.length} tools:`)
  for (const tool of toolset.tools) {
    const schema = tool.inputSchema
    const params = Object.keys(schema.properties ?? {}).join(', ') || '(none)'
    console.log(`  • ${tool.name.padEnd(22)} params: ${params}`)
  }

  // ── 2. Agent with all tools — simple query ─────────────────────────────────
  banner('2. Agent Calling httpbin (Echo GET)')

  const agent = new Agent({
    name: 'HttpBinAssistant',
    systemPrompt: `You are an API testing assistant with access to httpbin.org endpoints.
Use the available tools to make HTTP requests when the user asks.
Always summarize what the API returned in a clear, human-readable format.
When you call echo_get, pass the user's message in the "message" query parameter.`,
    tools: toolset.tools,
  })

  console.log('\nUser: "Send a GET request with message=hello&count=42"')
  process.stdout.write('\nAssistant: ')

  for await (const event of agent.runStream('Send a GET request with message hello and count 42')) {
    switch (event.type) {
      case 'tool_call_start':
        console.log(`\n  🔧 Calling ${event.name}(${JSON.stringify(event.arguments).slice(0, 100)})`)
        break
      case 'tool_call_result': {
        const resultStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        console.log(`  ✓  Response: ${resultStr.slice(0, 120)}...`)
        process.stdout.write('\nAssistant: ')
        break
      }
      case 'text_delta':
        process.stdout.write(event.content)
        break
    }
  }
  console.log()

  // ── 3. POST request with body ──────────────────────────────────────────────
  banner('3. Agent Calling httpbin (Echo POST with body)')

  console.log('\nUser: "Post a new entry with name=Fido and data=golden_retriever"')
  process.stdout.write('\nAssistant: ')

  for await (const event of agent.runStream(
    'Send a POST request with name "Fido" and data "golden_retriever"',
  )) {
    switch (event.type) {
      case 'tool_call_start':
        console.log(`\n  🔧 Calling ${event.name}(${JSON.stringify(event.arguments).slice(0, 100)})`)
        break
      case 'tool_call_result': {
        const resultStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        console.log(`  ✓  Response: ${resultStr.slice(0, 120)}...`)
        process.stdout.write('\nAssistant: ')
        break
      }
      case 'text_delta':
        process.stdout.write(event.content)
        break
    }
  }
  console.log()

  // ── 4. Error handling — request a 404 status ───────────────────────────────
  banner('4. Error Handling — Requesting a 404 Status')

  console.log('\nUser: "Request a 404 status code from the API"')
  process.stdout.write('\nAssistant: ')

  for await (const event of agent.runStream('Request a 404 status code from the API')) {
    switch (event.type) {
      case 'tool_call_start':
        console.log(`\n  🔧 Calling ${event.name}(${JSON.stringify(event.arguments)})`)
        break
      case 'tool_call_result': {
        const resultStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        console.log(`  ✓  Response: ${resultStr.slice(0, 120)}`)
        process.stdout.write('\nAssistant: ')
        break
      }
      case 'text_delta':
        process.stdout.write(event.content)
        break
    }
  }
  console.log()

  // ── 5. Filtered toolset — only expose specific operations ──────────────────
  banner('5. Filtered Toolset (only GET operations)')

  const getOnlyToolset = OpenAPIToolset.fromSpec(HTTPBIN_SPEC, {
    operationFilter: (_id, method) => method === 'get',
  })

  console.log(`\nFiltered to ${getOnlyToolset.tools.length} GET-only tools:`)
  for (const tool of getOnlyToolset.tools) {
    console.log(`  • ${tool.name} (readOnly: ${tool.isReadOnly({})}, concurrencySafe: ${tool.isConcurrencySafe({})})`)
  }

  // ── 6. Multi-tool call — agent decides which tools to use ──────────────────
  banner('6. Multi-Tool — Agent Decides What to Call')

  const multiAgent = new Agent({
    name: 'MultiToolBot',
    systemPrompt: `You are an HTTP testing assistant. You have tools for httpbin.org.
When asked to do multiple things, use the right tools for each.
Summarize all results together at the end.`,
    tools: toolset.tools,
  })

  console.log('\nUser: "What is my IP address and user agent?"')
  process.stdout.write('\nAssistant: ')

  let toolCallCount = 0
  for await (const event of multiAgent.runStream('What is my IP address and user agent?')) {
    switch (event.type) {
      case 'tool_call_start':
        toolCallCount++
        console.log(`\n  🔧 [${toolCallCount}] ${event.name}(${JSON.stringify(event.arguments).slice(0, 60)})`)
        break
      case 'tool_call_result': {
        const resultStr = typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        console.log(`  ✓  [${toolCallCount}] ${resultStr.slice(0, 100)}...`)
        break
      }
      case 'text_delta':
        if (toolCallCount > 0 && event.content.length > 0) {
          process.stdout.write(event.content)
        }
        break
      case 'usage':
        console.log(`\n\n📊 Usage: ${event.usage.totalPromptTokens} prompt + ${event.usage.totalCompletionTokens} completion tokens, ${event.usage.llmCalls} LLM calls`)
        break
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  banner('✅ All OpenAPI tool scenarios completed successfully!')
  console.log(`
  Generated ${toolset.tools.length} tools from spec (zero manual tool definitions).
  The agent called live httpbin.org endpoints via auto-generated RestApiTools.
  Error responses were returned as data (no crashes) for LLM self-correction.
  `)
}

main().catch(console.error)
