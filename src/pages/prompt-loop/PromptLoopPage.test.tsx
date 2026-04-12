// @vitest-environment jsdom
// Component tests for PromptLoopPage — parser outcomes, warnings, empty/validation states.
// Implements T-012B / F-007 / F-012 / F-024.
//
// Strategy:
//   - useProjectStore is mocked so each test injects precise state.
//   - promptService is mocked where parse output needs to be controlled.
//   - "Display" tests pre-populate the store with an iteration that already has
//     parsedSummary set — avoids relying on the async parse handler updating
//     mocked store state.
//   - "Interaction" tests verify the handler calls the right service/store fn.
//
// Coverage areas:
//   1. Empty states: no project, no architecture, no spec, no iterations
//   2. Validation: generate/parse buttons disabled / enabled
//   3. Task ID optional field behavior (conditional description textarea)
//   4. Successful parse display: badges, content sections, no warning box
//   5. Partial parse: no tests detected, no nextStep
//   6. Parser warnings: amber box, ⚠ prefix, exact texts
//   7. Derived warning: targetTaskId not found in implementedTaskIds
//   8. History integration: iteration switcher, parsed badge, task badges

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptLoopPage } from './PromptLoopPage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'
import type { PromptIteration, ParsedClaudeResponse } from '../../entities/prompt-iteration/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockParseClaudeResponse = vi.fn()
const mockGenerateFirstPrompt = vi.fn()
const mockGenerateNextPrompt = vi.fn()
vi.mock('../../mocks/services/promptService', () => ({
  mockPromptService: {
    parseClaudeResponse: (...args: unknown[]) => mockParseClaudeResponse(...args),
    generateFirstPrompt: (...args: unknown[]) => mockGenerateFirstPrompt(...args),
    generateNextPrompt: (...args: unknown[]) => mockGenerateNextPrompt(...args),
  },
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

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'iterative_loop',
    ...overrides,
  }
}

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A test product',
    MVPScope: 'Basic features',
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

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented T-005. Added stage gate.',
    plan: 'Write tests first, then implement.',
    changedFiles: ['src/lib/stageGates.ts', 'src/lib/stageGates.test.ts'],
    implementationSummary: 'Added canAdvanceFromIdea function.',
    nextStep: 'Proceed to T-006.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: ['T-005'],
    nextTaskId: 'T-006',
    inferredNextPhase: 'code_and_tests',
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-1',
    projectId: 'proj-1',
    iterationNumber: 1,
    promptText: 'Please implement T-005 with tests first.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-01-01',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: null,
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

// Default store state — active project with all prerequisites met, no iterations.
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Suppress clipboard errors from jsdom
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  })
})

// ─── 1. Empty states ──────────────────────────────────────────────────────────

describe('empty state — no project selected', () => {
  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ activeProject: null }))
  })

  it('shows "Проект не выбран" title', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('shows description about creating a project first', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/создайте проект/i)).toBeInTheDocument()
  })

  it('shows CTA button "Создать проект"', () => {
    render(<PromptLoopPage />)
    expect(screen.getByRole('button', { name: /создать проект/i })).toBeInTheDocument()
  })

  it('CTA navigates to /project/new', () => {
    render(<PromptLoopPage />)
    fireEvent.click(screen.getByRole('button', { name: /создать проект/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('does not render the prompt generation form', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/сгенерировать первый промпт/i)).not.toBeInTheDocument()
  })
})

describe('empty state — no architecture (project set)', () => {
  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(
      makeStore({ specPack: null, architectureDraft: null })
    )
  })

  it('shows amber "Требуется архитектура" warning', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Требуется архитектура')).toBeInTheDocument()
  })

  it('shows a link to navigate to architecture page', () => {
    render(<PromptLoopPage />)
    // Amber card contains "Перейти к архитектуре →"; EmptyState has "Перейти к архитектуре"
    expect(screen.getAllByText(/перейти к архитектуре/i).length).toBeGreaterThanOrEqual(1)
  })

  it('clicking architecture link navigates to /architecture', () => {
    render(<PromptLoopPage />)
    // Click the first link (the one in the amber card)
    fireEvent.click(screen.getAllByText(/перейти к архитектуре/i)[0])
    expect(mockNavigate).toHaveBeenCalledWith('/architecture')
  })

  it('shows bottom EmptyState "Сначала завершите архитектуру"', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Сначала завершите архитектуру')).toBeInTheDocument()
  })

  it('bottom EmptyState CTA navigates to /architecture', () => {
    render(<PromptLoopPage />)
    // There may be two "архитектур" links; EmptyState button has "Перейти к архитектуре" label
    const buttons = screen.getAllByRole('button', { name: /перейти к архитектуре/i })
    fireEvent.click(buttons[buttons.length - 1])
    expect(mockNavigate).toHaveBeenCalledWith('/architecture')
  })
})

describe('empty state — no spec (architecture present)', () => {
  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ specPack: null }))
  })

  it('shows amber "Требуется спецификация" warning', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Требуется спецификация')).toBeInTheDocument()
  })

  it('shows a link to navigate to spec page', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/перейти к спецификации/i)).toBeInTheDocument()
  })

  it('clicking spec link navigates to /spec', () => {
    render(<PromptLoopPage />)
    fireEvent.click(screen.getByText(/перейти к спецификации/i))
    expect(mockNavigate).toHaveBeenCalledWith('/spec')
  })

  it('does NOT show "Требуется архитектура" (arch is present)', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText('Требуется архитектура')).not.toBeInTheDocument()
  })
})

describe('empty state — first prompt form (no iterations)', () => {
  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore())
  })

  it('shows "Сгенерировать первый промпт для Claude Code" heading', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/сгенерировать первый промпт для claude code/i)).toBeInTheDocument()
  })

  it('shows "Не начато" badge in page header', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Не начато')).toBeInTheDocument()
  })

  it('shows task ID field label', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/id стартовой задачи/i)).toBeInTheDocument()
  })

  it('shows hint text about task ID being optional', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/если указан, промпт явно сошлётся/i)).toBeInTheDocument()
  })

  it('task description textarea is hidden when task ID field is empty', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/описание задачи/i)).not.toBeInTheDocument()
  })

  it('task description textarea appears after typing a task ID', () => {
    render(<PromptLoopPage />)
    const taskIdInput = screen.getByPlaceholderText('T-001')
    fireEvent.change(taskIdInput, { target: { value: 'T-007' } })
    expect(screen.getByText(/описание задачи/i)).toBeInTheDocument()
  })
})

// ─── 2. Validation ────────────────────────────────────────────────────────────

describe('validation — generate first prompt button', () => {
  it('is disabled when specPack is missing', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ specPack: null }))
    render(<PromptLoopPage />)
    const btn = screen.getByRole('button', { name: /сгенерировать первый промпт/i })
    expect(btn).toBeDisabled()
  })

  it('is disabled when architectureDraft is missing', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ architectureDraft: null }))
    render(<PromptLoopPage />)
    const btn = screen.getByRole('button', { name: /сгенерировать первый промпт/i })
    expect(btn).toBeDisabled()
  })

  it('is disabled when both specPack and architectureDraft are missing', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ specPack: null, architectureDraft: null }))
    render(<PromptLoopPage />)
    // Form is still rendered (promptIterations is empty), but button is disabled
    const btn = screen.getByRole('button', { name: /сгенерировать первый промпт/i })
    expect(btn).toBeDisabled()
  })

  it('is enabled when both specPack and architectureDraft are present', () => {
    mockUseProjectStore.mockReturnValue(makeStore())
    render(<PromptLoopPage />)
    const btn = screen.getByRole('button', { name: /сгенерировать первый промпт/i })
    expect(btn).not.toBeDisabled()
  })

  it('calls generateFirstPrompt when clicked', async () => {
    mockUseProjectStore.mockReturnValue(makeStore())
    const fakeIteration = makeIteration({ id: 'iter-new' })
    mockGenerateFirstPrompt.mockResolvedValue(fakeIteration)
    render(<PromptLoopPage />)
    fireEvent.click(screen.getByRole('button', { name: /сгенерировать первый промпт/i }))
    await waitFor(() => expect(mockGenerateFirstPrompt).toHaveBeenCalledOnce())
  })
})

describe('validation — parse response button', () => {
  const iteration = makeIteration({ status: 'draft' })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
  })

  it('is disabled when response textarea is empty', () => {
    render(<PromptLoopPage />)
    const btn = screen.getByRole('button', { name: /распарсить ответ/i })
    expect(btn).toBeDisabled()
  })

  it('becomes enabled after text is entered', () => {
    render(<PromptLoopPage />)
    const textarea = screen.getByPlaceholderText(/вставьте полный ответ claude/i)
    fireEvent.change(textarea, { target: { value: '1. Brief analysis\nSome content.' } })
    const btn = screen.getByRole('button', { name: /распарсить ответ/i })
    expect(btn).not.toBeDisabled()
  })

  it('calls parseClaudeResponse with the pasted text on click', async () => {
    mockParseClaudeResponse.mockReturnValue(makeParsed())
    render(<PromptLoopPage />)
    const textarea = screen.getByPlaceholderText(/вставьте полный ответ claude/i)
    fireEvent.change(textarea, { target: { value: 'Some response text.' } })
    fireEvent.click(screen.getByRole('button', { name: /распарсить ответ/i }))
    await waitFor(() =>
      expect(mockParseClaudeResponse).toHaveBeenCalledWith('Some response text.')
    )
  })

  it('calls updatePromptIteration after parse', async () => {
    const parsed = makeParsed()
    mockParseClaudeResponse.mockReturnValue(parsed)
    const updateFn = vi.fn()
    mockUseProjectStore.mockReturnValue(
      makeStore({ promptIterations: [iteration], updatePromptIteration: updateFn })
    )
    render(<PromptLoopPage />)
    fireEvent.change(screen.getByPlaceholderText(/вставьте полный ответ claude/i), {
      target: { value: 'Some response text.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /распарсить ответ/i }))
    await waitFor(() =>
      expect(updateFn).toHaveBeenCalledWith(
        iteration.id,
        expect.objectContaining({ status: 'parsed', parsedSummary: parsed })
      )
    )
  })
})

// ─── 3. Successful parse display ─────────────────────────────────────────────

describe('successful parse — full result display', () => {
  const parsed = makeParsed({
    hasTests: true,
    warnings: [],
    nextStep: 'Proceed to T-006.',
    analysis: 'Implemented T-005. Gate added.',
    implementationSummary: 'canAdvanceFromIdea exported.',
    implementedTaskIds: ['T-005'],
    nextTaskId: 'T-006',
    inferredNextPhase: 'code_and_tests',
  })
  const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
  })

  it('shows "Распарсено" status badge', () => {
    render(<PromptLoopPage />)
    // There may be two Распарсено badges (header + parsed result card); at least one must exist
    expect(screen.getAllByText('Распарсено').length).toBeGreaterThan(0)
  })

  it('shows "✓ Тесты найдены" badge when hasTests is true', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/тесты найдены/i)).toBeInTheDocument()
  })

  it('shows "Краткий анализ" section with content', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Краткий анализ')).toBeInTheDocument()
    expect(screen.getByText(/implemented t-005/i)).toBeInTheDocument()
  })

  it('shows "Резюме реализации" section', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Резюме реализации')).toBeInTheDocument()
  })

  it('shows "Рекомендуемый следующий шаг" in green box', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/рекомендуемый следующий шаг/i)).toBeInTheDocument()
    expect(screen.getByText('Proceed to T-006.')).toBeInTheDocument()
  })

  it('shows nextTaskId badge', () => {
    render(<PromptLoopPage />)
    // T-006 badge appears in the next-step area
    expect(screen.getByText('T-006')).toBeInTheDocument()
  })

  it('does NOT show warning box when warnings are empty', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/предупреждения парсера/i)).not.toBeInTheDocument()
  })

  it('shows "Готово к итерации 2" in generate-next card', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/готово к итерации 2/i)).toBeInTheDocument()
  })

  it('does NOT show "Тесты отсутствуют" message when hasTests is true', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/тесты отсутствуют/i)).not.toBeInTheDocument()
  })
})

// ─── 4. Partial parse — no tests detected ────────────────────────────────────

describe('partial parse — no tests detected', () => {
  const parsed = makeParsed({ hasTests: false, warnings: [] })
  const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
  })

  it('shows "⚠️ Нет тестов" badge', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/нет тестов/i)).toBeInTheDocument()
  })

  it('does NOT show "✓ Тесты найдены"', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/тесты найдены/i)).not.toBeInTheDocument()
  })

  it('shows "Тесты отсутствуют" warning in generate-next card', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/тесты отсутствуют/i)).toBeInTheDocument()
  })

  it('"Тесты отсутствуют" message contains actionable guidance', () => {
    render(<PromptLoopPage />)
    // The message should say the NEXT prompt will request tests
    const msg = screen.getByText(/тесты отсутствуют/i)
    expect(msg.textContent).toMatch(/следующий промпт/i)
  })
})

describe('partial parse — nextStep missing', () => {
  const parsed = makeParsed({
    nextStep: '',
    warnings: ['Could not parse "Recommended next step" section.'],
  })
  const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
  })

  it('shows grey "Следующий шаг не найден" fallback', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/следующий шаг не найден/i)).toBeInTheDocument()
  })

  it('fallback text tells user to ask Claude for "Следующий шаг" section', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/claude завершил ответ разделом/i)).toBeInTheDocument()
  })

  it('does NOT show the green next-step box', () => {
    render(<PromptLoopPage />)
    expect(screen.queryByText(/рекомендуемый следующий шаг/i)).not.toBeInTheDocument()
  })

  it('shows warning from parsedSummary.warnings[]', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/could not parse.*recommended next step/i)).toBeInTheDocument()
  })
})

// ─── 5. Parser warnings display ──────────────────────────────────────────────

describe('parser warnings — amber warning box', () => {
  const parsed = makeParsed({
    warnings: [
      'Could not parse "Brief analysis" section.',
      'No test files detected in this response.',
    ],
  })
  const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
  })

  it('shows "Предупреждения парсера" heading', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/предупреждения парсера/i)).toBeInTheDocument()
  })

  it('shows each warning text', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/could not parse.*brief analysis/i)).toBeInTheDocument()
    expect(screen.getByText(/no test files detected/i)).toBeInTheDocument()
  })

  it('each warning is prefixed with ⚠', () => {
    render(<PromptLoopPage />)
    const warnings = screen.getAllByText(/^⚠/)
    expect(warnings.length).toBeGreaterThanOrEqual(2)
  })
})

describe('parser warnings — no warnings means no warning box', () => {
  it('does not render the warnings box when warnings array is empty', () => {
    const parsed = makeParsed({ warnings: [] })
    const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.queryByText(/предупреждения парсера/i)).not.toBeInTheDocument()
  })
})

// ─── 6. Derived warning — target task not mentioned ──────────────────────────

describe('derived warning — targetTaskId not in implementedTaskIds', () => {
  it('shows warning when targetTaskId is set but not in implementedTaskIds', () => {
    const parsed = makeParsed({ implementedTaskIds: ['T-001'], warnings: [] })
    const iteration = makeIteration({
      status: 'parsed',
      targetTaskId: 'T-007',
      parsedSummary: parsed,
    })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.getByText(/T-007 не упомянута/i)).toBeInTheDocument()
  })

  it('does NOT show derived warning when targetTaskId IS in implementedTaskIds', () => {
    const parsed = makeParsed({ implementedTaskIds: ['T-007'], warnings: [] })
    const iteration = makeIteration({
      status: 'parsed',
      targetTaskId: 'T-007',
      parsedSummary: parsed,
    })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    // No "не упомянута" warning
    expect(screen.queryByText(/T-007 не упомянута/i)).not.toBeInTheDocument()
    // No warning box at all since warnings[] is also empty
    expect(screen.queryByText(/предупреждения парсера/i)).not.toBeInTheDocument()
  })

  it('does NOT show derived warning when targetTaskId is null (untracked iteration)', () => {
    const parsed = makeParsed({ implementedTaskIds: [], warnings: [] })
    const iteration = makeIteration({
      status: 'parsed',
      targetTaskId: null,
      parsedSummary: parsed,
    })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.queryByText(/предупреждения парсера/i)).not.toBeInTheDocument()
  })

  it('derived warning guidance tells user to verify Claude worked on the right task', () => {
    const parsed = makeParsed({ implementedTaskIds: [], warnings: [] })
    const iteration = makeIteration({
      status: 'parsed',
      targetTaskId: 'T-007',
      parsedSummary: parsed,
    })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.getByText(/проверьте, что claude работал над нужной задачей/i)).toBeInTheDocument()
  })
})

// ─── 7. History / iteration switcher ─────────────────────────────────────────

describe('iteration switcher — multiple iterations', () => {
  const iter1 = makeIteration({
    id: 'iter-1',
    iterationNumber: 1,
    status: 'parsed',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-005',
    parsedSummary: makeParsed({ analysis: 'First iteration analysis text.' }),
  })
  const iter2 = makeIteration({
    id: 'iter-2',
    iterationNumber: 2,
    status: 'draft',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-006',
    parsedSummary: null,
  })

  beforeEach(() => {
    mockUseProjectStore.mockReturnValue(
      makeStore({ promptIterations: [iter1, iter2] })
    )
  })

  it('shows "Все итерации" switcher card when there are multiple iterations', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText('Все итерации')).toBeInTheDocument()
  })

  it('renders a row for each iteration', () => {
    render(<PromptLoopPage />)
    expect(screen.getByText(/#1/)).toBeInTheDocument()
    expect(screen.getByText(/#2/)).toBeInTheDocument()
  })

  it('shows ✓ on parsed iterations', () => {
    render(<PromptLoopPage />)
    // iter-1 is parsed, iter-2 is draft
    expect(screen.getByText(/#1 ✓/)).toBeInTheDocument()
    expect(screen.queryByText(/#2 ✓/)).not.toBeInTheDocument()
  })

  it('shows task ID badge on iterations with targetTaskId', () => {
    render(<PromptLoopPage />)
    // T-005 appears in the switcher row; T-006 may appear in both context bar and switcher
    expect(screen.getAllByText('T-005').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T-006').length).toBeGreaterThanOrEqual(1)
  })

  it('does NOT show switcher when there is only one iteration', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iter1] }))
    render(<PromptLoopPage />)
    expect(screen.queryByText('Все итерации')).not.toBeInTheDocument()
  })
})

describe('history button in page header', () => {
  it('shows "История" button after a parsed iteration exists', () => {
    const parsed = makeParsed()
    const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.getByRole('button', { name: /история/i })).toBeInTheDocument()
  })

  it('does NOT show "История" button before any iterations are parsed', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [] }))
    render(<PromptLoopPage />)
    expect(screen.queryByRole('button', { name: /история/i })).not.toBeInTheDocument()
  })

  it('"История" button navigates to /history', () => {
    const parsed = makeParsed()
    const iteration = makeIteration({ status: 'parsed', parsedSummary: parsed })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    fireEvent.click(screen.getByRole('button', { name: /история/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/history')
  })
})

// ─── 8. Cycle context bar ─────────────────────────────────────────────────────

describe('cycle context bar', () => {
  it('shows cycle context bar when an active iteration exists', () => {
    const iteration = makeIteration({ cyclePhase: 'code_and_tests', targetTaskId: 'T-005' })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    expect(screen.getByText('Контекст цикла')).toBeInTheDocument()
  })

  it('shows task ID in context bar', () => {
    const iteration = makeIteration({ cyclePhase: 'code_and_tests', targetTaskId: 'T-005' })
    mockUseProjectStore.mockReturnValue(makeStore({ promptIterations: [iteration] }))
    render(<PromptLoopPage />)
    // T-005 badge should appear in context bar area
    expect(screen.getByText('T-005')).toBeInTheDocument()
  })

  it('does not show cycle context bar when there are no iterations and no architectureDraft', () => {
    mockUseProjectStore.mockReturnValue(makeStore({ architectureDraft: null, promptIterations: [] }))
    render(<PromptLoopPage />)
    expect(screen.queryByText('Контекст цикла')).not.toBeInTheDocument()
  })
})
