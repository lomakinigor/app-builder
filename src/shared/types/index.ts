// Re-export all domain types from one place for convenient imports.

export type { Project, IdeaDraft, ProjectStage, ProjectStatus } from '../../entities/project/types'

export type {
  ResearchProvider,
  ResearchRun,
  ImportedResearchArtifact,
  ResearchSource,
  ResearchBrief,
  ResearchBriefSource,
  ResearchMode,
  RunStatus,
  ResearchSourceType,
} from '../../entities/research/types'

export type { SpecPack, SpecFeature } from '../../entities/specification/types'

export type {
  ArchitectureDraft,
  StackItem,
  RoadmapPhase,
} from '../../entities/architecture/types'

export type {
  PromptIteration,
  ParsedClaudeResponse,
  PromptStatus,
} from '../../entities/prompt-iteration/types'
