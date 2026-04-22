// @vitest-environment jsdom
// T-405 — SharedProjectPage editor-mode routing tests.
//
// Coverage:
//   1. canEdit=true → setViewingMode('editor')
//   2. canEdit=false → setViewingMode('viewer')
//   3. Both redirect to /history

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
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

vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => true,
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SharedProjectPage — editor mode routing (T-405)', () => {
  it('sets viewingMode="editor" when canEdit=true', async () => {
    mockResolveShare.mockResolvedValue({ projectId: 'proj-test', canEdit: true })
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(mockSetViewingMode).toHaveBeenCalledWith('editor')
      expect(mockNavigate).toHaveBeenCalledWith('/history', { replace: true })
    })
  })

  it('sets viewingMode="viewer" when canEdit=false', async () => {
    mockResolveShare.mockResolvedValue({ projectId: 'proj-test', canEdit: false })
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(mockSetViewingMode).toHaveBeenCalledWith('viewer')
      expect(mockNavigate).toHaveBeenCalledWith('/history', { replace: true })
    })
  })

  it('calls selectProject in both cases', async () => {
    mockResolveShare.mockResolvedValue({ projectId: 'proj-test', canEdit: true })
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(mockSelectProject).toHaveBeenCalledWith('proj-test')
    })
  })
})
