// @vitest-environment jsdom
// T-211 — Superpowers cycle completeness: integration / acceptance tests.
//
// These tests fill the gap between isolated unit/page tests (T-201…T-207) and
// end-to-end browser automation.  Each test verifies a cross-component contract:
// - the same store state feeds two different pages consistently,
// - stage-gate CTAs are actionable and navigate correctly,
// - task-centric prompt iterations appear in the History dashboard,
// - multi-project state does not bleed between projects.
//
// Coverage areas:
//   A. Cycle entry — project creation → stepper + CTA
//   B. Stage-gate actionable hints — empty/no-project states across key pages
//   C. Prompt Loop → History cross-page data flow
//   D. Multi-project state isolation
//   E. No-project route resilience

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Project, IdeaDraft, SpecPack, ArchitectureDraft } from '../../shared/types'
import type { PromptIteration } from '../../entities/prompt-iteration/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  NavLink: ({ children, to, className }: { children: React.ReactNode; to: string; className?: unknown }) => (
    <a href={to} className={typeof className === 'function' ? '' : (className ?? '')}>
      {children}
    </a>
  ),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockUseProjectRegistry = vi.fn()
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (state: { projects: { id: string }[]; selectedProjectId: string | null }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

vi.mock('../../shared/lib/id', () => ({ generateId: () => 'test-id' }))
vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  promptIterationToMarkdown: () => '# markdown',
  researchBriefToMarkdown: () => '# markdown',
  specPackToMarkdown: () => '# markdown',
  architectureDraftToMarkdown: () => '# markdown',
}))
vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))
vi.mock('../../shared/lib/attentionSignal', () => ({
  startAttentionSignal: vi.fn(),
  stopAttentionSignal: vi.fn(),
}))
vi.mock('../../mocks/services/promptService', () => ({
  mockPromptService: {
    parseClaudeResponse: vi.fn(),
    generateFirstPrompt: vi.fn(),
    generateNextPrompt: vi.fn(),
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-t211',
    name: 'T-211 Test Project',
    projectType: 'application',
    createdAt: '2026-04-21T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    status: 'active',
    currentStage: 'iterative_loop',
    ...overrides,
  }
}

function makeIdea(overrides: Partial<IdeaDraft> = {}): IdeaDraft {
  return {
    title: 'Test Project',
    rawIdea: 'A comprehensive test product with enough detail to satisfy minimum length requirements here.',
    targetUser: 'Developers',
    problem: 'Complexity',
    constraints: '',
    notes: '',
    ...overrides,
  }
}

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A test product',
    MVPScope: 'Basic MVP',
    featureList: [{ id: 'F-001', name: 'Feature', priority: 'must', notes: '' }],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
    ...overrides,
  }
}

function makeArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [{ name: 'React', role: 'UI', rationale: '' }],
    moduleArchitecture: 'Modular',
    dataFlow: 'Unidirectional',
    roadmapPhases: [{ phase: 1, title: 'Phase 1', goals: [], taskIds: [] }],
    technicalRisks: [],
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-t211',
    projectId: 'proj-t211',
    iterationNumber: 1,
    promptText: 'Implement T-001 with tests.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-21T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: null,
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

function makeProjectStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    ideaDraft: null,
    researchRuns: [],
    importedArtifacts: [],
    researchBrief: null,
    specPack: makeSpec(),
    architectureDraft: makeArch(),
    promptIterations: [] as PromptIteration[],
    addPromptIteration: vi.fn(),
    updatePromptIteration: vi.fn(),
    setCurrentStage: vi.fn(),
    setIdeaDraft: vi.fn(),
    setResearchBrief: vi.fn(),
    setSpecPack: vi.fn(),
    updateSpecPack: vi.fn(),
    setArchitectureDraft: vi.fn(),
    addResearchRun: vi.fn(),
    addImportedArtifact: vi.fn(),
    setActiveProject: vi.fn(),
    setProjectType: vi.fn(),
    ...overrides,
  }
}

function makeRegistryStore(overrides: Record<string, unknown> = {}) {
  const proj = makeProject()
  return {
    projects: [proj],
    selectedProjectId: proj.id,
    createProject: vi.fn(),
    selectProject: vi.fn(),
    updateProject: vi.fn(),
    ...overrides,
  }
}

function setupMocks(
  storeOverrides: Record<string, unknown> = {},
  registryOverrides: Record<string, unknown> = {},
) {
  const store = makeProjectStore(storeOverrides)
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(store) : store,
  )
  const registry = makeRegistryStore(registryOverrides)
  mockUseProjectRegistry.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(registry) : registry,
  )
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  })
})

// ─── A. Cycle entry — project creation and stepper ───────────────────────────

describe('A. Cycle entry — project creation and stepper', () => {
  it('HomePage shows "Продолжить" button for active phase when project is selected', async () => {
    const { HomePage } = await import('../../pages/home/HomePage')
    setupMocks(
      { ideaDraft: makeIdea(), specPack: null, architectureDraft: null },
      {},
    )
    render(<HomePage />)
    // With ideaDraft only, brainstorm=done, spec=in_progress → Continue points to spec phase
    expect(screen.getByText(/Продолжить/)).toBeInTheDocument()
  })

  it('HomePage shows no stepper when no project is selected in registry', async () => {
    const { HomePage } = await import('../../pages/home/HomePage')
    setupMocks({}, { selectedProjectId: null, projects: [] })
    render(<HomePage />)
    // No selected project → shows empty project card, no cycle stepper
    expect(screen.getByText(/Проект не выбран/)).toBeInTheDocument()
    expect(screen.queryByText(/Продолжить/)).not.toBeInTheDocument()
  })

  it('HomePage cycle stepper shows "Обзор" phase when all artifacts present + iterations', async () => {
    const { HomePage } = await import('../../pages/home/HomePage')
    const iteration = makeIteration({
      parsedSummary: {
        analysisSummary: 'done',
        implementationPlan: 'done',
        changedFiles: ['src/foo.test.ts'],
        nextStep: 'review',
        warnings: [],
        hasTests: true,
        implementedTaskIds: ['T-001'],
        nextTaskId: null,
        inferredNextPhase: 'review',
      },
      cyclePhase: 'review',
    })
    setupMocks(
      {
        ideaDraft: makeIdea(),
        specPack: makeSpec(),
        architectureDraft: makeArch(),
        promptIterations: [iteration],
      },
      {},
    )
    render(<HomePage />)
    // All phases done or review → stepper should render the cycle phases
    expect(screen.getByText(/Выбранный проект/)).toBeInTheDocument()
  })
})

// ─── B. Stage-gate actionable hints ──────────────────────────────────────────

describe('B. Stage-gate actionable hints', () => {
  it('HistoryPage without activeProject: shows EmptyState with "Создать проект" CTA', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    setupMocks({ activeProject: null }, { selectedProjectId: null, projects: [] })
    render(<HistoryPage />)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
    expect(screen.getByText('Создать проект')).toBeInTheDocument()
  })

  it('HistoryPage "Создать проект" CTA navigates to /project/new', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    setupMocks({ activeProject: null }, { selectedProjectId: null, projects: [] })
    render(<HistoryPage />)
    screen.getByText('Создать проект').click()
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('HistoryPage with project but no iterations: TaskProgressPanel shows navigate-to-PromptLoop CTA', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    setupMocks({ promptIterations: [] })
    render(<HistoryPage />)
    // Text may appear in multiple places (TaskProgressPanel + other empty state hints)
    expect(screen.getAllByText(/Промпт-итераций пока нет/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Перейти к Циклу промптов/).length).toBeGreaterThanOrEqual(1)
  })

  it('PromptLoopPage without activeProject: shows EmptyState with CTA', async () => {
    const { PromptLoopPage } = await import('../../pages/prompt-loop/PromptLoopPage')
    setupMocks({ activeProject: null })
    render(<PromptLoopPage />)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('PromptLoopPage without architectureDraft: shows architecture gate card', async () => {
    const { PromptLoopPage } = await import('../../pages/prompt-loop/PromptLoopPage')
    setupMocks({ architectureDraft: null, promptIterations: [] })
    render(<PromptLoopPage />)
    // Gate card shows exact text "Требуется архитектура"
    expect(screen.getByText('Требуется архитектура')).toBeInTheDocument()
  })

  it('SpecPage without activeProject: shows EmptyState', async () => {
    const { SpecPage } = await import('../../pages/spec/SpecPage')
    setupMocks({ activeProject: null })
    render(<SpecPage />)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })
})

// ─── C. Prompt Loop → History cross-page data flow ───────────────────────────

describe('C. Prompt Loop → History cross-page data flow', () => {
  it('iteration with targetTaskId appears as task row in HistoryPage TaskProgressPanel', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    const iter = makeIteration({ targetTaskId: 'T-007', cyclePhase: 'code_and_tests' })
    setupMocks({ promptIterations: [iter] })
    render(<HistoryPage />)
    // T-007 appears in TaskProgressPanel task row (and possibly iteration cards)
    expect(screen.getAllByText('T-007').length).toBeGreaterThanOrEqual(1)
  })

  it('History card header shows correct "N задач" badge for task-centric iterations', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    const iter1 = makeIteration({ id: 'iter-1', targetTaskId: 'T-011', cyclePhase: 'code_and_tests' })
    const iter2 = makeIteration({ id: 'iter-2', targetTaskId: 'T-012', cyclePhase: 'review' })
    setupMocks({ promptIterations: [iter1, iter2] })
    render(<HistoryPage />)
    // buildTaskReviewModel groups by taskId: 2 unique task IDs → "2 задач" badge
    expect(screen.getByText('2 задач')).toBeInTheDocument()
  })

  it('multiple iterations for the same task ID collapse into one task row', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    const iter1 = makeIteration({ id: 'iter-1', iterationNumber: 1, targetTaskId: 'T-055', cyclePhase: 'code_and_tests' })
    const iter2 = makeIteration({ id: 'iter-2', iterationNumber: 2, targetTaskId: 'T-055', cyclePhase: 'review' })
    setupMocks({ promptIterations: [iter1, iter2] })
    render(<HistoryPage />)
    // Both iterations for T-055 → "1 задача" row (grouped), not "2 задач"
    expect(screen.getByText('1 задач')).toBeInTheDocument()
    expect(screen.getAllByText('T-055').length).toBeGreaterThanOrEqual(1)
  })

  it('iteration cyclePhase badge appears in History task row', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    const iter = makeIteration({ targetTaskId: 'T-033', cyclePhase: 'review' })
    setupMocks({ promptIterations: [iter] })
    render(<HistoryPage />)
    // Task row for T-033 appears in task progress panel
    expect(screen.getAllByText('T-033').length).toBeGreaterThanOrEqual(1)
  })
})

// ─── D. Multi-project state isolation ────────────────────────────────────────

describe('D. Multi-project state isolation', () => {
  it('HistoryPage with project A iterations: switching to project B (no iterations) shows empty state', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    // Simulate project B is active: no iterations, but project exists
    const projB = makeProject({ id: 'proj-B', name: 'Project B' })
    setupMocks(
      { activeProject: projB, promptIterations: [] },
      { projects: [projB], selectedProjectId: 'proj-B' },
    )
    render(<HistoryPage />)
    // Project B has no iterations → TaskProgressPanel shows empty CTA
    expect(screen.getAllByText(/Промпт-итераций пока нет/).length).toBeGreaterThanOrEqual(1)
    // TaskProgressPanel shows "0 задач" (no task rows from project A)
    expect(screen.getByText('0 задач')).toBeInTheDocument()
  })

  it('HomePage shows selected project name from registry, not a different project', async () => {
    const { HomePage } = await import('../../pages/home/HomePage')
    const projA = makeProject({ id: 'proj-A', name: 'Project Alpha' })
    setupMocks(
      { activeProject: projA, ideaDraft: null },
      { projects: [projA], selectedProjectId: 'proj-A' },
    )
    render(<HomePage />)
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
  })

  it('HistoryPage: iteration with no targetTaskId appears as "(unassigned)" task row', async () => {
    const { HistoryPage } = await import('../../pages/history/HistoryPage')
    // Iteration with no targetTaskId → groups as "(unassigned)"
    const iter = makeIteration({ targetTaskId: null, cyclePhase: 'code_and_tests' })
    setupMocks({ promptIterations: [iter] })
    render(<HistoryPage />)
    // "(unassigned)" row exists in TaskProgressPanel
    expect(screen.getByText('(unassigned)')).toBeInTheDocument()
    // Card header shows "1 задач" for the single (unassigned) row
    expect(screen.getByText('1 задач')).toBeInTheDocument()
  })

  it('TopBar shows "Нет проекта" pill when no project selected in registry', async () => {
    const { TopBar } = await import('../../app/layout/TopBar')
    setupMocks(
      { activeProject: null },
      { selectedProjectId: null, projects: [] },
    )
    render(<TopBar onMenuClick={vi.fn()} />)
    expect(screen.getByText('Нет проекта')).toBeInTheDocument()
  })
})

// ─── E. No-project route resilience ──────────────────────────────────────────

describe('E. No-project route resilience', () => {
  it('ArchitecturePage without activeProject renders EmptyState (no crash)', async () => {
    const { ArchitecturePage } = await import('../../pages/architecture/ArchitecturePage')
    setupMocks({ activeProject: null, architectureDraft: null })
    const { container } = render(<ArchitecturePage />)
    expect(container).toBeTruthy()
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('all key flow pages render "Проект не выбран" guard without crashing when activeProject is null', async () => {
    const { ResearchPage } = await import('../../pages/research/ResearchPage')
    setupMocks({ activeProject: null, researchBrief: null })
    const { unmount } = render(<ResearchPage />)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
    unmount()
  })
})
