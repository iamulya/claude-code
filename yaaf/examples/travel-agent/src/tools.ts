/**
 * Travel Tools — Flight search, hotel search, weather, itinerary, and booking
 *
 * All tools use realistic mock data so the example runs without external APIs.
 * In production, replace the mock data with real API calls.
 */

import { buildTool, type Tool } from 'yaaf'

// ── Mock Data ────────────────────────────────────────────────────────────────

const AIRLINES = ['United', 'Delta', 'American', 'JetBlue', 'Southwest', 'Emirates', 'Lufthansa']
const HOTEL_CHAINS = ['Marriott', 'Hilton', 'Hyatt', 'Four Seasons', 'Ritz-Carlton', 'IHG', 'Airbnb']
const AIRPORTS: Record<string, string> = {
  'new york': 'JFK', 'nyc': 'JFK', 'los angeles': 'LAX', 'la': 'LAX',
  'chicago': 'ORD', 'san francisco': 'SFO', 'sf': 'SFO', 'miami': 'MIA',
  'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT', 'dubai': 'DXB',
  'sydney': 'SYD', 'rome': 'FCO', 'barcelona': 'BCN', 'bangkok': 'BKK',
  'singapore': 'SIN', 'amsterdam': 'AMS', 'berlin': 'BER', 'lisbon': 'LIS',
}

const WEATHER_CONDITIONS = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Clear Skies']
const ATTRACTIONS: Record<string, string[]> = {
  'paris': ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Champs-Élysées', 'Montmartre'],
  'tokyo': ['Shibuya Crossing', 'Senso-ji Temple', 'Meiji Shrine', 'Akihabara', 'Tsukiji Market'],
  'london': ['Big Ben', 'Tower of London', 'British Museum', 'Buckingham Palace', 'Camden Market'],
  'rome': ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon', 'Roman Forum'],
  'barcelona': ['Sagrada Família', 'Park Güell', 'La Rambla', 'Gothic Quarter', 'Casa Batlló'],
  'new york': ['Statue of Liberty', 'Central Park', 'Times Square', 'Brooklyn Bridge', 'MoMA'],
  'dubai': ['Burj Khalifa', 'Dubai Mall', 'Palm Jumeirah', 'Dubai Marina', 'Gold Souk'],
  'sydney': ['Opera House', 'Harbour Bridge', 'Bondi Beach', 'Taronga Zoo', 'The Rocks'],
  'bangkok': ['Grand Palace', 'Wat Arun', 'Chatuchak Market', 'Khao San Road', 'Wat Pho'],
  'singapore': ['Marina Bay Sands', 'Gardens by the Bay', 'Sentosa', 'Chinatown', 'Orchard Road'],
}

function randomPrice(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function getAirport(city: string): string {
  return AIRPORTS[city.toLowerCase()] ?? city.slice(0, 3).toUpperCase()
}

function generateFlightTime(): string {
  const hours = Math.floor(Math.random() * 12) + 6
  const mins = Math.floor(Math.random() * 4) * 15
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// ── Tools ────────────────────────────────────────────────────────────────────

export function createSearchFlightsTool(): Tool {
  return buildTool({
    name: 'search_flights',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Departure city (e.g., "New York", "London")' },
        destination: { type: 'string', description: 'Arrival city' },
        date: { type: 'string', description: 'Travel date (YYYY-MM-DD)' },
        passengers: { type: 'number', description: 'Number of passengers (default: 1)' },
        cabin_class: {
          type: 'string',
          enum: ['economy', 'business', 'first'],
          description: 'Cabin class (default: economy)',
        },
      },
      required: ['origin', 'destination', 'date'],
    },
    maxResultChars: 10_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.origin
        ? `Search flights from ${i.origin} to ${i.destination} on ${i.date}`
        : 'Search for available flights'
    },
    async call(input: Record<string, unknown>) {
      const origin = getAirport(input.origin as string)
      const dest = getAirport(input.destination as string)
      const date = input.date as string
      const cabinClass = (input.cabin_class as string) ?? 'economy'
      const multiplier = cabinClass === 'business' ? 3.2 : cabinClass === 'first' ? 5.5 : 1

      const flights = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => {
        const airline = randomElement(AIRLINES)
        const departure = generateFlightTime()
        const durationH = 2 + Math.floor(Math.random() * 14)
        const durationM = Math.floor(Math.random() * 4) * 15
        const basePrice = randomPrice(180, 900)

        return {
          flightId: `${airline.slice(0, 2).toUpperCase()}${1000 + i * 100 + Math.floor(Math.random() * 99)}`,
          airline,
          origin,
          destination: dest,
          date,
          departure,
          duration: `${durationH}h ${durationM}m`,
          cabinClass,
          price: Math.round(basePrice * multiplier),
          currency: 'USD',
          stops: Math.random() > 0.6 ? 1 : 0,
          seatsAvailable: randomPrice(2, 45),
        }
      }).sort((a, b) => a.price - b.price)

      return {
        data: {
          searchParams: { origin, destination: dest, date, cabinClass },
          resultCount: flights.length,
          flights,
        },
      }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
  })
}

export function createSearchHotelsTool(): Tool {
  return buildTool({
    name: 'search_hotels',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City to search for hotels' },
        checkin: { type: 'string', description: 'Check-in date (YYYY-MM-DD)' },
        checkout: { type: 'string', description: 'Check-out date (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Number of guests (default: 2)' },
        max_price: { type: 'number', description: 'Maximum price per night in USD' },
      },
      required: ['city', 'checkin', 'checkout'],
    },
    maxResultChars: 10_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.city
        ? `Search hotels in ${i.city} from ${i.checkin} to ${i.checkout}`
        : 'Search for available hotels'
    },
    async call(input: Record<string, unknown>) {
      const city = input.city as string
      const maxPrice = input.max_price as number | undefined

      const hotels = Array.from({ length: 5 + Math.floor(Math.random() * 3) }, (_, i) => {
        const chain = randomElement(HOTEL_CHAINS)
        const stars = 3 + Math.floor(Math.random() * 3)
        const basePrice = stars === 5 ? randomPrice(280, 600) : stars === 4 ? randomPrice(150, 350) : randomPrice(80, 200)
        const price = maxPrice ? Math.min(basePrice, maxPrice) : basePrice

        return {
          hotelId: `HTL-${city.slice(0, 3).toUpperCase()}-${1000 + i}`,
          name: `${chain} ${city} ${['Downtown', 'Central', 'Grand', 'Resort', 'Boutique', 'Plaza'][i % 6]}`,
          chain,
          city,
          stars,
          pricePerNight: price,
          currency: 'USD',
          rating: (3.5 + Math.random() * 1.5).toFixed(1),
          reviewCount: randomPrice(200, 3000),
          amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa', 'Room Service']
            .filter(() => Math.random() > 0.3),
          cancellationPolicy: Math.random() > 0.5 ? 'Free cancellation' : 'Non-refundable',
        }
      }).sort((a, b) => a.pricePerNight - b.pricePerNight)

      return {
        data: {
          searchParams: { city, checkin: input.checkin, checkout: input.checkout },
          resultCount: hotels.length,
          hotels,
        },
      }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
  })
}

export function createCheckWeatherTool(): Tool {
  return buildTool({
    name: 'check_weather',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City to check weather for' },
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
      },
      required: ['city'],
    },
    maxResultChars: 5_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.city ? `Check weather in ${i.city}` : 'Check destination weather'
    },
    async call(input: Record<string, unknown>) {
      const city = input.city as string
      const days = 5

      const forecast = Array.from({ length: days }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() + i)
        return {
          date: date.toISOString().split('T')[0],
          condition: randomElement(WEATHER_CONDITIONS),
          tempHighC: randomPrice(18, 35),
          tempLowC: randomPrice(8, 22),
          humidity: randomPrice(30, 85),
          rainChance: randomPrice(0, 40),
        }
      })

      return {
        data: {
          city,
          forecast,
          bestTimeToVisit: `The weather in ${city} looks favorable for travel.`,
        },
      }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
  })
}

export function createGetAttractionsTool(): Tool {
  return buildTool({
    name: 'get_attractions',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City to get attractions for' },
        category: {
          type: 'string',
          enum: ['all', 'culture', 'food', 'nature', 'nightlife'],
          description: 'Category filter (default: all)',
        },
      },
      required: ['city'],
    },
    maxResultChars: 10_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.city ? `Get top attractions in ${i.city}` : 'Get destination attractions'
    },
    async call(input: Record<string, unknown>) {
      const city = input.city as string
      const cityKey = city.toLowerCase()
      const attractions = ATTRACTIONS[cityKey] ?? [
        `${city} Old Town`, `${city} National Museum`, `${city} Central Market`,
        `${city} Botanical Garden`, `${city} Waterfront`,
      ]

      const detailed = attractions.map((name, i) => ({
        name,
        rating: (4.0 + Math.random() * 1.0).toFixed(1),
        estimatedDuration: `${1 + Math.floor(Math.random() * 3)} hours`,
        priceRange: i % 3 === 0 ? 'Free' : `$${randomPrice(10, 50)}`,
        bestTime: randomElement(['Morning', 'Afternoon', 'Evening', 'Any time']),
      }))

      return {
        data: {
          city,
          attractionCount: detailed.length,
          attractions: detailed,
        },
      }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
  })
}

export function createEstimateBudgetTool(): Tool {
  return buildTool({
    name: 'estimate_budget',
    inputSchema: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Travel destination' },
        days: { type: 'number', description: 'Number of days' },
        travelers: { type: 'number', description: 'Number of travelers' },
        style: {
          type: 'string',
          enum: ['budget', 'mid-range', 'luxury'],
          description: 'Travel style (default: mid-range)',
        },
      },
      required: ['destination', 'days'],
    },
    maxResultChars: 5_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.destination
        ? `Estimate budget for ${i.days} days in ${i.destination}`
        : 'Estimate trip budget'
    },
    async call(input: Record<string, unknown>) {
      const days = input.days as number
      const travelers = (input.travelers as number) ?? 1
      const style = (input.style as string) ?? 'mid-range'

      const dailyRates = {
        budget: { hotel: 60, food: 30, transport: 15, activities: 20 },
        'mid-range': { hotel: 150, food: 60, transport: 30, activities: 50 },
        luxury: { hotel: 400, food: 120, transport: 60, activities: 100 },
      }
      const rates = dailyRates[style as keyof typeof dailyRates] ?? dailyRates['mid-range']

      const breakdown = {
        accommodation: rates.hotel * days,
        food: rates.food * days * travelers,
        transportation: rates.transport * days * travelers,
        activities: rates.activities * days * travelers,
        flights: randomPrice(300, 800) * travelers,
        insurance: randomPrice(30, 80) * travelers,
      }

      const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

      return {
        data: {
          destination: input.destination,
          days,
          travelers,
          style,
          breakdown,
          totalEstimate: total,
          currency: 'USD',
          tip: 'Budget an extra 10-15% for unexpected expenses.',
        },
      }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
  })
}

export function createBookTripTool(): Tool {
  return buildTool({
    name: 'book_trip',
    inputSchema: {
      type: 'object',
      properties: {
        flightId: { type: 'string', description: 'Flight ID to book' },
        hotelId: { type: 'string', description: 'Hotel ID to book' },
        travelerName: { type: 'string', description: 'Primary traveler name' },
        email: { type: 'string', description: 'Contact email' },
      },
      required: ['travelerName', 'email'],
    },
    maxResultChars: 5_000,
    describe: (input) => {
      const i = input as Record<string, unknown>
      return i.travelerName
        ? `Book trip for ${i.travelerName}`
        : 'Book a trip'
    },
    async call(input: Record<string, unknown>) {
      const confirmationId = `TRV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

      return {
        data: {
          status: 'confirmed',
          confirmationId,
          travelerName: input.travelerName,
          email: input.email,
          flightId: input.flightId ?? 'not-specified',
          hotelId: input.hotelId ?? 'not-specified',
          message: `Booking confirmed! Your confirmation ID is ${confirmationId}. A confirmation email will be sent to ${input.email}.`,
        },
      }
    },
    isReadOnly: () => false,
  })
}

/** Create all travel tools */
export function createTravelTools(): Tool[] {
  return [
    createSearchFlightsTool(),
    createSearchHotelsTool(),
    createCheckWeatherTool(),
    createGetAttractionsTool(),
    createEstimateBudgetTool(),
    createBookTripTool(),
  ]
}
