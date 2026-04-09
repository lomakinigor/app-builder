import type { ResearchBrief, SpecPack, ArchitectureDraft } from '../../shared/types'
import { mockSpecPack, mockArchitectureDraft } from '../project/seedData'

// ─── Mock spec generation service ────────────────────────────────────────────
// Generates spec and architecture drafts from a research brief.
// Replace with real AI-powered generation in Phase 3.

export const mockSpecService = {
  async generateSpec(_brief: ResearchBrief): Promise<SpecPack> {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return mockSpecPack
  },

  async generateArchitecture(_spec: SpecPack): Promise<ArchitectureDraft> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return mockArchitectureDraft
  },
}
