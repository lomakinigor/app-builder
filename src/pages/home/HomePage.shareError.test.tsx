// @vitest-environment jsdom
// T-410 — Hardening: share API failure shows user-facing error instead of silently failing.
//
// Coverage:
//   A. generateShareToken rejects → share-error appears
//   B. generateShareToken succeeds → no share-error
//   C. share-error cleared on next click

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomePage } from './HomePage'
import type { Project } from '../../shared/types'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../shared/config/features', () => ({
  isSharingEnabled: () => true,
}))

const mockGenerateShareToken = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    generateShareToken: mockGenerateShareToken,
    inviteByEmail: vi.fn(),
    getAuditTrail: vi.fn().mockResolvedValue([]),
    listCollaborators: vi.fn().mockResolvedValue([]),
    updateCollaboratorRole: vi.fn(),
    revokeCollaborator: vi.fn(),
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
  setupStore()
})

describe('A. Share API failure — user sees error', () => {
  it('shows share-error when generateShareToken rejects', async () => {
    mockGenerateShareToken.mockRejectedValue(new Error('Server error'))
    render(<HomePage />)
    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => {
      expect(screen.getByTestId('share-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('share-error')).toHaveTextContent('Server error')
  })
})

describe('B. Share success — no error shown', () => {
  it('does not show share-error when generateShareToken succeeds', async () => {
    mockGenerateShareToken.mockResolvedValue({ shareId: 'sh-1', shareUrl: '/shared/sh-1' })
    render(<HomePage />)
    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => {
      expect(screen.getByText('✓ Ссылка скопирована')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('share-error')).not.toBeInTheDocument()
  })
})

describe('C. Share error cleared on next attempt', () => {
  it('clears previous error when share button is clicked again', async () => {
    mockGenerateShareToken.mockRejectedValueOnce(new Error('Fail'))
    mockGenerateShareToken.mockResolvedValueOnce({ shareId: 'sh-1', shareUrl: '/shared/sh-1' })
    render(<HomePage />)

    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => expect(screen.getByTestId('share-error')).toBeInTheDocument())

    fireEvent.click(screen.getByText('🔗 Поделиться'))
    await waitFor(() => expect(screen.queryByTestId('share-error')).not.toBeInTheDocument())
  })
})
