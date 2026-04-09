import type { ResearchBrief, SpecPack, ArchitectureDraft, ProjectType } from '../../shared/types'
import { mockSpecPack, mockArchitectureDraft } from '../project/seedData'

// ─── Mock spec generation service ────────────────────────────────────────────
// Generates spec and architecture drafts from a research brief and project type.
// Replace with real AI-powered generation in Phase 3.
// implements F-005, F-006, F-025 / T-105

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
      ...mockSpecPack,
      projectType: 'application',
      productSummary: brief.valueHypothesis || mockSpecPack.productSummary,
      MVPScope: brief.recommendedMVP || mockSpecPack.MVPScope,
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

    // application — use mock plus carry spec context
    return {
      ...mockArchitectureDraft,
      projectType: 'application',
    }
  },
}
