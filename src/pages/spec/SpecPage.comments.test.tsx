// @vitest-environment jsdom
// T-407 — SpecPage comments panel tests.
//
// Coverage:
//   1. Owner sees CommentsPanel when specPack is present
//   2. Viewer sees CommentsPanel but no add form (canPost=false path)
//   3. Comments list renders author, date, body
//   4. Empty state shown when no comments
//   5. Error state shown when listComments rejects
//   6. addComment called on submit; result appended to list
//   7. Empty comment body prevents submit
//   8. CommentsPanel NOT shown when specPack is null

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SpecPage } from './SpecPage'
import type { Project, SpecPack } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  specPackToMarkdown: () => '# spec',
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
  currentStage: 'specification',
}

const mockSpec: SpecPack = {
  projectType: 'application',
  productSummary: 'A stateful app.',
  MVPScope: 'Single-user CRUD.',
  featureList: [{ id: 'f-1', name: 'Feature', description: '', priority: 'must' }],
  assumptions: [],
  constraints: [],
  acceptanceNotes: 'User can create tasks after reload.',
}

const commentsFixture = [
  {
    id: 'c-1',
    projectId: 'proj-1',
    artifactType: 'spec' as const,
    artifactId: 'proj-1',
    body: 'Spec looks solid.',
    authorLabel: 'owner',
    createdAt: '2026-04-22T10:00:00.000Z',
  },
]

function setupStore(specPack: SpecPack | null = mockSpec) {
  const base = {
    activeProject: mockProject,
    researchBrief: { id: 'b-1', projectId: 'proj-1', sources: [], problemSummary: 'P', targetUsers: [], keyInsights: [], valueHypothesis: 'V', recommendedMVP: 'M', open_questions: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    specPack,
    setSpecPack: vi.fn(),
    updateSpecPack: vi.fn(),
    setCurrentStage: vi.fn(),
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCanEdit.mockReturnValue(true)
  mockListComments.mockResolvedValue(commentsFixture)
  mockAddComment.mockResolvedValue({
    id: 'c-new',
    projectId: 'proj-1',
    artifactType: 'spec' as const,
    artifactId: 'proj-1',
    body: 'New comment',
    authorLabel: 'owner',
    createdAt: '2026-04-22T11:00:00.000Z',
  })
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. CommentsPanel visibility', () => {
  it('shows comments panel when specPack is present', async () => {
    render(<SpecPage />)
    await waitFor(() => {
      expect(screen.getByTestId('comments-panel')).toBeInTheDocument()
    })
  })

  it('does NOT show comments panel when specPack is null', () => {
    setupStore(null)
    render(<SpecPage />)
    expect(screen.queryByTestId('comments-panel')).not.toBeInTheDocument()
  })
})

describe('B. Comments list rendering', () => {
  it('renders comment body, author, and calls listComments with correct args', async () => {
    render(<SpecPage />)
    await waitFor(() => {
      expect(screen.getByText('Spec looks solid.')).toBeInTheDocument()
    })
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(mockListComments).toHaveBeenCalledWith('proj-1', 'spec', 'proj-1')
  })

  it('shows empty state when no comments', async () => {
    mockListComments.mockResolvedValue([])
    render(<SpecPage />)
    await waitFor(() => {
      expect(screen.getByText('Комментариев пока нет')).toBeInTheDocument()
    })
  })

  it('shows error when listComments rejects', async () => {
    mockListComments.mockRejectedValue(new Error('Server error'))
    render(<SpecPage />)
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })
})

describe('C. Add comment (owner/editor)', () => {
  it('owner sees add comment form', async () => {
    render(<SpecPage />)
    await waitFor(() => expect(screen.getByTestId('comments-panel')).toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: /Текст комментария/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Добавить комментарий/i })).toBeInTheDocument()
  })

  it('submit calls addComment and appends result to list', async () => {
    render(<SpecPage />)
    await waitFor(() => expect(screen.getByText('Spec looks solid.')).toBeInTheDocument())

    const textarea = screen.getByRole('textbox', { name: /Текст комментария/i })
    fireEvent.change(textarea, { target: { value: 'New comment' } })

    const submitButton = screen.getByRole('button', { name: /Добавить комментарий/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith({
        projectId: 'proj-1',
        artifactType: 'spec',
        artifactId: 'proj-1',
        body: 'New comment',
      })
    })
    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument()
    })
  })

  it('submit button disabled when body is empty', async () => {
    render(<SpecPage />)
    await waitFor(() => expect(screen.getByTestId('comments-panel')).toBeInTheDocument())
    const submitButton = screen.getByRole('button', { name: /Добавить комментарий/i })
    expect(submitButton).toBeDisabled()
  })
})

describe('D. Viewer mode — read-only', () => {
  it('viewer sees comments list but no add form', async () => {
    mockCanEdit.mockReturnValue(false)
    render(<SpecPage />)
    await waitFor(() => {
      expect(screen.getByText('Spec looks solid.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox', { name: /Текст комментария/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Добавить комментарий/i })).not.toBeInTheDocument()
    expect(screen.getByText('Только для чтения')).toBeInTheDocument()
  })
})
