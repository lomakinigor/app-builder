// @vitest-environment jsdom
// T-202 — ProjectNewPage acceptance tests
// Implements F-025 / F-027
//
// Coverage areas:
//   A. Initial render: form fields present, submit button present
//   B. Validation: empty name → error on submit; no type → error on submit
//   C. Happy path Application: fill name + select Application → createProject + selectProject + navigate /idea
//   D. Happy path Website: fill name + select Website → createProject with projectType='website'
//   E. Cancel: navigates back to /

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectNewPage } from './ProjectNewPage'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockCreateProject = vi.fn()
const mockSelectProject = vi.fn()

vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: () => ({
    createProject: mockCreateProject,
    selectProject: mockSelectProject,
  }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<ProjectNewPage />)
}

function fillName(value: string) {
  const input = screen.getByLabelText(/Название проекта/i)
  fireEvent.change(input, { target: { value } })
}

function selectType(label: RegExp | string) {
  fireEvent.click(screen.getByText(label))
}

function clickCreate() {
  fireEvent.click(screen.getByRole('button', { name: /Создать проект/i }))
}

function clickCancel() {
  fireEvent.click(screen.getByRole('button', { name: /Отмена/i }))
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateProject.mockReturnValue({
    id: 'proj-new-1',
    name: 'My App',
    projectType: 'application',
    createdAt: '2026-04-21T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    status: 'active',
    currentStage: 'idea',
  })
})

// ─── A. Initial render ────────────────────────────────────────────────────────

describe('A. Initial render', () => {
  it('shows page heading "Новый проект"', () => {
    renderPage()
    expect(screen.getByText('Новый проект')).toBeInTheDocument()
  })

  it('renders project name input', () => {
    renderPage()
    expect(screen.getByLabelText(/Название проекта/i)).toBeInTheDocument()
  })

  it('renders Application and Website type options', () => {
    renderPage()
    expect(screen.getByText('Приложение')).toBeInTheDocument()
    expect(screen.getByText('Сайт')).toBeInTheDocument()
  })

  it('renders "Создать проект" submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Создать проект/i })).toBeInTheDocument()
  })

  it('renders "Отмена" button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Отмена/i })).toBeInTheDocument()
  })
})

// ─── B. Validation ────────────────────────────────────────────────────────────

describe('B. Validation — errors shown on invalid submit', () => {
  it('shows name error when submitting with empty name and no type', () => {
    renderPage()
    clickCreate()
    expect(screen.getByText(/Название проекта обязательно/i)).toBeInTheDocument()
  })

  it('shows type error when name is filled but no type selected', () => {
    renderPage()
    fillName('My Project')
    clickCreate()
    expect(screen.getByText(/Выберите, что вы создаёте/i)).toBeInTheDocument()
  })

  it('shows name error when type is selected but name is empty', () => {
    renderPage()
    selectType('Приложение')
    clickCreate()
    expect(screen.getByText(/Название проекта обязательно/i)).toBeInTheDocument()
  })

  it('does NOT call createProject when form is invalid', () => {
    renderPage()
    clickCreate()
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('does NOT navigate when form is invalid', () => {
    renderPage()
    clickCreate()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

// ─── C. Happy path — Application ─────────────────────────────────────────────

describe('C. Happy path — create Application project', () => {
  function submit() {
    renderPage()
    fillName('My App')
    selectType('Приложение')
    clickCreate()
  }

  it('calls createProject with correct name', () => {
    submit()
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My App' }),
    )
  })

  it('calls createProject with projectType "application"', () => {
    submit()
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ projectType: 'application' }),
    )
  })

  it('calls selectProject with the returned project id', () => {
    submit()
    expect(mockSelectProject).toHaveBeenCalledWith('proj-new-1')
  })

  it('navigates to /idea after creation', () => {
    submit()
    expect(mockNavigate).toHaveBeenCalledWith('/idea')
  })

  it('trims whitespace from project name before creating', () => {
    renderPage()
    fillName('  My App  ')
    selectType('Приложение')
    clickCreate()
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My App' }),
    )
  })
})

// ─── D. Happy path — Website ──────────────────────────────────────────────────

describe('D. Happy path — create Website project', () => {
  beforeEach(() => {
    mockCreateProject.mockReturnValue({
      id: 'proj-new-2',
      name: 'My Site',
      projectType: 'website',
      createdAt: '2026-04-21T00:00:00Z',
      updatedAt: '2026-04-21T00:00:00Z',
      status: 'active',
      currentStage: 'idea',
    })
  })

  it('calls createProject with projectType "website"', () => {
    renderPage()
    fillName('My Site')
    selectType('Сайт')
    clickCreate()
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ projectType: 'website' }),
    )
  })

  it('calls selectProject with the returned project id', () => {
    renderPage()
    fillName('My Site')
    selectType('Сайт')
    clickCreate()
    expect(mockSelectProject).toHaveBeenCalledWith('proj-new-2')
  })

  it('navigates to /idea', () => {
    renderPage()
    fillName('My Site')
    selectType('Сайт')
    clickCreate()
    expect(mockNavigate).toHaveBeenCalledWith('/idea')
  })
})

// ─── E. Cancel ────────────────────────────────────────────────────────────────

describe('E. Cancel — returns to homepage', () => {
  it('navigates to "/" when Cancel is clicked', () => {
    renderPage()
    clickCancel()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('does NOT call createProject when Cancel is clicked', () => {
    renderPage()
    fillName('Abandoned')
    clickCancel()
    expect(mockCreateProject).not.toHaveBeenCalled()
  })
})
