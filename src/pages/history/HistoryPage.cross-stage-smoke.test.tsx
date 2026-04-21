// @vitest-environment jsdom
// SMOKE-RTL-001 — HistoryPage cross-stage smoke
// Implements wide/shallow integration check for the full Superpowers cycle.
//
// THIS IS NOT a regression suite — T-110 covers individual groups in depth.
// This smoke answers one question:
//   "Given a fully-seeded store (project + idea + spec + arch + 2 prompts),
//    does HistoryPage surface canonical markers from every stage at once?"
//
// Tests:
//   A. Application full-cycle smoke — 9 positive assertions + 2 anti-contamination
//   B. Website full-cycle smoke     — 9 positive assertions + 2 anti-contamination

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import type { Project, PromptIteration, IdeaDraft } from '../../shared/types'
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

const mockUseProjectRegistry = vi.fn()
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (s: { projects: { id: string; status: string }[]; selectedProjectId: string | null }) =>
    s.projects.find((p) => p.id === s.selectedProjectId) ?? null,
}))

// ─── Canonical prompt text ─────────────────────────────────────────────────────
// Local to this file — not imported from T-110 to avoid cross-test coupling.
// Each string contains the canonical vocabulary markers checked below.

const APP_FIRST_PROMPT = [
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
  'Phase 1: Core flow',
  'Goals: Onboarding screen, Primary entity list',
].join('\n')

const APP_NEXT_PROMPT = [
  'You are continuing the implementation of a web application.',
  '',
  '## Type guidance',
  'SPA architecture with Zustand store and React Router for client-side navigation.',
].join('\n')

const WEB_FIRST_PROMPT = [
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
  'Phase 1: Core pages',
  'Goals: Homepage, About page, MDX pipeline',
].join('\n')

const WEB_NEXT_PROMPT = [
  'You are continuing the implementation of a website.',
  '',
  '## Type guidance',
  'SSG/SSR with Next.js. Focus on SEO-friendly markup and page-based architecture.',
].join('\n')

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

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-1',
    projectId: 'proj-1',
    iterationNumber: 1,
    promptText: '',
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
  mockUseProjectRegistry.mockImplementation((selector?: (s: unknown) => unknown) => {
    const s = { projects: [], selectedProjectId: null, markProjectCompleted: vi.fn() }
    return selector ? selector(s) : s
  })
})

function renderPage(storeOverrides: Record<string, unknown> = {}) {
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) => {
    const state = makeStore(storeOverrides)
    return selector ? selector(state) : state
  })
  return render(<HistoryPage />)
}

// ─── A. Application full-cycle smoke ──────────────────────────────────────────

describe('A. Application full-cycle smoke — all canonical markers visible simultaneously', () => {
  it('given a fully-seeded application store, all stage markers are visible at once', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      ideaDraft: makeIdeaDraft(),
      specPack: createAppSpec(),
      architectureDraft: createAppArch(),
      promptIterations: [
        makeIteration({
          id: 'iter-1',
          iterationNumber: 1,
          projectType: 'application',
          promptText: APP_FIRST_PROMPT,
        }),
        makeIteration({
          id: 'iter-2',
          iterationNumber: 2,
          projectType: 'application',
          promptText: APP_NEXT_PROMPT,
        }),
      ],
    })

    // Stage: Idea — ideaDraft.rawIdea → CycleTimeline detail
    expect(screen.getByText('Идея зафиксирована')).toBeInTheDocument()

    // Stage: Project type badge — appears in project card + arch card + spec card
    expect(screen.getAllByText('📱 Приложение').length).toBeGreaterThanOrEqual(1)

    // Stage: Spec — feature name badge from specPack.featureList
    expect(screen.getByText('User onboarding')).toBeInTheDocument()

    // Stage: Spec — CycleTimeline confirms specPack reached
    expect(screen.getByText('Спек-пакет сгенерирован')).toBeInTheDocument()

    // Stage: Architecture stack — primary item
    expect(screen.getByText('React')).toBeInTheDocument()

    // Stage: Architecture stack — cross-type item (both types have TypeScript)
    expect(screen.getByText('TypeScript')).toBeInTheDocument()

    // Stage: Architecture roadmap — canonical application phase
    expect(screen.getByText('Core flow')).toBeInTheDocument()

    // Stage: Prompt loop — first iteration snippet contains ## Stack
    const snippets = screen.getAllByTestId('prompt-text-snippet')
    expect(snippets[0]).toHaveTextContent('## Stack')

    // Stage: Prompt loop — second iteration snippet confirms continuation
    expect(snippets[1]).toHaveTextContent('continuing the implementation')

    // Anti-contamination: no website-specific markers
    expect(screen.queryByText('Next.js')).not.toBeInTheDocument()
    expect(screen.queryByText('Core pages')).not.toBeInTheDocument()
  })
})

// ─── B. Website full-cycle smoke ──────────────────────────────────────────────

describe('B. Website full-cycle smoke — all canonical markers visible simultaneously', () => {
  it('given a fully-seeded website store, all stage markers are visible at once', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      ideaDraft: makeIdeaDraft(),
      specPack: createWebSpec(),
      architectureDraft: createWebArch(),
      promptIterations: [
        makeIteration({
          id: 'iter-1',
          iterationNumber: 1,
          projectType: 'website',
          promptText: WEB_FIRST_PROMPT,
        }),
        makeIteration({
          id: 'iter-2',
          iterationNumber: 2,
          projectType: 'website',
          promptText: WEB_NEXT_PROMPT,
        }),
      ],
    })

    // Stage: Idea — ideaDraft.rawIdea → CycleTimeline detail
    expect(screen.getByText('Идея зафиксирована')).toBeInTheDocument()

    // Stage: Project type badge — appears in project card + arch card + spec card
    expect(screen.getAllByText('🌐 Сайт').length).toBeGreaterThanOrEqual(1)

    // Stage: Spec — feature name badge from specPack.featureList
    expect(screen.getByText('Homepage')).toBeInTheDocument()

    // Stage: Spec — CycleTimeline confirms specPack reached
    expect(screen.getByText('Спек-пакет сгенерирован')).toBeInTheDocument()

    // Stage: Architecture stack — primary item
    expect(screen.getByText('Next.js')).toBeInTheDocument()

    // Stage: Architecture stack — cross-type item
    expect(screen.getByText('TypeScript')).toBeInTheDocument()

    // Stage: Architecture roadmap — canonical website phase
    expect(screen.getByText('Core pages')).toBeInTheDocument()

    // Stage: Prompt loop — first iteration snippet contains ## Stack
    const snippets = screen.getAllByTestId('prompt-text-snippet')
    expect(snippets[0]).toHaveTextContent('## Stack')

    // Stage: Prompt loop — second iteration snippet confirms continuation
    expect(snippets[1]).toHaveTextContent('continuing the implementation')

    // Anti-contamination: no application-specific markers
    expect(screen.queryByText('React Router')).not.toBeInTheDocument()
    expect(screen.queryByText('Core flow')).not.toBeInTheDocument()
  })
})
