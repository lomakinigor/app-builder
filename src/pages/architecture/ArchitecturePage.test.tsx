// @vitest-environment jsdom
// T-013 — ArchitecturePage UI tests: guards, empty states, gate-driven button behavior.
// T-017 — GateDiagnostics integration: hint shown for specific failure modes.
// Implements F-006 / T-013 / T-017
//
// Coverage areas:
//   1. Guard: no project → EmptyState with CTA
//   2. Guard: no specPack → amber warning card, no generate panel
//   3. Empty state: has spec, no arch → generate panel shown
//   4. Arch present: editable output rendered
//   5. Gate: canAdvanceFromArchitecture=true → "Перейти к циклу промптов" enabled
//   6. Gate: canAdvanceFromArchitecture=false → button disabled + banner
//   7. Gate wiring: UI delegates to gate, not inline logic

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchitecturePage } from './ArchitecturePage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'

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
    generateArchitecture: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  architectureDraftToMarkdown: () => '# arch markdown',
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
    currentStage: 'architecture',
    ...overrides,
  }
}

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A task manager.',
    MVPScope: 'CRUD + local persistence.',
    featureList: [{ id: 'f-001', name: 'Tasks', description: '', priority: 'must' }],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
    ...overrides,
  }
}

/** Minimal valid arch — passes canAdvanceFromArchitecture */
function makeArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [
      { name: 'React', role: 'UI layer', rationale: 'Component SPA' },
    ],
    moduleArchitecture: 'Feature-sliced',
    dataFlow: 'Unidirectional',
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['Shell'], estimatedComplexity: 'low' },
    ],
    technicalRisks: [],
    ...overrides,
  }
}

/** Arch that fails canAdvanceFromArchitecture (empty stack) */
function makeIncompleteArch(): ArchitectureDraft {
  return makeArch({ recommendedStack: [] })
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    specPack: makeSpec(),
    architectureDraft: null as ArchitectureDraft | null,
    setArchitectureDraft: vi.fn(),
    updateArchitectureDraft: vi.fn(),
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
  return render(<ArchitecturePage />)
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

  it('does NOT show arch generate panel when no project', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Сгенерировать архитектуру')).not.toBeInTheDocument()
  })

  it('does NOT show the "Перейти к циклу промптов" button', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText(/Перейти к циклу промптов/)).not.toBeInTheDocument()
  })
})

// ─── 2. Guard: no specPack ────────────────────────────────────────────────────

describe('2. Guard — no specPack', () => {
  it('shows "Требуется спецификация" warning', () => {
    renderPage({ specPack: null, architectureDraft: null })
    expect(screen.getByText('Требуется спецификация')).toBeInTheDocument()
  })

  it('shows link to /spec', () => {
    renderPage({ specPack: null, architectureDraft: null })
    expect(screen.getByText(/Перейти к спецификации/)).toBeInTheDocument()
  })

  it('does NOT show arch generate panel when no spec', () => {
    renderPage({ specPack: null, architectureDraft: null })
    expect(screen.queryByText('Сгенерировать архитектуру')).not.toBeInTheDocument()
  })
})

// ─── 3. Empty state: spec exists, no arch ────────────────────────────────────

describe('3. Empty state — spec present, no architectureDraft', () => {
  it('shows "Генерация архитектуры" card title', () => {
    renderPage({ architectureDraft: null })
    expect(screen.getByText('Генерация архитектуры')).toBeInTheDocument()
  })

  it('shows "Сгенерировать архитектуру" button', () => {
    renderPage({ architectureDraft: null })
    expect(screen.getByRole('button', { name: /Сгенерировать архитектуру/ })).toBeInTheDocument()
  })

  it('does NOT show navigation button to prompt loop', () => {
    renderPage({ architectureDraft: null })
    expect(screen.queryByRole('button', { name: /Перейти к циклу промптов/ })).not.toBeInTheDocument()
  })

  it('lists what will be generated', () => {
    renderPage({ architectureDraft: null })
    expect(screen.getByText(/Рекомендуемый стек с обоснованием/)).toBeInTheDocument()
  })
})

// ─── 4. Arch present: content rendered ───────────────────────────────────────

describe('4. Arch present — output rendered', () => {
  it('shows arch content when architectureDraft is set', () => {
    renderPage({ architectureDraft: makeArch() })
    // EditableArchitectureDraft view mode renders "Рекомендуемый стек" header
    expect(screen.getByText('Рекомендуемый стек')).toBeInTheDocument()
  })

  it('shows "Сгенерировано" badge', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.getByText('Сгенерировано')).toBeInTheDocument()
  })

  it('shows "Перегенерировать" button', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.getByRole('button', { name: /Перегенерировать/ })).toBeInTheDocument()
  })

  it('does NOT show the no-project empty state when arch is set', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.queryByText('Проект не выбран')).not.toBeInTheDocument()
  })
})

// ─── 5. Gate: complete arch → navigate button enabled ────────────────────────

describe('5. Gate — canAdvanceFromArchitecture passes → navigation enabled', () => {
  it('"Перейти к циклу промптов" button is present', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).toBeInTheDocument()
  })

  it('"Перейти к циклу промптов" is NOT disabled when gate passes', () => {
    renderPage({ architectureDraft: makeArch() })
    const btn = screen.getByRole('button', { name: /Перейти к циклу промптов/ })
    expect(btn).not.toBeDisabled()
  })

  it('GateBanner is NOT shown when gate passes', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.queryByText(/Архитектура неполная/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Черновика архитектуры ещё нет/)).not.toBeInTheDocument()
  })
})

// ─── 6. Gate: incomplete arch → navigate button disabled ─────────────────────

describe('6. Gate — canAdvanceFromArchitecture fails → navigation disabled', () => {
  it('"Перейти к циклу промптов" is disabled when stack is empty', () => {
    renderPage({ architectureDraft: makeIncompleteArch() })
    const btn = screen.getByRole('button', { name: /Перейти к циклу промптов/ })
    expect(btn).toBeDisabled()
  })

  it('GateBanner shows blocking reason when arch is incomplete', () => {
    renderPage({ architectureDraft: makeIncompleteArch() })
    expect(screen.getByText(/Архитектура неполная/)).toBeInTheDocument()
  })

  it('"Перейти к циклу промптов" is disabled when roadmapPhases is empty', () => {
    renderPage({ architectureDraft: makeArch({ roadmapPhases: [] }) })
    const btn = screen.getByRole('button', { name: /Перейти к циклу промптов/ })
    expect(btn).toBeDisabled()
  })

  it('GateBanner shows roadmap reason when phases missing', () => {
    renderPage({ architectureDraft: makeArch({ roadmapPhases: [] }) })
    expect(screen.getByText(/фазы роадмапа/)).toBeInTheDocument()
  })
})

// ─── 7. Gate wiring ───────────────────────────────────────────────────────────

describe('7. Gate wiring — UI uses canAdvanceFromArchitecture, not inline logic', () => {
  it('arch with all required fields → button enabled (gate logic)', () => {
    const fullArch = makeArch({
      recommendedStack: [{ name: 'React', role: 'UI', rationale: 'SPA' }],
      roadmapPhases: [{ phase: 0, title: 'Foundation', goals: ['Shell'], estimatedComplexity: 'low' }],
      projectType: 'application',
    })
    renderPage({ architectureDraft: fullArch })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).not.toBeDisabled()
  })

  it('arch with missing projectType → button disabled (gate catches it)', () => {
    const noType = makeArch({ projectType: '' as 'application' })
    renderPage({ architectureDraft: noType })
    const btn = screen.getByRole('button', { name: /Перейти к циклу промптов/ })
    expect(btn).toBeDisabled()
  })

  it('website arch passes gate — button enabled', () => {
    renderPage({
      architectureDraft: makeArch({
        projectType: 'website',
        recommendedStack: [{ name: 'Next.js', role: 'Framework', rationale: 'SSR' }],
      }),
    })
    const btn = screen.getByRole('button', { name: /Перейти к циклу промптов/ })
    expect(btn).not.toBeDisabled()
  })
})

// ─── 8. T-017 — GateDiagnostics integration ──────────────────────────────────

describe('8. GateDiagnostics — diagnostic hints shown on gate failure', () => {
  it('shows gate-diagnostics panel when arch is incomplete (empty stack)', () => {
    renderPage({ architectureDraft: makeIncompleteArch() })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })

  it('gate-diagnostics absent when gate passes', () => {
    renderPage({ architectureDraft: makeArch() })
    expect(screen.queryByTestId('gate-diagnostics')).not.toBeInTheDocument()
  })

  it('shows diagnostic text for empty recommendedStack', () => {
    renderPage({ architectureDraft: makeArch({ recommendedStack: [] }) })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
    expect(screen.getByText(/элементы стека/i)).toBeInTheDocument()
  })

  it('shows diagnostic text for empty roadmapPhases', () => {
    renderPage({ architectureDraft: makeArch({ roadmapPhases: [] }) })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
    expect(screen.getByText(/фазы роадмапа/i)).toBeInTheDocument()
  })

  it('shows diagnostic text for missing projectType', () => {
    renderPage({ architectureDraft: makeArch({ projectType: '' as 'application' }) })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
    expect(screen.getByText(/тип проекта/i)).toBeInTheDocument()
  })

  it('gate-diagnostics absent when no architectureDraft (empty state shown instead)', () => {
    renderPage({ architectureDraft: null })
    expect(screen.queryByTestId('gate-diagnostics')).not.toBeInTheDocument()
  })
})
