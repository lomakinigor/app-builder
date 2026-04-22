// @vitest-environment jsdom
// T-406 — HomePage collaborator management panel tests.
//
// Coverage:
//   1. Owner sees collaborator panel when sharing enabled
//   2. Collaborator list renders email, role, status, revoke button
//   3. Empty state: "Пока нет приглашённых участников"
//   4. Owner can change collaborator role (dropdown triggers updateCollaboratorRole)
//   5. Owner can revoke collaborator (revokeCollaborator called, row removed)
//   6. Editor does NOT see collaborator panel
//   7. Sharing flag OFF hides collaborator panel

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project, ProjectCollaborator } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockIsSharingEnabled = vi.fn(() => true)
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => mockIsSharingEnabled(),
}))

const mockListCollaborators = vi.fn()
const mockUpdateCollaboratorRole = vi.fn()
const mockRevokeCollaborator = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: vi.fn().mockResolvedValue({ shareId: 'share-proj-1', shareUrl: '/shared/share-proj-1' }),
    inviteByEmail: vi.fn().mockResolvedValue({ invitedEmail: 'x@x.com', status: 'sent' }),
    getAuditTrail: vi.fn().mockResolvedValue([]),
    listCollaborators: mockListCollaborators,
    updateCollaboratorRole: mockUpdateCollaboratorRole,
    revokeCollaborator: mockRevokeCollaborator,
  }),
}))

// Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})

const mockCanManageSharing = vi.fn(() => true)
vi.mock('../../app/store/viewingModeStore', () => ({
  useCanManageSharing: () => mockCanManageSharing(),
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

vi.mock('../../shared/lib/superpowers/cycleProgress', () => ({
  computeCycleProgress: () => [],
}))

vi.mock('../../shared/lib/superpowers/nextActionEngine', () => ({
  computeNextAction: () => ({ type: 'none' }),
  getRecommendedPhaseId: () => null,
}))

vi.mock('../../shared/ui/CycleProgressStepper', () => ({
  CycleProgressStepper: () => null,
}))

vi.mock('../../shared/ui/NextActionCard', () => ({
  NextActionCard: () => null,
}))

vi.mock('../../mocks/project/seedData', () => ({
  mockProject: { id: 'mock', name: 'Mock', projectType: 'application', createdAt: '2026-01-01', updatedAt: '2026-01-01', status: 'active', currentStage: 'idea' },
  mockIdeaDraft: null,
  mockResearchBrief: null,
  mockSpecPack: null,
  mockArchitectureDraft: null,
  mockPromptIterations: [],
  mockImportedArtifact: null,
  mockResearchRun: null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const collaboratorsFixture: ProjectCollaborator[] = [
  {
    id: 'collab-1',
    email: 'alice@example.com',
    role: 'viewer',
    status: 'active',
    invitedAt: '2026-04-22T10:18:00.000Z',
  },
  {
    id: 'collab-2',
    email: 'bob@example.com',
    role: 'editor',
    status: 'invited',
    invitedAt: '2026-04-22T11:00:00.000Z',
  },
]

// ─── Setup ────────────────────────────────────────────────────────────────────

function setupStore() {
  const base = {
    activeProject: mockSelectedProject,
    ideaDraft: null,
    researchBrief: null,
    specPack: null,
    architectureDraft: null,
    promptIterations: [],
    setIdeaDraft: vi.fn(),
    setResearchBrief: vi.fn(),
    setSpecPack: vi.fn(),
    setArchitectureDraft: vi.fn(),
    addPromptIteration: vi.fn(),
    addImportedArtifact: vi.fn(),
    addResearchRun: vi.fn(),
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSharingEnabled.mockReturnValue(true)
  mockCanManageSharing.mockReturnValue(true)
  mockListCollaborators.mockResolvedValue(collaboratorsFixture)
  mockUpdateCollaboratorRole.mockImplementation(
    (id: string, role: 'viewer' | 'editor'): Promise<ProjectCollaborator> => {
      const found = collaboratorsFixture.find((c) => c.id === id)!
      return Promise.resolve({ ...found, role })
    },
  )
  mockRevokeCollaborator.mockResolvedValue({ success: true })
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Collaborator panel visibility', () => {
  it('owner sees collaborator panel when sharing is enabled', async () => {
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByTestId('collaborator-panel')).toBeInTheDocument()
    })
  })

  it('sharing flag OFF hides collaborator panel', () => {
    mockIsSharingEnabled.mockReturnValue(false)
    render(<HomePage />)
    expect(screen.queryByTestId('collaborator-panel')).not.toBeInTheDocument()
  })

  it('editor (canManageSharing=false) does not see collaborator panel', () => {
    mockCanManageSharing.mockReturnValue(false)
    render(<HomePage />)
    expect(screen.queryByTestId('collaborator-panel')).not.toBeInTheDocument()
  })
})

describe('B. Collaborator list rendering', () => {
  it('renders email, role, status and revoke button for each collaborator', async () => {
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('invited')).toBeInTheDocument()
    expect(screen.getAllByText('Отозвать')).toHaveLength(2)
  })

  it('shows empty state when no collaborators', async () => {
    mockListCollaborators.mockResolvedValue([])
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('Пока нет приглашённых участников')).toBeInTheDocument()
    })
  })
})

describe('C. Role management', () => {
  it('changing collaborator role calls updateCollaboratorRole with new role', async () => {
    render(<HomePage />)
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

    const roleSelect = screen.getByRole('combobox', { name: /Роль alice@example\.com/i })
    fireEvent.change(roleSelect, { target: { value: 'editor' } })

    await waitFor(() => {
      expect(mockUpdateCollaboratorRole).toHaveBeenCalledWith('collab-1', 'editor')
    })
  })
})

describe('D. Revoke', () => {
  it('clicking Отозвать calls revokeCollaborator and removes the row', async () => {
    render(<HomePage />)
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

    const revokeButton = screen.getByRole('button', { name: /Отозвать alice@example\.com/i })
    fireEvent.click(revokeButton)

    await waitFor(() => {
      expect(mockRevokeCollaborator).toHaveBeenCalledWith('collab-1')
      expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
    })
  })
})
