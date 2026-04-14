/**
 * IAM Multi-Tenant Example — Identity-Aware Agent
 *
 * A realistic SaaS scenario demonstrating YAAF's IAM system:
 *
 * Scenario: "DataHub" — a multi-tenant analytics platform
 * - Users from different tenants (Acme Corp, Globex Inc) use the same agent
 * - Each user sees only their tenant's data
 * - Roles control which tools are available (viewer, analyst, admin)
 * - ABAC rules enforce additional constraints (contractors, time-of-day, regions)
 * - External permissions (e.g., Confluence spaces) are resolved and cached
 *
 * Run: npx tsx src/index.ts
 */

import {
  Agent,
  buildTool,
  rbac,
  abac,
  when,
  CompositeStrategy as CompositeAuthStrategy,
  TenantScopeStrategy,
  OwnershipScopeStrategy,
  CompositeScope,
  ResolverScopeStrategy,
  systemAwareScope,
  type UserContext,
  type DataScope,
  type PermissionResolver,
  type ResolvedPermissions,
} from 'yaaf'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. SIMULATED DATA — In-memory database with multi-tenant records
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DataRecord = {
  id: string
  tenantId: string
  createdBy: string
  department: string
  title: string
  value: number
}

const DATABASE: DataRecord[] = [
  // Acme Corp records
  { id: 'r1', tenantId: 'acme', createdBy: 'alice', department: 'engineering', title: 'Q4 Revenue Report', value: 4_200_000 },
  { id: 'r2', tenantId: 'acme', createdBy: 'alice', department: 'engineering', title: 'Infrastructure Costs', value: 890_000 },
  { id: 'r3', tenantId: 'acme', createdBy: 'bob', department: 'sales', title: 'Pipeline Forecast', value: 12_500_000 },
  { id: 'r4', tenantId: 'acme', createdBy: 'carol', department: 'hr', title: 'Headcount Plan', value: 150 },
  { id: 'r5', tenantId: 'acme', createdBy: 'dave', department: 'engineering', title: 'Cloud Spend Analysis', value: 1_200_000 },

  // Globex Inc records (different tenant)
  { id: 'r6', tenantId: 'globex', createdBy: 'eve', department: 'engineering', title: 'Product Roadmap', value: 0 },
  { id: 'r7', tenantId: 'globex', createdBy: 'frank', department: 'finance', title: 'Budget 2025', value: 50_000_000 },
  { id: 'r8', tenantId: 'globex', createdBy: 'eve', department: 'engineering', title: 'Sprint Metrics', value: 42 },
]

// Simulated Confluence spaces per user
const CONFLUENCE_SPACES: Record<string, string[]> = {
  'alice': ['ENG', 'PLATFORM', 'ALL-COMPANY'],
  'bob': ['SALES', 'ALL-COMPANY'],
  'carol': ['HR', 'ALL-COMPANY'],
  'eve': ['ENG', 'PRODUCT', 'ALL-COMPANY'],
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. TOOLS — Data-access tools that respect IAM scoping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const queryReports = buildTool({
  name: 'query_reports',
  inputSchema: {
    type: 'object',
    properties: {
      department: { type: 'string', description: 'Filter by department' },
      search: { type: 'string', description: 'Text search in titles' },
    },
  },
  maxResultChars: 50_000,
  describe: (input) => `Query reports${input.department ? ` in ${input.department}` : ''}`,
  isReadOnly: () => true,
  async call(input: Record<string, unknown>, ctx) {
    // Extract IAM scope from context
    const scope = ctx.extra?.scope as DataScope | undefined
    const user = ctx.extra?.user as UserContext | undefined

    let results = [...DATABASE]

    // Apply tenant filter from IAM scope
    if (scope?.filters?.tenantId) {
      results = results.filter(r => r.tenantId === scope.filters.tenantId)
    }

    // Apply ownership filter if present
    if (scope?.filters?.createdBy) {
      results = results.filter(r => r.createdBy === scope.filters.createdBy)
    }

    // Apply user's department filter
    if (input.department) {
      results = results.filter(r => r.department === input.department)
    }

    // Apply text search
    if (input.search) {
      const q = (input.search as string).toLowerCase()
      results = results.filter(r => r.title.toLowerCase().includes(q))
    }

    return {
      data: {
        count: results.length,
        scopeApplied: scope?.description ?? 'none',
        reports: results.map(r => ({
          id: r.id,
          title: r.title,
          department: r.department,
          value: r.value,
        })),
      },
    }
  },
})

const deleteReport = buildTool({
  name: 'delete_report',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  maxResultChars: 1_000,
  describe: (input) => `Delete report ${input.id}`,
  isDestructive: () => true,
  async call(input: Record<string, unknown>) {
    // In a real app, this would delete the record
    return { data: { deleted: input.id, success: true } }
  },
})

const searchConfluence = buildTool({
  name: 'search_confluence',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  maxResultChars: 50_000,
  describe: (input) => `Search Confluence for "${input.query}"`,
  isReadOnly: () => true,
  async call(input: Record<string, unknown>, ctx) {
    const scope = ctx.extra?.scope as DataScope | undefined
    const allowedSpaces = (scope?.filters?.allowedSpaces as string[]) ?? []

    if (allowedSpaces.length === 0) {
      return { data: { results: [], message: 'No Confluence access' } }
    }

    // Simulate searching only accessible spaces
    return {
      data: {
        results: allowedSpaces.map(space => ({
          space,
          title: `${input.query} - ${space} Wiki`,
          url: `https://company.atlassian.net/wiki/spaces/${space}`,
        })),
        scopeApplied: `Searched ${allowedSpaces.length} spaces: ${allowedSpaces.join(', ')}`,
      },
    }
  },
})

const exportData = buildTool({
  name: 'export_data',
  inputSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['csv', 'json', 'pdf'] },
    },
  },
  maxResultChars: 1_000,
  describe: (input) => `Export data as ${input.format}`,
  async call(input: Record<string, unknown>) {
    return { data: { exportUrl: `https://datahub.app/exports/${input.format}/download` } }
  },
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. EXTERNAL PERMISSION RESOLVER — Simulated Confluence permission sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const confluenceResolver: PermissionResolver = {
  name: 'confluence-permissions',
  system: 'confluence',

  async resolve(user: UserContext): Promise<ResolvedPermissions> {
    // Simulate API call to Confluence
    const spaces = CONFLUENCE_SPACES[user.userId] ?? []

    console.log(`    🔑 Resolved Confluence permissions for "${user.userId}": [${spaces.join(', ')}]`)

    return {
      system: 'confluence',
      grants: spaces.length > 0
        ? [{ resourceType: 'space', resourceIds: spaces, accessLevel: 'read' }]
        : [],
      resolvedAt: new Date(),
      cacheTTL: 300,
    }
  },
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. IAM CONFIGURATION — Authorization + Data Scoping
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// RBAC: role → allowed tools
const roleAuth = rbac({
  viewer: ['query_reports', 'search_confluence'],
  analyst: ['query_reports', 'search_confluence', 'export_data'],
  admin: ['query_reports', 'search_confluence', 'export_data', 'delete_report'],
})

// ABAC: attribute-based restrictions on top of RBAC
const abacRules = abac([
  // Contractors cannot export or delete, even if their role allows it
  when((user) => user.attributes?.isContractor === true)
    .deny(['export_data', 'delete_report'], 'Contractors cannot export or delete data'),

  // EU users cannot access US-region data
  when((_user, args) => {
    const dept = args.department as string | undefined
    return dept === 'classified'
  })
    .deny(['query_reports'], 'Access to classified department denied'),
])

// Compose: ABAC overrides first, then RBAC fallback
const authorization = CompositeAuthStrategy.firstMatch([abacRules, roleAuth])

// Data scoping: different strategies for different tools
const confluenceScope = new ResolverScopeStrategy({
  resolver: confluenceResolver,
  toScope: (grants, user) => ({
    strategy: 'confluence',
    filters: { allowedSpaces: grants[0]?.resourceIds ?? [] },
    description: `Confluence: ${grants[0]?.resourceIds?.length ?? 0} spaces for ${user.userId}`,
  }),
  cache: { ttl: 300, maxEntries: 100 },
})

const dataScope = systemAwareScope({
  toolSystems: {
    search_confluence: 'confluence',
  },
  scopes: {
    confluence: confluenceScope,
  },
  // Default: tenant + ownership merged
  fallback: CompositeScope.merge([
    new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
  ]),
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. THE AGENT — Configured with full IAM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const agent = new Agent({
  name: 'DataHub Assistant',
  systemPrompt: `You are the DataHub analytics assistant. Help users query reports,
search Confluence docs, and export data. Always use the available tools to
answer questions about data and reports.

IMPORTANT: The system automatically enforces access control:
- You only see data for the user's tenant
- Tool access depends on the user's role
- Confluence searches are scoped to the user's accessible spaces

If a tool call is denied, explain what happened and suggest the user contact their admin.`,
  tools: [queryReports, deleteReport, searchConfluence, exportData],
  accessPolicy: {
    authorization,
    dataScope,
    onDecision: (event) => {
      const icon = event.decision.action === 'allow' ? '✅' : '🚫'
      const reason = 'reason' in event.decision ? ` (${event.decision.reason})` : ''
      console.log(
        `    ${icon} IAM: ${event.user.userId} → ${event.toolName} → ${event.decision.action}${reason} [${event.durationMs}ms]`,
      )
    },
  },
})


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. DEMO SCENARIOS — Show IAM in action with different users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Define four users with different access levels

const alice: UserContext = {
  userId: 'alice',
  name: 'Alice Chen',
  roles: ['analyst'],
  attributes: {
    tenantId: 'acme',
    department: 'engineering',
    isContractor: false,
    region: 'us-west',
  },
}

const bob: UserContext = {
  userId: 'bob',
  name: 'Bob Smith',
  roles: ['viewer'],
  attributes: {
    tenantId: 'acme',
    department: 'sales',
    isContractor: false,
    region: 'us-east',
  },
}

const eve: UserContext = {
  userId: 'eve',
  name: 'Eve External',
  roles: ['analyst'],
  attributes: {
    tenantId: 'globex',
    department: 'engineering',
    isContractor: true,   // ← contractor flag triggers ABAC denial
    region: 'eu-west',
  },
}

const superAdmin: UserContext = {
  userId: 'admin-root',
  name: 'Root Admin',
  roles: ['admin', 'super_admin'],
  attributes: {
    tenantId: 'acme',
    isContractor: false,
  },
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. RUN SCENARIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runScenario(
  title: string,
  user: UserContext,
  query: string,
) {
  console.log(`\n${'═'.repeat(72)}`)
  console.log(`Scenario: ${title}`)
  console.log(`User: ${user.name} (${user.userId})`)
  console.log(`Roles: [${user.roles?.join(', ')}]`)
  console.log(`Tenant: ${user.attributes?.tenantId}`)
  console.log(`Contractor: ${user.attributes?.isContractor ? 'YES' : 'no'}`)
  console.log(`Query: "${query}"`)
  console.log(`${'─'.repeat(72)}`)

  try {
    const response = await agent.run(query, { user })
    console.log(`\nAgent Response:`)
    console.log(response)
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function main() {
  console.log('🔐 YAAF IAM Multi-Tenant Demo — DataHub Analytics')
  console.log('=' .repeat(72))

  // Scenario 1: Alice (analyst @ acme) queries reports
  //   → RBAC: analyst can query_reports ✅
  //   → Scope: tenant=acme, sees only Acme data
  await runScenario(
    'Alice queries reports (analyst, Acme Corp)',
    alice,
    'Show me all engineering reports',
  )

  // Scenario 2: Bob (viewer @ acme) tries to export
  //   → RBAC: viewer role doesn't include export_data 🚫
  await runScenario(
    'Bob tries to export data (viewer — no export permission)',
    bob,
    'Export all sales data as CSV',
  )

  // Scenario 3: Eve (contractor @ globex) tries to export
  //   → RBAC: analyst can export ✅
  //   → ABAC: contractor flag denies export 🚫
  await runScenario(
    'Eve tries to export (analyst + contractor — ABAC blocks export)',
    eve,
    'Export the sprint metrics as PDF',
  )

  // Scenario 4: Alice searches Confluence
  //   → RBAC: analyst can search_confluence ✅
  //   → PermissionResolver: Alice sees ENG, PLATFORM, ALL-COMPANY spaces
  await runScenario(
    'Alice searches Confluence (scoped to her accessible spaces)',
    alice,
    'Search Confluence for deployment runbook',
  )

  // Scenario 5: Super admin deletes a report
  //   → RBAC: admin can delete_report ✅
  //   → Scope: super_admin bypasses tenant isolation
  await runScenario(
    'Super Admin deletes a report (bypasses all restrictions)',
    superAdmin,
    'Delete report r3',
  )

  // Scenario 6: Tenant isolation — Eve (globex) cannot see Acme data
  //   → Scope: tenant=globex, sees only Globex data
  await runScenario(
    'Eve queries reports (different tenant — only sees Globex data)',
    eve,
    'Show me all reports',
  )

  console.log(`\n${'═'.repeat(72)}`)
  console.log('✅ All IAM scenarios completed.')
}

main().catch(console.error)
