// @vitest-environment jsdom
// T-213 — Project-level "Проект завершён" completion action on HistoryPage
// Implements F-024 / T-213
//
// Coverage areas:
//   A. UI    — completion button gate, banner, disabled state
//   B. Integration — registry selectedProject.status drives isProjectCompleted
//
// Store-level tests for markProjectCompleted are in projectRegistryStore.test.ts (Group E).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project, PromptIteration, ParsedClaudeResponse, IdeaDraft } from '../../shared/types'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockMarkProjectCompleted = vi.fn()
const mockUseProjectRegistry = vi.fn()
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (state: { projects: Project[]; selectedProjectId: string | null }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

vi.mock('../../shared/lib/superpowers/nextActionEngine', () => ({
  computeNextAction: vi.fn(() => ({ kind: 'none' as const, path: '/', label: '', reason: '' })),
  getRecommendedPhaseId: vi.fn(() => null),
  getRecommendedTaskId: vi.fn(() => null),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-pc',
    name: 'Project Complete Test',
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
    title: 'A completed product',
    rawIdea: 'A completed product',
    targetUser: 'Test user',
    problem: 'Test problem',
    constraints: '',
    notes: '',
  }
}

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Done.',
    plan: 'Tests written.',
    changedFiles: ['src/thing.ts', '[TEST] src/thing.test.ts'],
    implementationSummary: 'Complete.',
    nextStep: 'Review.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: [],
    nextTaskId: null,
    inferredNextPhase: 'review',
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-pc-1',
    projectId: 'proj-pc',
    iterationNumber: 1,
    promptText: 'Implement T-070.',
    claudeResponseRaw: null,
    parsedSummary: makeParsed(),
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

function makeProjectStore(overrides: Record<string, unknown> = {}) {
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
    markTaskReviewComplete: vi.fn(),
    ...overrides,
  }
}

function makeRegistry(projectOverrides: Partial<Project> = {}) {
  const proj = makeProject(projectOverrides)
  return {
    projects: [proj],
    selectedProjectId: proj.id,
    markProjectCompleted: mockMarkProjectCompleted,
    createProject: vi.fn(),
    selectProject: vi.fn(),
    updateProject: vi.fn(),
  }
}

function renderPage(
  storeOverrides: Record<string, unknown> = {},
  registryProjectOverrides: Partial<Project> = {},
) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeProjectStore(storeOverrides)
    return selector ? selector(state) : state
  })
  const registry = makeRegistry(registryProjectOverrides)
  mockUseProjectRegistry.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(registry) : registry,
  )
  return render(<HistoryPage />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── A. UI — completion button gate and completed banner ─────────────────────

describe('A. UI — completion button gate, banner, and disabled state', () => {
  it('shows enabled "Завершить проект" button when gate is met (completedReviewTaskIds non-empty)', () => {
    renderPage({
      promptIterations: [makeIteration()],
      completedReviewTaskIds: ['T-070'],
    })
    const btn = screen.getByTestId('complete-project-button')
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
  })

  it('clicking "Завершить проект" calls markProjectCompleted with the project ID', () => {
    renderPage({
      promptIterations: [makeIteration()],
      completedReviewTaskIds: ['T-070'],
    })
    fireEvent.click(screen.getByTestId('complete-project-button'))
    expect(mockMarkProjectCompleted).toHaveBeenCalledWith('proj-pc')
  })

  it('shows disabled "Завершить проект" button when no tasks are review-complete', () => {
    renderPage({
      promptIterations: [makeIteration()],
      completedReviewTaskIds: [],
    })
    const btn = screen.getByTestId('complete-project-button')
    expect(btn).toBeDisabled()
  })

  it('shows explanation text when gate is not met', () => {
    renderPage({
      promptIterations: [makeIteration()],
      completedReviewTaskIds: [],
    })
    expect(screen.getByText(/Завершите review хотя бы одной задачи/)).toBeInTheDocument()
  })

  it('shows "Проект завершён" banner when project status is "completed" (via registry)', () => {
    renderPage(
      { completedReviewTaskIds: ['T-070'] },
      { status: 'completed' },
    )
    const banner = screen.getByTestId('project-completed-banner')
    expect(banner).toBeInTheDocument()
    expect(within(banner).getByText('Проект завершён')).toBeInTheDocument()
  })

  it('does NOT show the completion button when project is already completed', () => {
    renderPage(
      { completedReviewTaskIds: ['T-070'] },
      { status: 'completed' },
    )
    expect(screen.queryByTestId('complete-project-button')).not.toBeInTheDocument()
  })
})

// ─── B. Integration — registry selectedProject.status drives completed UI ────

describe('B. Integration — completed status from registry drives HistoryPage presentation', () => {
  it('completed project shows "✓ Завершён" badge in project card header', () => {
    renderPage(
      { completedReviewTaskIds: ['T-070'] },
      { status: 'completed' },
    )
    expect(screen.getByText('✓ Завершён')).toBeInTheDocument()
  })

  it('active project does NOT show completed banner or completed badge', () => {
    renderPage({ completedReviewTaskIds: ['T-070'] })
    expect(screen.queryByTestId('project-completed-banner')).not.toBeInTheDocument()
    expect(screen.queryByText('✓ Завершён')).not.toBeInTheDocument()
  })

  it('completed project: completion action bar shows "Проект завершён" text (not a button)', () => {
    renderPage(
      { completedReviewTaskIds: ['T-070'] },
      { status: 'completed' },
    )
    // The bottom action bar shows completed text, not a button
    expect(screen.queryByTestId('complete-project-button')).not.toBeInTheDocument()
    // The text "Проект завершён" appears in both banner and bottom bar
    const instances = screen.getAllByText('Проект завершён')
    expect(instances.length).toBeGreaterThanOrEqual(2)
  })
})
