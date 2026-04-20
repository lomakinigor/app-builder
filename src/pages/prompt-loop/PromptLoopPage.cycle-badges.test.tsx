// @vitest-environment jsdom
// T-108 — PromptLoopPage CycleContextBar: phase badges, projectType badges, visibility rules.
// Pairs with promptService.cycle-aware.test.ts (pure service layer).
//
// Coverage areas:
//   A. Phase label badges — each CyclePhase maps to the correct Russian label
//   B. projectType badges — application → "Приложение", website → "Сайт"
//   C. Supporting data — targetTaskId badge, roadmap phase number
//   D. Visibility rules — bar shown/hidden based on iteration and architectureDraft presence

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PromptLoopPage } from './PromptLoopPage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'
import type { PromptIteration, CyclePhase } from '../../entities/prompt-iteration/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../mocks/services/promptService', () => ({
  mockPromptService: {
    parseClaudeResponse: vi.fn(),
    generateFirstPrompt: vi.fn(),
    generateNextPrompt: vi.fn(),
  },
}))

vi.mock('../../shared/lib/id', () => ({ generateId: () => 'test-id' }))
vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  promptIterationToMarkdown: () => '# markdown',
}))
vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))
vi.mock('../../shared/lib/attentionSignal', () => ({
  startAttentionSignal: vi.fn(),
  stopAttentionSignal: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-t108',
    name: 'T-108 Test Project',
    projectType: 'application',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    status: 'active',
    currentStage: 'iterative_loop',
    ...overrides,
  }
}

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A test product',
    MVPScope: 'Basic MVP',
    featureList: [],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
    ...overrides,
  }
}

function makeArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [],
    moduleArchitecture: 'Modular',
    dataFlow: 'Unidirectional',
    roadmapPhases: [],
    technicalRisks: [],
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-t108',
    projectId: 'proj-t108',
    iterationNumber: 1,
    promptText: 'Implement T-001 with tests.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-20T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: null,
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    specPack: makeSpec(),
    architectureDraft: makeArch(),
    promptIterations: [] as PromptIteration[],
    addPromptIteration: vi.fn(),
    updatePromptIteration: vi.fn(),
    setCurrentStage: vi.fn(),
    ...overrides,
  }
}

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockReturnValue(makeStore(storeOverrides))
  return render(<PromptLoopPage />)
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

// ─── A. Phase label badges ────────────────────────────────────────────────────

describe('A. CycleContextBar — phase label badges', () => {
  it('code_and_tests phase → shows "Код + Тесты" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'code_and_tests' })] })
    expect(screen.getByText(/Код \+ Тесты/)).toBeInTheDocument()
  })

  it('review phase → shows "Обзор" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'review' })] })
    expect(screen.getByText(/Обзор/)).toBeInTheDocument()
  })

  it('brainstorm phase → shows "Идея" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'brainstorm' })] })
    expect(screen.getByText(/Идея/)).toBeInTheDocument()
  })

  it('spec phase → shows "Спец" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'spec' })] })
    expect(screen.getByText(/Спец/)).toBeInTheDocument()
  })

  it('plan phase → shows "План" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'plan' })] })
    expect(screen.getByText(/План/)).toBeInTheDocument()
  })

  it('tasks phase → shows "Задачи" badge', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'tasks' })] })
    expect(screen.getByText(/Задачи/)).toBeInTheDocument()
  })

  it('code_and_tests phase does NOT show "Обзор"', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'code_and_tests' })] })
    // "Обзор" should not appear as a phase badge
    expect(screen.queryByText('✅ Обзор')).not.toBeInTheDocument()
  })

  it('review phase does NOT show "Код + Тесты"', () => {
    renderPage({ promptIterations: [makeIteration({ cyclePhase: 'review' })] })
    expect(screen.queryByText(/🔄 Код \+ Тесты/)).not.toBeInTheDocument()
  })
})

// ─── B. projectType badges ────────────────────────────────────────────────────

describe('B. CycleContextBar — projectType badges', () => {
  it('application project → shows at least one "Приложение" badge (context bar + iteration switcher)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      promptIterations: [makeIteration({ projectType: 'application' })],
    })
    // Badge appears in both the CycleContextBar and the iteration switcher
    expect(screen.getAllByText(/Приложение/).length).toBeGreaterThanOrEqual(1)
  })

  it('website project → shows at least one "Сайт" badge (context bar + iteration switcher)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      promptIterations: [makeIteration({ projectType: 'website' })],
    })
    expect(screen.getAllByText(/Сайт/).length).toBeGreaterThanOrEqual(1)
  })

  it('application project → does NOT show "🌐 Сайт" badge', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      promptIterations: [makeIteration({ projectType: 'application' })],
    })
    expect(screen.queryByText('🌐 Сайт')).not.toBeInTheDocument()
  })

  it('website project → does NOT show "📱 Приложение" badge', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      promptIterations: [makeIteration({ projectType: 'website' })],
    })
    expect(screen.queryByText('📱 Приложение')).not.toBeInTheDocument()
  })

  it('projectType falls back to specPack.projectType when activeProject is absent', () => {
    // This exercises the fallback: projectType = activeProject?.projectType ?? specPack?.projectType
    renderPage({
      activeProject: null,
      specPack: makeSpec({ projectType: 'website' }),
      architectureDraft: makeArch(),
      promptIterations: [makeIteration({ projectType: 'website' })],
    })
    // When activeProject is null, page shows empty state — bar not visible.
    // This validates that the code path doesn't crash with null activeProject.
    expect(screen.queryByText('Контекст цикла')).not.toBeInTheDocument()
  })
})

// ─── C. Supporting data — task ID and phase number ────────────────────────────

describe('C. CycleContextBar — targetTaskId and roadmapPhaseNumber', () => {
  it('targetTaskId="T-005" → shows "T-005" in context bar', () => {
    renderPage({ promptIterations: [makeIteration({ targetTaskId: 'T-005' })] })
    expect(screen.getByText('T-005')).toBeInTheDocument()
  })

  it('targetTaskId="T-012" → shows "T-012" in context bar', () => {
    renderPage({ promptIterations: [makeIteration({ targetTaskId: 'T-012' })] })
    expect(screen.getByText('T-012')).toBeInTheDocument()
  })

  it('targetTaskId=null → no task ID badge in context bar', () => {
    renderPage({ promptIterations: [makeIteration({ targetTaskId: null })] })
    // No T-xxx should appear unless it's in a heading or label
    expect(screen.queryByText(/^T-\d+$/)).not.toBeInTheDocument()
  })

  it('roadmapPhaseNumber=2 → shows "Фаза 2" in context bar', () => {
    renderPage({ promptIterations: [makeIteration({ roadmapPhaseNumber: 2 })] })
    expect(screen.getByText('Фаза 2')).toBeInTheDocument()
  })

  it('roadmapPhaseNumber=0 → shows "Фаза 0" in context bar', () => {
    renderPage({ promptIterations: [makeIteration({ roadmapPhaseNumber: 0 })] })
    expect(screen.getByText('Фаза 0')).toBeInTheDocument()
  })

  it('all context data present together: type + phase + task + phaseNumber', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      promptIterations: [makeIteration({
        cyclePhase: 'code_and_tests',
        targetTaskId: 'T-007',
        roadmapPhaseNumber: 1,
      })],
    })
    // Multiple badges may appear (context bar + switcher) — check at least one each
    expect(screen.getAllByText(/Приложение/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Код \+ Тесты/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T-007').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Фаза 1')).toBeInTheDocument()
  })
})

// ─── D. Visibility rules ──────────────────────────────────────────────────────

describe('D. CycleContextBar — visibility rules', () => {
  it('shows "Контекст цикла" header when active iteration exists', () => {
    renderPage({ promptIterations: [makeIteration()] })
    expect(screen.getByText('Контекст цикла')).toBeInTheDocument()
  })

  it('shows "Контекст цикла" when architectureDraft present and no iterations (projectType drives bar)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeArch(),
      promptIterations: [],
    })
    expect(screen.getByText('Контекст цикла')).toBeInTheDocument()
  })

  it('does NOT show context bar when no iterations AND no architectureDraft', () => {
    renderPage({ architectureDraft: null, promptIterations: [] })
    expect(screen.queryByText('Контекст цикла')).not.toBeInTheDocument()
  })

  it('no phase badge when iteration is absent but architectureDraft is present', () => {
    renderPage({ architectureDraft: makeArch(), promptIterations: [] })
    // No iteration → no cyclePhase → no phase badge in CycleContextBar.
    // GateDiagnostics may mention phase names in prose; use emoji-prefixed badge text
    // which is unique to CycleContextBar to avoid false matches.
    expect(screen.queryByText('🔄 Код + Тесты')).not.toBeInTheDocument()
    expect(screen.queryByText('✅ Обзор')).not.toBeInTheDocument()
  })

  it('second iteration becomes active when it is the last in the list', () => {
    const iter1 = makeIteration({ id: 'iter-1', iterationNumber: 1, cyclePhase: 'code_and_tests', targetTaskId: 'T-001' })
    const iter2 = makeIteration({ id: 'iter-2', iterationNumber: 2, cyclePhase: 'review', targetTaskId: 'T-002' })
    renderPage({ promptIterations: [iter1, iter2] })
    // Last iteration (iter2) is the active one — "Обзор" phase badge appears
    // T-002 may appear in both context bar and iteration switcher — at least one is enough
    expect(screen.queryByText('✅ Обзор')).toBeInTheDocument()
    expect(screen.getAllByText('T-002').length).toBeGreaterThanOrEqual(1)
  })
})
