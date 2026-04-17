// @vitest-environment jsdom
// T-022 — SpecPage structural quality slice.
// Implements F-005 / T-022
//
// Gap filled: the existing SpecPage.test.tsx (T-013/T-017) and
// SpecPage.type-aware.test.tsx (T-106) cover guards, gate logic, type badges,
// and type-specific feature names. Neither validates the structural content
// of EditableSpecPack in view mode or the edit/cancel round-trip.
//
// Coverage areas:
//   A. Structural headings — all four card headings present in view mode
//   B. MoSCoW priority labels — all four priority values rendered correctly
//   C. Assumptions and constraints — list items visible by text
//   D. acceptanceNotes — shown when non-empty; absent when empty/missing
//   E. Edit mode entry and Cancel — "Редактировать спек" opens edit mode;
//      Cancel returns to view mode without saving

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
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
  mockSpecService: { generateSpec: vi.fn().mockResolvedValue({}) },
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
    problemSummary: 'Users need a better task manager.',
    targetUsers: ['Developers'],
    keyInsights: ['Local storage is fine for V1'],
    valueHypothesis: 'A focused task manager with no setup',
    recommendedMVP: 'CRUD + persistence. No auth.',
    open_questions: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

/** Full spec with all four MoSCoW priorities and non-empty optional fields */
function makeRichSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A focused task manager for developers.',
    MVPScope: 'Single-user CRUD with local persistence. No auth in V1.',
    featureList: [
      { id: 'f-001', name: 'Onboarding flow', description: 'Sign-up wizard', priority: 'must' },
      { id: 'f-002', name: 'Task management', description: 'Create / edit / delete tasks', priority: 'should' },
      { id: 'f-003', name: 'Dark mode', description: 'Theme toggle', priority: 'could' },
      { id: 'f-004', name: 'Team sharing', description: 'Future multi-user', priority: 'wont' },
    ],
    assumptions: ['Desktop browser primary', 'Single user per install'],
    constraints: ['No backend in V1', 'No real-time sync'],
    acceptanceNotes: 'User can create and reload tasks without data loss.',
    ...overrides,
  }
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
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<SpecPage />)
}

// ─── A. Structural section headings (view mode) ───────────────────────────────

describe('A. Structural headings — all sections present in view mode', () => {
  it('renders "Резюме продукта" section heading', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Резюме продукта')).toBeInTheDocument()
  })

  it('renders "Объём MVP" section heading', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Объём MVP')).toBeInTheDocument()
  })

  it('renders "Список фич" section heading', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Список фич')).toBeInTheDocument()
  })

  it('renders "Допущения" section heading', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Допущения')).toBeInTheDocument()
  })

  it('renders "Ограничения" section heading', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Ограничения')).toBeInTheDocument()
  })

  it('renders productSummary text value', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('A focused task manager for developers.')).toBeInTheDocument()
  })

  it('renders MVPScope text value', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Single-user CRUD with local persistence. No auth in V1.')).toBeInTheDocument()
  })
})

// ─── B. MoSCoW priority labels ────────────────────────────────────────────────

describe('B. MoSCoW priority labels — all four values rendered', () => {
  it('renders "Обязательно" badge for must-priority feature', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Обязательно')).toBeInTheDocument()
  })

  it('renders "Желательно" badge for should-priority feature', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Желательно')).toBeInTheDocument()
  })

  it('renders "По возможности" badge for could-priority feature', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('По возможности')).toBeInTheDocument()
  })

  it('renders "Не сейчас" badge for wont-priority feature', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Не сейчас')).toBeInTheDocument()
  })

  it('feature name is visible alongside its priority label', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Onboarding flow')).toBeInTheDocument()
    expect(screen.getByText('Task management')).toBeInTheDocument()
    expect(screen.getByText('Dark mode')).toBeInTheDocument()
    expect(screen.getByText('Team sharing')).toBeInTheDocument()
  })

  it('spec with only must-priority features does not show "Желательно"', () => {
    const mustOnly = makeRichSpec({
      featureList: [
        { id: 'f-001', name: 'Core', description: '', priority: 'must' },
      ],
    })
    renderPage({ specPack: mustOnly })
    expect(screen.queryByText('Желательно')).not.toBeInTheDocument()
    expect(screen.queryByText('По возможности')).not.toBeInTheDocument()
    expect(screen.queryByText('Не сейчас')).not.toBeInTheDocument()
  })
})

// ─── C. Assumptions and constraints ──────────────────────────────────────────

describe('C. Assumptions and constraints — list items visible', () => {
  it('renders first assumption text', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText(/Desktop browser primary/)).toBeInTheDocument()
  })

  it('renders second assumption text', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText(/Single user per install/)).toBeInTheDocument()
  })

  it('renders first constraint text', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText(/No backend in V1/)).toBeInTheDocument()
  })

  it('renders second constraint text', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText(/No real-time sync/)).toBeInTheDocument()
  })

  it('empty assumptions array renders no assumption bullets', () => {
    renderPage({ specPack: makeRichSpec({ assumptions: [] }) })
    // Section heading still present, but bullet items are absent
    expect(screen.getByText('Допущения')).toBeInTheDocument()
    expect(screen.queryByText(/Desktop browser primary/)).not.toBeInTheDocument()
  })
})

// ─── D. acceptanceNotes — conditional rendering ───────────────────────────────

describe('D. acceptanceNotes — shown when non-empty, absent when empty', () => {
  it('renders "Критерии приёмки" heading when acceptanceNotes is non-empty', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByText('Критерии приёмки')).toBeInTheDocument()
  })

  it('renders acceptanceNotes text value', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(
      screen.getByText('User can create and reload tasks without data loss.'),
    ).toBeInTheDocument()
  })

  it('does NOT render "Критерии приёмки" section when acceptanceNotes is empty string', () => {
    renderPage({ specPack: makeRichSpec({ acceptanceNotes: '' }) })
    expect(screen.queryByText('Критерии приёмки')).not.toBeInTheDocument()
  })
})

// ─── E. Edit mode entry and Cancel ───────────────────────────────────────────

describe('E. Edit mode — entry and cancel round-trip', () => {
  it('"Редактировать спек" button is present in view mode', () => {
    renderPage({ specPack: makeRichSpec() })
    expect(screen.getByRole('button', { name: /Редактировать спек/ })).toBeInTheDocument()
  })

  it('clicking "Редактировать спек" enters edit mode — editing banner visible', () => {
    renderPage({ specPack: makeRichSpec() })
    fireEvent.click(screen.getByRole('button', { name: /Редактировать спек/ }))
    expect(screen.getByText('Редактирование спецификации')).toBeInTheDocument()
  })

  it('edit mode shows "Сохранить" and "Отменить" buttons', () => {
    renderPage({ specPack: makeRichSpec() })
    fireEvent.click(screen.getByRole('button', { name: /Редактировать спек/ }))
    // EditableSpecPack renders Save/Cancel in both the top banner and the bottom row
    expect(screen.getAllByRole('button', { name: /Сохранить/ }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /Отменить/ }).length).toBeGreaterThanOrEqual(1)
  })

  it('clicking "Отменить" returns to view mode — "Редактировать спек" reappears', () => {
    renderPage({ specPack: makeRichSpec() })
    fireEvent.click(screen.getByRole('button', { name: /Редактировать спек/ }))
    // In edit mode — cancel returns to view
    const cancelBtn = screen.getAllByRole('button', { name: /Отменить/ })[0]
    fireEvent.click(cancelBtn)
    expect(screen.getByRole('button', { name: /Редактировать спек/ })).toBeInTheDocument()
    expect(screen.queryByText('Редактирование спецификации')).not.toBeInTheDocument()
  })

  it('"Редактировать спек" NOT present in edit mode (replaced by Save/Cancel)', () => {
    renderPage({ specPack: makeRichSpec() })
    fireEvent.click(screen.getByRole('button', { name: /Редактировать спек/ }))
    expect(screen.queryByRole('button', { name: /Редактировать спек/ })).not.toBeInTheDocument()
  })
})
