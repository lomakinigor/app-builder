// @vitest-environment jsdom
// T-207 — HistoryPage TaskProgressPanel acceptance tests
// Implements F-024 / T-207
//
// Coverage areas:
//   A. Task rows display — grouping, taskId, phase/test badges, analysis snippet
//   B. Filter interactivity — phase filter, test filter, combined, counter text
//   C. Recommended task — "Следующая задача" badge, amber border, prominent CTA
//   D. Navigation — "Открыть в Prompt Loop" clicks navigate to /prompt-loop
//   E. Empty / safe states — no iterations, (unassigned) row, null parsedSummary

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

const mockUseProjectRegistry = vi.fn()
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (s: { projects: { id: string; status: string }[]; selectedProjectId: string | null }) =>
    s.projects.find((p) => p.id === s.selectedProjectId) ?? null,
}))

// nextActionEngine mocked so we control recommendedTaskId independently of store shape
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
    id: 'proj-tp',
    name: 'Task Progress Test Project',
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
    id: 'idea-tp',
    projectId: 'proj-tp',
    rawIdea: 'A test product',
    createdAt: '2026-04-21T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
  }
}

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented the feature.',
    plan: 'Tests first.',
    changedFiles: ['src/lib/thing.ts', '[TEST] src/lib/thing.test.ts'],
    implementationSummary: 'Added the feature with tests.',
    nextStep: 'Proceed to T-002.',
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
    id: 'iter-tp-1',
    projectId: 'proj-tp',
    iterationNumber: 1,
    promptText: 'Implement T-001 with tests.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'sent',
    createdAt: '2026-04-21T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-001',
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

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
    markTaskReviewComplete: vi.fn(),
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
  mockUseProjectRegistry.mockImplementation((selector?: (s: unknown) => unknown) => {
    const s = { projects: [], selectedProjectId: null, markProjectCompleted: vi.fn() }
    return selector ? selector(s) : s
  })
})

// ─── A. Task rows display ─────────────────────────────────────────────────────

describe('A. TaskProgressPanel — task rows display', () => {
  it('shows "Промпт-итераций пока нет" when promptIterations is empty', () => {
    renderPage({ promptIterations: [] })
    // Text appears in both TaskProgressPanel and the prompt iterations card
    expect(screen.getAllByText(/Промпт-итераций пока нет/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows task ID "T-001" when one iteration has targetTaskId="T-001"', () => {
    renderPage({ promptIterations: [makeIteration({ targetTaskId: 'T-001' })] })
    // T-001 appears in TaskProgressPanel row header; may also appear in decisions panel
    expect(screen.getAllByText('T-001').length).toBeGreaterThanOrEqual(1)
  })

  it('shows a single task row when two iterations share the same targetTaskId', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', iterationNumber: 1, targetTaskId: 'T-005' }),
        makeIteration({ id: 'i2', iterationNumber: 2, targetTaskId: 'T-005' }),
      ],
    })
    // TaskProgressPanel shows "2 задач" or "1 / 1 задач" counter — look for counter text
    // Two iterations → one grouped row with iterationCount=2
    expect(screen.getByText(/1 \/ 1 задач/)).toBeInTheDocument()
  })

  it('shows two task rows when two iterations have different targetTaskIds', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001' }),
        makeIteration({ id: 'i2', targetTaskId: 'T-002' }),
      ],
    })
    // "2 / 2 задач" appears in the filter counter
    expect(screen.getByText(/2 \/ 2 задач/)).toBeInTheDocument()
  })

  it('shows "✓ тесты" badge when hasTests=true on the task row', () => {
    renderPage({
      promptIterations: [
        makeIteration({ parsedSummary: makeParsed({ hasTests: true }) }),
      ],
    })
    expect(screen.getByText('✓ тесты')).toBeInTheDocument()
  })

  it('shows "⚠ нет тестов" badge when hasTests=false on the task row', () => {
    renderPage({
      promptIterations: [
        makeIteration({ parsedSummary: makeParsed({ hasTests: false }) }),
      ],
    })
    expect(screen.getByText('⚠ нет тестов')).toBeInTheDocument()
  })

  it('shows Код+Тесты phase badge on the task row', () => {
    renderPage({
      promptIterations: [makeIteration({ cyclePhase: 'code_and_tests' })],
    })
    // "Код+Тесты" appears in both TaskProgressPanel phase badge and CycleTimeline
    expect(screen.getAllByText('Код+Тесты').length).toBeGreaterThanOrEqual(1)
  })

  it('shows Ревью phase badge when iteration has cyclePhase="review"', () => {
    renderPage({
      promptIterations: [makeIteration({ cyclePhase: 'review' })],
    })
    // "Ревью" appears in TaskProgressPanel phase badge and possibly CycleTimeline
    expect(screen.getAllByText('Ревью').length).toBeGreaterThanOrEqual(1)
  })

  it('shows analysis snippet in task row when parsedSummary.analysis is set', () => {
    renderPage({
      promptIterations: [
        makeIteration({
          parsedSummary: makeParsed({ analysis: 'Implemented the onboarding flow.' }),
        }),
      ],
    })
    expect(screen.getByText(/Implemented the onboarding flow\./)).toBeInTheDocument()
  })

  it('shows "(unassigned)" when targetTaskId is null', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: null })],
    })
    expect(screen.getByText('(unassigned)')).toBeInTheDocument()
  })

  it('shows warning text in task row when parsedSummary has warnings', () => {
    renderPage({
      promptIterations: [
        makeIteration({ parsedSummary: makeParsed({ warnings: ['No test files found.'] }) }),
      ],
    })
    // Warning appears in both TaskProgressPanel row and IterationReviewCard
    expect(screen.getAllByText(/No test files found\./).length).toBeGreaterThanOrEqual(1)
  })

  it('shows iteration count in task row (e.g., "2 итер.")', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', iterationNumber: 1, targetTaskId: 'T-010' }),
        makeIteration({ id: 'i2', iterationNumber: 2, targetTaskId: 'T-010' }),
      ],
    })
    expect(screen.getByText(/2 итер\./)).toBeInTheDocument()
  })
})

// ─── B. Filter interactivity ──────────────────────────────────────────────────

describe('B. TaskProgressPanel — filter interactivity', () => {
  it('"Прогресс задач" card heading is visible', () => {
    renderPage({ promptIterations: [makeIteration()] })
    expect(screen.getByText('Прогресс задач')).toBeInTheDocument()
  })

  it('phase filter "all" shows all task rows', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
        makeIteration({ id: 'i2', targetTaskId: 'T-002', cyclePhase: 'review' }),
      ],
    })
    // With "all" filter: both tasks visible → "2 / 2 задач"
    expect(screen.getByText(/2 \/ 2 задач/)).toBeInTheDocument()
  })

  it('selecting "review" phase filter shows only tasks that visited review', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
        makeIteration({ id: 'i2', targetTaskId: 'T-002', cyclePhase: 'review' }),
      ],
    })
    // First select = phase filter (has cycle-phase options)
    const phaseSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(phaseSelect, { target: { value: 'review' } })
    // Only T-002 (review phase) should remain → "1 / 2 задач"
    expect(screen.getByText(/1 \/ 2 задач/)).toBeInTheDocument()
  })

  it('selecting "has_tests" test filter shows only tasks with tests', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', parsedSummary: makeParsed({ hasTests: true }) }),
        makeIteration({ id: 'i2', targetTaskId: 'T-002', parsedSummary: makeParsed({ hasTests: false }) }),
      ],
    })
    // Second select = test filter (has_tests / missing_tests options)
    const testSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(testSelect, { target: { value: 'has_tests' } })
    // Only T-001 (hasTests) remains
    expect(screen.getByText(/1 \/ 2 задач/)).toBeInTheDocument()
  })

  it('selecting "missing_tests" test filter shows only tasks without tests', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', parsedSummary: makeParsed({ hasTests: true }) }),
        makeIteration({ id: 'i2', targetTaskId: 'T-002', parsedSummary: makeParsed({ hasTests: false }) }),
      ],
    })
    const testSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(testSelect, { target: { value: 'missing_tests' } })
    expect(screen.getByText(/1 \/ 2 задач/)).toBeInTheDocument()
  })

  it('filter with no matches shows "Нет задач, соответствующих" message', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
      ],
    })
    const phaseSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(phaseSelect, { target: { value: 'review' } })
    expect(screen.getByText(/Нет задач, соответствующих/)).toBeInTheDocument()
  })
})

// ─── C. Recommended task ──────────────────────────────────────────────────────

describe('C. TaskProgressPanel — recommended task highlighting', () => {
  it('shows "Следующая задача" badge on the row matching recommendedTaskId', () => {
    mockGetRecommendedTaskId.mockReturnValue('T-001')
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    expect(screen.getByText('Следующая задача')).toBeInTheDocument()
  })

  it('does NOT show "Следующая задача" badge when recommendedTaskId is null', () => {
    mockGetRecommendedTaskId.mockReturnValue(null)
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    expect(screen.queryByText('Следующая задача')).not.toBeInTheDocument()
  })

  it('does NOT show "Следующая задача" badge when recommendedTaskId does not match any row', () => {
    mockGetRecommendedTaskId.mockReturnValue('T-999')
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    expect(screen.queryByText('Следующая задача')).not.toBeInTheDocument()
  })

  it('recommended row shows "Открыть в Prompt Loop →" (prominent amber CTA)', () => {
    mockGetRecommendedTaskId.mockReturnValue('T-001')
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    expect(screen.getByText('Открыть в Prompt Loop →')).toBeInTheDocument()
  })

  it('non-recommended row shows "Открыть в Цикле промптов →" (muted link text)', () => {
    mockGetRecommendedTaskId.mockReturnValue(null)
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    expect(screen.getByText('Открыть в Цикле промптов →')).toBeInTheDocument()
  })
})

// ─── D. Navigation ────────────────────────────────────────────────────────────

describe('D. TaskProgressPanel — navigation to Prompt Loop', () => {
  it('clicking "Открыть в Цикле промптов →" calls navigate("/prompt-loop")', () => {
    mockGetRecommendedTaskId.mockReturnValue(null)
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    fireEvent.click(screen.getByText('Открыть в Цикле промптов →'))
    expect(mockNavigate).toHaveBeenCalledWith('/prompt-loop')
  })

  it('clicking "Открыть в Prompt Loop →" (recommended CTA) calls navigate("/prompt-loop")', () => {
    mockGetRecommendedTaskId.mockReturnValue('T-001')
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    fireEvent.click(screen.getByText('Открыть в Prompt Loop →'))
    expect(mockNavigate).toHaveBeenCalledWith('/prompt-loop')
  })

  it('navigate is called exactly once per click', () => {
    mockGetRecommendedTaskId.mockReturnValue(null)
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    fireEvent.click(screen.getByText('Открыть в Цикле промптов →'))
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })
})

// ─── E. Empty / safe states ──────────────────────────────────────────────────

describe('E. TaskProgressPanel — empty and safe states', () => {
  it('renders without crashing when promptIterations is empty', () => {
    expect(() => renderPage({ promptIterations: [] })).not.toThrow()
  })

  it('renders without crashing when parsedSummary is null on all iterations', () => {
    expect(() =>
      renderPage({
        promptIterations: [
          makeIteration({ parsedSummary: null }),
          makeIteration({ id: 'i2', parsedSummary: null }),
        ],
      })
    ).not.toThrow()
  })

  it('renders "(unassigned)" row without crashing when targetTaskId is null', () => {
    expect(() =>
      renderPage({
        promptIterations: [makeIteration({ targetTaskId: null })],
      })
    ).not.toThrow()
  })

  it('"Прогресс задач" card header badge shows task count (e.g. "1 задач")', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    // Card header badge shows total task count
    expect(screen.getByText('1 задач')).toBeInTheDocument()
  })

  it('"Прогресс задач" card header badge shows "0 задач" when no iterations', () => {
    renderPage({ promptIterations: [] })
    expect(screen.getByText('0 задач')).toBeInTheDocument()
  })

  it('two tasks with same ID and different phases both show in single row phases', () => {
    renderPage({
      promptIterations: [
        makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
        makeIteration({ id: 'i2', targetTaskId: 'T-001', cyclePhase: 'review' }),
      ],
    })
    // Both phases appear as badges (may also appear in CycleTimeline)
    expect(screen.getAllByText('Код+Тесты').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Ревью').length).toBeGreaterThanOrEqual(1)
  })
})
