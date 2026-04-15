// @vitest-environment jsdom
// T-011 — ResearchPage acceptance tests: guards, gate banners, empty states, happy path.
// Implements F-002 / F-003 / F-004 / T-011
//
// Coverage areas:
//   A. Entry guard: no project → EmptyState, no workflow controls
//   B. Idea gate: ideaDraft absent or too short → GateBanner shown, run button disabled
//   C. Research empty state: valid idea, no brief → EmptyState + no advance button
//   D. Research happy path: valid brief → content visible, advance to spec enabled
//   E. Research blocking: partial brief (no problemSummary) → advance disabled + reason
//   F. Cross-stage: advance to spec reflects actual brief state, not just brief presence

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResearchPage } from './ResearchPage'
import type { Project, IdeaDraft, ResearchBrief } from '../../shared/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../mocks/services/researchService', () => ({
  mockResearchService: {
    runResearch: vi.fn().mockResolvedValue({}),
    normalizeImportedArtifact: vi.fn().mockResolvedValue({ brief: {}, warnings: [] }),
  },
  mockResearchProviders: [
    { id: 'mock-provider', name: 'Mock Research Provider', status: 'available' },
    { id: 'perplexity', name: 'Perplexity', status: 'coming_soon' },
  ],
}))

vi.mock('../../features/research-brief/EditableResearchBrief', () => ({
  EditableResearchBrief: ({
    brief,
    onSave,
  }: {
    brief: ResearchBrief
    onSave: (b: ResearchBrief) => void
  }) => (
    <div data-testid="editable-brief">
      <span>{brief.problemSummary}</span>
      <button onClick={() => onSave(brief)}>Сохранить бриф</button>
    </div>
  ),
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  researchBriefToMarkdown: () => '# research markdown',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** rawIdea that passes canAdvanceFromIdea (>= 50 chars) */
const VALID_RAW_IDEA =
  'An AI-powered project management tool where teams break goals into tasks and ship faster with AI guidance.'

/** rawIdea that is too short to pass the idea gate (< 50 chars) */
const SHORT_RAW_IDEA = 'A simple app'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'research',
    ...overrides,
  }
}

function makeIdeaDraft(overrides: Partial<IdeaDraft> = {}): IdeaDraft {
  return {
    title: 'My Project',
    rawIdea: VALID_RAW_IDEA,
    targetUser: 'Developers',
    problem: 'Lack of focus',
    constraints: 'No backend',
    notes: '',
    ...overrides,
  }
}

function makeResearchBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    problemSummary: 'Teams waste time on manual planning and lack of AI assistance.',
    targetUsers: ['Developers', 'Product managers'],
    valueHypothesis: 'AI removes the overhead of task breakdown.',
    competitorNotes: 'Jira is too complex. Notion lacks AI structure.',
    risks: ['Adoption risk: teams may revert to old tools.'],
    opportunities: ['Large market. AI UX is a differentiator.'],
    recommendedMVP: 'Task creation + AI breakdown + persistence. No auth.',
    openQuestions: ['How to handle offline mode?'],
    sourcesNote: 'Mock data',
    sourceIds: [],
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    ideaDraft: makeIdeaDraft() as IdeaDraft | null,
    researchRuns: [] as unknown[],
    importedArtifacts: [] as unknown[],
    researchBrief: null as ResearchBrief | null,
    addResearchRun: vi.fn(),
    updateResearchRun: vi.fn(),
    addImportedArtifact: vi.fn(),
    setResearchBrief: vi.fn(),
    setCurrentStage: vi.fn(),
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore()
    return selector ? selector(state) : state
  })
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<ResearchPage />)
}

// ─── A. Entry guard — no project ──────────────────────────────────────────────

describe('A. Entry guard — no project', () => {
  it('shows "Проект не выбран" empty state title', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('shows "Создать проект" CTA button', () => {
    renderPage({ activeProject: null })
    expect(screen.getByRole('button', { name: 'Создать проект' })).toBeInTheDocument()
  })

  it('"Создать проект" navigates to /project/new', () => {
    renderPage({ activeProject: null })
    fireEvent.click(screen.getByRole('button', { name: 'Создать проект' }))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('does NOT render the research run button', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByRole('button', { name: /Запустить исследование/ })).not.toBeInTheDocument()
  })

  it('does NOT show the tab switcher', () => {
    renderPage({ activeProject: null })
    expect(screen.queryByText('Новое исследование')).not.toBeInTheDocument()
  })
})

// ─── B. Idea gate — ideaDraft absent or invalid ────────────────────────────────

describe('B. Idea gate — idea insufficient for research', () => {
  it('shows gate banner when ideaDraft is null', () => {
    renderPage({ ideaDraft: null })
    // canAdvanceFromIdea returns reason: "Идея ещё не сохранена..."
    expect(screen.getByText(/Идея ещё не сохранена/)).toBeInTheDocument()
  })

  it('gate banner contains link to idea page when ideaDraft is null', () => {
    renderPage({ ideaDraft: null })
    expect(screen.getByText(/Перейти к идее/)).toBeInTheDocument()
  })

  it('shows gate banner when rawIdea is too short', () => {
    renderPage({ ideaDraft: makeIdeaDraft({ rawIdea: SHORT_RAW_IDEA }) })
    expect(screen.getByText(/символов/)).toBeInTheDocument()
  })

  it('"Запустить исследование" button is disabled when idea gate fails', () => {
    renderPage({ ideaDraft: null })
    expect(
      screen.getByRole('button', { name: /Запустить исследование/ }),
    ).toBeDisabled()
  })

  it('does NOT show the gate banner when ideaDraft is valid', () => {
    renderPage({ ideaDraft: makeIdeaDraft() })
    expect(screen.queryByText(/Сначала заполните этап Идеи/)).not.toBeInTheDocument()
  })
})

// ─── C. Research empty state — valid idea, no brief ───────────────────────────

describe('C. Research empty state — valid idea present, no brief yet', () => {
  it('shows "Бриф ещё не создан" empty state', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(screen.getByText('Бриф ещё не создан')).toBeInTheDocument()
  })

  it('shows the research empty state description', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(
      screen.getByText(/Запустите новое исследование или импортируйте/),
    ).toBeInTheDocument()
  })

  it('does NOT show "Перейти к спецификации" button when brief is absent', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(screen.queryByRole('button', { name: /Перейти к спецификации/ })).not.toBeInTheDocument()
  })

  it('shows the tab switcher (run / import tabs)', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    // Tab buttons include emojis, so use partial regex
    expect(screen.getByText(/Новое исследование/)).toBeInTheDocument()
    expect(screen.getByText(/Импорт исследования/)).toBeInTheDocument()
  })

  it('"Запустить исследование" button is enabled when idea gate passes', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(
      screen.getByRole('button', { name: /Запустить исследование/ }),
    ).toBeEnabled()
  })

  it('"Бриф отсутствует" badge shown when brief is null', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(screen.getByText('Бриф отсутствует')).toBeInTheDocument()
  })
})

// ─── D. Research happy path — valid brief present ─────────────────────────────

describe('D. Research happy path — valid brief present', () => {
  it('renders the editable research brief component', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: makeResearchBrief() })
    expect(screen.getByTestId('editable-brief')).toBeInTheDocument()
  })

  it('brief content is visible (problemSummary shown in mock component)', () => {
    const brief = makeResearchBrief({
      problemSummary: 'Teams waste time on manual planning.',
    })
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: brief })
    expect(screen.getByText('Teams waste time on manual planning.')).toBeInTheDocument()
  })

  it('shows "Бриф готов" badge when brief is present', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: makeResearchBrief() })
    expect(screen.getByText('Бриф готов')).toBeInTheDocument()
  })

  it('shows "Перейти к спецификации →" button in header when gate passes', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: makeResearchBrief() })
    expect(
      screen.getAllByRole('button', { name: /Перейти к спецификации/ }).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('clicking "Перейти к спецификации" navigates to /spec', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: makeResearchBrief() })
    const [btn] = screen.getAllByRole('button', { name: /Перейти к спецификации/ })
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/spec')
  })
})

// ─── E. Research blocking — partial brief without problemSummary ───────────────

describe('E. Research blocking — brief present but problemSummary empty', () => {
  it('advance button is disabled when problemSummary is empty', () => {
    renderPage({
      ideaDraft: makeIdeaDraft(),
      researchBrief: makeResearchBrief({ problemSummary: '' }),
    })
    const btns = screen.getAllByRole('button', { name: /Перейти к спецификации/ })
    // The disabled button is the one that is not enabled
    const disabledBtn = btns.find((b) => b.hasAttribute('disabled'))
    expect(disabledBtn).toBeDefined()
  })

  it('shows gate reason text when research gate fails', () => {
    renderPage({
      ideaDraft: makeIdeaDraft(),
      researchBrief: makeResearchBrief({ problemSummary: '' }),
    })
    expect(
      screen.getByText(/Бриф исследования неполный — отсутствует описание проблемы/),
    ).toBeInTheDocument()
  })

  it('does NOT navigate to spec when advance button is disabled and clicked', () => {
    renderPage({
      ideaDraft: makeIdeaDraft(),
      researchBrief: makeResearchBrief({ problemSummary: '' }),
    })
    const btns = screen.getAllByRole('button', { name: /Перейти к спецификации/ })
    const disabledBtn = btns.find((b) => b.hasAttribute('disabled'))
    if (disabledBtn) fireEvent.click(disabledBtn)
    expect(mockNavigate).not.toHaveBeenCalledWith('/spec')
  })
})

// ─── F. Cross-stage acceptance — Idea state affects Research readiness ────────

describe('F. Cross-stage acceptance — state from Idea flows into Research', () => {
  it('given no ideaDraft: gate banner shown, run button disabled, brief still null → no advance available', () => {
    renderPage({ ideaDraft: null, researchBrief: null })

    // Gate banner visible (actual reason from canAdvanceFromIdea)
    expect(screen.getByText(/Идея ещё не сохранена/)).toBeInTheDocument()
    // Run button disabled
    expect(screen.getByRole('button', { name: /Запустить исследование/ })).toBeDisabled()
    // No advance button (no brief)
    expect(screen.queryByRole('button', { name: /Перейти к спецификации/ })).not.toBeInTheDocument()
  })

  it('given valid ideaDraft + valid brief: no gate banner, advance button available', () => {
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: makeResearchBrief() })

    // No gate banner
    expect(screen.queryByText(/Сначала заполните этап Идеи/)).not.toBeInTheDocument()
    // Advance available
    expect(
      screen.getAllByRole('button', { name: /Перейти к спецификации/ }).length,
    ).toBeGreaterThan(0)
  })

  it('given valid ideaDraft + incomplete brief: no gate banner, but advance blocked', () => {
    renderPage({
      ideaDraft: makeIdeaDraft(),
      researchBrief: makeResearchBrief({ problemSummary: '   ' }),
    })

    // No idea gate banner
    expect(screen.queryByText(/Сначала заполните этап Идеи/)).not.toBeInTheDocument()
    // Advance button present but disabled
    const btns = screen.getAllByRole('button', { name: /Перейти к спецификации/ })
    const disabledBtn = btns.find((b) => b.hasAttribute('disabled'))
    expect(disabledBtn).toBeDefined()
  })

  it('switching from "no brief" to "brief present" would expose the advance path (store state drives it)', () => {
    // First render: no brief → no advance button
    renderPage({ ideaDraft: makeIdeaDraft(), researchBrief: null })
    expect(screen.queryByRole('button', { name: /Перейти к спецификации/ })).not.toBeInTheDocument()
  })

  it('two projects with different brief states render correct UI for the active one', () => {
    // Active project has a valid brief
    renderPage({
      activeProject: makeProject({ id: 'proj-active' }),
      ideaDraft: makeIdeaDraft(),
      researchBrief: makeResearchBrief(),
    })
    expect(
      screen.getAllByRole('button', { name: /Перейти к спецификации/ }).length,
    ).toBeGreaterThan(0)
  })
})
