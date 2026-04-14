// T-013 — Spec/Architecture service output shape + gate compatibility
// Implements F-005 / F-006 / T-013
//
// Verifies that mockSpecService.generateSpec and .generateArchitecture:
//   - return objects with all required fields populated
//   - produce outputs that pass canAdvanceFromSpec / canAdvanceFromArchitecture
//   - respect the projectType distinction (application vs website)
//
// Uses fake timers to suppress 1200ms / 1000ms delays.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ResearchBrief } from '../../shared/types'
import { mockSpecService } from './specService'
import { canAdvanceFromSpec, canAdvanceFromArchitecture } from '../../shared/lib/stageGates'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    id: 'brief-001',
    projectId: 'proj-001',
    sources: [],
    problemSummary: 'Users need a better way to manage tasks.',
    targetUsers: ['Developers', 'Project managers'],
    keyInsights: ['Single-user MVP is sufficient for V1'],
    valueHypothesis: 'A focused task manager with zero onboarding friction',
    recommendedMVP: 'Task list with CRUD and local persistence. No auth in V1.',
    open_questions: [],
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ─── generateSpec — application ───────────────────────────────────────────────

describe('generateSpec — application', () => {
  it('returns a SpecPack with projectType=application', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'application')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.projectType).toBe('application')
  })

  it('productSummary is a non-empty string', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'application')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.productSummary.trim().length).toBeGreaterThan(0)
  })

  it('MVPScope is a non-empty string', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'application')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.MVPScope.trim().length).toBeGreaterThan(0)
  })

  it('featureList has at least one entry', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'application')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.featureList.length).toBeGreaterThan(0)
  })

  it('generated application spec passes canAdvanceFromSpec', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'application')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })

  it('productSummary incorporates brief.valueHypothesis when present', async () => {
    const p = mockSpecService.generateSpec(
      makeBrief({ valueHypothesis: 'A focused kanban board' }),
      'application',
    )
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.productSummary).toContain('A focused kanban board')
  })
})

// ─── generateSpec — website ───────────────────────────────────────────────────

describe('generateSpec — website', () => {
  it('returns a SpecPack with projectType=website', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'website')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.projectType).toBe('website')
  })

  it('generated website spec passes canAdvanceFromSpec', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'website')
    await vi.runAllTimersAsync()
    const spec = await p
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })

  it('website and application specs have distinct featureLists', async () => {
    const pApp = mockSpecService.generateSpec(makeBrief(), 'application')
    const pWeb = mockSpecService.generateSpec(makeBrief(), 'website')
    await vi.runAllTimersAsync()
    const [appSpec, webSpec] = await Promise.all([pApp, pWeb])
    // Feature names differ between types
    const appNames = appSpec.featureList.map((f) => f.name)
    const webNames = webSpec.featureList.map((f) => f.name)
    expect(appNames).not.toEqual(webNames)
  })
})

// ─── generateArchitecture — application ──────────────────────────────────────

describe('generateArchitecture — application', () => {
  it('returns an ArchitectureDraft with projectType=application', async () => {
    const spec = { projectType: 'application' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'application')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe('application')
  })

  it('recommendedStack has at least one entry', async () => {
    const spec = { projectType: 'application' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'application')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.recommendedStack.length).toBeGreaterThan(0)
  })

  it('roadmapPhases has at least one phase', async () => {
    const spec = { projectType: 'application' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'application')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.roadmapPhases.length).toBeGreaterThan(0)
  })

  it('generated application arch passes canAdvanceFromArchitecture', async () => {
    const spec = { projectType: 'application' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'application')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })
})

// ─── generateArchitecture — website ──────────────────────────────────────────

describe('generateArchitecture — website', () => {
  it('returns an ArchitectureDraft with projectType=website', async () => {
    const spec = { projectType: 'website' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'website')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe('website')
  })

  it('generated website arch passes canAdvanceFromArchitecture', async () => {
    const spec = { projectType: 'website' as const, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
    const p = mockSpecService.generateArchitecture(spec, 'website')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })
})
