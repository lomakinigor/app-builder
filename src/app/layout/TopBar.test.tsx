// @vitest-environment jsdom
// T-203 — TopBar / ProjectSwitcher acceptance tests
// Implements F-027
//
// Coverage areas:
//   A. Initial state — selected project shown / null safe state
//   B. Dropdown open — project list rendered with active highlight
//   C. Switching projects — selectProject called, dropdown closes
//   D. New project shortcut — navigates to /project/new
//   E. No projects empty state — graceful render
//   F. Bridge: selectProject wires through to projectStore.activeProject

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Project } from '../../shared/types'
import { TopBar } from './TopBar'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockSelectProject = vi.fn()
const mockUseProjectRegistry = vi.fn()
vi.mock('../store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (state: { projects: Project[]; selectedProjectId: string | null }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'TaskFlow',
    projectType: 'application',
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    status: 'active',
    currentStage: 'idea',
    ...overrides,
  }
}

const PROJECT_A = makeProject({ id: 'proj-a', name: 'Project Alpha', projectType: 'application' })
const PROJECT_B = makeProject({ id: 'proj-b', name: 'Project Beta', projectType: 'website' })

function makeRegistryState(overrides: Partial<{
  projects: Project[]
  selectedProjectId: string | null
  selectProject: typeof mockSelectProject
}> = {}) {
  return {
    projects: [PROJECT_A, PROJECT_B],
    selectedProjectId: PROJECT_A.id,
    selectProject: mockSelectProject,
    ...overrides,
  }
}

function setupMocks(registryOverrides: Parameters<typeof makeRegistryState>[0] = {}) {
  const registryState = makeRegistryState(registryOverrides)

  mockUseProjectRegistry.mockImplementation(
    (selector?: (s: typeof registryState) => unknown) =>
      selector ? selector(registryState) : registryState,
  )

  mockUseProjectStore.mockReturnValue({
    activeProject: PROJECT_A,
  })
}

function renderTopBar() {
  return render(<TopBar onMenuClick={vi.fn()} />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setupMocks()
})

// ─── A. Initial state ─────────────────────────────────────────────────────────

describe('A. Initial state', () => {
  it('shows the selected project name in the trigger pill', () => {
    renderTopBar()
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
  })

  it('shows application type icon (📱) for application project', () => {
    renderTopBar()
    const pill = screen.getByRole('button', { name: /Project Alpha/i })
    expect(pill.textContent).toContain('📱')
  })

  it('shows "Нет проекта" when selectedProjectId is null', () => {
    setupMocks({ selectedProjectId: null })
    renderTopBar()
    expect(screen.getByText('Нет проекта')).toBeInTheDocument()
  })

  it('does not crash when projects list is empty', () => {
    setupMocks({ projects: [], selectedProjectId: null })
    expect(() => renderTopBar()).not.toThrow()
  })

  it('dropdown is closed by default', () => {
    renderTopBar()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

// ─── B. Dropdown open ─────────────────────────────────────────────────────────

describe('B. Dropdown — project list rendered', () => {
  it('opens dropdown on trigger click', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('lists all projects from registry', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    // "Project Alpha" appears in both trigger pill and dropdown item
    expect(screen.getAllByText('Project Alpha').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Project Beta')).toBeInTheDocument()
  })

  it('marks the active project with aria-selected="true"', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const options = screen.getAllByRole('option')
    const alphaOption = options.find((o) => o.textContent?.includes('Project Alpha'))
    expect(alphaOption).toHaveAttribute('aria-selected', 'true')
  })

  it('non-selected project has aria-selected="false"', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const options = screen.getAllByRole('option')
    const betaOption = options.find((o) => o.textContent?.includes('Project Beta'))
    expect(betaOption).toHaveAttribute('aria-selected', 'false')
  })

  it('shows website icon (🌐) for website project', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const betaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Beta'),
    )
    expect(betaOption?.textContent).toContain('🌐')
  })

  it('shows "Проектов пока нет" when projects list is empty', () => {
    setupMocks({ projects: [], selectedProjectId: null })
    renderTopBar()
    // open dropdown via the "Нет проекта" trigger button
    fireEvent.click(screen.getByText('Нет проекта').closest('button')!)
    expect(screen.getByText('Проектов пока нет')).toBeInTheDocument()
  })
})

// ─── C. Switching projects ────────────────────────────────────────────────────

describe('C. Switching projects', () => {
  it('calls selectProject with the clicked project id', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const betaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Beta'),
    )
    fireEvent.click(betaOption!)
    expect(mockSelectProject).toHaveBeenCalledWith('proj-b')
  })

  it('closes the dropdown after selection', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const betaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Beta'),
    )
    fireEvent.click(betaOption!)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('calls selectProject exactly once per click', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const betaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Beta'),
    )
    fireEvent.click(betaOption!)
    expect(mockSelectProject).toHaveBeenCalledTimes(1)
  })

  it('clicking the already-selected project still calls selectProject', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const alphaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Alpha'),
    )
    fireEvent.click(alphaOption!)
    expect(mockSelectProject).toHaveBeenCalledWith('proj-a')
  })
})

// ─── D. New project shortcut ──────────────────────────────────────────────────

describe('D. New project shortcut', () => {
  it('shows "Новый проект" action in the dropdown', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    expect(screen.getByText('Новый проект')).toBeInTheDocument()
  })

  it('navigates to /project/new when clicking "Новый проект"', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    fireEvent.click(screen.getByText('Новый проект'))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('closes the dropdown after clicking "Новый проект"', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    fireEvent.click(screen.getByText('Новый проект'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

// ─── E. No projects empty state ───────────────────────────────────────────────

describe('E. No projects — safe empty state', () => {
  it('renders without crash when projects=[] and selectedProjectId=null', () => {
    setupMocks({ projects: [], selectedProjectId: null })
    expect(() => renderTopBar()).not.toThrow()
  })

  it('still shows "Новый проект" action when no projects exist', () => {
    setupMocks({ projects: [], selectedProjectId: null })
    renderTopBar()
    fireEvent.click(screen.getByText('Нет проекта').closest('button')!)
    expect(screen.getByText('Новый проект')).toBeInTheDocument()
  })
})

// ─── F. Bridge: selectProject updates activeProject ──────────────────────────
// The store-level bridge (selectProject → projectStore.activeProject) is tested
// in projectRegistryStore.test.ts group B. Here we verify the UI calls
// selectProject with the correct id, which is sufficient to prove the chain.

describe('F. Bridge — UI calls selectProject correctly', () => {
  it('selecting Project B calls selectProject("proj-b")', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /Project Alpha/i }))
    const betaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Beta'),
    )
    fireEvent.click(betaOption!)
    expect(mockSelectProject).toHaveBeenCalledWith('proj-b')
  })

  it('selecting Project A calls selectProject("proj-a")', () => {
    // Start with Beta selected
    setupMocks({ selectedProjectId: PROJECT_B.id })
    renderTopBar()
    fireEvent.click(screen.getByText('Project Beta').closest('button')!)
    const alphaOption = screen.getAllByRole('option').find((o) =>
      o.textContent?.includes('Project Alpha'),
    )
    fireEvent.click(alphaOption!)
    expect(mockSelectProject).toHaveBeenCalledWith('proj-a')
  })
})
