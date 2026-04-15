/**
 * Knowledge Synthesizer test suite
 *
 * Tests the deterministic parts of the Synthesizer without real LLM calls:
 * - Frontmatter serialization and parsing
 * - Frontmatter validation (all field types)
 * - Article output parsing from LLM
 * - Compiler metadata injection
 * - Stub article generation
 * - KnowledgeSynthesizer orchestration (with mocked GenerateFn)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, readFile } from 'fs/promises'

import {
  serializeFrontmatter,
  validateFrontmatter,
  buildCompleteFrontmatter,
  parseArticleOutput,
} from '../knowledge/compiler/synthesizer/frontmatter.js'
import {
  generateStubArticle,
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
} from '../knowledge/compiler/synthesizer/prompt.js'
import { KnowledgeSynthesizer } from '../knowledge/compiler/synthesizer/synthesizer.js'
import type { KBOntology, ConceptRegistry } from '../knowledge/ontology/index.js'
import type { CompilationPlan, ArticlePlan } from '../knowledge/compiler/extractor/index.js'
import type { IngestedContent } from '../knowledge/compiler/ingester/index.js'
import type { GenerateFn } from '../knowledge/compiler/extractor/extractor.js'
import type { FrontmatterSchema } from '../knowledge/ontology/types.js'

// ── Test fixtures ─────────────────────────────────────────────────────────────

const TEST_ONTOLOGY: KBOntology = {
  domain: 'Test AI domain',
  entityTypes: {
    concept: {
      description: 'A core idea or abstraction',
      frontmatter: {
        fields: {
          title: { description: 'Title', type: 'string', required: true },
          entity_type: { description: 'Type', type: 'string', required: true },
          tags: { description: 'Tags', type: 'string[]', required: false },
          year: { description: 'Year introduced', type: 'number', required: false },
          status: {
            description: 'Status',
            type: 'enum',
            required: false,
            enum: ['active', 'deprecated', 'experimental'],
          },
          related: {
            description: 'Related concept',
            type: 'entity_ref',
            required: false,
            targetEntityType: 'concept',
          },
        },
      },
      articleStructure: [
        { heading: 'Overview', description: 'What is it?', required: true },
        { heading: 'Applications', description: 'Use cases', required: false },
      ],
      linkableTo: ['concept'],
      indexable: true,
    },
  },
  relationshipTypes: [],
  vocabulary: {},
  budget: { textDocumentTokens: 4096, imageTokens: 1200, maxImagesPerFetch: 3 },
  compiler: { extractionModel: 'gemini-2.5-flash', synthesisModel: 'gemini-2.5-pro' },
}

const TEST_REGISTRY: ConceptRegistry = new Map([
  [
    'concepts/attention-mechanism',
    {
      docId: 'concepts/attention-mechanism',
      canonicalTitle: 'Attention Mechanism',
      entityType: 'concept',
      aliases: ['attention mechanism'],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
])

function makeArticlePlan(overrides: Partial<ArticlePlan> = {}): ArticlePlan {
  return {
    docId: 'concepts/transformer',
    canonicalTitle: 'Transformer',
    entityType: 'concept',
    action: 'create',
    sourcePaths: ['/kb/raw/papers/transformer-paper.md'],
    knownLinkDocIds: ['concepts/attention-mechanism'],
    candidateNewConcepts: [],
    suggestedFrontmatter: { tags: ['nlp', 'deep-learning'] },
    confidence: 0.9,
    ...overrides,
  }
}

function makeContent(overrides: Partial<IngestedContent> = {}): IngestedContent {
  return {
    text: '# Attention Is All You Need\n\nThe transformer uses [[attention mechanism]] as its core building block.',
    images: [],
    mimeType: 'text/markdown',
    sourceFile: '/kb/raw/papers/transformer-paper.md',
    title: 'Attention Is All You Need',
    metadata: {},
    lossy: false,
    ...overrides,
  }
}

const VALID_LLM_ARTICLE = `---
title: "Transformer"
entity_type: concept
tags:
  - nlp
  - deep-learning
year: 2017
---

## Overview

The Transformer is a neural network architecture introduced in "Attention Is All You Need" (2017).
It relies entirely on [[Attention Mechanism]] rather than recurrence.

## Applications

- Machine translation
- Text generation
- Language modeling
`

// ── serializeFrontmatter tests ────────────────────────────────────────────────

describe('serializeFrontmatter', () => {
  it('serializes a simple string field', () => {
    const yaml = serializeFrontmatter({ title: 'My Article' })
    expect(yaml).toContain('title: My Article')
  })

  it('wraps strings with special chars in quotes', () => {
    const yaml = serializeFrontmatter({ title: 'true' })
    expect(yaml).toContain('"true"')
  })

  it('serializes arrays as YAML lists', () => {
    const yaml = serializeFrontmatter({ tags: ['nlp', 'ml'] })
    expect(yaml).toContain('tags:')
    expect(yaml).toContain('- nlp')
    expect(yaml).toContain('- ml')
  })

  it('serializes numbers bare', () => {
    const yaml = serializeFrontmatter({ year: 2017 })
    expect(yaml).toContain('year: 2017')
  })

  it('serializes booleans bare', () => {
    const yaml = serializeFrontmatter({ stub: true })
    expect(yaml).toContain('stub: true')
  })

  it('skips undefined and null fields', () => {
    const yaml = serializeFrontmatter({ title: 'Hi', empty: null, missing: undefined })
    expect(yaml).not.toContain('empty')
    expect(yaml).not.toContain('missing')
  })

  it('wraps in --- delimiters', () => {
    const yaml = serializeFrontmatter({ title: 'Test' })
    expect(yaml.startsWith('---')).toBe(true)
    expect(yaml.endsWith('---')).toBe(true)
  })
})

// ── validateFrontmatter tests ─────────────────────────────────────────────────

describe('validateFrontmatter', () => {
  const schema = TEST_ONTOLOGY.entityTypes['concept']!.frontmatter

  it('passes valid required fields', () => {
    const result = validateFrontmatter(
      { title: 'Test', entity_type: 'concept' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('errors on missing required field', () => {
    const result = validateFrontmatter(
      { entity_type: 'concept' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('title'))).toBe(true)
  })

  it('coerces number from string', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', year: '2017' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.valid).toBe(true)
    expect(result.values['year']).toBe(2017)
    expect(typeof result.values['year']).toBe('number')
  })

  it('coerces string[] from comma-separated string', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', tags: 'nlp, ml, ai' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(Array.isArray(result.values['tags'])).toBe(true)
    expect((result.values['tags'] as string[])).toContain('nlp')
    expect((result.values['tags'] as string[])).toContain('ml')
  })

  it('validates enum field — valid value passes', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', status: 'active' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.valid).toBe(true)
    expect(result.values['status']).toBe('active')
  })

  it('validates enum field — invalid value errors', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', status: 'invalid_value' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('status'))).toBe(true)
  })

  it('validates entity_ref — warns if docId not in registry', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', related: 'concepts/nonexistent' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    // Warning but not error — entity_ref may reference a new article
    expect(result.warnings.some(w => w.field.includes('related'))).toBe(true)
  })

  it('passes through extra fields not in schema', () => {
    const result = validateFrontmatter(
      { title: 'T', entity_type: 'concept', custom_field: 'custom_value' },
      schema,
      'concept',
      TEST_REGISTRY,
      TEST_ONTOLOGY,
    )
    expect(result.values['custom_field']).toBe('custom_value')
  })
})

// ── parseArticleOutput tests ──────────────────────────────────────────────────

describe('parseArticleOutput', () => {
  it('parses a valid frontmatter + body markdown', () => {
    const result = parseArticleOutput(VALID_LLM_ARTICLE)
    expect(result.frontmatter['title']).toBe('Transformer')
    expect(result.frontmatter['entity_type']).toBe('concept')
    expect(result.body).toContain('## Overview')
  })

  it('parses numeric frontmatter fields', () => {
    const result = parseArticleOutput(VALID_LLM_ARTICLE)
    expect(result.frontmatter['year']).toBe(2017)
  })

  it('parses array frontmatter fields', () => {
    const result = parseArticleOutput(VALID_LLM_ARTICLE)
    expect(Array.isArray(result.frontmatter['tags'])).toBe(true)
    expect((result.frontmatter['tags'] as string[])).toContain('nlp')
  })

  it('strips markdown code fences if present', () => {
    const withFences = '```markdown\n' + VALID_LLM_ARTICLE + '\n```'
    const result = parseArticleOutput(withFences)
    expect(result.frontmatter['title']).toBe('Transformer')
  })

  it('handles missing frontmatter gracefully', () => {
    const noFrontmatter = '## Overview\n\nSome content.'
    const result = parseArticleOutput(noFrontmatter)
    expect(result.frontmatter).toEqual({})
    expect(result.body).toContain('## Overview')
  })
})

// ── buildCompleteFrontmatter tests ────────────────────────────────────────────

describe('buildCompleteFrontmatter', () => {
  it('always includes compiler-injected fields', () => {
    const fm = buildCompleteFrontmatter(
      { title: 'Test', year: 2021 },
      { tags: ['nlp'] },
      {
        entityType: 'concept',
        canonicalTitle: 'Test',
        docId: 'concepts/test',
        sourcePaths: ['/raw/test.md'],
        confidence: 0.85,
        isStub: false,
      },
    )

    expect(fm['entity_type']).toBe('concept')
    expect(fm['stub']).toBe(false)
    expect(fm['compiled_at']).toBeDefined()
    expect(Array.isArray(fm['compiled_from'])).toBe(true)
    expect(fm['confidence']).toBe(0.85)
  })

  it('title is always from compilerMeta (canonical)', () => {
    const fm = buildCompleteFrontmatter(
      { title: 'Wrong Title' },
      {},
      {
        entityType: 'concept',
        canonicalTitle: 'Correct Title',
        docId: 'concepts/correct',
        sourcePaths: [],
        confidence: 0.9,
        isStub: false,
      },
    )
    expect(fm['title']).toBe('Correct Title')
  })
})

// ── generateStubArticle tests ─────────────────────────────────────────────────

describe('generateStubArticle', () => {
  it('generates valid markdown with frontmatter', () => {
    const stub = generateStubArticle({
      docId: 'concepts/multi-head-attention',
      canonicalTitle: 'Multi-Head Attention',
      entityType: 'concept',
      description: 'Attention computed in parallel across multiple heads',
      knownLinkDocIds: ['concepts/attention-mechanism'],
      registry: TEST_REGISTRY,
      compiledAt: '2024-01-01T00:00:00.000Z',
    })

    expect(stub).toContain('---')
    expect(stub).toContain('stub: true')
    expect(stub).toContain('Multi-Head Attention')
    expect(stub).toContain('Stub article')
  })

  it('includes parent links', () => {
    const stub = generateStubArticle({
      docId: 'concepts/multi-head-attention',
      canonicalTitle: 'Multi-Head Attention',
      entityType: 'concept',
      description: 'Parallel attention heads',
      knownLinkDocIds: ['concepts/attention-mechanism'],
      registry: TEST_REGISTRY,
      compiledAt: '2024-01-01T00:00:00.000Z',
    })
    // Should link to parent concept
    expect(stub).toContain('[[Attention Mechanism]]')
  })
})

// ── buildSynthesisSystemPrompt tests ──────────────────────────────────────────

describe('buildSynthesisSystemPrompt', () => {
  it('includes domain name', () => {
    const prompt = buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'concept')
    expect(prompt).toContain('Test AI domain')
  })

  it('includes entity type description', () => {
    const prompt = buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'concept')
    expect(prompt).toContain('A core idea or abstraction')
  })

  it('lists all required frontmatter fields', () => {
    const prompt = buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'concept')
    expect(prompt).toContain('title')
    expect(prompt).toContain('REQUIRED')
  })

  it('includes article structure sections', () => {
    const prompt = buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'concept')
    expect(prompt).toContain('Overview')
    expect(prompt).toContain('Applications')
  })

  it('includes wikilink rules', () => {
    const prompt = buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'concept')
    expect(prompt).toContain('[[wikilink]]')
  })

  it('throws for unknown entity type', () => {
    expect(() => buildSynthesisSystemPrompt(TEST_ONTOLOGY, 'nonexistent')).toThrow('Unknown entity type')
  })
})

// ── KnowledgeSynthesizer orchestration tests ──────────────────────────────────

describe('KnowledgeSynthesizer', () => {
  let tmpDir: string
  let compiledDir: string

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `yaaf-synth-test-${Date.now()}`)
    compiledDir = join(tmpDir, 'compiled')
    await mkdir(compiledDir, { recursive: true })
  })

  function makeplan(overrides: Partial<CompilationPlan> = {}): CompilationPlan {
    return {
      sourceCount: 1,
      articles: [makeArticlePlan()],
      skipped: [],
      blockedByMissingDeps: [],
      createdAt: Date.now(),
      ...overrides,
    }
  }

  it('writes a compiled article to disk', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    const result = await synth.synthesize(makeplan(), contentMap)

    expect(result.created).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('creates the output file at the expected path', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    await synth.synthesize(makeplan(), contentMap)

    const expectedPath = join(compiledDir, 'concepts/transformer.md')
    const written = await readFile(expectedPath, 'utf-8')
    expect(written).toContain('entity_type: concept')
    expect(written).toContain('compiled_at')
    expect(written).toContain('stub: false')
  })

  it('handles missing source content gracefully', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    // Empty content map — source not found
    const result = await synth.synthesize(makeplan(), new Map())

    expect(result.failed).toBe(1)
    expect(result.created).toBe(0)
  })

  it('handles LLM failure gracefully without crashing', async () => {
    const errorFn: GenerateFn = vi.fn().mockRejectedValue(new Error('Model overloaded'))
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), errorFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    const result = await synth.synthesize(makeplan(), contentMap)

    expect(result.failed).toBe(1)
    expect(result.articles[0]!.action).toBe('failed')
    expect(result.articles[0]!.error?.message).toContain('Model overloaded')
  })

  it('emits progress events', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const events: any[] = []
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    await synth.synthesize(makeplan(), contentMap, { onProgress: e => events.push(e) })

    const types = events.map(e => e.type)
    expect(types).toContain('article:started')
    expect(types).toContain('article:written')
    expect(types).toContain('run:complete')
  })

  it('creates stub articles for high-confidence candidates', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const planWithCandidate = makeplan({
      articles: [
        makeArticlePlan({
          confidence: 0.95,
          candidateNewConcepts: [{
            name: 'Multi-Head Attention',
            entityType: 'concept',
            description: 'Parallel attention heads',
            mentionCount: 5,
          }],
        }),
      ],
    })

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    const result = await synth.synthesize(planWithCandidate, contentMap, { stubConfidenceThreshold: 0.8 })

    expect(result.stubsCreated).toBe(1)

    // Stub file should exist
    const stubPath = join(compiledDir, 'concepts/multi-head-attention.md')
    const stubContent = await readFile(stubPath, 'utf-8')
    expect(stubContent).toContain('stub: true')
    expect(stubContent).toContain('Multi-Head Attention')
  })

  it('does not write files in dry run mode', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    const result = await synth.synthesize(makeplan(), contentMap, { dryRun: true })

    expect(result.created).toBe(1)
    expect(result.articles[0]!.outputPath).toBeUndefined()

    // File should NOT exist
    const expectedPath = join(compiledDir, 'concepts/transformer.md')
    let fileExists = false
    try { await readFile(expectedPath, 'utf-8'); fileExists = true } catch { /* expected */ }
    expect(fileExists).toBe(false)
  })

  it('injects compiler metadata into the written article', async () => {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_ARTICLE)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, new Map(TEST_REGISTRY), mockFn, compiledDir)

    const contentMap = new Map([['/kb/raw/papers/transformer-paper.md', makeContent()]])
    await synth.synthesize(makeplan(), contentMap)

    const article = await readFile(join(compiledDir, 'concepts/transformer.md'), 'utf-8')
    expect(article).toContain('compiled_at:')
    expect(article).toContain('compiled_from:')
    expect(article).toContain('confidence:')
    expect(article).toContain('entity_type: concept')
  })

  it('applies concurrency limit via semaphore', async () => {
    const callOrder: number[] = []
    let activeCount = 0
    let maxActive = 0

    const delayFn: GenerateFn = vi.fn().mockImplementation(async () => {
      activeCount++
      maxActive = Math.max(maxActive, activeCount)
      await new Promise(r => setTimeout(r, 10))
      activeCount--
      return VALID_LLM_ARTICLE
    })

    const multiPlan = makeplan({
      articles: [0, 1, 2, 3, 4].map(i =>
        makeArticlePlan({
          docId: `concepts/article-${i}`,
          canonicalTitle: `Article ${i}`,
          sourcePaths: [`/raw/source-${i}.md`],
        }),
      ),
    })

    const contentMap = new Map(
      [0, 1, 2, 3, 4].map(i => [
        `/raw/source-${i}.md`,
        makeContent({ sourceFile: `/raw/source-${i}.md` }),
      ])
    )

    const registry = new Map(TEST_REGISTRY)
    const synth = new KnowledgeSynthesizer(TEST_ONTOLOGY, registry, delayFn, compiledDir)
    await synth.synthesize(multiPlan, contentMap, { concurrency: 2 })

    // With concurrency=2, max active at once should never exceed 2
    expect(maxActive).toBeLessThanOrEqual(2)
  })
})
