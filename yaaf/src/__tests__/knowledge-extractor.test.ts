/**
 * Concept Extractor test suite
 *
 * Tests the two deterministic passes (static analysis + JSON parsing)
 * without making real LLM calls. The LLM pass is tested by injecting
 * a mock GenerateFn.
 */

import { describe, it, expect, vi } from 'vitest'
import { ConceptExtractor, makeGenerateFn } from '../knowledge/compiler/extractor/extractor.js'
import { buildExtractionSystemPrompt, buildExtractionUserPrompt } from '../knowledge/compiler/extractor/prompt.js'
import type { KBOntology, ConceptRegistry } from '../knowledge/ontology/index.js'
import type { IngestedContent } from '../knowledge/compiler/ingester/index.js'
import type { GenerateFn } from '../knowledge/compiler/extractor/extractor.js'

// ── Test ontology fixture ─────────────────────────────────────────────────────

const TEST_ONTOLOGY: KBOntology = {
  domain: 'Test AI research domain',
  entityTypes: {
    concept: {
      description: 'A core idea or abstraction',
      frontmatter: {
        fields: {
          title: { description: 'Title', type: 'string', required: true },
          entity_type: { description: 'Type', type: 'string', required: true },
          tags: { description: 'Tags', type: 'string[]', required: false },
        },
      },
      articleStructure: [
        { heading: 'Overview', description: 'What is it?', required: true },
        { heading: 'Applications', description: 'Use cases', required: false },
      ],
      linkableTo: ['tool', 'research_paper'],
      indexable: true,
    },
    tool: {
      description: 'A software tool or library',
      frontmatter: {
        fields: {
          title: { description: 'Title', type: 'string', required: true },
          entity_type: { description: 'Type', type: 'string', required: true },
          homepage: { description: 'URL', type: 'url', required: false },
        },
      },
      articleStructure: [
        { heading: 'Overview', description: 'What does it do?', required: true },
      ],
      linkableTo: ['concept'],
      indexable: true,
    },
    research_paper: {
      description: 'An academic paper or preprint',
      frontmatter: {
        fields: {
          title: { description: 'Title', type: 'string', required: true },
          entity_type: { description: 'Type', type: 'string', required: true },
          authors: { description: 'Authors', type: 'string[]', required: false },
          year: { description: 'Year', type: 'number', required: false },
        },
      },
      articleStructure: [
        { heading: 'Summary', description: 'What does this paper do?', required: true },
        { heading: 'Key Contributions', description: 'Novel contributions', required: true },
      ],
      linkableTo: ['concept', 'tool'],
      indexable: true,
    },
  },
  relationshipTypes: [
    {
      name: 'IMPLEMENTS',
      from: 'tool',
      to: 'concept',
      description: 'A tool implementing a concept',
      reciprocal: 'IMPLEMENTED_BY',
    },
  ],
  vocabulary: {
    'attention mechanism': {
      aliases: ['self-attention', 'scaled dot-product attention'],
      entityType: 'concept',
      docId: 'concepts/attention-mechanism',
    },
    transformer: {
      aliases: ['transformer model', 'transformer architecture'],
      entityType: 'concept',
      docId: 'concepts/transformer',
    },
    pytorch: {
      aliases: ['torch', 'PyTorch'],
      entityType: 'tool',
      docId: 'tools/pytorch',
    },
  },
  budget: {
    textDocumentTokens: 4096,
    imageTokens: 1200,
    maxImagesPerFetch: 3,
  },
  compiler: {
    extractionModel: 'gemini-2.5-flash',
    synthesisModel: 'gemini-2.5-pro',
  },
}

const TEST_REGISTRY: ConceptRegistry = new Map([
  [
    'concepts/attention-mechanism',
    {
      docId: 'concepts/attention-mechanism',
      canonicalTitle: 'Attention Mechanism',
      entityType: 'concept',
      aliases: ['attention mechanism', 'self-attention'],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
  [
    'concepts/transformer',
    {
      docId: 'concepts/transformer',
      canonicalTitle: 'Transformer',
      entityType: 'concept',
      aliases: ['transformer', 'transformer model'],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
  [
    'tools/pytorch',
    {
      docId: 'tools/pytorch',
      canonicalTitle: 'PyTorch',
      entityType: 'tool',
      aliases: ['pytorch', 'torch'],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
])

// ── IngestedContent fixture ───────────────────────────────────────────────────

function makeContent(overrides: Partial<IngestedContent> = {}): IngestedContent {
  return {
    text: 'The attention mechanism is used in transformers. We implemented it with PyTorch.',
    images: [],
    mimeType: 'text/markdown',
    sourceFile: '/kb/raw/papers/attention-paper.md',
    title: 'Attention Is All You Need',
    metadata: {},
    lossy: false,
    ...overrides,
  }
}

// ── Valid LLM response fixture ────────────────────────────────────────────────

const VALID_LLM_RESPONSE = JSON.stringify({
  articles: [
    {
      canonicalTitle: 'Attention Is All You Need',
      entityType: 'research_paper',
      action: 'create',
      existingDocId: null,
      docIdSuggestion: 'research-papers/attention-is-all-you-need',
      knownLinkDocIds: ['concepts/attention-mechanism', 'concepts/transformer', 'tools/pytorch'],
      candidateNewConcepts: [
        {
          name: 'Multi-Head Attention',
          entityType: 'concept',
          description: 'Attention computed in parallel across multiple heads',
          mentionCount: 5,
        },
      ],
      suggestedFrontmatter: {
        authors: ['Vaswani et al.'],
        year: 2017,
        tags: ['nlp', 'transformers'],
      },
      skipReason: null,
      confidence: 0.95,
    },
  ],
})

// ── buildExtractionSystemPrompt tests ─────────────────────────────────────────

describe('buildExtractionSystemPrompt', () => {
  it('includes the domain description', () => {
    const prompt = buildExtractionSystemPrompt(TEST_ONTOLOGY)
    expect(prompt).toContain('Test AI research domain')
  })

  it('lists all entity types', () => {
    const prompt = buildExtractionSystemPrompt(TEST_ONTOLOGY)
    expect(prompt).toContain('concept')
    expect(prompt).toContain('tool')
    expect(prompt).toContain('research_paper')
  })

  it('includes relationship types', () => {
    const prompt = buildExtractionSystemPrompt(TEST_ONTOLOGY)
    expect(prompt).toContain('IMPLEMENTS')
  })

  it('includes the docId format rule', () => {
    const prompt = buildExtractionSystemPrompt(TEST_ONTOLOGY)
    expect(prompt).toContain('docId format')
  })
})

// ── buildExtractionUserPrompt tests ───────────────────────────────────────────

describe('buildExtractionUserPrompt', () => {
  it('includes the source file path', () => {
    const content = makeContent()
    const { entityMentions, registryMatches } = getStaticResult(content)
    const prompt = buildExtractionUserPrompt(content, { entityMentions, registryMatches, tokenEstimate: 100 }, TEST_REGISTRY, TEST_ONTOLOGY)
    expect(prompt).toContain('attention-paper.md')
  })

  it('includes pre-detected entity mentions', () => {
    const content = makeContent()
    const staticResult = getStaticResult(content)
    const prompt = buildExtractionUserPrompt(content, staticResult, TEST_REGISTRY, TEST_ONTOLOGY)
    // attention mechanism is mentioned in the text
    expect(prompt).toContain('attention mechanism')
  })

  it('includes registry matches', () => {
    const content = makeContent()
    const staticResult = getStaticResult(content)
    const prompt = buildExtractionUserPrompt(content, staticResult, TEST_REGISTRY, TEST_ONTOLOGY)
    // Should mention registry entries
    expect(prompt).toContain('concepts/attention-mechanism')
  })

  it('truncates very long source texts', () => {
    const longText = 'A'.repeat(100_000)
    const content = makeContent({ text: longText })
    const staticResult = getStaticResult(content)
    const prompt = buildExtractionUserPrompt(content, staticResult, TEST_REGISTRY, TEST_ONTOLOGY)
    // The prompt should not contain all 100k chars
    expect(prompt.length).toBeLessThan(50_000)
    expect(prompt).toContain('truncated')
  })

  it('includes the source title when available', () => {
    const content = makeContent({ title: 'Attention Is All You Need' })
    const staticResult = getStaticResult(content)
    const prompt = buildExtractionUserPrompt(content, staticResult, TEST_REGISTRY, TEST_ONTOLOGY)
    expect(prompt).toContain('Attention Is All You Need')
  })
})

// ── ConceptExtractor tests ────────────────────────────────────────────────────

describe('ConceptExtractor.buildPlan', () => {
  function makeExtractor(response: string): ConceptExtractor {
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(response)
    return new ConceptExtractor(TEST_ONTOLOGY, TEST_REGISTRY, mockFn)
  }

  it('produces a compilation plan with correct structure', async () => {
    const extractor = makeExtractor(VALID_LLM_RESPONSE)
    const plan = await extractor.buildPlan([makeContent()])

    expect(plan.sourceCount).toBe(1)
    expect(plan.articles).toHaveLength(1)
    expect(plan.skipped).toHaveLength(0)
  })

  it('correctly parses the article plan', async () => {
    const extractor = makeExtractor(VALID_LLM_RESPONSE)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    expect(article.canonicalTitle).toBe('Attention Is All You Need')
    expect(article.entityType).toBe('research_paper')
    expect(article.action).toBe('create')
    expect(article.confidence).toBe(0.95)
  })

  it('validates knownLinkDocIds against registry', async () => {
    const extractor = makeExtractor(VALID_LLM_RESPONSE)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    // All three links are in the registry
    expect(article.knownLinkDocIds).toContain('concepts/attention-mechanism')
    expect(article.knownLinkDocIds).toContain('concepts/transformer')
    expect(article.knownLinkDocIds).toContain('tools/pytorch')
  })

  it('rejects unknown docIds from knownLinkDocIds', async () => {
    const response = JSON.stringify({
      articles: [{
        canonicalTitle: 'Test Article',
        entityType: 'concept',
        action: 'create',
        docIdSuggestion: 'concepts/test-article',
        knownLinkDocIds: ['concepts/attention-mechanism', 'concepts/NONEXISTENT'],
        candidateNewConcepts: [],
        suggestedFrontmatter: {},
        confidence: 0.8,
      }],
    })
    const extractor = makeExtractor(response)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    expect(article.knownLinkDocIds).toContain('concepts/attention-mechanism')
    expect(article.knownLinkDocIds).not.toContain('concepts/NONEXISTENT')
  })

  it('uses fallback entity type when LLM returns invalid type', async () => {
    const response = JSON.stringify({
      articles: [{
        canonicalTitle: 'Test',
        entityType: 'INVALID_TYPE_XYZ',
        action: 'create',
        docIdSuggestion: 'concepts/test',
        knownLinkDocIds: [],
        candidateNewConcepts: [],
        suggestedFrontmatter: {},
        confidence: 0.5,
      }],
    })
    const extractor = makeExtractor(response)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    // Falls back to first valid entity type
    expect(Object.keys(TEST_ONTOLOGY.entityTypes)).toContain(article.entityType)
  })

  it('handles stripped markdown code fences in LLM response', async () => {
    const responseWithFences = '```json\n' + VALID_LLM_RESPONSE + '\n```'
    const extractor = makeExtractor(responseWithFences)
    const plan = await extractor.buildPlan([makeContent()])

    expect(plan.articles).toHaveLength(1)
    expect(plan.articles[0]!.canonicalTitle).toBe('Attention Is All You Need')
  })

  it('handles skip action correctly', async () => {
    const skipResponse = JSON.stringify({
      articles: [{
        canonicalTitle: 'CHANGELOG.md',
        entityType: 'concept',
        action: 'skip',
        docIdSuggestion: 'concepts/changelog',
        knownLinkDocIds: [],
        candidateNewConcepts: [],
        suggestedFrontmatter: {},
        skipReason: 'This is a changelog file, not KB-worthy content',
        confidence: 0.9,
      }],
    })
    const extractor = makeExtractor(skipResponse)
    const content = makeContent({ sourceFile: '/kb/raw/CHANGELOG.md' })
    const plan = await extractor.buildPlan([content])

    expect(plan.articles).toHaveLength(0)
    expect(plan.skipped).toHaveLength(1)
    expect(plan.skipped[0]!.reason).toContain('changelog')
  })

  it('moves failed extractions to skipped list', async () => {
    const errorFn: GenerateFn = vi.fn().mockRejectedValue(new Error('API timeout'))
    const extractor = new ConceptExtractor(TEST_ONTOLOGY, TEST_REGISTRY, errorFn)

    const plan = await extractor.buildPlan([makeContent()])

    expect(plan.articles).toHaveLength(0)
    expect(plan.skipped).toHaveLength(1)
    expect(plan.skipped[0]!.reason).toContain('Extraction failed')
    expect(plan.skipped[0]!.reason).toContain('API timeout')
  })

  it('merges multiple sources targeting the same docId', async () => {
    // Both sources return a plan for the same article
    const sameDocResponse = JSON.stringify({
      articles: [{
        canonicalTitle: 'Attention Mechanism',
        entityType: 'concept',
        action: 'update',
        existingDocId: 'concepts/attention-mechanism',
        docIdSuggestion: 'concepts/attention-mechanism',
        knownLinkDocIds: ['concepts/transformer'],
        candidateNewConcepts: [],
        suggestedFrontmatter: { tags: ['nlp'] },
        confidence: 0.9,
      }],
    })

    const mockFn: GenerateFn = vi.fn().mockResolvedValue(sameDocResponse)
    const extractor = new ConceptExtractor(TEST_ONTOLOGY, TEST_REGISTRY, mockFn)

    const content1 = makeContent({ sourceFile: '/kb/raw/source1.md' })
    const content2 = makeContent({ sourceFile: '/kb/raw/source2.md' })
    const plan = await extractor.buildPlan([content1, content2])

    // Should be merged into one article plan
    expect(plan.articles).toHaveLength(1)

    const article = plan.articles[0]!
    // Both source files should be in sourcePaths
    expect(article.sourcePaths).toContain('/kb/raw/source1.md')
    expect(article.sourcePaths).toContain('/kb/raw/source2.md')
  })

  it('processes multiple different articles from one content', async () => {
    const multiResponse = JSON.stringify({
      articles: [
        {
          canonicalTitle: 'Attention Mechanism',
          entityType: 'concept',
          action: 'update',
          existingDocId: 'concepts/attention-mechanism',
          docIdSuggestion: 'concepts/attention-mechanism',
          knownLinkDocIds: [],
          candidateNewConcepts: [],
          suggestedFrontmatter: {},
          confidence: 0.9,
        },
        {
          canonicalTitle: 'Transformer',
          entityType: 'concept',
          action: 'update',
          existingDocId: 'concepts/transformer',
          docIdSuggestion: 'concepts/transformer',
          knownLinkDocIds: ['concepts/attention-mechanism'],
          candidateNewConcepts: [],
          suggestedFrontmatter: {},
          confidence: 0.85,
        },
      ],
    })

    const extractor = makeExtractor(multiResponse)
    const plan = await extractor.buildPlan([makeContent()])

    expect(plan.articles).toHaveLength(2)
    const titles = plan.articles.map(a => a.canonicalTitle)
    expect(titles).toContain('Attention Mechanism')
    expect(titles).toContain('Transformer')
  })

  it('includes candidateNewConcepts from LLM', async () => {
    const extractor = makeExtractor(VALID_LLM_RESPONSE)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    expect(article.candidateNewConcepts).toHaveLength(1)
    expect(article.candidateNewConcepts[0]!.name).toBe('Multi-Head Attention')
    expect(article.candidateNewConcepts[0]!.entityType).toBe('concept')
  })

  it('uses suggestedFrontmatter from LLM response', async () => {
    const extractor = makeExtractor(VALID_LLM_RESPONSE)
    const plan = await extractor.buildPlan([makeContent()])

    const article = plan.articles[0]!
    expect(article.suggestedFrontmatter['year']).toBe(2017)
    expect(article.suggestedFrontmatter['tags']).toContain('nlp')
  })
})

// ── Directory hint detection tests ────────────────────────────────────────────

describe('ConceptExtractor directory hints', () => {
  it('detects papers/ directory hint', async () => {
    // We test this indirectly by checking the user prompt contains the hint
    const content = makeContent({ sourceFile: '/kb/raw/papers/my-paper.md' })
    const ontology = TEST_ONTOLOGY

    // The directory hint should appear in the user prompt
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_RESPONSE)
    const extractor = new ConceptExtractor(ontology, TEST_REGISTRY, mockFn)

    await extractor.buildPlan([content])

    // Check that the mock was called with a prompt containing research_paper hint
    const callArgs = (mockFn as ReturnType<typeof vi.fn>).mock.calls[0]!
    const userPrompt = callArgs[1] as string
    expect(userPrompt).toContain('research_paper')
  })

  it('detects web-clips/ directory hint', async () => {
    const content = makeContent({ sourceFile: '/kb/raw/web-clips/article/index.md' })
    const mockFn: GenerateFn = vi.fn().mockResolvedValue(VALID_LLM_RESPONSE)
    const extractor = new ConceptExtractor(TEST_ONTOLOGY, TEST_REGISTRY, mockFn)

    await extractor.buildPlan([content])

    const callArgs = (mockFn as ReturnType<typeof vi.fn>).mock.calls[0]!
    const userPrompt = callArgs[1] as string
    expect(userPrompt).toContain('article')
  })
})

// ── makeGenerateFn tests ──────────────────────────────────────────────────────

describe('makeGenerateFn', () => {
  it('creates a GenerateFn from a model-like object', async () => {
    const mockModel = {
      complete: vi.fn().mockResolvedValue({ content: 'test response', finishReason: 'stop' }),
    }

    const generateFn = makeGenerateFn(mockModel, { temperature: 0.0 })
    const result = await generateFn('system prompt', 'user prompt')

    expect(result).toBe('test response')
    expect(mockModel.complete).toHaveBeenCalledWith({
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'user prompt' },
      ],
      temperature: 0.0,
      maxTokens: 8192,
    })
  })

  it('handles null content from model', async () => {
    const mockModel = {
      complete: vi.fn().mockResolvedValue({ content: null }),
    }

    const generateFn = makeGenerateFn(mockModel)
    const result = await generateFn('system', 'user')

    expect(result).toBe('') // null → ''
  })
})

// ── Helpers for tests ─────────────────────────────────────────────────────────

import { buildAliasIndex, scanForEntityMentions } from '../knowledge/ontology/index.js'

function getStaticResult(content: IngestedContent): {
  entityMentions: any[]
  registryMatches: any[]
  directoryHint?: string
  tokenEstimate: number
} {
  const aliasIndex = buildAliasIndex(TEST_ONTOLOGY)
  const entityMentions = scanForEntityMentions(content.text, TEST_ONTOLOGY, aliasIndex)

  const registryMatches = entityMentions
    .filter(m => m.docId)
    .map(m => {
      const entry = TEST_REGISTRY.get(m.docId!)
      if (!entry) return null
      return {
        docId: entry.docId,
        canonicalTitle: entry.canonicalTitle,
        entityType: entry.entityType,
        confidence: 0.8,
      }
    })
    .filter(Boolean)

  return {
    entityMentions,
    registryMatches,
    tokenEstimate: Math.ceil(content.text.length / 4),
  }
}
