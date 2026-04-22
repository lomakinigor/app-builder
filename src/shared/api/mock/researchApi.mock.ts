// T-301 — Mock adapter for ResearchApi
// Delegates to the existing mockResearchService; no business logic changes.

import { mockResearchService } from '../../../mocks/services/researchService'
import type { ResearchApi, ResearchRunOptions } from '../types'
import type { ImportedResearchArtifact, IdeaDraft } from '../../types'

export const researchApiMock: ResearchApi = {
  runResearch(options: ResearchRunOptions) {
    return mockResearchService.runResearch(options)
  },

  normalizeImportedArtifact(artifact: ImportedResearchArtifact, ideaDraft?: IdeaDraft | null) {
    return mockResearchService.normalizeImportedArtifact(artifact, ideaDraft)
  },
}
