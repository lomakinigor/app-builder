// T-021 — Visual regression snapshot for PromptLoopPage in parsed-iteration state.
//
// PromptLoopPage in "summary" state renders (when a parsed iteration exists):
//   - PageHeader "Цикл промптов" with project-type + iteration-count badges
//   - CycleContextBar: project type / cycle phase / target task / phase number
//   - Active iteration card: iteration header, status badge, prompt text, copy buttons
//   - Parsed result card: analysis, plan, implementation summary, changed files
//     (test files highlighted in green), implemented task IDs, next step
//     with inferred-phase badge and next-task badge
//   - "Готово к итерации 2" card with Code+Tests button and Review button
//     (Review button visible because canAdvanceToReview passes:
//      hasTests=true, warnings=[], inferredNextPhase='review', targetTaskId='T-001')
//
// Seed strategy:
//   seedPromptLoopPage() writes full pipeline state (project, spec, arch, one
//   parsed iteration) to localStorage before navigation so Zustand rehydration
//   picks it up synchronously.  All dates are pinned to FIXED_DATE and locale
//   is pinned to 'ru-RU' in playwright.visual.config.ts.
//
// Stability measures:
//   - All CSS animations/transitions disabled (preparePageForScreenshot)
//   - document.fonts.ready awaited
//   - Seeded promptText is fixed — no dynamic generation calls are made
//   - No clipboard or modal interactions — static parsed state only
//
// Baseline file: promptloop-summary-desktop.png
// To update: npm run test:visual:update

import { test, expect } from '@playwright/test'
import { preparePageForScreenshot } from './helpers/preparePageForScreenshot'
import { seedPromptLoopPage } from './helpers/seedState'

test('VIS-003 — PromptLoopPage: application project parsed iteration (desktop)', async ({ page }) => {
  // Seed: full pipeline + one parsed iteration (T-001, hasTests=true, inferredNextPhase='review')
  await seedPromptLoopPage(page, 'application')

  // Sanity 1: page heading confirms PromptLoopPage rendered
  await expect(page.getByRole('heading', { name: 'Цикл промптов', level: 1 })).toBeVisible()

  // Sanity 2: parsed iteration badge confirms the seeded summary state loaded
  await expect(page.getByText('Распарсено').first()).toBeVisible()

  // Stabilise for screenshot (freeze animations, fonts.ready, image await)
  await preparePageForScreenshot(page)

  // Visual assertion — full-page captures all sections of the summary view
  await expect(page).toHaveScreenshot('promptloop-summary-desktop.png', {
    fullPage: true,
  })
})
