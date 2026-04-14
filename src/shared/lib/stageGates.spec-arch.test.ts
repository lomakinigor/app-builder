// T-013 — Stage gate unit tests: canAdvanceFromSpec / canAdvanceFromArchitecture
// Implements F-005 / F-006 / T-013
//
// Verifies that the Spec and Architecture gates enforce the PRD minimum completeness
// criteria and return stable diagnostic codes for each blocking condition.
//
// Scenarios:
//   A. canAdvanceFromSpec — null / no spec
//   B. canAdvanceFromSpec — empty productSummary (separate from MVPScope)
//   C. canAdvanceFromSpec — empty MVPScope
//   D. canAdvanceFromSpec — empty featureList
//   E. canAdvanceFromSpec — missing projectType
//   F. canAdvanceFromSpec — complete spec passes
//   G. canAdvanceFromArchitecture — null / no arch
//   H. canAdvanceFromArchitecture — empty stack
//   I. canAdvanceFromArchitecture — empty roadmap
//   J. canAdvanceFromArchitecture — missing projectType
//   K. canAdvanceFromArchitecture — complete arch passes
//   Edge: diagnostic constants are unique; passing results have no diagnostic

import { describe, it, expect } from 'vitest'
import type { SpecPack, ArchitectureDraft } from '../types'
import {
  canAdvanceFromSpec,
  canAdvanceFromArchitecture,
  SPEC_DIAG,
  ARCH_DIAG,
} from './stageGates'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A stateful web application for managing tasks.',
    MVPScope: 'Single-user CRUD with local persistence. No auth, no billing in V1.',
    featureList: [
      { id: 'f-001', name: 'Onboarding', description: 'First-use flow', priority: 'must' },
    ],
    assumptions: ['Desktop browser primary'],
    constraints: ['No backend in V1'],
    acceptanceNotes: 'User can create and manage tasks after a page refresh.',
    ...overrides,
  }
}

function makeArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [
      { name: 'React', role: 'UI layer', rationale: 'Component-based SPA' },
    ],
    moduleArchitecture: 'Feature-sliced: app → pages → features → entities → shared',
    dataFlow: 'User action → store → UI re-render',
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['Shell', 'Routing'], estimatedComplexity: 'low' },
    ],
    technicalRisks: ['localStorage limit at 5 MB'],
    ...overrides,
  }
}

// ─── A. canAdvanceFromSpec — null ─────────────────────────────────────────────

describe('A. canAdvanceFromSpec — no spec', () => {
  it('null → canAdvance=false', () => {
    expect(canAdvanceFromSpec(null).canAdvance).toBe(false)
  })

  it('null → reason is non-empty string', () => {
    expect(canAdvanceFromSpec(null).reason).toBeTruthy()
  })

  it('null → diagnostic=SPEC_DIAG.NO_SPEC', () => {
    expect(canAdvanceFromSpec(null).diagnostic).toBe(SPEC_DIAG.NO_SPEC)
  })
})

// ─── B. canAdvanceFromSpec — empty productSummary ─────────────────────────────

describe('B. canAdvanceFromSpec — empty productSummary', () => {
  it('empty string → canAdvance=false', () => {
    expect(canAdvanceFromSpec(makeSpec({ productSummary: '' })).canAdvance).toBe(false)
  })

  it('whitespace-only → canAdvance=false', () => {
    expect(canAdvanceFromSpec(makeSpec({ productSummary: '   ' })).canAdvance).toBe(false)
  })

  it('empty productSummary → diagnostic=SPEC_DIAG.EMPTY_SUMMARY', () => {
    expect(canAdvanceFromSpec(makeSpec({ productSummary: '' })).diagnostic).toBe(SPEC_DIAG.EMPTY_SUMMARY)
  })

  it('empty summary blocks even when MVPScope is non-empty', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: '', MVPScope: 'Something' }))
    expect(result.canAdvance).toBe(false)
    expect(result.diagnostic).toBe(SPEC_DIAG.EMPTY_SUMMARY)
  })
})

// ─── C. canAdvanceFromSpec — empty MVPScope ───────────────────────────────────

describe('C. canAdvanceFromSpec — empty MVPScope', () => {
  it('empty MVPScope → canAdvance=false', () => {
    expect(canAdvanceFromSpec(makeSpec({ MVPScope: '' })).canAdvance).toBe(false)
  })

  it('whitespace-only MVPScope → canAdvance=false', () => {
    expect(canAdvanceFromSpec(makeSpec({ MVPScope: '  ' })).canAdvance).toBe(false)
  })

  it('empty MVPScope → diagnostic=SPEC_DIAG.EMPTY_MVP_SCOPE', () => {
    expect(canAdvanceFromSpec(makeSpec({ MVPScope: '' })).diagnostic).toBe(SPEC_DIAG.EMPTY_MVP_SCOPE)
  })

  it('productSummary present + MVPScope empty → does NOT trigger EMPTY_SUMMARY', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: 'A product.', MVPScope: '' }))
    expect(result.diagnostic).not.toBe(SPEC_DIAG.EMPTY_SUMMARY)
    expect(result.diagnostic).toBe(SPEC_DIAG.EMPTY_MVP_SCOPE)
  })
})

// ─── D. canAdvanceFromSpec — empty featureList ────────────────────────────────

describe('D. canAdvanceFromSpec — empty featureList', () => {
  it('featureList=[] → canAdvance=false', () => {
    expect(canAdvanceFromSpec(makeSpec({ featureList: [] })).canAdvance).toBe(false)
  })

  it('featureList=[] → diagnostic=SPEC_DIAG.NO_FEATURES', () => {
    expect(canAdvanceFromSpec(makeSpec({ featureList: [] })).diagnostic).toBe(SPEC_DIAG.NO_FEATURES)
  })

  it('featureList=[] → reason is non-empty', () => {
    expect(canAdvanceFromSpec(makeSpec({ featureList: [] })).reason).toBeTruthy()
  })

  it('single feature is sufficient to pass featureList check', () => {
    const result = canAdvanceFromSpec(makeSpec({
      featureList: [{ id: 'f-001', name: 'Feature A', description: '', priority: 'must' }],
    }))
    // Should not block on NO_FEATURES (may pass or block on another field)
    expect(result.diagnostic).not.toBe(SPEC_DIAG.NO_FEATURES)
  })
})

// ─── E. canAdvanceFromSpec — missing projectType ──────────────────────────────

describe('E. canAdvanceFromSpec — missing projectType', () => {
  it('projectType="" → canAdvance=false', () => {
    // Cast to bypass TS — tests runtime behavior
    const spec = makeSpec({ projectType: '' as 'application' })
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(false)
  })

  it('projectType="" → diagnostic=SPEC_DIAG.MISSING_PROJECT_TYPE', () => {
    const spec = makeSpec({ projectType: '' as 'application' })
    expect(canAdvanceFromSpec(spec).diagnostic).toBe(SPEC_DIAG.MISSING_PROJECT_TYPE)
  })
})

// ─── F. canAdvanceFromSpec — complete spec ────────────────────────────────────

describe('F. canAdvanceFromSpec — complete spec passes', () => {
  it('complete application spec → canAdvance=true', () => {
    expect(canAdvanceFromSpec(makeSpec()).canAdvance).toBe(true)
  })

  it('complete spec → reason=null', () => {
    expect(canAdvanceFromSpec(makeSpec()).reason).toBeNull()
  })

  it('complete spec → no diagnostic', () => {
    expect(canAdvanceFromSpec(makeSpec()).diagnostic).toBeUndefined()
  })

  it('website type spec also passes', () => {
    const websiteSpec = makeSpec({
      projectType: 'website',
      featureList: [{ id: 'f-w01', name: 'Homepage', description: 'Hero + CTA', priority: 'must' }],
    })
    expect(canAdvanceFromSpec(websiteSpec).canAdvance).toBe(true)
  })

  it('spec with multiple features passes', () => {
    const rich = makeSpec({
      featureList: [
        { id: 'f-001', name: 'Onboarding', description: '', priority: 'must' },
        { id: 'f-002', name: 'Dashboard', description: '', priority: 'must' },
        { id: 'f-003', name: 'Export', description: '', priority: 'could' },
      ],
    })
    expect(canAdvanceFromSpec(rich).canAdvance).toBe(true)
  })
})

// ─── G. canAdvanceFromArchitecture — null ────────────────────────────────────

describe('G. canAdvanceFromArchitecture — no arch', () => {
  it('null → canAdvance=false', () => {
    expect(canAdvanceFromArchitecture(null).canAdvance).toBe(false)
  })

  it('null → reason is non-empty', () => {
    expect(canAdvanceFromArchitecture(null).reason).toBeTruthy()
  })

  it('null → diagnostic=ARCH_DIAG.NO_ARCH', () => {
    expect(canAdvanceFromArchitecture(null).diagnostic).toBe(ARCH_DIAG.NO_ARCH)
  })
})

// ─── H. canAdvanceFromArchitecture — empty stack ─────────────────────────────

describe('H. canAdvanceFromArchitecture — empty stack', () => {
  it('recommendedStack=[] → canAdvance=false', () => {
    expect(canAdvanceFromArchitecture(makeArch({ recommendedStack: [] })).canAdvance).toBe(false)
  })

  it('recommendedStack=[] → diagnostic=ARCH_DIAG.EMPTY_STACK', () => {
    expect(canAdvanceFromArchitecture(makeArch({ recommendedStack: [] })).diagnostic).toBe(ARCH_DIAG.EMPTY_STACK)
  })

  it('recommendedStack=[] → reason is non-empty', () => {
    expect(canAdvanceFromArchitecture(makeArch({ recommendedStack: [] })).reason).toBeTruthy()
  })
})

// ─── I. canAdvanceFromArchitecture — empty roadmap ───────────────────────────

describe('I. canAdvanceFromArchitecture — empty roadmap', () => {
  it('roadmapPhases=[] → canAdvance=false', () => {
    expect(canAdvanceFromArchitecture(makeArch({ roadmapPhases: [] })).canAdvance).toBe(false)
  })

  it('roadmapPhases=[] → diagnostic=ARCH_DIAG.EMPTY_ROADMAP', () => {
    expect(canAdvanceFromArchitecture(makeArch({ roadmapPhases: [] })).diagnostic).toBe(ARCH_DIAG.EMPTY_ROADMAP)
  })

  it('stack present + roadmap empty — NOT blocked by EMPTY_STACK', () => {
    const result = canAdvanceFromArchitecture(makeArch({ roadmapPhases: [] }))
    expect(result.diagnostic).not.toBe(ARCH_DIAG.EMPTY_STACK)
    expect(result.diagnostic).toBe(ARCH_DIAG.EMPTY_ROADMAP)
  })
})

// ─── J. canAdvanceFromArchitecture — missing projectType ─────────────────────

describe('J. canAdvanceFromArchitecture — missing projectType', () => {
  it('projectType="" → canAdvance=false', () => {
    const arch = makeArch({ projectType: '' as 'application' })
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(false)
  })

  it('projectType="" → diagnostic=ARCH_DIAG.MISSING_PROJECT_TYPE', () => {
    const arch = makeArch({ projectType: '' as 'application' })
    expect(canAdvanceFromArchitecture(arch).diagnostic).toBe(ARCH_DIAG.MISSING_PROJECT_TYPE)
  })
})

// ─── K. canAdvanceFromArchitecture — complete arch ───────────────────────────

describe('K. canAdvanceFromArchitecture — complete arch passes', () => {
  it('complete application arch → canAdvance=true', () => {
    expect(canAdvanceFromArchitecture(makeArch()).canAdvance).toBe(true)
  })

  it('complete arch → reason=null', () => {
    expect(canAdvanceFromArchitecture(makeArch()).reason).toBeNull()
  })

  it('complete arch → no diagnostic', () => {
    expect(canAdvanceFromArchitecture(makeArch()).diagnostic).toBeUndefined()
  })

  it('website arch passes', () => {
    const websiteArch = makeArch({
      projectType: 'website',
      recommendedStack: [{ name: 'Next.js', role: 'Framework', rationale: 'SSR/SSG' }],
      roadmapPhases: [{ phase: 0, title: 'Foundation', goals: ['Scaffold'], estimatedComplexity: 'low' }],
    })
    expect(canAdvanceFromArchitecture(websiteArch).canAdvance).toBe(true)
  })

  it('arch with multiple roadmap phases passes', () => {
    const rich = makeArch({
      roadmapPhases: [
        { phase: 0, title: 'Foundation', goals: ['Shell'], estimatedComplexity: 'low' },
        { phase: 1, title: 'Core', goals: ['CRUD'], estimatedComplexity: 'medium' },
        { phase: 2, title: 'Polish', goals: ['Export'], estimatedComplexity: 'high' },
      ],
    })
    expect(canAdvanceFromArchitecture(rich).canAdvance).toBe(true)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('SPEC_DIAG constants are all unique strings', () => {
    const values = Object.values(SPEC_DIAG)
    expect(new Set(values).size).toBe(values.length)
  })

  it('ARCH_DIAG constants are all unique strings', () => {
    const values = Object.values(ARCH_DIAG)
    expect(new Set(values).size).toBe(values.length)
  })

  it('SPEC_DIAG and ARCH_DIAG share no values (no cross-domain collision)', () => {
    const specValues = new Set(Object.values(SPEC_DIAG))
    const archValues = Object.values(ARCH_DIAG)
    for (const v of archValues) {
      expect(specValues.has(v)).toBe(false)
    }
  })

  it('passing spec result has canAdvance=true, reason=null, no diagnostic', () => {
    const result = canAdvanceFromSpec(makeSpec())
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
    expect(result.diagnostic).toBeUndefined()
  })

  it('passing arch result has canAdvance=true, reason=null, no diagnostic', () => {
    const result = canAdvanceFromArchitecture(makeArch())
    expect(result.canAdvance).toBe(true)
    expect(result.reason).toBeNull()
    expect(result.diagnostic).toBeUndefined()
  })

  it('gate checks are fail-fast: summary empty blocks before MVP-scope check', () => {
    const result = canAdvanceFromSpec(makeSpec({ productSummary: '', MVPScope: '' }))
    // First failing check wins — EMPTY_SUMMARY, not EMPTY_MVP_SCOPE
    expect(result.diagnostic).toBe(SPEC_DIAG.EMPTY_SUMMARY)
  })

  it('gate checks are fail-fast: stack empty blocks before roadmap check', () => {
    const result = canAdvanceFromArchitecture(makeArch({ recommendedStack: [], roadmapPhases: [] }))
    expect(result.diagnostic).toBe(ARCH_DIAG.EMPTY_STACK)
  })
})
