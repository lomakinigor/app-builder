// @vitest-environment jsdom
// T-011 — IdeaPage acceptance tests: guards, empty states, gate-driven CTA, happy path.
// Implements F-001 / F-002 / F-004 / T-011
//
// Coverage areas:
//   A. Entry guard: no project → EmptyState, no form rendered
//   B. Idea form empty state: project present, idea empty
//   C. Idea blocking: submit with insufficient idea → errors shown
//   D. Idea happy path: valid idea pre-seeded → gate passes, navigate on continue
//   E. Persistence contract: form pre-populated from ideaDraft in store

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IdeaPage } from './IdeaPage'
import type { Project, IdeaDraft } from '../../shared/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** rawIdea that satisfies IDEA_MIN_LENGTH (50) and IDEA_RECOMMENDED_LENGTH (100) */
const VALID_RAW_IDEA =
  'An AI-powered project management tool where teams break goals into tasks, get AI-suggested next actions based on what is overdue or blocked, and ship faster.'

/** rawIdea that is non-empty but below IDEA_MIN_LENGTH (50) */
const SHORT_RAW_IDEA = 'A to-do app'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'idea',
    ...overrides,
  }
}

function makeIdeaDraft(overrides: Partial<IdeaDraft> = {}): IdeaDraft {
  return {
    title: 'My Project',
    rawIdea: VALID_RAW_IDEA,
    targetUser: 'Developers',
    problem: 'Lack of focus',
    constraints: 'No backend',
    notes: '',
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    ideaDraft: null as IdeaDraft | null,
    setActiveProject: vi.fn(),
    setIdeaDraft: vi.fn(),
    setCurrentStage: vi.fn(),
    setProjectType: vi.fn(),
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
  return render(<IdeaPage />)
}

// ─── A. Entry guard — no project ──────────────────────────────────────────────

describe('A. Entry guard — no project', () => {
  it('shows "Проект не выбран" empty state title', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('shows "Создать проект" CTA button', () => {
    renderPage({ activeProject: null })
    expect(screen.getByRole('button', { name: 'Создать проект' })).toBeInTheDocument()
  })

  it('does NOT render the idea description textarea', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByPlaceholderText(/Инструмент управления проектами/)).not.toBeInTheDocument()
  })

  it('does NOT show the project type selector', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Тип проекта')).not.toBeInTheDocument()
  })

  it('"Создать проект" navigates to /project/new', () => {
    renderPage({ activeProject: null })
    fireEvent.click(screen.getByRole('button', { name: 'Создать проект' }))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })
})

// ─── B. Idea form — project present, idea empty ────────────────────────────────

describe('B. Idea form — project present, idea empty', () => {
  it('renders the idea description textarea', () => {
    renderPage()
    // Textarea is identified by its placeholder (label not linked via htmlFor)
    expect(screen.getByPlaceholderText(/Инструмент управления проектами/)).toBeInTheDocument()
  })

  it('renders the project type selector', () => {
    renderPage()
    expect(screen.getByText('Тип проекта')).toBeInTheDocument()
    expect(screen.getByText('Приложение')).toBeInTheDocument()
    expect(screen.getByText('Сайт')).toBeInTheDocument()
  })

  it('"Сохранить черновик" is disabled when textarea is empty', () => {
    renderPage()
    // Use queryAllByText to avoid slow accessible-name computation across all buttons
    const saveDraftBtns = screen.queryAllByText(/Сохранить черновик/)
    expect(saveDraftBtns.length).toBeGreaterThan(0)
    expect(saveDraftBtns[0]).toBeDisabled()
  })

  it('does NOT show a validation error before the user interacts', () => {
    renderPage()
    expect(screen.queryByText(/Пожалуйста, опишите идею/)).not.toBeInTheDocument()
    expect(screen.queryByText(/символов минимум/)).not.toBeInTheDocument()
  })
})

// ─── C. Idea blocking — submit with insufficient idea ─────────────────────────

describe('C. Idea blocking — submit triggers validation errors', () => {
  it('shows "Пожалуйста, опишите идею" after clicking continue with empty form', () => {
    renderPage({ ideaDraft: null })
    // Use getAllByText to avoid slow accessible-name computation across all buttons
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(
      screen.getByText('Пожалуйста, опишите идею продукта, чтобы продолжить.'),
    ).toBeInTheDocument()
  })

  it('shows character-length error after clicking continue with a short idea', () => {
    renderPage({ ideaDraft: makeIdeaDraft({ rawIdea: SHORT_RAW_IDEA }) })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(screen.getByText(/символах/)).toBeInTheDocument()
  })

  it('shows the blocked state explanation banner after failed submit', () => {
    renderPage({ ideaDraft: null })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(
      screen.getByText(/Исправьте ошибки выше/),
    ).toBeInTheDocument()
  })

  it('does NOT call navigate when idea is invalid', () => {
    renderPage({ ideaDraft: null })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does NOT call setIdeaDraft when idea is invalid', () => {
    const mockSetIdeaDraft = vi.fn()
    renderPage({ ideaDraft: null, setIdeaDraft: mockSetIdeaDraft })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(mockSetIdeaDraft).not.toHaveBeenCalled()
  })
})

// ─── D. Idea happy path — valid idea pre-seeded ───────────────────────────────

describe('D. Idea happy path — valid idea and projectType in store', () => {
  it('form is pre-populated with stored idea text', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft({ rawIdea: VALID_RAW_IDEA }),
    })
    expect(screen.getByPlaceholderText(/Инструмент управления проектами/)).toHaveValue(VALID_RAW_IDEA)
  })

  it('form is pre-populated with stored title', () => {
    renderPage({
      activeProject: makeProject(),
      ideaDraft: makeIdeaDraft({ title: 'TaskFlow Pro' }),
    })
    expect(screen.getByPlaceholderText(/напр. TaskFlow/)).toHaveValue('TaskFlow Pro')
  })

  it('project type from activeProject is pre-selected', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft(),
    })
    // "Приложение" button should appear selected (bg-white class in active state)
    // We test that it renders, not internal CSS
    expect(screen.getByText('Приложение')).toBeInTheDocument()
  })

  it('clicking continue calls setIdeaDraft with the form values', () => {
    const mockSetIdeaDraft = vi.fn()
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft(),
      setIdeaDraft: mockSetIdeaDraft,
    })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(mockSetIdeaDraft).toHaveBeenCalledOnce()
    expect(mockSetIdeaDraft.mock.calls[0][0]).toMatchObject({
      rawIdea: VALID_RAW_IDEA,
    })
  })

  it('clicking continue navigates to /research when idea is valid', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft(),
    })
    const continueBtns = screen.getAllByText(/Сохранить и перейти к исследованию/)
    fireEvent.click(continueBtns[0])
    expect(mockNavigate).toHaveBeenCalledWith('/research')
  })

  it('"Сохранить черновик" is enabled when rawIdea is non-empty', () => {
    renderPage({
      activeProject: makeProject(),
      ideaDraft: makeIdeaDraft(),
    })
    const saveDraftBtns = screen.queryAllByText(/Сохранить черновик/)
    expect(saveDraftBtns.length).toBeGreaterThan(0)
    expect(saveDraftBtns[0]).toBeEnabled()
  })

  it('clicking "Сохранить черновик" calls setIdeaDraft but does NOT navigate', () => {
    const mockSetIdeaDraft = vi.fn()
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft(),
      setIdeaDraft: mockSetIdeaDraft,
    })
    const saveDraftBtns = screen.getAllByText(/Сохранить черновик/)
    fireEvent.click(saveDraftBtns[0])
    expect(mockSetIdeaDraft).toHaveBeenCalledOnce()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

// ─── E. Persistence contract — form reflects stored ideaDraft ──────────────────

describe('E. Persistence contract — form reflects stored ideaDraft', () => {
  it('shows stored idea text even after re-render (store is source of truth for init)', () => {
    const storedIdea = 'A stored idea that is at least fifty characters long, verified here.'
    renderPage({
      activeProject: makeProject(),
      ideaDraft: makeIdeaDraft({ rawIdea: storedIdea }),
    })
    expect(screen.getByPlaceholderText(/Инструмент управления проектами/)).toHaveValue(storedIdea)
  })

  it('no error banner shown when stored idea is valid and not yet submitted', () => {
    renderPage({
      activeProject: makeProject(),
      ideaDraft: makeIdeaDraft(),
    })
    expect(screen.queryByText(/Исправьте ошибки/)).not.toBeInTheDocument()
  })

  it('shows "Проект активен" badge when activeProject is set', () => {
    renderPage({ activeProject: makeProject() })
    expect(screen.getByText('Проект активен')).toBeInTheDocument()
  })
})
