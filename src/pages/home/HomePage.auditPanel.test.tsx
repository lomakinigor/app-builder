// @vitest-environment jsdom
// T-404 — HomePage audit panel tests.
//
// Coverage:
//   1. Audit panel shown with events when sharing enabled
//   2. Empty state when getAuditTrail returns []
//   3. Error state when getAuditTrail rejects
//   4. Audit panel not shown when sharing flag OFF
//   5. Audit panel renders human-readable event rows

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockIsSharingEnabled = vi.fn(() => true)
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => mockIsSharingEnabled(),
}))

const mockGetAuditTrail = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: vi.fn().mockResolvedValue({ shareId: 'share-proj-1', shareUrl: '/shared/share-proj-1' }),
    inviteByEmail: vi.fn(),
    getAuditTrail: mockGetAuditTrail,
    listCollaborators: vi.fn().mockResolvedValue([]),
    updateCollaboratorRole: vi.fn(),
    revokeCollaborator: vi.fn(),
  }),
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

const auditEventsFixture = [
  {
    id: 'audit-proj-1-1',
    projectId: 'proj-1',
    type: 'share_link_created' as const,
    timestamp: '2026-04-22T10:15:00.000Z',
    actorLabel: 'owner',
    shareId: 'share-proj-1',
  },
  {
    id: 'audit-proj-1-2',
    projectId: 'proj-1',
    type: 'share_invite_sent' as const,
    timestamp: '2026-04-22T10:18:00.000Z',
    actorLabel: 'owner',
    targetEmail: 'alice@example.com',
    shareId: 'share-proj-1',
  },
  {
    id: 'audit-proj-1-3',
    projectId: 'proj-1',
    type: 'share_link_opened' as const,
    timestamp: '2026-04-22T10:24:00.000Z',
    actorLabel: 'anonymous viewer',
    shareId: 'share-proj-1',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSharingEnabled.mockReturnValue(true)
  mockGetAuditTrail.mockResolvedValue(auditEventsFixture)
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Audit panel visibility', () => {
  it('shows audit panel when sharing is enabled', async () => {
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByTestId('audit-panel')).toBeInTheDocument()
    })
  })

  it('audit panel not shown when sharing flag is OFF', () => {
    mockIsSharingEnabled.mockReturnValue(false)
    render(<HomePage />)
    expect(screen.queryByTestId('audit-panel')).not.toBeInTheDocument()
  })
})

describe('B. Audit event rendering', () => {
  it('renders human-readable rows for each audit event', async () => {
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByTestId('audit-panel')).toBeInTheDocument()
    })
    expect(screen.getByText(/Ссылка создана/)).toBeInTheDocument()
    expect(screen.getByText(/Приглашение отправлено на alice@example\.com/)).toBeInTheDocument()
    expect(screen.getByText(/Ссылку открыл anonymous viewer/)).toBeInTheDocument()
  })

  it('shows empty state when getAuditTrail returns []', async () => {
    mockGetAuditTrail.mockResolvedValue([])
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('Пока нет действий по доступу')).toBeInTheDocument()
    })
  })
})

describe('C. Error state', () => {
  it('shows error message when getAuditTrail rejects', async () => {
    mockGetAuditTrail.mockRejectedValue(new Error('Server unavailable'))
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
    })
  })
})
