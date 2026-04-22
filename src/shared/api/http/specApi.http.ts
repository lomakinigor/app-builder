// T-305 — HTTP adapter for SpecApi
// Wired to VITE_API_BASE_URL. Activated when VITE_API_MODE=real.
//
// Contract:
//   POST /api/spec/generate         → SpecPack
//   POST /api/architecture/generate → ArchitectureDraft

import type { SpecApi } from '../types'
import type { ResearchBrief, SpecPack, ArchitectureDraft, ProjectType } from '../../types'
import { postJson } from './client'

// ─── Request body shapes ──────────────────────────────────────────────────────
// Compact context — only fields the backend generator needs.

interface GenerateSpecBody {
  projectType: ProjectType
  brief: {
    problemSummary: string
    targetUsers: string[]
    valueHypothesis: string
    competitorNotes: string
    risks: string[]
    opportunities: string[]
    recommendedMVP: string
    openQuestions: string[]
  }
}

interface GenerateArchitectureBody {
  projectType: ProjectType
  spec: {
    productSummary: string
    MVPScope: string
    featureList: SpecPack['featureList']
    constraints: SpecPack['constraints']
    assumptions: SpecPack['assumptions']
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const specApiHttp: SpecApi = {
  generateSpec(brief: ResearchBrief, projectType: ProjectType): Promise<SpecPack> {
    const body: GenerateSpecBody = {
      projectType,
      brief: {
        problemSummary: brief.problemSummary,
        targetUsers: brief.targetUsers,
        valueHypothesis: brief.valueHypothesis,
        competitorNotes: brief.competitorNotes,
        risks: brief.risks,
        opportunities: brief.opportunities,
        recommendedMVP: brief.recommendedMVP,
        openQuestions: brief.openQuestions,
      },
    }
    return postJson<SpecPack>('/api/spec/generate', body)
  },

  generateArchitecture(spec: SpecPack, projectType: ProjectType): Promise<ArchitectureDraft> {
    const body: GenerateArchitectureBody = {
      projectType,
      spec: {
        productSummary: spec.productSummary,
        MVPScope: spec.MVPScope,
        featureList: spec.featureList,
        constraints: spec.constraints,
        assumptions: spec.assumptions,
      },
    }
    return postJson<ArchitectureDraft>('/api/architecture/generate', body)
  },
}
