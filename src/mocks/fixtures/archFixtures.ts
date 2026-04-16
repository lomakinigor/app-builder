/**
 * Canonical architecture fixtures shared across T-104 / T-108 / T-110.
 *
 * Each export is a factory function that returns a fresh ArchitectureDraft
 * object so tests cannot accidentally mutate a shared constant.
 *
 * The canonical stacks, roadmap phases and vocabularies here are the
 * single source of truth for:
 *   - Application: React + TypeScript + Vite + Zustand + React Router + Tailwind CSS
 *   - Website:     Next.js + TypeScript + Tailwind CSS + MDX + Vercel
 */

import type { ArchitectureDraft } from '../../shared/types'

// ─── Application ──────────────────────────────────────────────────────────────

/**
 * Full 5-phase application architecture (foundation → polish).
 * Stack: React, TypeScript, Vite, Zustand, React Router, Tailwind CSS.
 */
export function createAppArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
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
    ...overrides,
  }
}

/**
 * Application arch scoped to a single phase: phase 1 "Core flow".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createAppArchCoreFlow(): ArchitectureDraft {
  return createAppArch({
    roadmapPhases: [
      { phase: 1, title: 'Core flow', goals: ['Onboarding screen', 'Primary entity list', 'Create/edit form'], estimatedComplexity: 'medium' },
    ],
  })
}

// ─── Website ──────────────────────────────────────────────────────────────────

/**
 * Full 5-phase website architecture (foundation → polish & CMS).
 * Stack: Next.js, TypeScript, Tailwind CSS, MDX, Vercel.
 */
export function createWebArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'website',
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
    ...overrides,
  }
}

/**
 * Website arch scoped to a single phase: phase 1 "Core pages".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createWebArchCorePages(): ArchitectureDraft {
  return createWebArch({
    roadmapPhases: [
      { phase: 1, title: 'Core pages', goals: ['Homepage', 'About page', 'MDX pipeline'], estimatedComplexity: 'low' },
    ],
  })
}

/**
 * Website arch scoped to a single phase: phase 2 "Blog".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createWebArchBlog(): ArchitectureDraft {
  return createWebArch({
    roadmapPhases: [
      { phase: 2, title: 'Blog', goals: ['Article list page', 'Article detail page', 'RSS feed'], estimatedComplexity: 'medium' },
    ],
  })
}
