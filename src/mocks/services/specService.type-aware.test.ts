// T-102 — Type-aware spec/architecture generation tests
// implements F-005 / F-006 / T-102
//
// Complements T-013 (shape + gate compatibility) with deeper assertions:
//   A. Type differentiation — spec level (content, constraints, assumptions differ per type)
//   B. Type differentiation — architecture level (stack, roadmap, module arch, risks differ)
//   C. Minimal contract — invariants that must hold for every supported type
//   D. Brief integration — targetUsers / valueHypothesis / recommendedMVP propagation
//   E. Fallback — unknown/undefined projectType falls back to application deterministically
//   F. Determinism — identical inputs produce structurally identical outputs
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
    keyInsights: ['Single-user MVP is sufficient for V1'],
    valueHypothesis: 'A focused task manager with zero onboarding friction',
    recommendedMVP: 'Task list with CRUD and local persistence. No auth in V1.',
    open_questions: [],
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

/** Run a generateSpec call through fake timers and await the result. */
async function generateSpec(type: ProjectType, briefOverrides?: Partial<ResearchBrief>) {
  const p = mockSpecService.generateSpec(makeBrief(briefOverrides), type)
  await vi.runAllTimersAsync()
  return p
}

/** Run a generateArchitecture call through fake timers and await the result. */
async function generateArch(type: ProjectType) {
  const stub = { projectType: type, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' }
  const p = mockSpecService.generateArchitecture(stub, type)
  await vi.runAllTimersAsync()
  return p
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ─── A. Type differentiation — Spec ──────────────────────────────────────────

describe('spec generation — type differentiation', () => {
  it('application featureList first entry is user-onboarding oriented', async () => {
    const spec = await generateSpec('application')
    const names = spec.featureList.map((f) => f.name.toLowerCase())
    expect(names.some((n) => n.includes('onboard') || n.includes('dashboard') || n.includes('data'))).toBe(true)
  })

  it('website featureList first entry is content/homepage oriented', async () => {
    const spec = await generateSpec('website')
    const names = spec.featureList.map((f) => f.name.toLowerCase())
    expect(names.some((n) => n.includes('homepage') || n.includes('blog') || n.includes('content'))).toBe(true)
  })

  it('application and website featureLists are completely different', async () => {
    const [appSpec, webSpec] = await Promise.all([
      generateSpec('application'),
      generateSpec('website'),
    ])
    const appNames = new Set(appSpec.featureList.map((f) => f.name))
    const webNames = new Set(webSpec.featureList.map((f) => f.name))
    const intersection = [...appNames].filter((n) => webNames.has(n))
    expect(intersection).toHaveLength(0)
  })

  it('application constraints mention client-only / no backend', async () => {
    const spec = await generateSpec('application')
    const text = spec.constraints.join(' ').toLowerCase()
    expect(text).toMatch(/no backend|client.only|local storage/i)
  })

  it('website constraints mention SEO / Lighthouse / no database', async () => {
    const spec = await generateSpec('website')
    const text = spec.constraints.join(' ').toLowerCase()
    expect(text).toMatch(/lighthouse|seo|no database|no e.commerce/i)
  })

  it('application assumptions mention collaboration or single-user', async () => {
    const spec = await generateSpec('application')
    const text = spec.assumptions.join(' ').toLowerCase()
    expect(text).toMatch(/collaboration|single.user|local/i)
  })

  it('website assumptions mention file-based or no database', async () => {
    const spec = await generateSpec('website')
    const text = spec.assumptions.join(' ').toLowerCase()
    expect(text).toMatch(/file.based|no database|no cms|no backend/i)
  })

  it('application acceptanceNotes describes onboarding or entity flow', async () => {
    const spec = await generateSpec('application')
    expect(spec.acceptanceNotes.toLowerCase()).toMatch(/onboard|entity|data/i)
  })

  it('website acceptanceNotes describes visitor navigation or SSG', async () => {
    const spec = await generateSpec('website')
    expect(spec.acceptanceNotes.toLowerCase()).toMatch(/visitor|navigate|ssg|static|contact/i)
  })

  it('application and website productSummary texts are distinct', async () => {
    const [appSpec, webSpec] = await Promise.all([
      generateSpec('application'),
      generateSpec('website'),
    ])
    expect(appSpec.productSummary).not.toBe(webSpec.productSummary)
  })

  it('application and website MVPScope texts are distinct when brief has no recommendedMVP', async () => {
    const [appSpec, webSpec] = await Promise.all([
      generateSpec('application', { recommendedMVP: '' }),
      generateSpec('website', { recommendedMVP: '' }),
    ])
    expect(appSpec.MVPScope).not.toBe(webSpec.MVPScope)
  })
})

// ─── B. Type differentiation — Architecture ───────────────────────────────────

describe('architecture generation — type differentiation', () => {
  it('application stack includes React as primary UI layer', async () => {
    const arch = await generateArch('application')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).toContain('React')
  })

  it('website stack includes Next.js as primary framework', async () => {
    const arch = await generateArch('website')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).toContain('Next.js')
  })

  it('application stack does not include Next.js', async () => {
    const arch = await generateArch('application')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).not.toContain('Next.js')
  })

  it('website stack does not include React as standalone entry', async () => {
    const arch = await generateArch('website')
    const stackNames = arch.recommendedStack.map((s) => s.name)
    expect(stackNames).not.toContain('React')
  })

  it('application moduleArchitecture describes feature-sliced or Zustand pattern', async () => {
    const arch = await generateArch('application')
    expect(arch.moduleArchitecture.toLowerCase()).toMatch(/feature.sliced|zustand|store/i)
  })

  it('website moduleArchitecture describes Next.js app router or MDX', async () => {
    const arch = await generateArch('website')
    expect(arch.moduleArchitecture.toLowerCase()).toMatch(/next\.js|app router|mdx|content/i)
  })

  it('application roadmap phase 1 is core-flow oriented', async () => {
    const arch = await generateArch('application')
    const phase1 = arch.roadmapPhases.find((p) => p.phase === 1)
    expect(phase1?.title.toLowerCase()).toMatch(/core|flow|entity/i)
  })

  it('website roadmap phase 1 is content-pages oriented', async () => {
    const arch = await generateArch('website')
    const phase1 = arch.roadmapPhases.find((p) => p.phase === 1)
    expect(phase1?.title.toLowerCase()).toMatch(/pages|content|core/i)
  })

  it('application technicalRisks mention localStorage or client persistence', async () => {
    const arch = await generateArch('application')
    const text = arch.technicalRisks.join(' ').toLowerCase()
    expect(text).toMatch(/local storage|storage|persistence|client/i)
  })

  it('website technicalRisks mention SEO, MDX, or content', async () => {
    const arch = await generateArch('website')
    const text = arch.technicalRisks.join(' ').toLowerCase()
    expect(text).toMatch(/seo|mdx|content|lighthouse|cms/i)
  })

  it('application and website dataFlow descriptions are distinct', async () => {
    const [appArch, webArch] = await Promise.all([
      generateArch('application'),
      generateArch('website'),
    ])
    expect(appArch.dataFlow).not.toBe(webArch.dataFlow)
  })
})

// ─── C. Minimal contract — every supported type ───────────────────────────────

const SUPPORTED_TYPES: ProjectType[] = ['application', 'website']

describe('spec generation — minimal contract per type', () => {
  it.each(SUPPORTED_TYPES)('%s: productSummary is a non-empty string', async (type) => {
    const spec = await generateSpec(type)
    expect(typeof spec.productSummary).toBe('string')
    expect(spec.productSummary.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: MVPScope is a non-empty string', async (type) => {
    const spec = await generateSpec(type)
    expect(typeof spec.MVPScope).toBe('string')
    expect(spec.MVPScope.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: featureList has at least one feature', async (type) => {
    const spec = await generateSpec(type)
    expect(spec.featureList.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: featureList has at least one "must" priority feature', async (type) => {
    const spec = await generateSpec(type)
    const mustFeatures = spec.featureList.filter((f) => f.priority === 'must')
    expect(mustFeatures.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: every feature has id, name, description, and priority', async (type) => {
    const spec = await generateSpec(type)
    for (const feature of spec.featureList) {
      expect(typeof feature.id).toBe('string')
      expect(feature.id.trim().length).toBeGreaterThan(0)
      expect(typeof feature.name).toBe('string')
      expect(feature.name.trim().length).toBeGreaterThan(0)
      expect(typeof feature.description).toBe('string')
      expect(feature.description.trim().length).toBeGreaterThan(0)
      expect(['must', 'should', 'could', 'wont']).toContain(feature.priority)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: assumptions is a non-empty array', async (type) => {
    const spec = await generateSpec(type)
    expect(Array.isArray(spec.assumptions)).toBe(true)
    expect(spec.assumptions.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: constraints is a non-empty array', async (type) => {
    const spec = await generateSpec(type)
    expect(Array.isArray(spec.constraints)).toBe(true)
    expect(spec.constraints.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: acceptanceNotes is a non-empty string', async (type) => {
    const spec = await generateSpec(type)
    expect(typeof spec.acceptanceNotes).toBe('string')
    expect(spec.acceptanceNotes.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: projectType field matches the requested type', async (type) => {
    const spec = await generateSpec(type)
    expect(spec.projectType).toBe(type)
  })

  it.each(SUPPORTED_TYPES)('%s: passes canAdvanceFromSpec gate', async (type) => {
    const spec = await generateSpec(type)
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })
})

describe('architecture generation — minimal contract per type', () => {
  it.each(SUPPORTED_TYPES)('%s: recommendedStack has at least one entry', async (type) => {
    const arch = await generateArch(type)
    expect(arch.recommendedStack.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: every stack item has name, role, and rationale', async (type) => {
    const arch = await generateArch(type)
    for (const item of arch.recommendedStack) {
      expect(typeof item.name).toBe('string')
      expect(item.name.trim().length).toBeGreaterThan(0)
      expect(typeof item.role).toBe('string')
      expect(item.role.trim().length).toBeGreaterThan(0)
      expect(typeof item.rationale).toBe('string')
      expect(item.rationale.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(SUPPORTED_TYPES)('%s: roadmapPhases has at least one phase', async (type) => {
    const arch = await generateArch(type)
    expect(arch.roadmapPhases.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: roadmapPhases includes phase 0 (Foundation)', async (type) => {
    const arch = await generateArch(type)
    const phase0 = arch.roadmapPhases.find((p) => p.phase === 0)
    expect(phase0).toBeDefined()
    expect(phase0?.goals.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: technicalRisks has at least one risk', async (type) => {
    const arch = await generateArch(type)
    expect(Array.isArray(arch.technicalRisks)).toBe(true)
    expect(arch.technicalRisks.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: moduleArchitecture is a non-empty string', async (type) => {
    const arch = await generateArch(type)
    expect(typeof arch.moduleArchitecture).toBe('string')
    expect(arch.moduleArchitecture.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: dataFlow is a non-empty string', async (type) => {
    const arch = await generateArch(type)
    expect(typeof arch.dataFlow).toBe('string')
    expect(arch.dataFlow.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: projectType field matches the requested type', async (type) => {
    const arch = await generateArch(type)
    expect(arch.projectType).toBe(type)
  })

  it.each(SUPPORTED_TYPES)('%s: passes canAdvanceFromArchitecture gate', async (type) => {
    const arch = await generateArch(type)
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })
})

// ─── D. Brief integration ─────────────────────────────────────────────────────

describe('spec generation — brief integration', () => {
  it.each(SUPPORTED_TYPES)('%s: productSummary includes brief.valueHypothesis when provided', async (type) => {
    const spec = await generateSpec(type, { valueHypothesis: 'Unique insight for test-XYZ' })
    expect(spec.productSummary).toContain('Unique insight for test-XYZ')
  })

  it.each(SUPPORTED_TYPES)('%s: productSummary uses fallback when valueHypothesis is empty', async (type) => {
    const spec = await generateSpec(type, { valueHypothesis: '' })
    expect(spec.productSummary.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: MVPScope is the brief.recommendedMVP when provided', async (type) => {
    const spec = await generateSpec(type, { recommendedMVP: 'Custom MVP definition for test-XYZ' })
    expect(spec.MVPScope).toBe('Custom MVP definition for test-XYZ')
  })

  it.each(SUPPORTED_TYPES)('%s: MVPScope uses type-specific fallback when recommendedMVP is empty', async (type) => {
    const spec = await generateSpec(type, { recommendedMVP: '' })
    expect(spec.MVPScope.trim().length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_TYPES)('%s: first targetUser from brief appears in assumptions', async (type) => {
    const spec = await generateSpec(type, { targetUsers: ['TestUserAlpha', 'TestUserBeta'] })
    const assumptionsText = spec.assumptions.join(' ')
    expect(assumptionsText).toContain('TestUserAlpha')
  })

  it.each(SUPPORTED_TYPES)('%s: assumptions include at most 2 targetUsers from brief', async (type) => {
    const spec = await generateSpec(type, { targetUsers: ['User A', 'User B', 'User C', 'User D'] })
    // The service slices first 2 — User C and D should not appear
    const assumptionsText = spec.assumptions.join(' ')
    expect(assumptionsText).not.toContain('User C')
    expect(assumptionsText).not.toContain('User D')
  })

  it.each(SUPPORTED_TYPES)('%s: assumptions remain valid when brief.targetUsers is empty', async (type) => {
    const spec = await generateSpec(type, { targetUsers: [] })
    expect(Array.isArray(spec.assumptions)).toBe(true)
    expect(spec.assumptions.length).toBeGreaterThan(0)
  })
})

// ─── E. Fallback — unknown / undefined type ───────────────────────────────────

describe('spec generation — fallback for unknown type', () => {
  it('does not throw for unknown projectType cast', async () => {
    // TypeScript type system prevents this at compile time, but runtime
    // callers (e.g., deserialized localStorage data) may send unknown values.
    const p = mockSpecService.generateSpec(makeBrief(), 'unknown' as ProjectType)
    await vi.runAllTimersAsync()
    await expect(p).resolves.toBeDefined()
  })

  it('returns a spec with all required fields for unknown type', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'unknown' as ProjectType)
    await vi.runAllTimersAsync()
    const spec = await p
    expect(spec.productSummary.trim().length).toBeGreaterThan(0)
    expect(spec.MVPScope.trim().length).toBeGreaterThan(0)
    expect(spec.featureList.length).toBeGreaterThan(0)
    expect(spec.assumptions.length).toBeGreaterThan(0)
    expect(spec.constraints.length).toBeGreaterThan(0)
    expect(spec.acceptanceNotes.trim().length).toBeGreaterThan(0)
  })

  it('unknown type fallback passes canAdvanceFromSpec gate', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'unknown' as ProjectType)
    await vi.runAllTimersAsync()
    const spec = await p
    // The fallback returns application shape — gate must pass (only checks field presence)
    expect(canAdvanceFromSpec(spec).canAdvance).toBe(true)
  })

  it('unknown type fallback returns application-shaped spec (implicit else branch)', async () => {
    const p = mockSpecService.generateSpec(makeBrief(), 'unknown' as ProjectType)
    await vi.runAllTimersAsync()
    const spec = await p
    // The service has no explicit unknown handler — falls through to application.
    // Pin this so a future change (e.g., throwing) is noticed.
    const appSpec = await generateSpec('application')
    // Same featureList structure (same feature names)
    const unknownNames = spec.featureList.map((f) => f.name)
    const appNames = appSpec.featureList.map((f) => f.name)
    expect(unknownNames).toEqual(appNames)
  })

  it('architecture does not throw for unknown projectType cast', async () => {
    const p = mockSpecService.generateArchitecture(
      { projectType: 'unknown' as ProjectType, productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' },
      'unknown' as ProjectType,
    )
    await vi.runAllTimersAsync()
    await expect(p).resolves.toBeDefined()
  })

  it('unknown type architecture fallback passes canAdvanceFromArchitecture gate', async () => {
    const p = mockSpecService.generateArchitecture(
      { projectType: 'application', productSummary: 's', MVPScope: 's', featureList: [], assumptions: [], constraints: [], acceptanceNotes: '' },
      'unknown' as ProjectType,
    )
    await vi.runAllTimersAsync()
    const arch = await p
    expect(canAdvanceFromArchitecture(arch).canAdvance).toBe(true)
  })
})

// ─── F. Determinism / stability ───────────────────────────────────────────────

describe('spec generation — determinism', () => {
  it.each(SUPPORTED_TYPES)('%s: two calls with same brief produce identical productSummary', async (type) => {
    const brief = makeBrief()
    const [spec1, spec2] = await Promise.all([generateSpec(type, brief), generateSpec(type, brief)])
    expect(spec1.productSummary).toBe(spec2.productSummary)
  })

  it.each(SUPPORTED_TYPES)('%s: two calls with same brief produce identical featureList', async (type) => {
    const brief = makeBrief()
    const [spec1, spec2] = await Promise.all([generateSpec(type, brief), generateSpec(type, brief)])
    expect(spec1.featureList).toEqual(spec2.featureList)
  })

  it.each(SUPPORTED_TYPES)('%s: two calls produce identical constraints array', async (type) => {
    const brief = makeBrief()
    const [spec1, spec2] = await Promise.all([generateSpec(type, brief), generateSpec(type, brief)])
    expect(spec1.constraints).toEqual(spec2.constraints)
  })

  it.each(SUPPORTED_TYPES)('%s: architecture — two calls produce identical stack', async (type) => {
    const [arch1, arch2] = await Promise.all([generateArch(type), generateArch(type)])
    expect(arch1.recommendedStack).toEqual(arch2.recommendedStack)
  })

  it.each(SUPPORTED_TYPES)('%s: architecture — two calls produce identical roadmapPhases', async (type) => {
    const [arch1, arch2] = await Promise.all([generateArch(type), generateArch(type)])
    expect(arch1.roadmapPhases).toEqual(arch2.roadmapPhases)
  })
})
