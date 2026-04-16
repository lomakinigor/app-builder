// @vitest-environment jsdom
// T-106 — ArchitecturePage type-aware UI assertions
// Implements F-006 / T-106
//
// Verifies that ArchitecturePage renders the correct type-specific stack names,
// roadmap vocabulary, and gate state, aligned with contracts from T-104.
//
// Scenarios:
//   A. Type badge — application shows "📱 Приложение"; website shows "🌐 Сайт"
//   B. Type description text — visible when arch present; correct per type
//   C. Stack primary technology — application shows "React"; website shows "Next.js"
//   D. TypeScript cross-type — present in both application and website stacks
//   E. No cross-stack contamination — application NOT "Next.js"; website NOT "React"
//   F. Roadmap vocabulary — application has "Core flow" / "Dashboard and navigation";
//                           website has "Core pages" / "Blog"
//   G. Vocabulary differentiation — roadmap titles differ between types
//   H. Gate alignment — complete arch enables CTA; type content doesn't mask gate failure

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchitecturePage } from './ArchitecturePage'
import type { Project, SpecPack, ArchitectureDraft } from '../../shared/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../mocks/services/specService', () => ({
  mockSpecService: {
    generateArchitecture: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../shared/lib/markdown/exportArtifactToMarkdown', () => ({
  architectureDraftToMarkdown: () => '# arch markdown',
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: () => Promise.resolve({ method: 'clipboard' }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'architecture',
    ...overrides,
  }
}

function makeSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'A task manager.',
    MVPScope: 'CRUD + local persistence.',
    featureList: [{ id: 'f-001', name: 'Tasks', description: '', priority: 'must' }],
    assumptions: [],
    constraints: [],
    acceptanceNotes: '',
    ...overrides,
  }
}

/**
 * Full application architecture matching canonical T-104 contract.
 * stack[0] = React (primary), TypeScript present, roadmap: Foundation → Core flow → Dashboard and navigation → …
 */
function makeApplicationArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    recommendedStack: [
      { name: 'React', role: 'UI layer', rationale: 'Component-based SPA with strong ecosystem' },
      { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors' },
      { name: 'Vite', role: 'Build tool', rationale: 'Fast HMR, lean bundle' },
      { name: 'Zustand', role: 'State management', rationale: 'Lightweight store with built-in persistence' },
      { name: 'React Router', role: 'Client routing', rationale: 'Declarative SPA routing' },
      { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first, responsive design system' },
    ],
    moduleArchitecture: 'Feature-sliced: app → pages → features → entities → shared',
    dataFlow: 'User action → store → UI re-render',
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['App shell', 'Routing', 'Layout'], estimatedComplexity: 'low' },
      { phase: 1, title: 'Core flow', goals: ['Onboarding screen', 'Primary entity list', 'Create/edit form'], estimatedComplexity: 'medium' },
      { phase: 2, title: 'Dashboard and navigation', goals: ['Summary dashboard', 'In-app navigation'], estimatedComplexity: 'medium' },
      { phase: 3, title: 'Search, filters, and settings', goals: ['Entity filtering', 'Search bar'], estimatedComplexity: 'medium' },
      { phase: 4, title: 'Polish and export', goals: ['Export to CSV/JSON', 'Performance audit'], estimatedComplexity: 'high' },
    ],
    technicalRisks: ['localStorage limit at 5 MB'],
    ...overrides,
  }
}

/**
 * Full website architecture matching canonical T-104 contract.
 * stack[0] = Next.js (primary), TypeScript present, roadmap: Foundation → Core pages → Blog → …
 */
function makeWebsiteArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'website',
    recommendedStack: [
      { name: 'Next.js', role: 'Framework', rationale: 'SSR/SSG for SEO, file-based routing' },
      { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors' },
      { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first, responsive design system' },
      { name: 'MDX', role: 'Content authoring', rationale: 'Markdown + JSX for V1; easy to swap later' },
      { name: 'Vercel', role: 'Hosting / deployment', rationale: 'Zero-config Next.js deployment, global CDN' },
    ],
    moduleArchitecture: 'Next.js App Router with page-level components',
    dataFlow: 'SSG at build time; ISR for dynamic pages',
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['Next.js scaffold', 'Tailwind setup', 'Dark mode'], estimatedComplexity: 'low' },
      { phase: 1, title: 'Core pages', goals: ['Homepage', 'About page', 'MDX pipeline'], estimatedComplexity: 'low' },
      { phase: 2, title: 'Blog', goals: ['Article list page', 'Article detail page', 'RSS feed'], estimatedComplexity: 'medium' },
      { phase: 3, title: 'SEO and contact', goals: ['Per-page meta tags', 'Sitemap.xml', 'Contact form'], estimatedComplexity: 'medium' },
      { phase: 4, title: 'Polish and CMS', goals: ['Analytics integration', 'Performance audit'], estimatedComplexity: 'high' },
    ],
    technicalRisks: ['MDX versioning', 'Vercel pricing at scale'],
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    activeProject: makeProject(),
    specPack: makeSpec(),
    architectureDraft: null as ArchitectureDraft | null,
    setArchitectureDraft: vi.fn(),
    updateArchitectureDraft: vi.fn(),
    setCurrentStage: vi.fn(),
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
  return render(<ArchitecturePage />)
}

// ─── A. Type badge rendering ──────────────────────────────────────────────────

describe('A. Type badge — application vs website', () => {
  it('application project → shows "📱 Приложение" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    expect(screen.getByText('📱 Приложение')).toBeInTheDocument()
  })

  it('website project → shows "🌐 Сайт" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    expect(screen.getByText('🌐 Сайт')).toBeInTheDocument()
  })

  it('application page does NOT show "🌐 Сайт" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'application' }) })
    expect(screen.queryByText('🌐 Сайт')).not.toBeInTheDocument()
  })

  it('website page does NOT show "📱 Приложение" badge', () => {
    renderPage({ activeProject: makeProject({ projectType: 'website' }) })
    expect(screen.queryByText('📱 Приложение')).not.toBeInTheDocument()
  })
})

// ─── B. Type description text ─────────────────────────────────────────────────

describe('B. Type description — shown when arch present; correct per type', () => {
  it('application arch → shows SPA-oriented description', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByText(/адаптирована для Приложения/)).toBeInTheDocument()
  })

  it('website arch → shows SSR/SSG-oriented description', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText(/адаптирована для Сайта/)).toBeInTheDocument()
  })

  it('application page does NOT show website description', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.queryByText(/адаптирована для Сайта/)).not.toBeInTheDocument()
  })

  it('website page does NOT show application description', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.queryByText(/адаптирована для Приложения/)).not.toBeInTheDocument()
  })

  it('description NOT visible when no architectureDraft (generate panel shown instead)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: null,
    })
    expect(screen.queryByText(/адаптирована для/)).not.toBeInTheDocument()
  })
})

// ─── C. Stack primary technology ─────────────────────────────────────────────

describe('C. Stack primary technology — React for application, Next.js for website', () => {
  it('application arch shows "React" in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    // StackViewRow renders item.name as font-semibold text
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('website arch shows "Next.js" in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText('Next.js')).toBeInTheDocument()
  })
})

// ─── D. TypeScript present in both types ──────────────────────────────────────

describe('D. TypeScript — present in both application and website stacks', () => {
  it('application arch shows "TypeScript" in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('website arch shows "TypeScript" in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })
})

// ─── E. No cross-stack contamination ─────────────────────────────────────────

describe('E. Cross-stack contamination — application NOT "Next.js"; website NOT primary "React"', () => {
  it('application arch does NOT show "Next.js" anywhere in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    // Next.js is not in the application stack at all
    expect(screen.queryByText('Next.js')).not.toBeInTheDocument()
  })

  it('website arch does NOT show standalone "React" entry in the stack', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    // Website stack has Next.js, not React standalone
    // "React" may appear inside rationale text; check the stack item name specifically
    const stackItems = screen.getAllByRole('generic').filter(
      (el) => el.tagName === 'SPAN' && el.classList.contains('font-semibold')
    )
    const names = stackItems.map((el) => el.textContent)
    expect(names).not.toContain('React')
  })

  it('Tailwind CSS present in both types (cross-cutting infrastructure)', () => {
    // T-104 group C established Tailwind CSS as shared cross-cutting technology
    const appArch = makeApplicationArch()
    const webArch = makeWebsiteArch()
    const appNames = appArch.recommendedStack.map((s) => s.name)
    const webNames = webArch.recommendedStack.map((s) => s.name)
    expect(appNames).toContain('Tailwind CSS')
    expect(webNames).toContain('Tailwind CSS')
  })
})

// ─── F. Roadmap vocabulary — application ─────────────────────────────────────

describe('F. Roadmap vocabulary — application canonical phase titles visible', () => {
  it('application arch shows "Core flow" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByText('Core flow')).toBeInTheDocument()
  })

  it('application arch shows "Dashboard and navigation" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByText('Dashboard and navigation')).toBeInTheDocument()
  })

  it('application arch shows "Onboarding screen" goal', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByText(/Onboarding screen/)).toBeInTheDocument()
  })
})

// ─── G. Roadmap vocabulary — website ─────────────────────────────────────────

describe('G. Roadmap vocabulary — website canonical phase titles visible', () => {
  it('website arch shows "Core pages" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText('Core pages')).toBeInTheDocument()
  })

  it('website arch shows "Blog" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText('Blog')).toBeInTheDocument()
  })

  it('website arch shows "Article list page" goal', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText(/Article list page/)).toBeInTheDocument()
  })

  it('website arch shows "SEO and contact" phase title', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByText('SEO and contact')).toBeInTheDocument()
  })
})

// ─── H. Roadmap vocabulary — no cross-type bleed ─────────────────────────────

describe('H. Roadmap vocabulary differentiation — no cross-type bleed', () => {
  it('application arch does NOT show "Core pages" (website-specific phase)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.queryByText('Core pages')).not.toBeInTheDocument()
  })

  it('website arch does NOT show "Core flow" (application-specific phase)', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.queryByText('Core flow')).not.toBeInTheDocument()
  })

  it('website arch does NOT show "Dashboard and navigation" phase', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.queryByText('Dashboard and navigation')).not.toBeInTheDocument()
  })

  it('application arch does NOT show "Blog" phase', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    // "Blog" is a website-specific phase title; application has no such phase
    expect(screen.queryByText(/^Blog$/)).not.toBeInTheDocument()
  })
})

// ─── I. Gate alignment ────────────────────────────────────────────────────────

describe('I. Gate alignment — type-aware content does not mask gate failure', () => {
  it('complete application arch → "Перейти к циклу промптов" is NOT disabled', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch(),
    })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).not.toBeDisabled()
  })

  it('complete website arch → "Перейти к циклу промптов" is NOT disabled', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch(),
    })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).not.toBeDisabled()
  })

  it('website arch with correct type badge but empty stack → CTA blocked', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch({ recommendedStack: [] }),
    })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).toBeDisabled()
  })

  it('application arch with correct type badge but empty roadmap → CTA blocked', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch({ roadmapPhases: [] }),
    })
    expect(screen.getByRole('button', { name: /Перейти к циклу промптов/ })).toBeDisabled()
  })

  it('empty stack shows gate diagnostics even when type-specific content previously visible', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'website' }),
      architectureDraft: makeWebsiteArch({ recommendedStack: [] }),
    })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })

  it('empty roadmap shows gate diagnostics for application type', () => {
    renderPage({
      activeProject: makeProject({ projectType: 'application' }),
      architectureDraft: makeApplicationArch({ roadmapPhases: [] }),
    })
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })
})
