/**
 * Ontology barrel — public API for the ontology layer
 */

export type {
  // Core type system
  KBOntology,
  EntityTypeSchema,
  RelationshipType,
  VocabularyEntry,
  FrontmatterSchema,
  FrontmatterFieldSchema,
  ArticleSection,
  FieldType,
  KBBudgetConfig,
  KBCompilerModelConfig,

  // Registry
  ConceptRegistry,
  ConceptRegistryEntry,

  // Validation
  OntologyValidationResult,
  OntologyValidationIssue,
} from './types.js'

export {
  // Loader
  OntologyLoader,
  validateOntology,
  serializeOntology,
  ONTOLOGY_FILENAME,
  KB_CONFIG_FILENAME,
} from './loader.js'

export type { AliasIndex, EntityMention, NormalizeOptions, NormalizationResult } from './vocabulary.js'

export {
  // Vocabulary
  buildAliasIndex,
  resolveWikilink,
  normalizeWikilinks,
  scanForEntityMentions,
} from './vocabulary.js'

export {
  // Registry
  buildConceptRegistry,
  findByWikilink,
  findByEntityType,
  buildDocIdAliasMap,
  upsertRegistryEntry,
  removeRegistryEntry,
  serializeRegistry,
  deserializeRegistry,
} from './registry.js'
