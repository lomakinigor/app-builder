// T-301 — Mock adapter for SpecApi
// Delegates to the existing mockSpecService; no business logic changes.

import { mockSpecService } from '../../../mocks/services/specService'
import type { SpecApi } from '../types'
import type { ResearchBrief, SpecPack, ProjectType } from '../../types'

export const specApiMock: SpecApi = {
  generateSpec(brief: ResearchBrief, projectType: ProjectType) {
    return mockSpecService.generateSpec(brief, projectType)
  },

  generateArchitecture(spec: SpecPack, projectType: ProjectType) {
    return mockSpecService.generateArchitecture(spec, projectType)
  },
}
