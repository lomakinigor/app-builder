// @vitest-environment jsdom
// T-402 — HomePage share button feature flag gating.
//
// Coverage:
//   1. Share button hidden when VITE_FEATURE_SHARING is off
//   2. Share button visible when VITE_FEATURE_SHARING is on
//   3. Owner flow (navigate, project overview) unaffected regardless of flag

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockIsSharingEnabled = vi.fn(() => false)
vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => mockIsSharingEnabled(),
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

function setupStore(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSharingEnabled.mockReturnValue(false)
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Sharing flag OFF (default)', () => {
  it('hides the share button', () => {
    render(<HomePage />)
    expect(screen.queryByText('🔗 Поделиться')).not.toBeInTheDocument()
  })

  it('still shows the project name and overview buttons', () => {
    render(<HomePage />)
    expect(screen.getByText('My Project')).toBeInTheDocument()
    expect(screen.getByText('Обзор')).toBeInTheDocument()
  })
})

describe('B. Sharing flag ON', () => {
  beforeEach(() => {
    mockIsSharingEnabled.mockReturnValue(true)
  })

  it('shows the share button', () => {
    render(<HomePage />)
    expect(screen.getByText('🔗 Поделиться')).toBeInTheDocument()
  })

  it('still shows the project name and overview buttons', () => {
    render(<HomePage />)
    expect(screen.getByText('My Project')).toBeInTheDocument()
    expect(screen.getByText('Обзор')).toBeInTheDocument()
  })
})
