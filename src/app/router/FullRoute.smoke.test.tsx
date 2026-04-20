// @vitest-environment jsdom
// SMOKE-RTL-002 — Full-route render smoke
//
// One it.each over all 10 main routes: confirms every page component renders
// without crash and surfaces its expected heading or guard text under a
// minimal null-project store state.
//
// THIS IS NOT a logic test — T-011 (acceptance) and T-110 (review phase) own
// that. This file answers one question:
//   "Does every route produce visible DOM without throwing?"

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { FC } from 'react'

import { HomePage } from '../../pages/home/HomePage'
import { IdeaPage } from '../../pages/idea/IdeaPage'
import { ResearchPage } from '../../pages/research/ResearchPage'
import { SpecPage } from '../../pages/spec/SpecPage'
import { ArchitecturePage } from '../../pages/architecture/ArchitecturePage'
import { PromptLoopPage } from '../../pages/prompt-loop/PromptLoopPage'
import { HistoryPage } from '../../pages/history/HistoryPage'
import { BlogPage } from '../../pages/blog/BlogPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'
import { ProjectNewPage } from '../../pages/project-new/ProjectNewPage'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

const mockUseProjectRegistry = vi.fn()
vi.mock('../store/projectRegistryStore', () => ({
  useProjectRegistry: (...args: unknown[]) => mockUseProjectRegistry(...args),
  selectSelectedProject: (state: { projects: { id: string }[]; selectedProjectId: string | null }) =>
    state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
}))

const mockUseBlogStore = vi.fn()
vi.mock('../store/blogStore', () => ({
  useBlogStore: (...args: unknown[]) => mockUseBlogStore(...args),
}))

const mockUseSettingsStore = vi.fn()
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: (...args: unknown[]) => mockUseSettingsStore(...args),
}))

// ─── Minimal store states ─────────────────────────────────────────────────────

function makeProjectStoreState() {
  return {
    activeProject: null,
    ideaDraft: null,
    researchRuns: [] as unknown[],
    importedArtifacts: [] as unknown[],
    researchBrief: null,
    specPack: null,
    architectureDraft: null,
    promptIterations: [] as unknown[],
    setIdeaDraft: vi.fn(),
    setResearchBrief: vi.fn(),
    setSpecPack: vi.fn(),
    updateSpecPack: vi.fn(),
    setArchitectureDraft: vi.fn(),
    addPromptIteration: vi.fn(),
    updatePromptIteration: vi.fn(),
    addResearchRun: vi.fn(),
    addImportedArtifact: vi.fn(),
    setCurrentStage: vi.fn(),
  }
}

function makeRegistryState() {
  return {
    projects: [] as unknown[],
    selectedProjectId: null as string | null,
    createProject: vi.fn(),
    selectProject: vi.fn(),
    updateProject: vi.fn(),
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  const projectState = makeProjectStoreState()
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(projectState) : projectState,
  )

  const registryState = makeRegistryState()
  mockUseProjectRegistry.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(registryState) : registryState,
  )

  mockUseBlogStore.mockReturnValue({
    postsByProject: {},
    getPostsForProject: () => [],
    getPostById: () => undefined,
    upsertPost: vi.fn(),
    updatePost: vi.fn(),
    updatePublicationStatus: vi.fn(),
    markCopied: vi.fn(),
    ensureTodayPost: () => null,
  })

  mockUseSettingsStore.mockReturnValue({
    soundNotificationsEnabled: true,
    setSoundNotificationsEnabled: vi.fn(),
  })
})

// ─── Smoke matrix ─────────────────────────────────────────────────────────────
//
// expected: the shortest text guaranteed to be present when the page renders.
//
// Most pages show <PageHeader title="…"> even in the no-project guard branch,
// so the page title is the strongest signal.  BlogPage is the exception: its
// guard returns only <EmptyState> with no PageHeader, so we check the guard
// title "Проект не выбран" instead.

interface SmokeCase {
  label: string
  Component: FC
  expected: string
}

const SMOKE_CASES: SmokeCase[] = [
  { label: 'HomePage (/)',                    Component: HomePage,         expected: 'AI Product Studio' },
  { label: 'IdeaPage (/idea)',                Component: IdeaPage,         expected: 'Идея' },
  { label: 'ResearchPage (/research)',        Component: ResearchPage,     expected: 'Исследование' },
  { label: 'SpecPage (/spec)',                Component: SpecPage,         expected: 'Спецификация' },
  { label: 'ArchitecturePage (/architecture)',Component: ArchitecturePage, expected: 'Архитектура' },
  { label: 'PromptLoopPage (/prompt-loop)',   Component: PromptLoopPage,   expected: 'Цикл промптов' },
  { label: 'HistoryPage (/history)',          Component: HistoryPage,      expected: 'Обзор' },
  { label: 'BlogPage (/blog)',                Component: BlogPage,         expected: 'Проект не выбран' },
  { label: 'SettingsPage (/settings)',        Component: SettingsPage,     expected: 'Настройки' },
  { label: 'ProjectNewPage (/project/new)',   Component: ProjectNewPage,   expected: 'Новый проект' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SMOKE-RTL-002 — full route render', () => {
  it.each(SMOKE_CASES)('$label renders without crash', ({ Component, expected }) => {
    const { container } = render(<Component />)

    expect(container).toBeTruthy()
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})
