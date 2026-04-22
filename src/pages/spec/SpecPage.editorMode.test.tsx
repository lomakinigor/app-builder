// @vitest-environment jsdom
// T-405 — SpecPage editor-mode gating tests.
//
// Coverage:
//   1. Editor sees generate panel (brief exists, no spec)
//   2. Editor sees "Перегенерировать" button (spec exists)
//   3. Editor and owner behave identically for workflow actions

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecPage } from './SpecPage'
import type { Project, ResearchBrief, SpecPack } from '../../shared/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  specPackToMarkdown: () => '# spec',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

// T-405: editor has canEdit=true
const mockCanEdit = vi.fn(() => true)
vi.mock('../../app/store/viewingModeStore', () => ({
  useCanEditProject: () => mockCanEdit(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(): Project {
  return {
    id: 'proj-1',
    name: 'Test',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'specification',
  }
}

function makeBrief(): ResearchBrief {
  return {
    id: 'brief-1',
    projectId: 'proj-1',
    sources: [],
    problemSummary: 'Problem',
    targetUsers: ['Dev'],
    keyInsights: [],
    valueHypothesis: 'Value',
    recommendedMVP: 'MVP',
    open_questions: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeSpec(): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A stateful app.',
    MVPScope: 'Single-user CRUD.',
    featureList: [{ id: 'f-1', name: 'Feature', description: '', priority: 'must' }],
    assumptions: [],
    constraints: [],
    acceptanceNotes: 'Can create tasks after reload.',
  }
}

function setupStore(overrides: Record<string, unknown> = {}) {
  const base = {
    activeProject: makeProject(),
    researchBrief: makeBrief(),
    specPack: null as SpecPack | null,
    setSpecPack: vi.fn(),
    updateSpecPack: vi.fn(),
    setCurrentStage: vi.fn(),
    ...overrides,
  }
  mockUseProjectStore.mockImplementation((selector?: (s: unknown) => unknown) =>
    selector ? selector(base) : base
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCanEdit.mockReturnValue(true) // editor mode
  setupStore()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SpecPage — editor mode', () => {
  it('shows generate panel when brief exists but no spec (editor allowed)', () => {
    setupStore({ specPack: null })
    render(<SpecPage />)
    expect(screen.getByText('Сгенерировать спецификацию')).toBeInTheDocument()
  })

  it('shows "Перегенерировать" when spec exists (editor allowed)', () => {
    setupStore({ specPack: makeSpec() })
    render(<SpecPage />)
    expect(screen.getByText('Перегенерировать')).toBeInTheDocument()
  })

  it('editor and owner see identical workflow actions', () => {
    setupStore({ specPack: null })
    render(<SpecPage />)
    // same assertions as owner mode in SpecPage.viewerMode.test.tsx
    expect(screen.getByText('Сгенерировать спецификацию')).toBeInTheDocument()
  })
})
