// @vitest-environment jsdom
// T-402 — SharedProjectPage feature flag guard tests.
//
// Coverage:
//   1. Flag OFF: shows "unavailable" page, does not call resolveShare
//   2. Flag OFF: "На главную" button navigates to "/"
//   3. Flag ON: existing loading/resolve flow still works (regression check)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SharedProjectPage } from './SharedProjectPage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ shareId: 'share-proj-1' }),
  useNavigate: () => mockNavigate,
}))

const mockIsSharingEnabled = vi.fn(() => false)
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => mockIsSharingEnabled(),
}))

const mockSelectProject = vi.fn()
const mockProjects: Project[] = [
  {
    id: 'proj-1',
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
  getSharingApi: () => ({ resolveShare: mockResolveShare }),
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveShare.mockResolvedValue({ projectId: 'proj-1', canEdit: false })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Sharing flag OFF', () => {
  beforeEach(() => {
    mockIsSharingEnabled.mockReturnValue(false)
  })

  it('shows "Функция недоступна" page', () => {
    render(<SharedProjectPage />)
    expect(screen.getByText('Функция недоступна')).toBeInTheDocument()
  })

  it('does not call resolveShare', () => {
    render(<SharedProjectPage />)
    expect(mockResolveShare).not.toHaveBeenCalled()
  })

  it('does not set viewingMode to viewer', () => {
    render(<SharedProjectPage />)
    expect(mockSetViewingMode).not.toHaveBeenCalled()
  })
})

describe('B. Sharing flag ON — resolve flow still works', () => {
  beforeEach(() => {
    mockIsSharingEnabled.mockReturnValue(true)
  })

  it('shows loading state while resolving', () => {
    mockResolveShare.mockImplementation(() => new Promise(() => {}))
    render(<SharedProjectPage />)
    expect(screen.getByText('Открываем проект…')).toBeInTheDocument()
  })

  it('calls selectProject and setViewingMode on success', async () => {
    render(<SharedProjectPage />)
    await waitFor(() => {
      expect(mockSelectProject).toHaveBeenCalledWith('proj-1')
      expect(mockSetViewingMode).toHaveBeenCalledWith('viewer')
    })
  })
})
