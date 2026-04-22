// @vitest-environment jsdom
// T-401 — SharedProjectPage tests.
//
// Coverage:
//   1. Shows loading state initially
//   2. Error state when shareId resolves to unknown project
//   3. Sets viewingMode='viewer' and navigates on success
//   4. Error state when API rejects

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SharedProjectPage } from './SharedProjectPage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ shareId: 'share-proj-test' }),
  useNavigate: () => mockNavigate,
}))

const mockSelectProject = vi.fn()
const mockProjects: Project[] = [
  {
    id: 'proj-test',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'idea',
  },
]
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (selector?: (s: unknown) => unknown) => {
    const state = { projects: mockProjects, selectProject: mockSelectProject }
    return selector ? selector(state) : state
  },
}))

const mockSetViewingMode = vi.fn()
vi.mock('../../app/store/viewingModeStore', () => ({
  useViewingModeStore: (selector?: (s: unknown) => unknown) => {
    const state = { setViewingMode: mockSetViewingMode }
    return selector ? selector(state) : state
  },
}))

const mockResolveShare = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    resolveShare: mockResolveShare,
  }),
}))

// T-402: enable sharing so T-401 flow tests run unimpeded
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => true,
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveShare.mockResolvedValue({ projectId: 'proj-test', canEdit: false })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SharedProjectPage', () => {
  it('shows loading state while resolving', () => {
    mockResolveShare.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<SharedProjectPage />)
    expect(screen.getByText('Открываем проект…')).toBeInTheDocument()
  })

  it('calls selectProject and setViewingMode("viewer") on success', async () => {
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(mockSelectProject).toHaveBeenCalledWith('proj-test')
      expect(mockSetViewingMode).toHaveBeenCalledWith('viewer')
      expect(mockNavigate).toHaveBeenCalledWith('/history', { replace: true })
    })
  })

  it('shows error when project not found in registry', async () => {
    mockResolveShare.mockResolvedValue({ projectId: 'proj-unknown', canEdit: false })
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(screen.getByText('Не удалось открыть ссылку')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows error when API rejects', async () => {
    mockResolveShare.mockRejectedValue(new Error('Network error'))
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(screen.getByText('Не удалось открыть ссылку')).toBeInTheDocument()
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
  })
})
