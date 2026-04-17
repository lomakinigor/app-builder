import type { Page } from '@playwright/test'

/**
 * T-018 — localStorage seed helpers for visual regression tests.
 *
 * All dates are pinned to a fixed ISO string so toLocaleDateString() and
 * toLocaleString() always render the same output regardless of when the
 * test runs.  With Playwright locale: 'ru-RU' the rendered value is:
 *   createdAt / updatedAt → "15.01.2026"
 *   promptIteration.createdAt → "15.01.2026, 10:00:00"
 *
 * Seed data shapes match the Zustand persist format:
 *   { state: {...}, version: 0 }
 *
 * Store keys (from projectRegistryStore / projectStore):
 *   'ai-product-studio-registry'  — project list + selectedProjectId
 *   'ai-product-studio-project'   — active project stage data (hot slots)
 */

// ─── Fixed seed constants ─────────────────────────────────────────────────────

export const FIXED_DATE = '2026-01-15T10:00:00.000Z'

export const APP_PROJECT_ID = 'vis-proj-app-001'
export const WEB_PROJECT_ID = 'vis-proj-web-001'

// ─── Shared payload builders ──────────────────────────────────────────────────

function makeAppProject() {
  return {
    id: APP_PROJECT_ID,
    name: 'AI Task Manager Pro',
    projectType: 'application' as const,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    status: 'active' as const,
    currentStage: 'review' as const,
  }
}

function makeWebProject() {
  return {
    id: WEB_PROJECT_ID,
    name: 'Studio Blog Platform',
    projectType: 'website' as const,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    status: 'active' as const,
    currentStage: 'review' as const,
  }
}

function makeIdeaDraft(projectType: 'application' | 'website') {
  return {
    rawIdea:
      projectType === 'application'
        ? 'An AI-powered task management application that helps developers break down complex projects into manageable tasks, track progress, and receive smart next-action suggestions based on what is blocked or overdue.'
        : 'A content-driven blog platform for technical writers with MDX authoring, tagging, and RSS support.',
    productName: projectType === 'application' ? 'AI Task Manager Pro' : 'Studio Blog Platform',
    productType: projectType,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  }
}

function makeResearchBrief(projectType: 'application' | 'website') {
  return {
    problemSummary:
      projectType === 'application'
        ? 'Developers lose track of tasks across multiple tools; no single view ties task status to code progress.'
        : 'Technical writers lack a lightweight platform that combines MDX authoring with clean presentation.',
    targetUsers:
      projectType === 'application'
        ? ['Indie developers', 'Small dev teams']
        : ['Technical bloggers', 'Developer advocates'],
    valueHypothesis:
      projectType === 'application'
        ? 'A focused CRUD task manager with AI-suggested next actions reduces context switching.'
        : 'MDX-first authoring with instant preview removes friction from publishing.',
    competitorNotes:
      projectType === 'application'
        ? 'Linear, Jira — too heavy; Todoist — no code context.'
        : 'Medium — no code blocks; Hashnode — complex setup.',
    risks: ['Scope creep beyond MVP'],
    opportunities: ['Underserved solo-dev segment'],
    recommendedMVP:
      projectType === 'application'
        ? 'Single-user CRUD task list with local persistence and AI next-action chip.'
        : 'Homepage + MDX blog pipeline + RSS feed.',
    openQuestions: ['Mobile app in V2?'],
    sourcesNote: 'Mock research run',
    sourceIds: ['mock-run-001'],
    briefSource: 'generated' as const,
  }
}

function makeSpecPack(projectType: 'application' | 'website') {
  if (projectType === 'application') {
    return {
      projectType: 'application' as const,
      productSummary: 'An application: A focused AI-powered task manager',
      MVPScope: 'Single-user CRUD with local persistence. No auth in V1.',
      featureList: [
        { id: 'f-001', name: 'User onboarding', description: 'Sign-up / sign-in flow', priority: 'must' as const },
        { id: 'f-002', name: 'Core data management', description: 'Create, view, edit, delete', priority: 'must' as const },
        { id: 'f-003', name: 'Dashboard / overview', description: 'Summary view', priority: 'must' as const },
        { id: 'f-004', name: 'AI next-action chip', description: 'Suggested next task based on blockers', priority: 'should' as const },
      ],
      assumptions: ['Desktop browser primary'],
      constraints: ['No backend in V1'],
      acceptanceNotes: 'User can create and view tasks after reload.',
    }
  }
  return {
    projectType: 'website' as const,
    productSummary: 'A content-driven website: A focused blog platform for technical writers',
    MVPScope: 'Homepage, about page, MDX-based blog, contact form. No CMS in V1.',
    featureList: [
      { id: 'f-001', name: 'Homepage', description: 'Hero section with value proposition, CTA', priority: 'must' as const },
      { id: 'f-002', name: 'Content pages', description: 'About, services pages', priority: 'must' as const },
      { id: 'f-003', name: 'Blog / articles', description: 'MDX-based article list and detail', priority: 'must' as const },
      { id: 'f-004', name: 'RSS feed', description: 'Auto-generated feed for subscribers', priority: 'should' as const },
    ],
    assumptions: ['Content authored in MDX'],
    constraints: ['No authentication', 'No database in MVP'],
    acceptanceNotes: 'Visitor can navigate homepage → blog.',
  }
}

function makeArchitectureDraft(projectType: 'application' | 'website') {
  if (projectType === 'application') {
    return {
      projectType: 'application' as const,
      moduleArchitecture: 'Feature-sliced design',
      dataFlow: 'Zustand store → React components → localStorage',
      technicalRisks: ['No backend — local storage only in V1'],
      recommendedStack: [
        { name: 'React', role: 'UI layer', rationale: 'Component-based SPA' },
        { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors' },
        { name: 'Vite', role: 'Build tool', rationale: 'Fast HMR, lean bundle' },
        { name: 'Zustand', role: 'State management', rationale: 'Lightweight store' },
        { name: 'React Router', role: 'Client routing', rationale: 'Declarative SPA routing' },
        { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first design system' },
      ],
      roadmapPhases: [
        { phase: 0, title: 'Foundation', goals: ['App shell', 'Routing', 'Layout and navigation'], estimatedComplexity: 'low' },
        { phase: 1, title: 'Core flow', goals: ['Onboarding screen', 'Primary entity list', 'Create/edit form'], estimatedComplexity: 'medium' },
        { phase: 2, title: 'Dashboard and navigation', goals: ['Summary dashboard', 'In-app navigation'], estimatedComplexity: 'medium' },
        { phase: 3, title: 'Search, filters, and settings', goals: ['Entity filtering', 'Search bar'], estimatedComplexity: 'medium' },
        { phase: 4, title: 'Polish and export', goals: ['Export to CSV/JSON', 'Performance audit'], estimatedComplexity: 'high' },
      ],
    }
  }
  return {
    projectType: 'website' as const,
    moduleArchitecture: 'Pages + shared components',
    dataFlow: 'Static props → Next.js pages → MDX content',
    technicalRisks: ['SEO depends on correct meta tags'],
    recommendedStack: [
      { name: 'Next.js', role: 'Framework', rationale: 'SSR/SSG for SEO' },
      { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors' },
      { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first design system' },
      { name: 'MDX', role: 'Content authoring', rationale: 'Markdown + JSX for blog posts' },
      { name: 'Vercel', role: 'Hosting / deployment', rationale: 'Zero-config deployment' },
    ],
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['Next.js scaffold', 'Tailwind setup', 'Dark mode'], estimatedComplexity: 'low' },
      { phase: 1, title: 'Core pages', goals: ['Homepage', 'About page', 'MDX pipeline'], estimatedComplexity: 'low' },
      { phase: 2, title: 'Blog', goals: ['Article list page', 'Article detail page', 'RSS feed'], estimatedComplexity: 'medium' },
      { phase: 3, title: 'SEO and contact', goals: ['Per-page meta tags', 'Sitemap.xml', 'Contact form'], estimatedComplexity: 'medium' },
      { phase: 4, title: 'Polish and CMS', goals: ['Analytics integration', 'Performance audit'], estimatedComplexity: 'high' },
    ],
  }
}

function makePromptIterations(projectId: string, projectType: 'application' | 'website') {
  return [
    {
      id: `iter-vis-${projectType}-001`,
      projectId,
      iterationNumber: 1,
      promptText:
        'Task T-001: Build the application scaffold with routing and core layout components.',
      claudeResponseRaw: null,
      parsedSummary: {
        analysis: 'Implemented T-001 project scaffold. Core application structure created successfully with TypeScript.',
        plan: 'Created main application entry point, routing setup, and layout components.',
        changedFiles: ['src/main.tsx', 'src/App.tsx', 'src/App.test.tsx', 'src/app/layout/AppLayout.tsx'],
        implementationSummary: 'Application scaffold is complete. All required files are in place with correct module boundaries.',
        nextStep: 'T-001 is complete. All tests pass. The implementation is ready for review.',
        warnings: [],
        hasTests: true,
        implementedTaskIds: ['T-001'],
        nextTaskId: 'T-002',
        inferredNextPhase: 'review' as const,
      },
      recommendedNextStep: 'T-001 is complete. All tests pass. Ready for T-002.',
      status: 'parsed' as const,
      createdAt: FIXED_DATE,
      projectType,
      cyclePhase: 'code_and_tests' as const,
      targetTaskId: 'T-001',
      roadmapPhaseNumber: 0,
    },
  ]
}

function makeResearchRun(projectId: string) {
  return [
    {
      id: `run-vis-${projectId}`,
      projectId,
      mode: 'mock',
      status: 'completed' as const,
      startedAt: FIXED_DATE,
      completedAt: FIXED_DATE,
      rawOutput: null,
      normalizedBrief: null,
    },
  ]
}

// ─── Main seed function ───────────────────────────────────────────────────────

/**
 * Seeds localStorage with a full pipeline state and navigates to /history.
 *
 * Zustand persist format: `{ state: { ...storeState }, version: 0 }`
 *
 * After calling this, the page will render HistoryPage with:
 *   - Named project of the given type
 *   - Research run + brief
 *   - Spec pack
 *   - Architecture draft
 *   - One parsed prompt iteration (T-001, hasTests=true)
 *
 * All timestamps are pinned to FIXED_DATE so screenshots are stable.
 */
export async function seedHistoryPage(
  page: Page,
  projectType: 'application' | 'website',
): Promise<void> {
  const projectId = projectType === 'application' ? APP_PROJECT_ID : WEB_PROJECT_ID
  const project = projectType === 'application' ? makeAppProject() : makeWebProject()
  const ideaDraft = makeIdeaDraft(projectType)
  const researchBrief = makeResearchBrief(projectType)
  const specPack = makeSpecPack(projectType)
  const architectureDraft = makeArchitectureDraft(projectType)
  const promptIterations = makePromptIterations(projectId, projectType)
  const researchRuns = makeResearchRun(projectId)

  // Navigate to the app origin first so localStorage is accessible (Same-Origin Policy).
  // We land on '/' briefly — the seed data is written before Zustand rehydrates.
  await page.goto('/')
  // Clear any prior state from previous tests
  await page.evaluate(() => {
    localStorage.removeItem('ai-product-studio-registry')
    localStorage.removeItem('ai-product-studio-project')
  })

  await page.evaluate(
    ({
      projectId: pid,
      project: proj,
      ideaDraft: idea,
      researchBrief: brief,
      specPack: spec,
      architectureDraft: arch,
      promptIterations: iters,
      researchRuns: runs,
    }) => {
      // Registry store: project list + active selection
      localStorage.setItem(
        'ai-product-studio-registry',
        JSON.stringify({
          state: {
            projects: [proj],
            selectedProjectId: pid,
          },
          version: 0,
        }),
      )

      // Project store: all hot stage slots
      localStorage.setItem(
        'ai-product-studio-project',
        JSON.stringify({
          state: {
            activeProject: proj,
            projectData: {},
            ideaDraft: idea,
            researchRuns: runs,
            importedArtifacts: [],
            researchBrief: brief,
            specPack: spec,
            architectureDraft: arch,
            promptIterations: iters,
            ui: { sidebarOpen: false, activeTab: 'overview' },
          },
          version: 0,
        }),
      )
    },
    { projectId, project, ideaDraft, researchBrief, specPack, architectureDraft, promptIterations, researchRuns },
  )

  // Navigate to HistoryPage; Zustand will rehydrate from the seeded localStorage.
  await page.goto('/history')
}
