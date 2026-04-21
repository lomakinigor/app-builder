// @vitest-environment jsdom
// T-212 — "Review complete" action on HistoryPage
// Implements F-024 / T-212
//
// Coverage areas:
//   A. Model — reviewStatus returns 'done' when completedReviewTaskIds is non-empty
//   B. UI    — review-complete button, completed badge, gate rules
//   C. Integration — completion propagates to cycle phase status

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project, PromptIteration, ParsedClaudeResponse, IdeaDraft } from '../../shared/types'
import { computeCycleProgress } from '../../shared/lib/superpowers/cycleProgress'
import type { ProjectData } from '../../app/store/projectStore'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockGetRecommendedTaskId = vi.fn(() => null as string | null)
const mockGetRecommendedPhaseId = vi.fn(() => null)
const mockComputeNextAction = vi.fn(() => ({ kind: 'none' as const, path: '/', label: '', reason: '' }))

vi.mock('../../shared/lib/superpowers/nextActionEngine', () => ({
  computeNextAction: (...args: unknown[]) => mockComputeNextAction(...args),
  getRecommendedPhaseId: (...args: unknown[]) => mockGetRecommendedPhaseId(...args),
  getRecommendedTaskId: (...args: unknown[]) => mockGetRecommendedTaskId(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-rc',
    name: 'Review Complete Test Project',
    projectType: 'application',
    createdAt: '2026-04-21T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    status: 'active',
    currentStage: 'iterative_loop',
    ...overrides,
  }
}

function makeIdeaDraft(): IdeaDraft {
  return {
    id: 'idea-rc',
    projectId: 'proj-rc',
    rawIdea: 'A product with review',
    createdAt: '2026-04-21T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
  }
}

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Feature implemented.',
    plan: 'Tests written.',
    changedFiles: ['src/lib/thing.ts', '[TEST] src/lib/thing.test.ts'],
    implementationSummary: 'Done.',
    nextStep: 'Proceed.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: [],
    nextTaskId: null,
    inferredNextPhase: 'code_and_tests',
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-rc-1',
    projectId: 'proj-rc',
    iterationNumber: 1,
    promptText: 'Implement T-070 with tests.',
    claudeResponseRaw: null,
    parsedSummary: makeParsed({ hasTests: true }),
    recommendedNextStep: null,
    status: 'parsed',
    createdAt: '2026-04-21T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-070',
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

const mockMarkTaskReviewComplete = vi.fn()

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    ideaDraft: makeIdeaDraft(),
    researchRuns: [],
    importedArtifacts: [],
    researchBrief: null,
    specPack: null,
    architectureDraft: null,
    promptIterations: [] as PromptIteration[],
    completedReviewTaskIds: [] as string[],
    markTaskReviewComplete: mockMarkTaskReviewComplete,
    ...overrides,
  }
}

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<HistoryPage />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRecommendedTaskId.mockReturnValue(null)
  mockGetRecommendedPhaseId.mockReturnValue(null)
  mockComputeNextAction.mockReturnValue({ kind: 'none', path: '/', label: '', reason: '' })
})

// ─── A. Model — reviewStatus via computeCycleProgress ────────────────────────

describe('A. Model — reviewStatus with completedReviewTaskIds', () => {
  function makeProjectData(overrides: Partial<ProjectData> = {}): ProjectData {
    return {
      ideaDraft: makeIdeaDraft(),
      researchRuns: [],
      importedArtifacts: [],
      researchBrief: null,
      specPack: null,
      architectureDraft: null,
      promptIterations: [],
      completedReviewTaskIds: [],
      ...overrides,
    }
  }

  it('review phase is "not_started" with no iterations and no completedReviewTaskIds', () => {
    const phases = computeCycleProgress(makeProjectData())
    const review = phases.find((p) => p.id === 'review')!
    expect(review.status).toBe('not_started')
  })

  it('review phase is "done" when completedReviewTaskIds is non-empty (with iterations)', () => {
    const phases = computeCycleProgress(
      makeProjectData({
        promptIterations: [makeIteration()],
        completedReviewTaskIds: ['T-070'],
      }),
    )
    const review = phases.find((p) => p.id === 'review')!
    expect(review.status).toBe('done')
  })

  it('review phase stays "in_progress" when iterations exist but completedReviewTaskIds is empty', () => {
    const phases = computeCycleProgress(
      makeProjectData({
        promptIterations: [makeIteration({ parsedSummary: makeParsed() })],
        completedReviewTaskIds: [],
      }),
    )
    const review = phases.find((p) => p.id === 'review')!
    // hasParsed=true → in_progress (no explicit completion, no review-phase iteration)
    expect(review.status).toBe('in_progress')
  })
})

// ─── B. UI — review-complete button and badge ─────────────────────────────────

describe('B. UI — review-complete action in TaskProgressPanel', () => {
  it('shows "Завершить review" button for a task with hasTests=true and not yet completed', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-070', parsedSummary: makeParsed({ hasTests: true }) })],
      completedReviewTaskIds: [],
    })
    expect(screen.getByText('Завершить review')).toBeInTheDocument()
  })

  it('clicking "Завершить review" calls markTaskReviewComplete with the task ID', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-070', parsedSummary: makeParsed({ hasTests: true }) })],
      completedReviewTaskIds: [],
    })
    fireEvent.click(screen.getByText('Завершить review'))
    expect(mockMarkTaskReviewComplete).toHaveBeenCalledWith('T-070')
  })

  it('completed task shows "✓ Review завершён" badge', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-070', parsedSummary: makeParsed({ hasTests: true }) })],
      completedReviewTaskIds: ['T-070'],
    })
    expect(screen.getByText('✓ Review завершён')).toBeInTheDocument()
  })

  it('completed task does NOT show "Завершить review" button', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-070', parsedSummary: makeParsed({ hasTests: true }) })],
      completedReviewTaskIds: ['T-070'],
    })
    expect(screen.queryByText('Завершить review')).not.toBeInTheDocument()
  })

  it('task without tests (hasTests=false) does NOT show "Завершить review" button', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-080', parsedSummary: makeParsed({ hasTests: false }) })],
      completedReviewTaskIds: [],
    })
    expect(screen.queryByText('Завершить review')).not.toBeInTheDocument()
  })

  it('"(unassigned)" row does NOT show "Завершить review" button even with hasTests=true', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: null, parsedSummary: makeParsed({ hasTests: true }) })],
      completedReviewTaskIds: [],
    })
    expect(screen.queryByText('Завершить review')).not.toBeInTheDocument()
  })
})

// ─── C. Integration — completion propagates to cycle phase ───────────────────

describe('C. Integration — review completion affects History dashboard', () => {
  it('when completedReviewTaskIds is non-empty, computeCycleProgress review status is done', () => {
    // Verify the pure function used by HistoryPage produces 'done' for review
    const phases = computeCycleProgress({
      ideaDraft: makeIdeaDraft(),
      researchRuns: [],
      importedArtifacts: [],
      researchBrief: null,
      specPack: null,
      architectureDraft: null,
      promptIterations: [makeIteration()],
      completedReviewTaskIds: ['T-070'],
    })
    expect(phases.find((p) => p.id === 'review')?.status).toBe('done')
  })
})
