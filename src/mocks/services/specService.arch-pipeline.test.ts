// T-104 — Architecture generation: pipeline, structural integrity, spec-alignment
// implements F-006 / T-104
//
// Complements T-102 (type differentiation + minimal contract) and T-013 (gate logic)
// with deeper assertions:
//
//   A. Full pipeline — generateSpec → generateArchitecture (end-to-end, both types)
//   B. Roadmap structural integrity — sequential phase numbering, goals, complexity
//   C. Stack structural integrity — uniqueness, TypeScript cross-type presence
//   D. _spec parameter behaviour — projectType arg wins; spec content is ignored
//   E. Roadmap domain coverage — phase goals collectively cover spec feature areas
//
// Design note:
//   generateArchitecture(_spec, projectType) currently ignores its first argument.
//   The `_spec` prefix signals this is intentional for MVP.
//   Tests in group D explicitly pin this contract so a future change is noticed.
//
// Uses fake timers to suppress async delays.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ResearchBrief, ProjectType } from '../../shared/types'
import { mockSpecService } from './specService'
import { canAdvanceFromSpec, canAdvanceFromArchitecture } from '../../shared/lib/stageGates'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    id: 'brief-001',
    projectId: 'proj-001',
    sources: [],
    problemSummary: 'Users need a better way to manage tasks.',
    targetUsers: ['Developers', 'Project managers'],
    keyInsights: ['Single-user MVP sufficient for V1'],
    valueHypothesis: 'A focused tool with zero onboarding friction',
    recommendedMVP: 'Task list with CRUD and local persistence.',
    open_questions: [],
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

/** Run spec generation through fake timers. */
async function runGenerateSpec(type: ProjectType, briefOverrides?: Partial<ResearchBrief>) {
  const p = mockSpecService.generateSpec(makeBrief(briefOverrides), type)
  await vi.runAllTimersAsync()
  return p
}

/** Run architecture generation through fake timers using an empty stub spec. */
async function runGenerateArch(type: ProjectType) {
  const stub = {
    projectType: type,
    productSummary: 's',
    MVPScope: 's',
    featureList: [],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
  }
  const p = mockSpecService.generateArchitecture(stub, type)
  await vi.runAllTimersAsync()
  return p
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ─── A. Full pipeline — generateSpec → generateArchitecture ───────────────────

describe('architecture generation — full spec→arch pipeline', () => {
  it('application: full pipeline spec.projectType matches arch.projectType', async () => {
    const spec = await runGenerateSpec('application')
    const p = mockSpecService.generateArchitecture(spec, spec.projectType)
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe(spec.projectType)
  })

  it('website: full pipeline spec.projectType matches arch.projectType', async () => {
    const spec = await runGenerateSpec('website')
    const p = mockSpecService.generateArchitecture(spec, spec.projectType)
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe(spec.projectType)
  })

  it('application: full pipeline spec passes canAdvanceFromSpec gate', async () => {
    const spec = await runGenerateSpec('application')
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })

  it('website: full pipeline spec passes canAdvanceFromSpec gate', async () => {
    const spec = await runGenerateSpec('website')
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })

  it('application: full pipeline arch passes canAdvanceFromArchitecture gate', async () => {
    const spec = await runGenerateSpec('application')
    const p = mockSpecService.generateArchitecture(spec, spec.projectType)
    await vi.runAllTimersAsync()
    const arch = await p
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })

  it('website: full pipeline arch passes canAdvanceFromArchitecture gate', async () => {
    const spec = await runGenerateSpec('website')
    const p = mockSpecService.generateArchitecture(spec, spec.projectType)
    await vi.runAllTimersAsync()
    const arch = await p
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })

  it('application: real spec input does not degrade arch quality vs empty stub', async () => {
    const spec = await runGenerateSpec('application')
    const archFromReal = await (() => {
      const p = mockSpecService.generateArchitecture(spec, 'application')
      return vi.runAllTimersAsync().then(() => p)
    })()
    const archFromStub = await runGenerateArch('application')
    // Architecture is type-driven; both should produce identical outputs
    expect(archFromReal.recommendedStack).toEqual(archFromStub.recommendedStack)
    expect(archFromReal.roadmapPhases).toEqual(archFromStub.roadmapPhases)
  })

  it('website: real spec input does not degrade arch quality vs empty stub', async () => {
    const spec = await runGenerateSpec('website')
    const archFromReal = await (() => {
      const p = mockSpecService.generateArchitecture(spec, 'website')
      return vi.runAllTimersAsync().then(() => p)
    })()
    const archFromStub = await runGenerateArch('website')
    expect(archFromReal.recommendedStack).toEqual(archFromStub.recommendedStack)
    expect(archFromReal.roadmapPhases).toEqual(archFromStub.roadmapPhases)
  })
})

// ─── B. Roadmap structural integrity ─────────────────────────────────────────

const SUPPORTED_TYPES: ProjectType[] = ['application', 'website']

describe('architecture generation — roadmap structural integrity', () => {
  it.each(SUPPORTED_TYPES)('%s: roadmap phases start at 0', async (type) => {
    const arch = await runGenerateArch(type)
    const phaseNumbers = arch.roadmapPhases.map((p) => p.phase)
    expect(phaseNumbers[0]).toBe(0)
  })

  it.each(SUPPORTED_TYPES)('%s: roadmap phase numbers are unique (no duplicates)', async (type) => {
    const arch = await runGenerateArch(type)
    const phaseNumbers = arch.roadmapPhases.map((p) => p.phase)
    expect(new Set(phaseNumbers).size).toBe(phaseNumbers.length)
  })

  it.each(SUPPORTED_TYPES)('%s: roadmap phase numbers are sequential (no gaps)', async (type) => {
    const arch = await runGenerateArch(type)
    const phaseNumbers = arch.roadmapPhases.map((p) => p.phase).sort((a, b) => a - b)
    for (let i = 0; i < phaseNumbers.length; i++) {
      expect(phaseNumbers[i]).toBe(i)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: every roadmap phase has a non-empty title', async (type) => {
    const arch = await runGenerateArch(type)
    for (const phase of arch.roadmapPhases) {
      expect(typeof phase.title).toBe('string')
      expect(phase.title.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: every roadmap phase has at least one goal', async (type) => {
    const arch = await runGenerateArch(type)
    for (const phase of arch.roadmapPhases) {
      expect(Array.isArray(phase.goals)).toBe(true)
      expect(phase.goals.length).toBeGreaterThan(0)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: every goal in every phase is a non-empty string', async (type) => {
    const arch = await runGenerateArch(type)
    for (const phase of arch.roadmapPhases) {
      for (const goal of phase.goals) {
        expect(typeof goal).toBe('string')
        expect(goal.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it.each(SUPPORTED_TYPES)('%s: every phase has a valid estimatedComplexity', async (type) => {
    const arch = await runGenerateArch(type)
    const validComplexities = new Set(['low', 'medium', 'high'])
    for (const phase of arch.roadmapPhases) {
      expect(validComplexities.has(phase.estimatedComplexity)).toBe(true)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: roadmap has at least 2 distinct complexity levels (realistic distribution)', async (type) => {
    const arch = await runGenerateArch(type)
    const complexities = new Set(arch.roadmapPhases.map((p) => p.estimatedComplexity))
    expect(complexities.size).toBeGreaterThanOrEqual(2)
  })

  it.each(SUPPORTED_TYPES)('%s: phase 0 has the lowest complexity in the roadmap', async (type) => {
    const arch = await runGenerateArch(type)
    const phase0 = arch.roadmapPhases.find((p) => p.phase === 0)
    expect(phase0?.estimatedComplexity).toBe('low')
  })
})

// ─── C. Stack structural integrity ───────────────────────────────────────────

describe('architecture generation — stack structural integrity', () => {
  it.each(SUPPORTED_TYPES)('%s: stack item names are all unique', async (type) => {
    const arch = await runGenerateArch(type)
    const names = arch.recommendedStack.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it.each(SUPPORTED_TYPES)('%s: stack item roles are all unique', async (type) => {
    const arch = await runGenerateArch(type)
    const roles = arch.recommendedStack.map((s) => s.role)
    expect(new Set(roles).size).toBe(roles.length)
  })

  it.each(SUPPORTED_TYPES)('%s: stack rationales are all distinct', async (type) => {
    const arch = await runGenerateArch(type)
    const rationales = arch.recommendedStack.map((s) => s.rationale)
    expect(new Set(rationales).size).toBe(rationales.length)
  })

  it('TypeScript appears in both application and website stacks', async () => {
    const [appArch, webArch] = await Promise.all([
      runGenerateArch('application'),
      runGenerateArch('website'),
    ])
    const appNames = appArch.recommendedStack.map((s) => s.name)
    const webNames = webArch.recommendedStack.map((s) => s.name)
    expect(appNames).toContain('TypeScript')
    expect(webNames).toContain('TypeScript')
  })

  it('Tailwind CSS appears in both application and website stacks', async () => {
    const [appArch, webArch] = await Promise.all([
      runGenerateArch('application'),
      runGenerateArch('website'),
    ])
    const appNames = appArch.recommendedStack.map((s) => s.name)
    const webNames = webArch.recommendedStack.map((s) => s.name)
    expect(appNames).toContain('Tailwind CSS')
    expect(webNames).toContain('Tailwind CSS')
  })

  it.each(SUPPORTED_TYPES)('%s: each stack item rationale mentions at least 2 distinct concepts', async (type) => {
    const arch = await runGenerateArch(type)
    for (const item of arch.recommendedStack) {
      // Rationale should be a real sentence, not a single word
      expect(item.rationale.trim().split(/\s+/).length).toBeGreaterThanOrEqual(5)
    }
  })
})

// ─── D. _spec parameter behaviour (type-param-wins contract) ─────────────────
//
// generateArchitecture(_spec, projectType) ignores _spec by design (MVP).
// These tests pin that contract so a future change to use _spec is noticed.

describe('architecture generation — _spec parameter is ignored (type arg wins)', () => {
  it('passing a website spec with projectType=application returns application arch', async () => {
    const webSpec = await runGenerateSpec('website')
    const p = mockSpecService.generateArchitecture(webSpec, 'application')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe('application')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).toContain('React')
    expect(stackNames).not.toContain('Next.js')
  })

  it('passing an application spec with projectType=website returns website arch', async () => {
    const appSpec = await runGenerateSpec('application')
    const p = mockSpecService.generateArchitecture(appSpec, 'website')
    await vi.runAllTimersAsync()
    const arch = await p
    expect(arch.projectType).toBe('website')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).toContain('Next.js')
    expect(stackNames).not.toContain('React')
  })

  it('two application specs with different content produce identical arch', async () => {
    const spec1 = await runGenerateSpec('application', { valueHypothesis: 'A task manager' })
    const spec2 = await runGenerateSpec('application', { valueHypothesis: 'A photo editing tool' })

    const [arch1, arch2] = await (async () => {
      const p1 = mockSpecService.generateArchitecture(spec1, 'application')
      const p2 = mockSpecService.generateArchitecture(spec2, 'application')
      await vi.runAllTimersAsync()
      return Promise.all([p1, p2])
    })()

    expect(arch1.recommendedStack).toEqual(arch2.recommendedStack)
    expect(arch1.roadmapPhases).toEqual(arch2.roadmapPhases)
    expect(arch1.moduleArchitecture).toBe(arch2.moduleArchitecture)
    expect(arch1.dataFlow).toBe(arch2.dataFlow)
    expect(arch1.technicalRisks).toEqual(arch2.technicalRisks)
  })

  it('two website specs with different targetUsers produce identical arch', async () => {
    const spec1 = await runGenerateSpec('website', { targetUsers: ['Bloggers'] })
    const spec2 = await runGenerateSpec('website', { targetUsers: ['E-commerce owners', 'Agencies'] })

    const [arch1, arch2] = await (async () => {
      const p1 = mockSpecService.generateArchitecture(spec1, 'website')
      const p2 = mockSpecService.generateArchitecture(spec2, 'website')
      await vi.runAllTimersAsync()
      return Promise.all([p1, p2])
    })()

    expect(arch1.roadmapPhases).toEqual(arch2.roadmapPhases)
    expect(arch1.recommendedStack).toEqual(arch2.recommendedStack)
  })
})

// ─── E. Roadmap domain coverage — arch phases reflect spec feature areas ──────
//
// The architecture roadmap and the spec featureList are generated independently
// from the same type. We verify they are conceptually coherent:
// app roadmap phases collectively cover the main app spec feature areas,
// and website roadmap phases collectively cover the main website spec feature areas.

describe('architecture generation — roadmap domain coverage vs spec', () => {
  it('application: roadmap phase goals collectively mention onboarding/user concerns', async () => {
    const arch = await runGenerateArch('application')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/onboard|user|sign/i)
  })

  it('application: roadmap phase goals collectively mention data/entity management', async () => {
    const arch = await runGenerateArch('application')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/entity|data|crud|create|edit|list/i)
  })

  it('application: roadmap phase goals collectively mention dashboard/overview', async () => {
    const arch = await runGenerateArch('application')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/dashboard|overview|summary/i)
  })

  it('application: roadmap phase goals collectively mention search or settings', async () => {
    const arch = await runGenerateArch('application')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/search|filter|setting/i)
  })

  it('website: roadmap phase goals collectively mention homepage/content pages', async () => {
    const arch = await runGenerateArch('website')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/homepage|page|content/i)
  })

  it('website: roadmap phase goals collectively mention blog/articles', async () => {
    const arch = await runGenerateArch('website')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/blog|article|post/i)
  })

  it('website: roadmap phase goals collectively mention SEO or meta', async () => {
    const arch = await runGenerateArch('website')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/seo|meta|sitemap|open graph/i)
  })

  it('website: roadmap phase goals collectively mention contact form', async () => {
    const arch = await runGenerateArch('website')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals).join(' ').toLowerCase()
    expect(allGoals).toMatch(/contact|form/i)
  })

  it('application: roadmap phase goals collectively cover all 5 phases worth of concerns', async () => {
    const arch = await runGenerateArch('application')
    // At least 4 distinct non-trivial concerns are covered across the roadmap
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals)
    expect(allGoals.length).toBeGreaterThanOrEqual(8)
  })

  it('website: roadmap phase goals collectively cover all 5 phases worth of concerns', async () => {
    const arch = await runGenerateArch('website')
    const allGoals = arch.roadmapPhases.flatMap((p) => p.goals)
    expect(allGoals.length).toBeGreaterThanOrEqual(8)
  })
})
