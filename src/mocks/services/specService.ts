import type { ResearchBrief, SpecPack, ArchitectureDraft, ProjectType } from '../../shared/types'

// ─── Mock spec generation service ────────────────────────────────────────────
// Generates spec and architecture drafts from a research brief and project type.
// Replace with real AI-powered generation in Phase 3.
// implements F-005, F-006, F-025 / T-105, T-205

// ─── Application mock fixtures ────────────────────────────────────────────────

const applicationSpecFeatures: SpecPack['featureList'] = [
  { id: 'f-001', name: 'User onboarding', description: 'Sign-up / sign-in flow with clear first-use guidance and an empty-state dashboard.', priority: 'must' },
  { id: 'f-002', name: 'Core data management', description: 'Create, view, edit, and delete the primary entities of the application.', priority: 'must' },
  { id: 'f-003', name: 'Dashboard / overview', description: 'Summary view of the user\'s current state, key metrics, and pending actions.', priority: 'must' },
  { id: 'f-004', name: 'In-app navigation', description: 'Sidebar or bottom-nav routing between major sections; breadcrumb context for nested flows.', priority: 'must' },
  { id: 'f-005', name: 'User settings', description: 'Profile and preferences screen; ability to update account details.', priority: 'should' },
  { id: 'f-006', name: 'Notifications / alerts', description: 'In-app feedback (toasts, banners) for async actions, errors, and important state changes.', priority: 'should' },
  { id: 'f-007', name: 'Search and filtering', description: 'Filter or search the primary entity list by name, status, or date.', priority: 'should' },
  { id: 'f-008', name: 'Export / share', description: 'Export key data as CSV, JSON, or markdown; optional shareable read-only link.', priority: 'could' },
  { id: 'f-009', name: 'Keyboard shortcuts', description: 'Power-user shortcuts for common create/navigate/submit actions.', priority: 'could' },
  { id: 'f-010', name: 'Multi-user collaboration', description: 'Invite team members, share workspaces, role-based permissions.', priority: 'wont' },
]

const applicationArchStack: ArchitectureDraft['recommendedStack'] = [
  { name: 'React', role: 'UI layer', rationale: 'Component-based SPA with strong ecosystem; ideal for stateful, interactive application UIs' },
  { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors, self-documenting domain models and props contracts' },
  { name: 'Vite', role: 'Build tool', rationale: 'Fast HMR, lean bundle, zero-config for React + TypeScript' },
  { name: 'Zustand', role: 'State management', rationale: 'Lightweight store with built-in persistence; avoids boilerplate of Redux for MVP scope' },
  { name: 'React Router', role: 'Client routing', rationale: 'Declarative SPA routing with nested layouts and protected route support' },
  { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first, responsive, consistent design system without runtime CSS overhead' },
]

const applicationRoadmap: ArchitectureDraft['roadmapPhases'] = [
  {
    phase: 0,
    title: 'Foundation',
    goals: ['App shell', 'Routing', 'Layout and navigation', 'State store', 'Typed domain models', 'Mock data'],
    estimatedComplexity: 'low',
  },
  {
    phase: 1,
    title: 'Core flow',
    goals: ['Onboarding screen', 'Primary entity list', 'Create/edit form', 'Delete with confirmation'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 2,
    title: 'Dashboard and navigation',
    goals: ['Summary dashboard', 'In-app navigation', 'Breadcrumbs', 'Empty states'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 3,
    title: 'Search, filters, and settings',
    goals: ['Entity filtering', 'Search bar', 'User settings page', 'Notification toasts'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 4,
    title: 'Polish and export',
    goals: ['Export to CSV/JSON', 'Keyboard shortcuts', 'Error boundaries', 'Performance audit'],
    estimatedComplexity: 'high',
  },
]

// ─── Website mock fixtures ────────────────────────────────────────────────────

const websiteSpecFeatures: SpecPack['featureList'] = [
  { id: 'f-001', name: 'Homepage', description: 'Hero section with value proposition, CTA, and key highlights.', priority: 'must' },
  { id: 'f-002', name: 'Content pages', description: 'About, services/product, and any static info pages.', priority: 'must' },
  { id: 'f-003', name: 'Blog / articles', description: 'Markdown-based article list and detail pages with SEO metadata.', priority: 'must' },
  { id: 'f-004', name: 'Contact form', description: 'Simple form that sends an inquiry email via a serverless function.', priority: 'should' },
  { id: 'f-005', name: 'SEO optimization', description: 'Per-page meta tags, Open Graph, and sitemap.xml generation.', priority: 'should' },
  { id: 'f-006', name: 'Dark mode', description: 'System-preference-aware colour scheme with manual toggle.', priority: 'could' },
  { id: 'f-007', name: 'CMS integration', description: 'Swap markdown files for a headless CMS (e.g. Contentful).', priority: 'could' },
  { id: 'f-008', name: 'Analytics', description: 'Privacy-friendly page-view tracking.', priority: 'could' },
  { id: 'f-009', name: 'Multi-language', description: 'i18n support for additional locales.', priority: 'wont' },
]

const websiteArchStack: ArchitectureDraft['recommendedStack'] = [
  { name: 'Next.js', role: 'Framework', rationale: 'SSR/SSG for SEO, file-based routing, built-in image optimisation, ideal for content-driven websites' },
  { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors, self-documenting page props and API routes' },
  { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first, responsive, consistent design system with minimal CSS overhead' },
  { name: 'MDX', role: 'Content authoring', rationale: 'Markdown + JSX lets developers write content without a CMS in V1; easy to swap later' },
  { name: 'Vercel', role: 'Hosting / deployment', rationale: 'Zero-config Next.js deployment, global CDN, automatic preview URLs, free tier' },
]

const websiteRoadmap: ArchitectureDraft['roadmapPhases'] = [
  {
    phase: 0,
    title: 'Foundation',
    goals: ['Next.js scaffold', 'Tailwind setup', 'Layout shell', 'Navigation', 'Dark mode'],
    estimatedComplexity: 'low',
  },
  {
    phase: 1,
    title: 'Core pages',
    goals: ['Homepage', 'About page', 'Content page template', 'MDX pipeline'],
    estimatedComplexity: 'low',
  },
  {
    phase: 2,
    title: 'Blog',
    goals: ['Article list page', 'Article detail page', 'Tag/category filtering', 'RSS feed'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 3,
    title: 'SEO and contact',
    goals: ['Per-page meta tags', 'Open Graph images', 'Sitemap.xml', 'Contact form + serverless handler'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 4,
    title: 'Polish and CMS',
    goals: ['Analytics integration', 'Performance audit', 'Optional headless CMS adapter'],
    estimatedComplexity: 'high',
  },
]

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockSpecService = {
  async generateSpec(brief: ResearchBrief, projectType: ProjectType): Promise<SpecPack> {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    if (projectType === 'website') {
      return {
        projectType: 'website',
        productSummary:
          brief.valueHypothesis
            ? `A content-driven website: ${brief.valueHypothesis}`
            : 'A fast, SEO-optimised website with a blog, static content pages, and a contact form. Built for discoverability and ease of content authoring.',
        MVPScope:
          brief.recommendedMVP ||
          'Homepage, about page, markdown-based blog, and contact form. No CMS, no authentication, no e-commerce in V1.',
        featureList: websiteSpecFeatures,
        assumptions: [
          'Content is authored by developers in MDX for V1',
          'No database required for V1 — all content is file-based',
          'Contact form uses a serverless function; no backend server',
          ...(brief.targetUsers?.slice(0, 2).map((u) => `Primary audience: ${u}`) ?? []),
        ],
        constraints: [
          'No authentication',
          'No database in MVP',
          'No e-commerce',
          'Must achieve Lighthouse score ≥ 90 on mobile',
        ],
        acceptanceNotes:
          'A visitor can navigate homepage → blog → article and fill the contact form — all without JavaScript required for core content (SSG).',
      }
    }

    // application
    return {
      projectType: 'application',
      productSummary: brief.valueHypothesis
        ? `An application: ${brief.valueHypothesis}`
        : 'A stateful web application with user onboarding, core entity management, and a dashboard.',
      MVPScope:
        brief.recommendedMVP ||
        'Single-user mode. Onboarding flow, core entity CRUD, dashboard overview. No collaboration, no billing, no export in V1.',
      featureList: applicationSpecFeatures,
      assumptions: [
        'Users interact primarily through a desktop or tablet browser',
        'No real-time collaboration required in V1',
        'Local state persistence is sufficient for single-user MVP',
        ...(brief.targetUsers?.slice(0, 2).map((u) => `Primary audience: ${u}`) ?? []),
      ],
      constraints: [
        'No backend server in MVP — client-only with local storage',
        'No authentication in V1',
        'No billing',
        'Must be usable on mobile (responsive layout)',
      ],
      acceptanceNotes:
        'A user can complete the onboarding flow, create and manage the core entities, see a dashboard summary, and return to their data after a page refresh.',
    }
  },

  async generateArchitecture(_spec: SpecPack, projectType: ProjectType): Promise<ArchitectureDraft> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (projectType === 'website') {
      return {
        projectType: 'website',
        recommendedStack: websiteArchStack,
        moduleArchitecture:
          'Next.js app router: app/ shell → pages/ → components/ → content/ MDX files → lib/ utilities. No database in V1 — content sourced from markdown files in the repo.',
        dataFlow:
          'Static content at build time: MDX files → @next/mdx → static HTML pages. Dynamic paths (contact form) via Next.js API routes deployed as Vercel serverless functions.',
        roadmapPhases: websiteRoadmap,
        technicalRisks: [
          'MDX build times grow with content volume — plan for incremental static regeneration if > 500 posts',
          'Contact form serverless function requires environment variables for email provider — document setup clearly',
          'SEO depends on correct canonical URLs and meta tags — review with Lighthouse before launch',
          'Switching to a headless CMS later requires content migration — keep MDX schema simple and consistent',
        ],
      }
    }

    // application
    return {
      projectType: 'application',
      recommendedStack: applicationArchStack,
      moduleArchitecture:
        'Feature-sliced architecture: app shell → route-level pages → feature modules → domain entities → shared utilities. State managed in Zustand stores; components are pure and receive data via props or store selectors.',
      dataFlow:
        'User action → store action → state update → UI re-render. Async operations (future API calls) go through service adapters that return typed results into the store. No direct API calls from components.',
      roadmapPhases: applicationRoadmap,
      technicalRisks: [
        'Local storage (~5 MB) may be hit with large entity lists — plan for IndexedDB if data grows',
        'Client-only persistence means data is lost when browser storage is cleared — warn users',
        'No auth in V1 limits sharing; adding it later requires refactoring routing and store shape',
        'SPA routing requires a server fallback rule (e.g. 404 → index.html) for production deploys',
      ],
    }
  },
}
