// @vitest-environment jsdom
// T-013 — SpecPage UI tests: guards, empty states, gate-driven button behavior.
// Implements F-005 / T-013
//
// Coverage areas:
//   1. Guard: no project → EmptyState with CTA
//   2. Guard: no researchBrief → amber warning card, no generate panel
//   3. Empty state: has brief, no spec → generate panel shown
//   4. Spec present: editable output rendered
//   5. Gate: canAdvanceFromSpec=true → "Перейти к архитектуре" enabled
//   6. Gate: canAdvanceFromSpec=false → "Перейти к архитектуре" disabled + banner
//   7. Gate wiring: UI delegates to gate, no inline duplication

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecPage } from './SpecPage'
import type { Project, SpecPack, ResearchBrief } from '../../shared/types'

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

function makeResearchBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    id: 'brief-1',
    projectId: 'proj-1',
    sources: [],
    problemSummary: 'Users need a better task manager.',
    targetUsers: ['Developers'],
    keyInsights: ['Local storage is fine for V1'],
    valueHypothesis: 'A focused task manager with no setup',
    recommendedMVP: 'CRUD + persistence. No auth.',
    open_questions: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

/** Minimal valid spec — passes canAdvanceFromSpec */
function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A stateful web application for managing tasks.',
    MVPScope: 'Single-user CRUD. No auth, no billing.',
    featureList: [
      { id: 'f-001', name: 'Onboarding', description: '', priority: 'must' },
    ],
    assumptions: ['Desktop primary'],
    constraints: ['No backend'],
    acceptanceNotes: 'User can create tasks after reload.',
    ...overrides,
  }
}

/** Spec that fails canAdvanceFromSpec (empty productSummary) */
function makeIncompleteSpec(): SpecPack {
  return makeSpec({ productSummary: '' })
}

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
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore()
    return selector ? selector(state) : state
  })
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<SpecPage />)
}

// ─── 1. Guard: no project ─────────────────────────────────────────────────────

describe('1. Guard — no project', () => {
  it('shows "Проект не выбран" empty state', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('shows "Создать проект" CTA', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Создать проект')).toBeInTheDocument()
  })

  it('does NOT show spec generate panel when no project', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Сгенерировать спецификацию')).not.toBeInTheDocument()
  })

  it('does NOT show the "Перейти к архитектуре" button', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText(/Перейти к архитектуре/)).not.toBeInTheDocument()
  })
})

// ─── 2. Guard: no researchBrief ───────────────────────────────────────────────

describe('2. Guard — no researchBrief', () => {
  it('shows "Требуется исследовательский бриф" warning', () => {
    renderPage({ researchBrief: null, specPack: null })
    expect(screen.getByText('Требуется исследовательский бриф')).toBeInTheDocument()
  })

  it('shows link to /research', () => {
    renderPage({ researchBrief: null, specPack: null })
    expect(screen.getByText(/Перейти к исследованию/)).toBeInTheDocument()
  })

  it('does NOT show spec generate panel when no brief', () => {
    renderPage({ researchBrief: null, specPack: null })
    expect(screen.queryByText('Сгенерировать спецификацию')).not.toBeInTheDocument()
  })
})

// ─── 3. Empty state: brief exists, no spec ───────────────────────────────────

describe('3. Empty state — brief present, no specPack', () => {
  it('shows "Генерация спецификации" card title', () => {
    renderPage({ specPack: null })
    expect(screen.getByText('Генерация спецификации')).toBeInTheDocument()
  })

  it('shows "Сгенерировать спецификацию" button', () => {
    renderPage({ specPack: null })
    expect(screen.getByRole('button', { name: /Сгенерировать спецификацию/ })).toBeInTheDocument()
  })

  it('does NOT show navigation button to architecture', () => {
    renderPage({ specPack: null })
    expect(screen.queryByRole('button', { name: /Перейти к архитектуре/ })).not.toBeInTheDocument()
  })

  it('lists what will be generated', () => {
    renderPage({ specPack: null })
    expect(screen.getByText(/Резюме продукта/)).toBeInTheDocument()
  })
})

// ─── 4. Spec present: content rendered ───────────────────────────────────────

describe('4. Spec present — output rendered', () => {
  it('shows spec content when specPack is set', () => {
    renderPage({ specPack: makeSpec() })
    // EditableSpecPack view mode renders the product summary header
    expect(screen.getByText('Резюме продукта')).toBeInTheDocument()
  })

  it('shows "Сгенерировано" badge', () => {
    renderPage({ specPack: makeSpec() })
    expect(screen.getByText('Сгенерировано')).toBeInTheDocument()
  })

  it('shows "Перегенерировать" button', () => {
    renderPage({ specPack: makeSpec() })
    expect(screen.getByRole('button', { name: /Перегенерировать/ })).toBeInTheDocument()
  })

  it('does NOT show the no-project empty state when specPack is set', () => {
    renderPage({ specPack: makeSpec() })
    expect(screen.queryByText('Проект не выбран')).not.toBeInTheDocument()
  })
})

// ─── 5. Gate: complete spec → navigate button enabled ────────────────────────

describe('5. Gate — canAdvanceFromSpec passes → navigation enabled', () => {
  it('"Перейти к архитектуре" button is present', () => {
    renderPage({ specPack: makeSpec() })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).toBeInTheDocument()
  })

  it('"Перейти к архитектуре" button is NOT disabled when gate passes', () => {
    renderPage({ specPack: makeSpec() })
    const btn = screen.getByRole('button', { name: /Перейти к архитектуре/ })
    expect(btn).not.toBeDisabled()
  })

  it('GateBanner is NOT shown when gate passes', () => {
    renderPage({ specPack: makeSpec() })
    // GateBanner shows the reason text; gate passes → no reason → no banner
    expect(screen.queryByText(/Спецификация неполная/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Спецификации ещё нет/)).not.toBeInTheDocument()
  })
})

// ─── 6. Gate: incomplete spec → navigate button disabled ─────────────────────

describe('6. Gate — canAdvanceFromSpec fails → navigation disabled', () => {
  it('"Перейти к архитектуре" is disabled when productSummary is empty', () => {
    renderPage({ specPack: makeIncompleteSpec() })
    const btn = screen.getByRole('button', { name: /Перейти к архитектуре/ })
    expect(btn).toBeDisabled()
  })

  it('GateBanner shows blocking reason when spec is incomplete', () => {
    renderPage({ specPack: makeIncompleteSpec() })
    expect(screen.getByText(/Спецификация неполная/)).toBeInTheDocument()
  })

  it('"Перейти к архитектуре" is disabled when featureList is empty', () => {
    renderPage({ specPack: makeSpec({ featureList: [] }) })
    const btn = screen.getByRole('button', { name: /Перейти к архитектуре/ })
    expect(btn).toBeDisabled()
  })

  it('"Перейти к архитектуре" is disabled when MVPScope is empty', () => {
    renderPage({ specPack: makeSpec({ MVPScope: '' }) })
    const btn = screen.getByRole('button', { name: /Перейти к архитектуре/ })
    expect(btn).toBeDisabled()
  })
})

// ─── 7. Gate wiring ───────────────────────────────────────────────────────────

describe('7. Gate wiring — UI uses canAdvanceFromSpec, not inline logic', () => {
  it('spec with all required fields → button enabled (gate logic, not string check)', () => {
    const fullSpec = makeSpec({
      productSummary: 'A task manager.',
      MVPScope: 'CRUD + local persistence.',
      featureList: [{ id: 'f-x', name: 'Tasks', description: '', priority: 'must' }],
      projectType: 'application',
    })
    renderPage({ specPack: fullSpec })
    expect(screen.getByRole('button', { name: /Перейти к архитектуре/ })).not.toBeDisabled()
  })

  it('spec with missing projectType → button disabled (gate catches it)', () => {
    const noType = makeSpec({ projectType: '' as 'application' })
    renderPage({ specPack: noType })
    const btn = screen.getByRole('button', { name: /Перейти к архитектуре/ })
    expect(btn).toBeDisabled()
  })
})
