// @vitest-environment jsdom
// T-407 — ArchitecturePage comments panel tests.
//
// Coverage:
//   1. Owner sees CommentsPanel when architectureDraft is present
//   2. Viewer sees CommentsPanel read-only (no add form)
//   3. CommentsPanel NOT shown when architectureDraft is null
//   4. listComments called with artifactType=architecture

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ArchitecturePage } from './ArchitecturePage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  architectureDraftToMarkdown: () => '# arch',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

const mockListComments = vi.fn()
const mockAddComment = vi.fn()
vi.mock('../../shared/api', () => ({
  getSpecApi: () => ({ generateSpec: vi.fn(), generateArchitecture: vi.fn() }),
  getCommentsApi: () => ({
    listComments: mockListComments,
    addComment: mockAddComment,
  }),
}))

const mockCanEdit = vi.fn(() => true)
vi.mock('../../app/store/viewingModeStore', () => ({
  useCanEditProject: () => mockCanEdit(),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  projectType: 'application',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  status: 'active',
  currentStage: 'architecture',
}

const mockSpec: SpecPack = {
  projectType: 'application',
  productSummary: 'App',
  MVPScope: 'CRUD',
  featureList: [{ id: 'f-1', name: 'F', description: '', priority: 'must' }],
  assumptions: [],
  constraints: [],
  acceptanceNotes: 'OK',
}

const mockArch: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [{ name: 'React', role: 'UI', rationale: 'Ecosystem' }],
  moduleArchitecture: 'Feature-sliced',
  dataFlow: 'Store → UI',
  roadmapPhases: [{ phase: 0, title: 'Foundation', goals: ['Shell'], estimatedComplexity: 'low' }],
  technicalRisks: [],
}

const archCommentsFixture = [
  {
    id: 'ca-1',
    projectId: 'proj-1',
    artifactType: 'architecture' as const,
    artifactId: 'proj-1',
    body: 'Stack looks good.',
    authorLabel: 'editor',
    createdAt: '2026-04-22T11:00:00.000Z',
  },
]

function setupStore(architectureDraft: ArchitectureDraft | null = mockArch) {
  const base = {
    activeProject: mockProject,
    specPack: mockSpec,
    architectureDraft,
    setArchitectureDraft: vi.fn(),
    updateArchitectureDraft: vi.fn(),
    setCurrentStage: vi.fn(),
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCanEdit.mockReturnValue(true)
  mockListComments.mockResolvedValue(archCommentsFixture)
  mockAddComment.mockResolvedValue({
    id: 'ca-new',
    projectId: 'proj-1',
    artifactType: 'architecture' as const,
    artifactId: 'proj-1',
    body: 'New comment',
    authorLabel: 'owner',
    createdAt: '2026-04-22T12:00:00.000Z',
  })
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. CommentsPanel on ArchitecturePage', () => {
  it('shows comments panel when architectureDraft is present', async () => {
    render(<ArchitecturePage />)
    await waitFor(() => {
      expect(screen.getByTestId('comments-panel')).toBeInTheDocument()
    })
  })

  it('does NOT show comments panel when architectureDraft is null', () => {
    setupStore(null)
    render(<ArchitecturePage />)
    expect(screen.queryByTestId('comments-panel')).not.toBeInTheDocument()
  })

  it('calls listComments with artifactType=architecture', async () => {
    render(<ArchitecturePage />)
    await waitFor(() => expect(screen.getByTestId('comments-panel')).toBeInTheDocument())
    expect(mockListComments).toHaveBeenCalledWith('proj-1', 'architecture', 'proj-1')
  })

  it('renders comment body from listComments response', async () => {
    render(<ArchitecturePage />)
    await waitFor(() => {
      expect(screen.getByText('Stack looks good.')).toBeInTheDocument()
    })
  })
})

describe('B. Viewer mode on ArchitecturePage', () => {
  it('viewer sees comments list but no add form', async () => {
    mockCanEdit.mockReturnValue(false)
    render(<ArchitecturePage />)
    await waitFor(() => {
      expect(screen.getByText('Stack looks good.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox', { name: /Текст комментария/i })).not.toBeInTheDocument()
    expect(screen.getByText('Только для чтения')).toBeInTheDocument()
  })
})
