// T-303 — HTTP adapter for ResearchApi
// Wired to VITE_API_BASE_URL. Activated when VITE_API_MODE=real.
//
// Contract:
//   POST /api/research/run      → ResearchBrief
//   POST /api/research/normalize → { brief: ResearchBrief, warnings: string[] }

import type { ResearchApi, ResearchRunOptions } from '../types'
import type { ImportedResearchArtifact, IdeaDraft } from '../../types'
import { postJson } from './client'

export const researchApiHttp: ResearchApi = {
  runResearch(options: ResearchRunOptions) {
    return postJson('/api/research/run', {
      projectId: options.projectId,
      mode: options.mode,
      inputSummary: options.inputSummary,
    })
  },

  normalizeImportedArtifact(artifact: ImportedResearchArtifact, ideaDraft?: IdeaDraft | null) {
    return postJson('/api/research/normalize', {
      artifact,
      ideaDraft: ideaDraft ?? null,
    })
  },
}
