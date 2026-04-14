/**
 * YAAF A2A Server — A "Weather Specialist" Agent
 *
 * This file runs a YAAF agent as an A2A-compliant server.
 * Any A2A client (Vercel AI SDK, LangGraph, ADK, etc.) can discover
 * and interact with it using the A2A protocol.
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/yaaf-server.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/yaaf-server.ts
 */

import { Agent, serveA2A, buildTool } from 'yaaf'

// ── Weather Tools ────────────────────────────────────────────────────────────

/**
 * Simulated weather data. In production, this would call a real weather API.
 * The point of this example is the A2A protocol, not the weather API.
 */
const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
  'san francisco': { temp: 62, condition: 'Foggy', humidity: 85, wind: '12 mph W' },
  'new york': { temp: 78, condition: 'Partly Cloudy', humidity: 65, wind: '8 mph NE' },
  'london': { temp: 55, condition: 'Rainy', humidity: 90, wind: '15 mph SW' },
  'tokyo': { temp: 72, condition: 'Clear', humidity: 50, wind: '5 mph SE' },
  'paris': { temp: 68, condition: 'Sunny', humidity: 55, wind: '10 mph N' },
  'sydney': { temp: 70, condition: 'Warm & Clear', humidity: 45, wind: '7 mph NW' },
  'berlin': { temp: 60, condition: 'Overcast', humidity: 75, wind: '11 mph E' },
  'mumbai': { temp: 88, condition: 'Hot & Humid', humidity: 80, wind: '6 mph S' },
  'toronto': { temp: 65, condition: 'Partly Sunny', humidity: 60, wind: '9 mph W' },
  'dubai': { temp: 95, condition: 'Sunny & Hot', humidity: 35, wind: '4 mph NE' },
}

const getWeatherTool = buildTool({
  name: 'get_weather',
  maxResultChars: 10_000,
  inputSchema: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name (e.g., "San Francisco", "Tokyo")' },
    },
    required: ['city'],
  },
  describe: (input) => `Get weather for ${(input as any).city}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const city = (input.city as string).toLowerCase()
    const data = weatherData[city]
    if (!data) {
      return {
        data: {
          error: `Weather data not available for "${input.city}".`,
          availableCities: Object.keys(weatherData).map(c =>
            c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
          ),
        },
      }
    }
    return {
      data: {
        city: input.city,
        temperature: `${data.temp}°F (${Math.round((data.temp - 32) * 5 / 9)}°C)`,
        condition: data.condition,
        humidity: `${data.humidity}%`,
        wind: data.wind,
        forecast: 'Next 24h: Similar conditions expected.',
      },
    }
  },
})

const compareWeatherTool = buildTool({
  name: 'compare_weather',
  maxResultChars: 10_000,
  inputSchema: {
    type: 'object',
    properties: {
      cities: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of city names to compare weather for',
      },
    },
    required: ['cities'],
  },
  describe: (input) => `Compare weather for ${(input as any).cities?.join(', ')}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const cities = input.cities as string[]
    const results = cities.map(city => {
      const data = weatherData[city.toLowerCase()]
      return data
        ? { city, temp: data.temp, condition: data.condition, humidity: data.humidity }
        : { city, error: 'Not available' }
    })
    return { data: { comparison: results } }
  },
})

// ── Create the YAAF Agent ────────────────────────────────────────────────────

const weatherAgent = new Agent({
  name: 'WeatherSpecialist',
  systemPrompt: `You are a weather specialist agent. You have access to current weather data for major cities around the world.

When a user asks about weather:
1. Use the get_weather tool to fetch current conditions
2. Present the data in a clear, friendly format
3. Offer helpful context (e.g., "bring an umbrella" if rainy)

When asked to compare cities, use the compare_weather tool.

If a city isn't available, list the cities you DO have data for.
Always be concise and helpful.`,
  tools: [getWeatherTool, compareWeatherTool],
})

// ── Start the A2A Server ─────────────────────────────────────────────────────

const PORT = parseInt(process.env.A2A_PORT ?? '4100')

const handle = await serveA2A(weatherAgent, {
  name: 'YAAF Weather Specialist',
  description: 'A weather specialist agent built with YAAF. Provides current weather data for major cities worldwide.',
  version: '1.0.0',
  port: PORT,
  skills: [
    {
      id: 'weather_lookup',
      name: 'Weather Lookup',
      description: 'Get current weather conditions for a specific city',
      tags: ['weather', 'temperature', 'forecast'],
      examples: ['What is the weather in Tokyo?', 'Is it raining in London?'],
    },
    {
      id: 'weather_comparison',
      name: 'Weather Comparison',
      description: 'Compare weather conditions across multiple cities',
      tags: ['weather', 'comparison', 'travel'],
      examples: ['Compare weather in Paris and Berlin', 'Which is warmer: Dubai or Mumbai?'],
    },
  ],
})

console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║  YAAF Weather Agent — A2A Server Ready                    ║
  ╠════════════════════════════════════════════════════════════╣
  ║                                                            ║
  ║  Agent Card: ${handle.url}/.well-known/agent.json          
  ║                                                            ║
  ║  Test with curl:                                           ║
  ║    curl ${handle.url}/.well-known/agent.json               
  ║                                                            ║
  ║  Or run the Vercel AI client in another terminal:          ║
  ║    npx tsx src/vercel-client.ts                             ║
  ║                                                            ║
  ║  Press Ctrl+C to stop.                                     ║
  ╚════════════════════════════════════════════════════════════╝
`)

// Keep alive
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down A2A server...')
  await handle.close()
  process.exit(0)
})
