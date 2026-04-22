// @vitest-environment jsdom
// T-401 — SpecPage viewer-mode gating tests.
// T-405 — Updated to use useCanEditProject (replaces useIsViewer).
//
// Coverage:
//   1. Owner mode: generate panel visible when brief exists, no spec
//   2. Owner mode: "Перегенерировать" button visible when spec exists
//   3. Viewer mode: generate panel hidden even when brief exists, no spec
//   4. Viewer mode: "Перегенерировать" button hidden when spec exists
//   5. Viewer mode: "Перейти к архитектуре" navigation still visible

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
  mockCanEdit.mockReturnValue(true)
})

// ─── Owner mode ───────────────────────────────────────────────────────────────

describe('Owner mode', () => {
  it('shows generate panel when brief exists but no spec', () => {
    setupStore({ specPack: null })
    render(<SpecPage />)
    expect(screen.getByText('Сгенерировать спецификацию')).toBeInTheDocument()
  })

  it('shows "Перегенерировать" when spec exists', () => {
    setupStore({ specPack: makeSpec() })
    render(<SpecPage />)
    expect(screen.getByText('Перегенерировать')).toBeInTheDocument()
  })
})

// ─── Viewer mode ──────────────────────────────────────────────────────────────

describe('Viewer mode', () => {
  beforeEach(() => {
    mockCanEdit.mockReturnValue(false)
  })

  it('hides generate panel even when brief exists and no spec', () => {
    setupStore({ specPack: null })
    render(<SpecPage />)
    expect(screen.queryByText('Сгенерировать спецификацию')).not.toBeInTheDocument()
  })

  it('hides "Перегенерировать" when spec exists', () => {
    setupStore({ specPack: makeSpec() })
    render(<SpecPage />)
    expect(screen.queryByText('Перегенерировать')).not.toBeInTheDocument()
  })

  it('still shows "Перейти к архитектуре" navigation button', () => {
    setupStore({ specPack: makeSpec() })
    render(<SpecPage />)
    expect(screen.getByText(/Перейти к архитектуре/)).toBeInTheDocument()
  })
})
