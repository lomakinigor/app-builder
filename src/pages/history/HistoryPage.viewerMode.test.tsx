// @vitest-environment jsdom
// T-401 — HistoryPage viewer-mode gating tests.
// T-405 — Updated to use useCanEditProject + useCanManageSharing.
//
// Coverage:
//   1. Owner mode: "Завершить проект" section visible (owner-only, T-405)
//   2. Viewer mode: "Завершить проект" section hidden
//   3. Viewer mode: read-only banner rendered by AppLayout (tested at that level)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockCanEdit = vi.fn(() => true)
const mockCanManageSharing = vi.fn(() => true)
vi.mock('../../app/store/viewingModeStore', () => ({
  useCanEditProject: () => mockCanEdit(),
  useCanManageSharing: () => mockCanManageSharing(),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (selector?: (s: unknown) => unknown) => {
    const state = {
      markProjectCompleted: vi.fn(),
      projects: [],
      selectedProjectId: 'proj-1',
    }
    return selector ? selector(state) : state
  },
  selectSelectedProject: (state: { selectedProjectId: string; projects: Project[] }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'iterative_loop',
    ...overrides,
  }
}

function setupStore(overrides: Record<string, unknown> = {}) {
  const base = {
    activeProject: makeProject(),
    ideaDraft: null,
    researchRuns: [],
    importedArtifacts: [],
    researchBrief: null,
    specPack: null,
    architectureDraft: null,
    promptIterations: [],
    completedReviewTaskIds: [],
    markTaskReviewComplete: vi.fn(),
    ...overrides,
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCanEdit.mockReturnValue(true)
  mockCanManageSharing.mockReturnValue(true)
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HistoryPage — owner mode', () => {
  it('shows "Завершить проект" section', () => {
    render(<HistoryPage />)
    expect(screen.getByTestId('complete-project-button')).toBeInTheDocument()
  })
})

describe('HistoryPage — viewer mode', () => {
  beforeEach(() => {
    mockCanEdit.mockReturnValue(false)
    mockCanManageSharing.mockReturnValue(false)
  })

  it('hides "Завершить проект" button', () => {
    render(<HistoryPage />)
    expect(screen.queryByTestId('complete-project-button')).not.toBeInTheDocument()
  })

  it('still shows read-only content (project overview card)', () => {
    render(<HistoryPage />)
    // project name is visible — content is NOT hidden
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
