import type { ResearchBrief, ResearchRun, ImportedResearchArtifact, ResearchMode, IdeaDraft } from '../../shared/types'
import { mockResearchBrief } from '../project/seedData'
import { normalizeResearchText } from '../../features/imported-research-input/normalizer'

// ─── Mock research service ────────────────────────────────────────────────────
// Simulates research generation and handles imported research normalization.
// The runResearch path still uses mock data (real provider integration is Phase 2).
// The normalizeImportedArtifact path now uses the real heuristic text normalizer.

export interface ResearchRunOptions {
  projectId: string
  mode: ResearchMode
  inputSummary: string
}

export const mockResearchService = {
  async runResearch(options: ResearchRunOptions): Promise<ResearchBrief> {
    // Simulate provider latency — real implementation calls Perplexity API here
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      ...mockResearchBrief,
      briefSource: 'generated',
      sourcesNote: `Research generated via mock provider in ${options.mode} mode. Replace with real Perplexity run in Phase 2.`,
    }
  },

  async normalizeImportedArtifact(
    artifact: ImportedResearchArtifact,
    ideaDraft?: IdeaDraft | null
  ): Promise<{ brief: ResearchBrief; warnings: string[] }> {
    // Simulate a short processing delay (normalization is synchronous but we keep async API for future)
    await new Promise((resolve) => setTimeout(resolve, 400))

    const result = normalizeResearchText(
      artifact.rawContent,
      artifact.id,
      artifact.title,
      ideaDraft
    )

    return { brief: result.brief, warnings: result.warnings }
  },
}

export interface MockResearchProvider {
  id: string
  name: string
  type: 'perplexity' | 'manual' | 'mock'
  supportsModelSelection: boolean
  supportsDeepResearch: boolean
  status: 'available' | 'unavailable' | 'coming_soon'
}

export const mockResearchProviders: MockResearchProvider[] = [
  {
    id: 'mock-provider',
    name: 'Mock Research (Demo)',
    type: 'mock',
    supportsModelSelection: false,
    supportsDeepResearch: true,
    status: 'available',
  },
  {
    id: 'perplexity-pro',
    name: 'Perplexity Pro Search',
    type: 'perplexity',
    supportsModelSelection: false,
    supportsDeepResearch: false,
    status: 'coming_soon',
  },
  {
    id: 'perplexity-deep',
    name: 'Perplexity Deep Research',
    type: 'perplexity',
    supportsModelSelection: true,
    supportsDeepResearch: true,
    status: 'coming_soon',
  },
  {
    id: 'manual',
    name: 'Manual Research',
    type: 'manual',
    supportsModelSelection: false,
    supportsDeepResearch: false,
    status: 'available',
  },
]

export function createResearchRun(options: ResearchRunOptions & { id: string }): ResearchRun {
  return {
    id: options.id,
    projectId: options.projectId,
    providerId: 'mock-provider',
    mode: options.mode,
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    inputSummary: options.inputSummary,
  }
}
