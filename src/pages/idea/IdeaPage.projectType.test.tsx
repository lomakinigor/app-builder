// @vitest-environment jsdom
// T-104 — IdeaPage project type selector: selection state, store wiring, edge cases.
// Pairs with T-103 (ProjectTypeSelector impl) and T-102 (store contract).
//
// Coverage areas:
//   A. Initial render — both options visible, default reflects activeProject.projectType
//   B. Interaction behavior — click switches selection, idempotent re-click is safe
//   C. Store wiring — setProjectType called with correct value after interaction
//   D. Null activeProject — empty state renders, no crash, no store call

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IdeaPage } from './IdeaPage'
import type { Project } from '../../shared/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockSetProjectType = vi.fn()
const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-t104',
    name: 'T-104 Test Project',
    projectType: 'application',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    status: 'active',
    currentStage: 'idea',
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    ideaDraft: null,
    setActiveProject: vi.fn(),
    setIdeaDraft: vi.fn(),
    setCurrentStage: vi.fn(),
    setProjectType: mockSetProjectType,
    ...overrides,
  }
}

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<IdeaPage />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── A. Initial render ────────────────────────────────────────────────────────

describe('A. Initial render — selector visible, default reflects projectType', () => {
  it('renders both type option buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Приложение/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Сайт/ })).toBeInTheDocument()
  })

  it('"Тип проекта" label is visible', () => {
    renderPage()
    expect(screen.getByText('Тип проекта')).toBeInTheDocument()
  })

  it('default projectType "application" → "Приложение" button is pressed', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    const btn = screen.getByRole('button', { name: /Приложение/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('default projectType "application" → "Сайт" button is NOT pressed', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    const btn = screen.getByRole('button', { name: /Сайт/ })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('projectType "website" in store → "Сайт" button is pressed on mount', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    const btn = screen.getByRole('button', { name: /Сайт/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('projectType "website" in store → "Приложение" button is NOT pressed on mount', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    const btn = screen.getByRole('button', { name: /Приложение/ })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })
})

// ─── B. Interaction behavior ──────────────────────────────────────────────────

describe('B. Interaction behavior — clicks switch selection state', () => {
  it('clicking "Сайт" sets its aria-pressed to true', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    fireEvent.click(screen.getByRole('button', { name: /Сайт/ }))
    expect(screen.getByRole('button', { name: /Сайт/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking "Сайт" sets "Приложение" aria-pressed to false', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    fireEvent.click(screen.getByRole('button', { name: /Сайт/ }))
    expect(screen.getByRole('button', { name: /Приложение/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "Приложение" after "Сайт" toggles back correctly', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    fireEvent.click(screen.getByRole('button', { name: /Приложение/ }))
    expect(screen.getByRole('button', { name: /Приложение/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Сайт/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking the already-selected button does not crash', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    const btn = screen.getByRole('button', { name: /Приложение/ })
    expect(() => {
      fireEvent.click(btn)
      fireEvent.click(btn)
    }).not.toThrow()
  })

  it('re-clicking already-selected button keeps it pressed', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    const btn = screen.getByRole('button', { name: /Приложение/ })
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})

// ─── C. Store wiring ──────────────────────────────────────────────────────────

describe('C. Store wiring — setProjectType called after interaction', () => {
  it('clicking "Сайт" calls setProjectType("website")', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    fireEvent.click(screen.getByRole('button', { name: /Сайт/ }))
    expect(mockSetProjectType).toHaveBeenCalledWith('website')
  })

  it('clicking "Приложение" calls setProjectType("application")', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    fireEvent.click(screen.getByRole('button', { name: /Приложение/ }))
    expect(mockSetProjectType).toHaveBeenCalledWith('application')
  })

  it('clicking "Сайт" then "Приложение" calls setProjectType twice, last with "application"', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    fireEvent.click(screen.getByRole('button', { name: /Сайт/ }))
    fireEvent.click(screen.getByRole('button', { name: /Приложение/ }))
    expect(mockSetProjectType).toHaveBeenCalledTimes(2)
    expect(mockSetProjectType).toHaveBeenLastCalledWith('application')
  })

  it('clicking a type when activeProject exists always calls setProjectType', () => {
    renderPage({ activeProject: makeProject() })
    fireEvent.click(screen.getByRole('button', { name: /Сайт/ }))
    expect(mockSetProjectType).toHaveBeenCalledOnce()
  })
})

// ─── D. Null activeProject ────────────────────────────────────────────────────

describe('D. Null activeProject — empty state, no crash, no store call', () => {
  it('renders without crashing when activeProject is null', () => {
    expect(() => renderPage({ activeProject: null })).not.toThrow()
  })

  it('shows the "Проект не выбран" empty state', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('does NOT render the type selector when activeProject is null', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Тип проекта')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Приложение/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Сайт/ })).not.toBeInTheDocument()
  })

  it('setProjectType is never called when activeProject is null (no selector rendered)', () => {
    renderPage({ activeProject: null })
    expect(mockSetProjectType).not.toHaveBeenCalled()
  })

  it('shows "Создать проект" action when activeProject is null', () => {
    renderPage({ activeProject: null })
    expect(screen.getByRole('button', { name: 'Создать проект' })).toBeInTheDocument()
  })
})
