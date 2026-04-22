// @vitest-environment jsdom
// T-403 — HomePage invite-by-email UI tests.
//
// Coverage:
//   1. Invite panel not shown before share is generated
//   2. Invite panel shown after share token is generated (share button clicked)
//   3. Submitting valid email calls inviteByEmail with correct shareId + email
//   4. Success: shows "Приглашение отправлено" feedback
//   5. Error: shows error message from API
//   6. Feature flag OFF: invite panel never appears

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

const mockGenerateShareToken = vi.fn()
const mockInviteByEmail = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: mockGenerateShareToken,
    inviteByEmail: mockInviteByEmail,
    getAuditTrail: vi.fn().mockResolvedValue([]),
    listCollaborators: vi.fn().mockResolvedValue([]),
    updateCollaboratorRole: vi.fn(),
    revokeCollaborator: vi.fn(),
  }),
}))

// Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})

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

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSharingEnabled.mockReturnValue(true)
  mockGenerateShareToken.mockResolvedValue({ shareId: 'share-proj-1', shareUrl: '/shared/share-proj-1' })
  mockInviteByEmail.mockResolvedValue({ invitedEmail: 'user@example.com', status: 'sent' })
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Invite panel visibility', () => {
  it('invite panel is hidden before share button is clicked', () => {
    render(<HomePage />)
    expect(screen.queryByTestId('invite-panel')).not.toBeInTheDocument()
  })

  it('invite panel appears after share button is clicked', async () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => {
      expect(screen.getByTestId('invite-panel')).toBeInTheDocument()
    })
  })
})

describe('B. Invite submission', () => {
  it('clicking Пригласить calls inviteByEmail with shareId and email', async () => {
    render(<HomePage />)

    // First generate share token
    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => expect(screen.getByTestId('invite-panel')).toBeInTheDocument())

    // Type email and submit
    const emailInput = screen.getByPlaceholderText('user@example.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByText('Пригласить'))

    await waitFor(() => {
      expect(mockInviteByEmail).toHaveBeenCalledWith('share-proj-1', 'test@example.com', 'viewer')
    })
  })

  it('shows success feedback after successful invite', async () => {
    render(<HomePage />)

    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => expect(screen.getByTestId('invite-panel')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByText('Пригласить'))

    await waitFor(() => {
      expect(screen.getByText('✓ Приглашение отправлено')).toBeInTheDocument()
    })
  })

  it('shows error message when inviteByEmail rejects', async () => {
    mockInviteByEmail.mockRejectedValue(new Error('Invalid email address'))

    render(<HomePage />)

    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => expect(screen.getByTestId('invite-panel')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'bad-email' },
    })
    fireEvent.click(screen.getByText('Пригласить'))

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })
})

describe('C. Feature flag OFF — no invite panel', () => {
  beforeEach(() => {
    mockIsSharingEnabled.mockReturnValue(false)
  })

  it('share button not present, invite panel never visible', () => {
    render(<HomePage />)
    expect(screen.queryByText('🔗 Поделиться')).not.toBeInTheDocument()
    expect(screen.queryByTestId('invite-panel')).not.toBeInTheDocument()
  })
})
