import type { IdeaDraft, ResearchBrief, SpecPack, ArchitectureDraft } from '../types'
import { IDEA_MIN_LENGTH } from '../../features/idea-input/validation'

// ─── Stage gate result ────────────────────────────────────────────────────────

export interface StageGateResult {
  canAdvance: boolean
  /** Human-readable reason shown on the blocked button tooltip / banner */
  reason: string | null
}

// ─── Idea → Research ──────────────────────────────────────────────────────────

export function canAdvanceFromIdea(ideaDraft: IdeaDraft | null): StageGateResult {
  if (!ideaDraft) {
    return { canAdvance: false, reason: 'No idea saved yet. Fill in your product idea first.' }
  }

  const rawIdea = ideaDraft.rawIdea.trim()

  if (!rawIdea) {
    return { canAdvance: false, reason: 'Your product idea is empty. Describe what you want to build.' }
  }

  if (rawIdea.length < IDEA_MIN_LENGTH) {
    return {
      canAdvance: false,
      reason: `Your idea is too short (${rawIdea.length}/${IDEA_MIN_LENGTH} chars). Add more detail before continuing.`,
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Research → Spec ──────────────────────────────────────────────────────────

export function canAdvanceFromResearch(researchBrief: ResearchBrief | null): StageGateResult {
  if (!researchBrief) {
    return {
      canAdvance: false,
      reason: 'No research brief yet. Run research or import existing research first.',
    }
  }

  if (!researchBrief.problemSummary?.trim()) {
    return {
      canAdvance: false,
      reason: 'Research brief is incomplete — problem summary is missing. Edit the brief before continuing.',
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Spec → Architecture ──────────────────────────────────────────────────────

export function canAdvanceFromSpec(specPack: SpecPack | null): StageGateResult {
  if (!specPack) {
    return {
      canAdvance: false,
      reason: 'No specification yet. Generate or edit the spec before continuing.',
    }
  }

  if (!specPack.productSummary?.trim() && !specPack.MVPScope?.trim()) {
    return {
      canAdvance: false,
      reason: 'Spec is incomplete — product summary and MVP scope are both empty. Edit the spec before continuing.',
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Architecture → Prompt Loop ───────────────────────────────────────────────

export function canAdvanceFromArchitecture(architectureDraft: ArchitectureDraft | null): StageGateResult {
  if (!architectureDraft) {
    return {
      canAdvance: false,
      reason: 'No architecture draft yet. Generate or edit the architecture before continuing.',
    }
  }

  if (!architectureDraft.recommendedStack?.length) {
    return {
      canAdvance: false,
      reason: 'Architecture is incomplete — no stack items defined. Edit the architecture before continuing.',
    }
  }

  if (!architectureDraft.roadmapPhases?.length) {
    return {
      canAdvance: false,
      reason: 'Architecture is incomplete — no roadmap phases defined. Edit the architecture before continuing.',
    }
  }

  return { canAdvance: true, reason: null }
}
