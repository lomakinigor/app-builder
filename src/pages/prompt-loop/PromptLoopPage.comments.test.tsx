// @vitest-environment jsdom
// T-407 — PromptLoopPage comments panel tests.
//
// Coverage:
//   1. Comments panel shown for active iteration (owner/editor can post)
//   2. Comments panel NOT shown when no active iteration
//   3. listComments called with artifactType=prompt_iteration and iteration id
//   4. Viewer sees comments but no add form
//   5. Editor can add comment → addComment called + appended

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptLoopPage } from './PromptLoopPage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'
import type { PromptIteration, ParsedClaudeResponse } from '../../entities/prompt-iteration/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../shared/lib/id', () => ({
  generateId: () => 'test-id',
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  promptIterationToMarkdown: () => '# markdown',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

const mockListComments = vi.fn()
const mockAddComment = vi.fn()
vi.mock('../../shared/api', () => ({
  getPromptLoopApi: () => ({
    generateFirstPrompt: vi.fn(),
    generateNextPrompt: vi.fn(),
    parseClaudeResponse: vi.fn(),
  }),
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
  currentStage: 'iterative_loop',
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

const parsedSummary: ParsedClaudeResponse = {
  analysis: 'Analyzed T-001',
  plan: 'Plan',
  changedFiles: ['src/app.ts'],
  implementationSummary: 'Done',
  nextStep: 'Next task',
  warnings: [],
  hasTests: true,
  implementedTaskIds: ['T-001'],
  nextTaskId: 'T-002',
  inferredNextPhase: 'code_and_tests',
}

const mockIteration: PromptIteration = {
  id: 'iter-abc',
  projectId: 'proj-1',
  iterationNumber: 1,
  promptText: 'Build X',
  claudeResponseRaw: null,
  parsedSummary,
  recommendedNextStep: 'Continue',
  status: 'parsed',
  createdAt: '2026-04-22T10:00:00.000Z',
  projectType: 'application',
  cyclePhase: 'code_and_tests',
  targetTaskId: 'T-001',
  roadmapPhaseNumber: 0,
}

const iterCommentFixture = [
  {
    id: 'ci-1',
    projectId: 'proj-1',
    artifactType: 'prompt_iteration' as const,
    artifactId: 'iter-abc',
    body: 'Good iteration.',
    authorLabel: 'editor',
    createdAt: '2026-04-22T12:00:00.000Z',
  },
]

function setupStore(promptIterations: PromptIteration[] = [mockIteration]) {
  const base = {
    activeProject: mockProject,
    specPack: mockSpec,
    architectureDraft: mockArch,
    promptIterations,
    addPromptIteration: vi.fn(),
    updatePromptIteration: vi.fn(),
    setCurrentStage: vi.fn(),
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCanEdit.mockReturnValue(true)
  mockListComments.mockResolvedValue(iterCommentFixture)
  mockAddComment.mockResolvedValue({
    id: 'ci-new',
    projectId: 'proj-1',
    artifactType: 'prompt_iteration' as const,
    artifactId: 'iter-abc',
    body: 'Added comment',
    authorLabel: 'editor',
    createdAt: '2026-04-22T13:00:00.000Z',
  })
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. CommentsPanel on PromptLoopPage', () => {
  it('shows comments panel when active iteration exists', async () => {
    render(<PromptLoopPage />)
    await waitFor(() => {
      expect(screen.getByTestId('comments-panel')).toBeInTheDocument()
    })
  })

  it('does NOT show comments panel when no iterations', () => {
    setupStore([])
    render(<PromptLoopPage />)
    expect(screen.queryByTestId('comments-panel')).not.toBeInTheDocument()
  })

  it('calls listComments with artifactType=prompt_iteration and iteration id', async () => {
    render(<PromptLoopPage />)
    await waitFor(() => expect(screen.getByTestId('comments-panel')).toBeInTheDocument())
    expect(mockListComments).toHaveBeenCalledWith('proj-1', 'prompt_iteration', 'iter-abc')
  })

  it('renders comment body from listComments response', async () => {
    render(<PromptLoopPage />)
    await waitFor(() => {
      expect(screen.getByText('Good iteration.')).toBeInTheDocument()
    })
  })
})

describe('B. Editor can add comment on iteration', () => {
  it('editor sees add form and can submit a comment', async () => {
    render(<PromptLoopPage />)
    await waitFor(() => expect(screen.getByTestId('comments-panel')).toBeInTheDocument())

    const textarea = screen.getByRole('textbox', { name: /Текст комментария/i })
    fireEvent.change(textarea, { target: { value: 'Added comment' } })
    fireEvent.click(screen.getByRole('button', { name: /Добавить комментарий/i }))

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith({
        projectId: 'proj-1',
        artifactType: 'prompt_iteration',
        artifactId: 'iter-abc',
        body: 'Added comment',
      })
    })
    await waitFor(() => {
      expect(screen.getByText('Added comment')).toBeInTheDocument()
    })
  })
})

describe('C. Viewer mode on PromptLoopPage', () => {
  it('viewer sees comments but no add form', async () => {
    mockCanEdit.mockReturnValue(false)
    render(<PromptLoopPage />)
    await waitFor(() => {
      expect(screen.getByText('Good iteration.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('textbox', { name: /Текст комментария/i })).not.toBeInTheDocument()
    expect(screen.getByText('Только для чтения')).toBeInTheDocument()
  })
})
