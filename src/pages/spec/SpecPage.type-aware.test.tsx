// @vitest-environment jsdom
// T-106 — SpecPage type-aware UI assertions
// Implements F-005 / T-106
//
// Verifies that SpecPage renders type-specific content, labels, and gate state
// aligned with the service contracts pinned in T-102.
//
// Scenarios:
//   A. Type badge — application shows "📱 Приложение"; website shows "🌐 Сайт"
//   B. Type description text — visible when specPack present; correct per type
//   C. Feature list — type-specific feature names rendered; no cross-type bleed
//   D. productSummary — rendered and visibly type-specific
//   E. Gate alignment — complete type-aware spec enables CTA; content doesn't mask gate failure

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecPage } from './SpecPage'
import type { Project, SpecPack, ResearchBrief } from '../../shared/types'
import { createAppSpec, createWebSpec } from '../../mocks/fixtures/specFixtures'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../mocks/services/specService', () => ({
  mockSpecService: {
    generateSpec: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  specPackToMarkdown: () => '# spec markdown',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'specification',
    ...overrides,
  }
}

function makeResearchBrief(): ResearchBrief {
  return {
    id: 'brief-1',
    projectId: 'proj-1',
    sources: [],
    problemSummary: 'Users need a better tool.',
    targetUsers: ['Developers'],
    keyInsights: ['Local storage is fine for V1'],
    valueHypothesis: 'A focused task manager',
    recommendedMVP: 'CRUD + persistence.',
    open_questions: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

/**
 * Application spec — delegates to shared canonical fixtures (specFixtures).
 * Feature names match T-102 service contracts.
 */
const makeApplicationSpec = (overrides: Partial<SpecPack> = {}) => createAppSpec(overrides)

/**
 * Website spec — delegates to shared canonical fixtures (specFixtures).
 * Feature names match T-102 service contracts.
 */
const makeWebsiteSpec = (overrides: Partial<SpecPack> = {}) => createWebSpec(overrides)

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    researchBrief: makeResearchBrief(),
    specPack: null as SpecPack | null,
    setSpecPack: vi.fn(),
    updateSpecPack: vi.fn(),
    setCurrentStage: vi.fn(),
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<SpecPage />)
}

// ─── A. Type badge rendering ──────────────────────────────────────────────────

describe('A. Type badge — application vs website', () => {
  it('application project → shows "📱 Приложение" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    expect(screen.getByText('📱 Приложение')).toBeInTheDocument()
  })

  it('website project → shows "🌐 Сайт" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    expect(screen.getByText('🌐 Сайт')).toBeInTheDocument()
  })

  it('application page does NOT show "🌐 Сайт" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    expect(screen.queryByText('🌐 Сайт')).not.toBeInTheDocument()
  })

  it('website page does NOT show "📱 Приложение" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    expect(screen.queryByText('📱 Приложение')).not.toBeInTheDocument()
  })
})

// ─── B. Type-specific description text ───────────────────────────────────────

describe('B. Type description — shown when specPack present; correct per type', () => {
  it('application spec → shows application-adapted label', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.getByText(/адаптирована для Приложения/)).toBeInTheDocument()
  })

  it('website spec → shows website-adapted label', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.getByText(/адаптирована для Сайта/)).toBeInTheDocument()
  })

  it('application page does NOT show website-adapted label', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.queryByText(/адаптирована для Сайта/)).not.toBeInTheDocument()
  })

  it('website page does NOT show application-adapted label', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.queryByText(/адаптирована для Приложения/)).not.toBeInTheDocument()
  })

  it('description is NOT visible when no specPack (generate panel shown instead)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: null,
    })
    expect(screen.queryByText(/адаптирована для/)).not.toBeInTheDocument()
  })
})

// ─── C. Feature list — type-specific names visible in UI ─────────────────────

describe('C. Feature list — type-specific names rendered; no cross-type bleed', () => {
  it('application spec shows "User onboarding" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.getByText('User onboarding')).toBeInTheDocument()
  })

  it('application spec shows "Core data management" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.getByText('Core data management')).toBeInTheDocument()
  })

  it('website spec shows "Homepage" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.getByText('Homepage')).toBeInTheDocument()
  })

  it('website spec shows "Blog / articles" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.getByText('Blog / articles')).toBeInTheDocument()
  })

  it('application spec does NOT show "Homepage" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.queryByText('Homepage')).not.toBeInTheDocument()
  })

  it('website spec does NOT show "User onboarding" feature', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.queryByText('User onboarding')).not.toBeInTheDocument()
  })
})

// ─── D. productSummary rendered and type-specific ─────────────────────────────

describe('D. productSummary — rendered and visibly type-specific', () => {
  it('application productSummary text is visible in the UI', () => {
    const spec = makeApplicationSpec({
      productSummary: 'An application: A focused task manager',
    })
    renderPage({ activeProject: makeProject({ projectType: 'application' }), specPack: spec })
    expect(screen.getByText('An application: A focused task manager')).toBeInTheDocument()
  })

  it('website productSummary text is visible in the UI', () => {
    const spec = makeWebsiteSpec({
      productSummary: 'A content-driven website: A focused blog platform',
    })
    renderPage({ activeProject: makeProject({ projectType: 'website' }), specPack: spec })
    expect(screen.getByText('A content-driven website: A focused blog platform')).toBeInTheDocument()
  })

  it('application and website productSummary texts differ — not the same content', () => {
    const appSpec = makeApplicationSpec()
    const webSpec = makeWebsiteSpec()
    expect(appSpec.productSummary).not.toBe(webSpec.productSummary)
  })
})

// ─── E. Gate alignment — type-aware content doesn't mask gate failure ─────────

describe('E. Gate alignment — complete type-aware spec enables CTA; no masking', () => {
  it('complete application spec → "Перейти к архитектуре" is NOT disabled', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).not.toBeDisabled()
  })

  it('complete website spec → "Перейти к архитектуре" is NOT disabled', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).not.toBeDisabled()
  })

  it('website spec with empty featureList → CTA blocked despite correct type badge', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec({ featureList: [] }),
    })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).toBeDisabled()
  })

  it('application spec with empty productSummary → CTA blocked despite type-aware features', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec({ productSummary: '' }),
    })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).toBeDisabled()
  })

  it('website spec with empty MVPScope → gate diagnostics shown', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec({ MVPScope: '' }),
    })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })
})
