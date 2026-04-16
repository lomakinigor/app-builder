/**
 * Canonical spec fixtures shared across T-106 / T-108 / T-110.
 *
 * Each export is a factory function that accepts optional overrides and returns
 * a fresh SpecPack so tests cannot mutate a shared constant.
 *
 * Feature names here are the canonical vocabulary used in assertions:
 *   - Application: "User onboarding", "Core data management", "Dashboard / overview"
 *   - Website:     "Homepage", "Content pages", "Blog / articles"
 */

import type { SpecPack } from '../../shared/types'

/**
 * Canonical application spec.
 * featureList matches the service output pinned in T-102.
 */
export function createAppSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'An application: A focused task manager',
    MVPScope: 'Single-user CRUD with local persistence. No auth in V1.',
    featureList: [
      { id: 'f-001', name: 'User onboarding', description: 'Sign-up / sign-in flow', priority: 'must' },
      { id: 'f-002', name: 'Core data management', description: 'Create, view, edit, delete', priority: 'must' },
      { id: 'f-003', name: 'Dashboard / overview', description: 'Summary view', priority: 'must' },
    ],
    assumptions: ['Desktop browser primary'],
    constraints: ['No backend in V1'],
    acceptanceNotes: 'User can create tasks after reload.',
    ...overrides,
  }
}

/**
 * Canonical website spec.
 * featureList matches the service output pinned in T-102.
 */
export function createWebSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'website',
    productSummary: 'A content-driven website: A focused blog platform',
    MVPScope: 'Homepage, about page, markdown-based blog, and contact form. No CMS in V1.',
    featureList: [
      { id: 'f-001', name: 'Homepage', description: 'Hero section with value proposition, CTA', priority: 'must' },
      { id: 'f-002', name: 'Content pages', description: 'About, services pages', priority: 'must' },
      { id: 'f-003', name: 'Blog / articles', description: 'Markdown-based article list', priority: 'must' },
    ],
    assumptions: ['Content authored in MDX'],
    constraints: ['No authentication', 'No database in MVP'],
    acceptanceNotes: 'Visitor can navigate homepage → blog.',
    ...overrides,
  }
}
