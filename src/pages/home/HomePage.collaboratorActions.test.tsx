// @vitest-environment jsdom
// T-410 — Hardening: collaborator action errors (revoke/role-change) shown to owner.
//
// Coverage:
//   A. revokeCollaborator rejects → collaborator-action-error shown
//   B. updateCollaboratorRole rejects → collaborator-action-error shown
//   C. successful revoke → no error shown

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project, ProjectCollaborator } from '../../shared/types'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => true,
}))

const mockListCollaborators = vi.fn()
const mockUpdateCollaboratorRole = vi.fn()
const mockRevokeCollaborator = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: vi.fn().mockResolvedValue({ shareId: 'sh-1', shareUrl: '/shared/sh-1' }),
    inviteByEmail: vi.fn(),
    getAuditTrail: vi.fn().mockResolvedValue([]),
    listCollaborators: mockListCollaborators,
    updateCollaboratorRole: mockUpdateCollaboratorRole,
    revokeCollaborator: mockRevokeCollaborator,
  }),
}))

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})

vi.mock('../../app/store/viewingModeStore', () => ({
  useCanManageSharing: () => true,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockSelectedProject: Project = {
  id: 'proj-1',
  name: 'My Project',
  projectType: 'application',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  status: 'active',
  currentStage: 'idea',
}

const mockCollaborator: ProjectCollaborator = {
  id: 'collab-1',
  projectId: 'proj-1',
  email: 'alice@example.com',
  role: 'viewer',
  status: 'accepted',
  invitedAt: '2026-01-01',
}

vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (selector?: (s: unknown) => unknown) => {
    const state = {
      selectProject: vi.fn(),
      projects: [mockSelectedProject],
      selectedProjectId: 'proj-1',
    }
    return selector ? selector(state) : state
  },
  selectSelectedProject: (state: { selectedProjectId: string; projects: Project[] }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

vi.mock('../../shared/lib/superpowers/cycleProgress', () => ({ computeCycleProgress: () => [] }))
vi.mock('../../shared/lib/superpowers/nextActionEngine', () => ({
  computeNextAction: () => ({ type: 'none' }),
  getRecommendedPhaseId: () => null,
}))
vi.mock('../../shared/ui/CycleProgressStepper', () => ({ CycleProgressStepper: () => null }))
vi.mock('../../shared/ui/NextActionCard', () => ({ NextActionCard: () => null }))
vi.mock('../../mocks/project/seedData', () => ({
  mockProject: { id: 'mock', name: 'Mock', projectType: 'application', createdAt: '2026-01-01', updatedAt: '2026-01-01', status: 'active', currentStage: 'idea' },
  mockIdeaDraft: null, mockResearchBrief: null, mockSpecPack: null, mockArchitectureDraft: null,
  mockPromptIterations: [], mockImportedArtifact: null, mockResearchRun: null,
}))

function setupStore() {
  const base = {
    activeProject: mockSelectedProject,
    ideaDraft: null, researchBrief: null, specPack: null, architectureDraft: null,
    promptIterations: [],
    setIdeaDraft: vi.fn(), setResearchBrief: vi.fn(), setSpecPack: vi.fn(),
    setArchitectureDraft: vi.fn(), addPromptIteration: vi.fn(),
    addImportedArtifact: vi.fn(), addResearchRun: vi.fn(),
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListCollaborators.mockResolvedValue([mockCollaborator])
  mockRevokeCollaborator.mockResolvedValue(undefined)
  mockUpdateCollaboratorRole.mockResolvedValue({ ...mockCollaborator, role: 'editor' })
  setupStore()
})

describe('A. Revoke failure — owner sees error', () => {
  it('shows collaborator-action-error when revokeCollaborator rejects', async () => {
    mockRevokeCollaborator.mockRejectedValue(new Error('Cannot revoke'))
    render(<HomePage />)
    await waitFor(() => expect(screen.getByTestId('collaborator-row-collab-1')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Отозвать alice@example.com' }))
    await waitFor(() => {
      expect(screen.getByTestId('collaborator-action-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('collaborator-action-error')).toHaveTextContent('Cannot revoke')
  })
})

describe('B. Role change failure — owner sees error', () => {
  it('shows collaborator-action-error when updateCollaboratorRole rejects', async () => {
    mockUpdateCollaboratorRole.mockRejectedValue(new Error('Permission denied'))
    render(<HomePage />)
    await waitFor(() => expect(screen.getByTestId('collaborator-row-collab-1')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox', { name: 'Роль alice@example.com' }), {
      target: { value: 'editor' },
    })
    await waitFor(() => {
      expect(screen.getByTestId('collaborator-action-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('collaborator-action-error')).toHaveTextContent('Permission denied')
  })
})

describe('C. Successful revoke — no error', () => {
  it('does not show error when revoke succeeds', async () => {
    render(<HomePage />)
    await waitFor(() => expect(screen.getByTestId('collaborator-row-collab-1')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Отозвать alice@example.com' }))
    await waitFor(() => {
      expect(screen.queryByTestId('collaborator-row-collab-1')).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId('collaborator-action-error')).not.toBeInTheDocument()
  })
})
