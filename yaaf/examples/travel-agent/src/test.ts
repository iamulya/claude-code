/**
 * Quick self-test — verifies all tools execute correctly
 * Run: npx tsx src/test.ts
 */
import { createTravelTools } from './tools.js'

const ctx = { model: 'test', tools: [], signal: new AbortController().signal, messages: [] as any[] }

async function main() {
  const tools = createTravelTools()
  console.log('Tools:', tools.map(t => t.name).join(', '))
  console.log('')

  // 1. Flight search
  const flights = await tools[0]!.call(
    { origin: 'New York', destination: 'Paris', date: '2025-06-15' }, ctx
  )
  const fd = flights.data as any
  console.log(`✓ search_flights: ${fd.resultCount} flights found`)
  console.log(`  Cheapest: ${fd.flights[0].airline} ${fd.flights[0].flightId} — $${fd.flights[0].price}`)

  // 2. Hotel search
  const hotels = await tools[1]!.call(
    { city: 'Paris', checkin: '2025-06-15', checkout: '2025-06-20' }, ctx
  )
  const hd = hotels.data as any
  console.log(`✓ search_hotels: ${hd.resultCount} hotels found`)
  console.log(`  Cheapest: ${hd.hotels[0].name} — $${hd.hotels[0].pricePerNight}/night`)

  // 3. Weather
  const weather = await tools[2]!.call({ city: 'Paris' }, ctx)
  const wd = weather.data as any
  console.log(`✓ check_weather: ${wd.forecast.length}-day forecast`)
  console.log(`  Tomorrow: ${wd.forecast[0].condition}, ${wd.forecast[0].tempHighC}°C`)

  // 4. Attractions
  const attractions = await tools[3]!.call({ city: 'Paris' }, ctx)
  const ad = attractions.data as any
  console.log(`✓ get_attractions: ${ad.attractionCount} attractions`)
  console.log(`  Top: ${ad.attractions[0].name}`)

  // 5. Budget
  const budget = await tools[4]!.call(
    { destination: 'Paris', days: 5, travelers: 2, style: 'mid-range' }, ctx
  )
  const bd = budget.data as any
  console.log(`✓ estimate_budget: $${bd.totalEstimate} total`)

  // 6. Booking
  const booking = await tools[5]!.call(
    { travelerName: 'Alice Smith', email: 'alice@example.com', flightId: 'UA1234' }, ctx
  )
  const bk = booking.data as any
  console.log(`✓ book_trip: ${bk.status} — ${bk.confirmationId}`)

  console.log('\n🎉 All 6 tools passed!')
}

main().catch(err => {
  console.error('FAILED:', err)
  process.exit(1)
})
