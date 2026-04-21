// @vitest-environment jsdom
// T-110 — HistoryPage history view acceptance tests
// Implements F-024 / T-110
//
// Verifies that HistoryPage (the Review screen) surfaces type-aware content
// using the same canonical vocabulary pinned in T-104, T-106, and T-108:
//   - type badges and wording (application vs website)
//   - canonical stack names (React / Next.js, TypeScript cross-type)
//   - roadmap phase titles from architectureDraft
//   - feature names from specPack (not just IDs)
//   - prompt text snippets with no cross-type contamination
//
// Scenarios:
//   A. Type & stack summary
//   B. Roadmap & stage history
//   C. Prompt history integration
//   D. Cross-type comparison
//   E. Edge / empty states

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project, SpecPack, PromptIteration, IdeaDraft } from '../../shared/types'
import { createAppArch, createWebArch } from '../../mocks/fixtures/archFixtures'
import { createAppSpec, createWebSpec } from '../../mocks/fixtures/specFixtures'

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
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    status: 'active',
    currentStage: 'review',
    ...overrides,
  }
}

function makeIdeaDraft(): IdeaDraft {
  return {
    id: 'idea-1',
    projectId: 'proj-1',
    rawIdea: 'A task manager for developers',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

/**
 * Spec factories — delegate to shared canonical fixtures.
 * Accept the same overrides API used in gate-alignment tests (group E).
 */
const makeApplicationSpec = (overrides: Partial<SpecPack> = {}) => createAppSpec(overrides)
const makeWebsiteSpec = (overrides: Partial<SpecPack> = {}) => createWebSpec(overrides)

/**
 * Arch instances from shared canonical fixtures (archFixtures).
 * Fresh objects per module load; tests must not mutate these.
 */
const APP_ARCH = createAppArch()
const WEB_ARCH = createWebArch()

/**
 * Builds a minimal PromptIteration with an explicit promptText.
 * All fields that IterationReviewCard reads are populated.
 */
function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-1',
    projectId: 'proj-1',
    iterationNumber: 1,
    promptText: '## Task\nImplement foundation.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'sent',
    createdAt: '2026-01-01T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-001',
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

/**
 * Simulates a generateFirstPrompt output for application type.
 * Contains "## Stack", "## MVP scope", and all canonical application stack names.
 * Does NOT contain "Next.js" or "SEO".
 */
function makeAppFirstPromptText(): string {
  return [
    'You are building a web application.',
    '',
    '## Stack',
    'React — UI layer',
    'TypeScript — Type safety',
    'Vite — Build tool',
    'Zustand — State management',
    'React Router — Client routing',
    'Tailwind CSS — Styling',
    '',
    '## MVP scope',
    'Phase 0: Foundation',
    'Goals: App shell, Routing, Layout and navigation',
    '',
    '## Task',
    'T-001: Set up project scaffold.',
  ].join('\n')
}

/**
 * Simulates a generateNextPrompt output for application type.
 * Contains "continuing the implementation", SPA/Zustand guidance.
 * Does NOT contain "Next.js" or "SEO".
 */
function makeAppNextPromptText(): string {
  return [
    'You are continuing the implementation of a web application.',
    '',
    '## Type guidance',
    'SPA architecture with Zustand store and React Router for client-side navigation.',
    '',
    '## What was implemented',
    'Foundation scaffold: App shell, routing, layout.',
    '',
    '## Task',
    'T-002: Implement Core flow — onboarding screen.',
  ].join('\n')
}

/**
 * Simulates a generateFirstPrompt output for website type.
 * Contains "## Stack", "## MVP scope", and Next.js/SSG vocabulary.
 * Does NOT contain "React Router" or "Zustand".
 */
function makeWebFirstPromptText(): string {
  return [
    'You are building a website.',
    '',
    '## Stack',
    'Next.js — Framework',
    'TypeScript — Type safety',
    'Tailwind CSS — Styling',
    'MDX — Content authoring',
    'Vercel — Hosting / deployment',
    '',
    '## MVP scope',
    'Phase 0: Foundation',
    'Goals: Next.js scaffold, Tailwind setup, Dark mode',
    '',
    '## Type guidance',
    'SSG/SSR architecture with Next.js for SEO and performance.',
    '',
    '## Task',
    'T-001: Set up Next.js scaffold.',
  ].join('\n')
}

/**
 * Simulates a generateNextPrompt output for website type.
 * Contains "continuing the implementation" + SSG/SEO vocabulary.
 * Does NOT contain "React Router" or "Zustand".
 */
function makeWebNextPromptText(): string {
  return [
    'You are continuing the implementation of a website.',
    '',
    '## Type guidance',
    'SSG/SSR with Next.js. Focus on SEO-friendly markup, semantic HTML, page-based architecture.',
    '',
    '## What was implemented',
    'Foundation: Next.js scaffold, Tailwind setup.',
    '',
    '## Task',
    'T-002: Implement Core pages — Homepage and About.',
  ].join('\n')
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<HistoryPage />)
}

// ─── A. Type & stack summary ──────────────────────────────────────────────────

describe('A. Type & stack summary', () => {
  it('application project → shows "📱 Приложение" badge in project overview', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    expect(screen.getByText('📱 Приложение')).toBeInTheDocument()
  })

  it('website project → shows "🌐 Сайт" badge in project overview', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    expect(screen.getByText('🌐 Сайт')).toBeInTheDocument()
  })

  it('application arch → arch card shows "React" in stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('application arch → arch card shows "TypeScript" in stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('website arch → arch card shows "Next.js" in stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('Next.js')).toBeInTheDocument()
  })

  it('website arch → arch card shows "TypeScript" in stack (cross-type)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('application arch → arch card badge shows "📱 Приложение"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    // Two sources: project overview card + arch card
    const badges = screen.getAllByText('📱 Приложение')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('website arch → arch card badge shows "🌐 Сайт"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    const badges = screen.getAllByText('🌐 Сайт')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── B. Roadmap & stage history ───────────────────────────────────────────────

describe('B. Roadmap & stage history', () => {
  it('application arch → roadmap shows "Core flow" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('Core flow')).toBeInTheDocument()
  })

  it('application arch → roadmap shows "Dashboard and navigation" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('Dashboard and navigation')).toBeInTheDocument()
  })

  it('website arch → roadmap shows "Core pages" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('Core pages')).toBeInTheDocument()
  })

  it('website arch → roadmap shows "Blog" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('Blog')).toBeInTheDocument()
  })

  it('website arch → roadmap shows "SEO and contact" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('SEO and contact')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Спецификация" stage when specPack present', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('Спецификация')).toBeInTheDocument()
  })

  it('CycleTimeline shows "Код + Тесты" stage label', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
    })
    expect(screen.getByText('Код + Тесты')).toBeInTheDocument()
  })

  it('arch card shows "Foundation" as the first roadmap phase for application', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    // 'Foundation' appears for both application and website — just verify it's in the DOM
    expect(screen.getAllByText('Foundation').length).toBeGreaterThanOrEqual(1)
  })
})

// ─── C. Prompt history integration ───────────────────────────────────────────

describe('C. Prompt history integration', () => {
  it('first application prompt snippet contains "## Stack"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ iterationNumber: 1, promptText: makeAppFirstPromptText() }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).toHaveTextContent('## Stack')
  })

  it('first application prompt snippet contains "## MVP scope"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ iterationNumber: 1, promptText: makeAppFirstPromptText() }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).toHaveTextContent('## MVP scope')
  })

  it('next application prompt snippet contains "continuing the implementation"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ iterationNumber: 2, promptText: makeAppNextPromptText() }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).toHaveTextContent('continuing the implementation')
  })

  it('application prompt snippet does NOT contain "Next.js"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ iterationNumber: 1, promptText: makeAppFirstPromptText() }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).not.toHaveTextContent('Next.js')
  })

  it('application prompt snippet does NOT contain "SEO" (no website guidance leaked)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ iterationNumber: 1, promptText: makeAppFirstPromptText() }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).not.toHaveTextContent('SEO')
  })

  it('website first prompt snippet contains "## Stack"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
      promptIterations: [
        makeIteration({
          iterationNumber: 1,
          projectType: 'website',
          promptText: makeWebFirstPromptText(),
        }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).toHaveTextContent('## Stack')
  })

  it('website next prompt snippet contains "continuing the implementation"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
      promptIterations: [
        makeIteration({
          iterationNumber: 2,
          projectType: 'website',
          promptText: makeWebNextPromptText(),
        }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).toHaveTextContent('continuing the implementation')
  })

  it('website prompt snippet does NOT contain "React Router"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
      promptIterations: [
        makeIteration({
          iterationNumber: 1,
          projectType: 'website',
          promptText: makeWebFirstPromptText(),
        }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).not.toHaveTextContent('React Router')
  })

  it('website prompt snippet does NOT contain "Zustand"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
      promptIterations: [
        makeIteration({
          iterationNumber: 1,
          projectType: 'website',
          promptText: makeWebFirstPromptText(),
        }),
      ],
    })
    expect(screen.getByTestId('prompt-text-snippet')).not.toHaveTextContent('Zustand')
  })
})

// ─── D. Cross-type comparison ─────────────────────────────────────────────────

describe('D. Cross-type comparison — application vs website stack & roadmap', () => {
  it('application stack contains "React" but NOT "Next.js"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.queryByText('Next.js')).not.toBeInTheDocument()
  })

  it('website stack contains "Next.js" but NOT "React" as a standalone stack item', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('Next.js')).toBeInTheDocument()
    // WEB_ARCH does not include a 'React' stack item
    expect(screen.queryByText('React')).not.toBeInTheDocument()
  })

  it('application roadmap contains "Core flow" but NOT "Core pages"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.getByText('Core flow')).toBeInTheDocument()
    expect(screen.queryByText('Core pages')).not.toBeInTheDocument()
  })

  it('website roadmap contains "Core pages" but NOT "Core flow"', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.getByText('Core pages')).toBeInTheDocument()
    expect(screen.queryByText('Core flow')).not.toBeInTheDocument()
  })

  it('application stack does NOT contain "MDX" (website-specific)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
    })
    expect(screen.queryByText('MDX')).not.toBeInTheDocument()
  })

  it('website stack does NOT contain "Zustand" (application-specific)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: WEB_ARCH,
    })
    expect(screen.queryByText('Zustand')).not.toBeInTheDocument()
  })

  it('spec summary shows application feature names ("User onboarding") not website names', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: makeApplicationSpec(),
    })
    expect(screen.getByText('User onboarding')).toBeInTheDocument()
    expect(screen.queryByText('Homepage')).not.toBeInTheDocument()
  })

  it('spec summary shows website feature names ("Homepage") not application names', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      specPack: makeWebsiteSpec(),
    })
    expect(screen.getByText('Homepage')).toBeInTheDocument()
    expect(screen.queryByText('User onboarding')).not.toBeInTheDocument()
  })
})

// ─── E. Edge / empty states ───────────────────────────────────────────────────

describe('E. Edge / empty states', () => {
  it('no activeProject → shows "Проект не выбран"', () => {
    renderPage({ activeProject: null })
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('no architectureDraft → arch card NOT rendered (no "Архитектура и роадмап" heading)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: null,
    })
    expect(screen.queryByText('Архитектура и роадмап')).not.toBeInTheDocument()
  })

  it('no promptIterations → shows "Промпт-итераций пока нет" (in iterations card or task panel)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      promptIterations: [],
    })
    // Appears in both TaskProgressPanel and the iterations card — at least one must be present
    expect(screen.getAllByText(/Промпт-итераций пока нет/).length).toBeGreaterThanOrEqual(1)
  })

  it('partial empty: no specPack → spec summary card NOT rendered', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      specPack: null,
    })
    expect(screen.queryByText('Краткое резюме спека')).not.toBeInTheDocument()
  })

  it('multiple iterations → all prompt-text-snippet elements rendered', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ id: 'iter-1', iterationNumber: 1, promptText: makeAppFirstPromptText() }),
        makeIteration({ id: 'iter-2', iterationNumber: 2, promptText: makeAppNextPromptText() }),
      ],
    })
    const snippets = screen.getAllByTestId('prompt-text-snippet')
    expect(snippets).toHaveLength(2)
  })

  it('prompt with empty promptText → snippet element not rendered', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: APP_ARCH,
      promptIterations: [
        makeIteration({ promptText: '' }),
      ],
    })
    expect(screen.queryByTestId('prompt-text-snippet')).not.toBeInTheDocument()
  })
})
