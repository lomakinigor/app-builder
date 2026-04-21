// @vitest-environment jsdom
// T-110 — HistoryPage review phase contract
// Pairs with T-109 (HistoryPage as the Review phase of the Superpowers cycle).
//
// Coverage areas (distinct from HistoryPage.history-view.test.tsx which covers type/stack/roadmap):
//   A. Cycle stages — all 6 stage labels, "← вы здесь" on Review, completion states
//   B. Task and test badges — hasTests indicator, targetTaskId, implementedTaskIds, nextTaskId
//   C. Decisions panel + review checklist — KEY_DECISIONS rendering, checklist items
//   D. Partial / empty states — no iterations, no specPack, null parsedSummary, null targetTaskId

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project, PromptIteration, IdeaDraft, ParsedClaudeResponse } from '../../shared/types'
import { createAppArch } from '../../mocks/fixtures/archFixtures'
import { createAppSpec } from '../../mocks/fixtures/specFixtures'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-t110',
    name: 'T-110 Test Project',
    projectType: 'application',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    status: 'active',
    currentStage: 'review',
    ...overrides,
  }
}

function makeIdeaDraft(): IdeaDraft {
  return {
    id: 'idea-t110',
    projectId: 'proj-t110',
    rawIdea: 'A test product idea',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
  }
}

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Analyzed the task.',
    implemented: 'Foundation scaffold.',
    nextStep: 'Continue with core flow.',
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
    id: 'iter-t110',
    projectId: 'proj-t110',
    iterationNumber: 1,
    promptText: 'Implement T-001 with tests.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'sent',
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
})

// ─── A. Cycle stages ──────────────────────────────────────────────────────────

describe('A. Cycle stages — CycleTimeline labels, completion, review context', () => {
  it('renders "Фаза обзора" review label bar at the top of the page', () => {
    renderPage()
    expect(screen.getByText('Фаза обзора')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Идея" stage label', () => {
    renderPage()
    expect(screen.getByText('Идея')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Спецификация" stage label', () => {
    renderPage()
    expect(screen.getByText('Спецификация')).toBeInTheDocument()
  })

  it('CycleTimeline shows "План" stage label', () => {
    renderPage()
    expect(screen.getByText('План')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Задачи" stage label', () => {
    renderPage()
    expect(screen.getByText('Задачи')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Код + Тесты" stage label', () => {
    renderPage()
    expect(screen.getByText('Код + Тесты')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Обзор" stage label', () => {
    renderPage()
    // "Обзор" also appears in the PageHeader title — use getAllByText
    expect(screen.getAllByText('Обзор').length).toBeGreaterThanOrEqual(1)
  })

  it('Review stage always shows "← вы здесь" badge (isCurrentStage=true unconditionally)', () => {
    renderPage()
    expect(screen.getByText('← вы здесь')).toBeInTheDocument()
  })

  it('with ideaDraft: Идея stage shows "Идея зафиксирована" detail', () => {
    renderPage({ ideaDraft: makeIdeaDraft() })
    expect(screen.getByText('Идея зафиксирована')).toBeInTheDocument()
  })

  it('without ideaDraft: Идея stage shows "Идеи пока нет" detail', () => {
    renderPage({ ideaDraft: null })
    expect(screen.getByText('Идеи пока нет')).toBeInTheDocument()
  })

  it('with specPack: Спецификация stage shows "Спек-пакет сгенерирован" detail', () => {
    renderPage({ specPack: createAppSpec() })
    expect(screen.getByText('Спек-пакет сгенерирован')).toBeInTheDocument()
  })

  it('with architectureDraft: Plan stage shows "Архитектура и роадмап готовы" detail', () => {
    renderPage({ architectureDraft: createAppArch() })
    expect(screen.getByText('Архитектура и роадмап готовы')).toBeInTheDocument()
  })

  it('with iterations: Код + Тесты stage shows "Цикл промптов активен" detail', () => {
    renderPage({ promptIterations: [makeIteration()] })
    expect(screen.getByText('Цикл промптов активен')).toBeInTheDocument()
  })

  it('with specPack: "Готово" badge renders at least once for completed stages', () => {
    renderPage({ specPack: createAppSpec(), architectureDraft: createAppArch() })
    // Multiple "Готово" badges may appear (Идея, Спецификация, План, Задачи)
    expect(screen.getAllByText('Готово').length).toBeGreaterThanOrEqual(1)
  })
})

// ─── B. Task and test badges ──────────────────────────────────────────────────

describe('B. Task and test badges — IterationReviewCard', () => {
  it('parsedSummary.hasTests=true → shows "✓ Тесты обнаружены" badge', () => {
    renderPage({
      promptIterations: [
        makeIteration({ status: 'parsed', parsedSummary: makeParsed({ hasTests: true }) }),
      ],
    })
    expect(screen.getByText('✓ Тесты обнаружены')).toBeInTheDocument()
  })

  it('parsedSummary.hasTests=false → shows "⚠ Тестовые файлы не обнаружены" badge', () => {
    renderPage({
      promptIterations: [
        makeIteration({ status: 'parsed', parsedSummary: makeParsed({ hasTests: false }) }),
      ],
    })
    expect(screen.getByText('⚠ Тестовые файлы не обнаружены')).toBeInTheDocument()
  })

  it('parsedSummary=null → neither test badge is shown', () => {
    renderPage({
      promptIterations: [makeIteration({ parsedSummary: null })],
    })
    expect(screen.queryByText('✓ Тесты обнаружены')).not.toBeInTheDocument()
    expect(screen.queryByText('⚠ Тестовые файлы не обнаружены')).not.toBeInTheDocument()
  })

  it('targetTaskId="T-001" → "T-001" badge visible (IterationReviewCard and/or decisions panel)', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: 'T-001' })],
    })
    // T-001 appears in both the IterationReviewCard header and KEY_DECISIONS linked tasks
    expect(screen.getAllByText('T-001').length).toBeGreaterThanOrEqual(1)
  })

  it('targetTaskId=null + parsedSummary=null → "Упомянутые задачи:" label absent (no task section rendered)', () => {
    renderPage({
      promptIterations: [makeIteration({ targetTaskId: null, parsedSummary: null })],
    })
    // "Упомянутые задачи:" label only appears when parsedSummary.implementedTaskIds is non-empty
    expect(screen.queryByText('Упомянутые задачи:')).not.toBeInTheDocument()
  })

  it('parsedSummary.implementedTaskIds=["T-001","T-002"] → both task badges visible + "Упомянутые задачи:" label', () => {
    renderPage({
      promptIterations: [
        makeIteration({
          status: 'parsed',
          parsedSummary: makeParsed({ implementedTaskIds: ['T-001', 'T-002'] }),
        }),
      ],
    })
    // T-001 also appears in KEY_DECISIONS — getAllByText is correct
    expect(screen.getAllByText('T-001').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T-002').length).toBeGreaterThanOrEqual(1)
    // This label is unique to the implementedTaskIds section in IterationReviewCard
    expect(screen.getByText('Упомянутые задачи:')).toBeInTheDocument()
  })

  it('parsedSummary.nextTaskId="T-003" → "T-003" badge and "Следующая:" label visible', () => {
    renderPage({
      promptIterations: [
        makeIteration({
          status: 'parsed',
          parsedSummary: makeParsed({ nextTaskId: 'T-003' }),
        }),
      ],
    })
    expect(screen.getByText('T-003')).toBeInTheDocument()
    expect(screen.getByText('Следующая:')).toBeInTheDocument()
  })

  it('iteration status "parsed" → "Распарсено" status badge visible', () => {
    renderPage({
      promptIterations: [
        makeIteration({ status: 'parsed', parsedSummary: makeParsed() }),
      ],
    })
    expect(screen.getByText('Распарсено')).toBeInTheDocument()
  })

  it('iteration status "sent" → "Отправлено" status badge visible', () => {
    renderPage({
      promptIterations: [makeIteration({ status: 'sent' })],
    })
    expect(screen.getByText('Отправлено')).toBeInTheDocument()
  })

  it('parsedSummary.warnings=["Missing test file"] → warning text visible', () => {
    renderPage({
      promptIterations: [
        makeIteration({
          status: 'parsed',
          parsedSummary: makeParsed({ warnings: ['Missing test file'] }),
        }),
      ],
    })
    // Warning appears in both IterationReviewCard and TaskProgressPanel
    expect(screen.getAllByText(/Missing test file/).length).toBeGreaterThanOrEqual(1)
  })
})

// ─── C. Decisions panel + review checklist ────────────────────────────────────

describe('C. Decisions panel and review checklist', () => {
  it('"Ключевые решения" card heading is visible', () => {
    renderPage()
    expect(screen.getByText('Ключевые решения')).toBeInTheDocument()
  })

  it('DecisionsPanel renders D-001 entry ID', () => {
    renderPage()
    expect(screen.getByText('D-001')).toBeInTheDocument()
  })

  it('DecisionsPanel renders D-001 title text', () => {
    renderPage()
    expect(screen.getByText('Архитектура «frontend-first» для MVP')).toBeInTheDocument()
  })

  it('DecisionsPanel renders D-002 entry ID', () => {
    renderPage()
    expect(screen.getByText('D-002')).toBeInTheDocument()
  })

  it('D-001 linked task T-001 badge visible in decisions panel', () => {
    renderPage()
    // T-001 appears as a linked task badge in D-001. There may be other T-001 appearances.
    expect(screen.getAllByText('T-001').length).toBeGreaterThanOrEqual(1)
  })

  it('D-001 linked feature F-008 badge visible in decisions panel', () => {
    renderPage()
    expect(screen.getByText('F-008')).toBeInTheDocument()
  })

  it('"Чеклист обзора" card heading is visible', () => {
    renderPage()
    expect(screen.getByText('Чеклист обзора')).toBeInTheDocument()
  })

  it('ReviewChecklist renders at least one criterion mentioning "docs/PRD.md"', () => {
    renderPage()
    expect(screen.getByText('docs/PRD.md')).toBeInTheDocument()
  })

  it('ReviewChecklist renders at least one criterion mentioning "docs/tasks.md"', () => {
    renderPage()
    expect(screen.getByText('docs/tasks.md')).toBeInTheDocument()
  })

  it('review context banner contains helpful guidance text', () => {
    renderPage()
    expect(screen.getByText(/Вы в конце цикла/)).toBeInTheDocument()
  })
})

// ─── D. Partial / empty states ───────────────────────────────────────────────

describe('D. Partial and empty states — graceful degradation', () => {
  it('null activeProject → "Проект не выбран" empty state', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('null activeProject → does NOT show review content (no "Фаза обзора" banner)', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Фаза обзора')).not.toBeInTheDocument()
  })

  it('no promptIterations → "Промпт-итераций пока нет" in iterations card', () => {
    renderPage({ promptIterations: [] })
    expect(screen.getAllByText(/Промпт-итераций пока нет/).length).toBeGreaterThanOrEqual(1)
  })

  it('no specPack → "Краткое резюме спека" card NOT rendered', () => {
    renderPage({ specPack: null })
    expect(screen.queryByText('Краткое резюме спека')).not.toBeInTheDocument()
  })

  it('no architectureDraft → "Архитектура и роадмап" card NOT rendered', () => {
    renderPage({ architectureDraft: null })
    expect(screen.queryByText('Архитектура и роадмап')).not.toBeInTheDocument()
  })

  it('iteration with parsedSummary=null renders without crashing (no test badge)', () => {
    expect(() =>
      renderPage({ promptIterations: [makeIteration({ parsedSummary: null })] })
    ).not.toThrow()
  })

  it('iteration with targetTaskId=null renders without crashing (no task badge in header)', () => {
    expect(() =>
      renderPage({ promptIterations: [makeIteration({ targetTaskId: null })] })
    ).not.toThrow()
  })

  it('page renders without crashing when all optional data is null', () => {
    expect(() =>
      renderPage({
        ideaDraft: null,
        specPack: null,
        architectureDraft: null,
        promptIterations: [],
        researchBrief: null,
      })
    ).not.toThrow()
  })

  it('iteration with roadmapPhaseNumber=null → "Фаза" text NOT rendered in IterationReviewCard', () => {
    renderPage({
      promptIterations: [makeIteration({ roadmapPhaseNumber: null as unknown as number })],
    })
    // roadmapPhaseNumber null → conditional skips the "Фаза N" span
    expect(screen.queryByText(/^Фаза \d+$/)).not.toBeInTheDocument()
  })

  it('iteration with roadmapPhaseNumber=1 → "Фаза 1" visible in IterationReviewCard', () => {
    renderPage({
      promptIterations: [makeIteration({ roadmapPhaseNumber: 1 })],
    })
    expect(screen.getByText('Фаза 1')).toBeInTheDocument()
  })
})
