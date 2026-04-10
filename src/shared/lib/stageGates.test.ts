// ─── Stage gate unit tests ────────────────────────────────────────────────────
// Implements T-016 (partial) / T-007 DoD.
//
// Tests canAdvanceFromSpec and canAdvanceFromArchitecture — the two gates that
// guard the Spec → Architecture → PromptLoop progression.
//
// canAdvanceFromIdea and canAdvanceFromResearch are simpler helpers tested
// indirectly through E2E-style acceptance tests in T-011/T-016.

import { describe, it, expect } from 'vitest'
import {
  canAdvanceFromSpec,
  canAdvanceFromArchitecture,
} from './stageGates'
import type { SpecPack, ArchitectureDraft } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A helpful tool.',
    MVPScope: 'Core CRUD + auth.',
    featureList: [],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
    ...overrides,
  }
}

function makeArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [{ name: 'React', role: 'UI', rationale: 'Standard' }],
    moduleArchitecture: 'Feature-sliced.',
    dataFlow: 'Zustand → components.',
    roadmapPhases: [{ phase: 1, title: 'Foundation', goals: ['Setup'], estimatedComplexity: 'low' }],
    technicalRisks: [],
    ...overrides,
  }
}

// ─── canAdvanceFromSpec ────────────────────────────────────────────────────────

describe('canAdvanceFromSpec', () => {

  it('blocks when specPack is null', () => {
    const result = canAdvanceFromSpec(null)
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toBeTruthy()
  })

  it('blocks when both productSummary and MVPScope are empty', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: '', MVPScope: '' }))
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toMatch(/резюме|объём|пусты/i)
  })

  it('passes when productSummary is present even if MVPScope is empty', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: 'A product.', MVPScope: '' }))
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('passes when MVPScope is present even if productSummary is empty', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: '', MVPScope: 'Core features only.' }))
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('blocks when projectType is missing (empty string)', () => {
    // projectType coerced to empty to simulate a bad state
    const spec = makeSpec({ projectType: '' as 'application' })
    const result = canAdvanceFromSpec(spec)
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toMatch(/тип проекта/i)
  })

  it('passes for a well-formed application spec', () => {
    const result = canAdvanceFromSpec(makeSpec())
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('passes for a well-formed website spec', () => {
    const result = canAdvanceFromSpec(makeSpec({ projectType: 'website' }))
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('blocks when productSummary is only whitespace and MVPScope is empty', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: '   ', MVPScope: '' }))
    expect(result.canAdvance).toBe(false)
  })
})

// ─── canAdvanceFromArchitecture ────────────────────────────────────────────────

describe('canAdvanceFromArchitecture', () => {

  it('blocks when architectureDraft is null', () => {
    const result = canAdvanceFromArchitecture(null)
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toBeTruthy()
  })

  it('blocks when recommendedStack is empty', () => {
    const result = canAdvanceFromArchitecture(makeArch({ recommendedStack: [] }))
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toMatch(/стек/i)
  })

  it('blocks when roadmapPhases is empty', () => {
    const result = canAdvanceFromArchitecture(makeArch({ roadmapPhases: [] }))
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toMatch(/роадмап|фаз/i)
  })

  it('blocks when projectType is missing', () => {
    const arch = makeArch({ projectType: '' as 'application' })
    const result = canAdvanceFromArchitecture(arch)
    expect(result.canAdvance).toBe(false)
    expect(result.reason).toMatch(/тип проекта/i)
  })

  it('passes for a well-formed application architecture', () => {
    const result = canAdvanceFromArchitecture(makeArch())
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('passes for a well-formed website architecture', () => {
    const result = canAdvanceFromArchitecture(makeArch({ projectType: 'website' }))
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('passes with multiple stack items and multiple roadmap phases', () => {
    const arch = makeArch({
      recommendedStack: [
        { name: 'React', role: 'UI', rationale: 'Ecosystem' },
        { name: 'Vite', role: 'Build', rationale: 'Fast' },
      ],
      roadmapPhases: [
        { phase: 1, title: 'Foundation', goals: ['Setup'], estimatedComplexity: 'low' },
        { phase: 2, title: 'Core', goals: ['Auth', 'CRUD'], estimatedComplexity: 'medium' },
      ],
    })
    const result = canAdvanceFromArchitecture(arch)
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('result.reason is null (not undefined) when canAdvance is true', () => {
    const result = canAdvanceFromArchitecture(makeArch())
    // Ensures callers can safely do `result.reason ?? undefined` without surprises
    expect(result.reason).toBeNull()
  })
})
