// @vitest-environment jsdom
// T-405 — HomePage editor-mode tests.
//
// Coverage:
//   1. Editor does NOT see share button (owner-only)
//   2. Editor does NOT see invite panel
//   3. Editor does NOT see audit panel
//   4. Editor still sees project name and project overview buttons

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Sharing ON, but editor canManageSharing=false
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => true,
}))

// T-405: editor mode — canManageSharing=false
const mockCanManageSharing = vi.fn(() => false)
vi.mock('../../app/store/viewingModeStore', () => ({
  useCanManageSharing: () => mockCanManageSharing(),
}))

vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: vi.fn().mockResolvedValue({ shareId: 'share-proj-1', shareUrl: '/shared/share-proj-1' }),
    inviteByEmail: vi.fn(),
    getAuditTrail: vi.fn().mockResolvedValue([]),
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

beforeEach(() => {
  vi.clearAllMocks()
  mockCanManageSharing.mockReturnValue(false) // editor mode
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HomePage — editor mode (T-405)', () => {
  it('hides share button (owner-only sharing control)', () => {
    render(<HomePage />)
    expect(screen.queryByText('🔗 Поделиться')).not.toBeInTheDocument()
  })

  it('hides invite panel (owner-only sharing control)', () => {
    render(<HomePage />)
    expect(screen.queryByTestId('invite-panel')).not.toBeInTheDocument()
  })

  it('hides audit panel (owner-only sharing control)', () => {
    render(<HomePage />)
    expect(screen.queryByTestId('audit-panel')).not.toBeInTheDocument()
  })

  it('hides collaborator panel (owner-only sharing control)', () => {
    render(<HomePage />)
    expect(screen.queryByTestId('collaborator-panel')).not.toBeInTheDocument()
  })

  it('still shows project name and navigation buttons', () => {
    render(<HomePage />)
    expect(screen.getByText('My Project')).toBeInTheDocument()
    expect(screen.getByText('Обзор')).toBeInTheDocument()
  })
})
