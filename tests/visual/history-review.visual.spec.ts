// T-018 — Visual regression snapshots for HistoryPage ("Обзор/Review" screen)
//
// HistoryPage is the single review/summary screen in the app — it renders:
//   - Project overview card (type badge, dates)
//   - Superpowers cycle timeline (6-stage progress)
//   - Task progress dashboard (filter dropdowns, task rows)
//   - Architecture & roadmap summary (stack badges, phase list)
//   - Prompt iterations (parsed iteration card with task/test badges)
//   - Spec summary (features, must/should breakdown)
//   - Review checklist
//   - Key decisions
//
// Visual tests catch: layout regressions, missing cards, broken card hierarchy,
// badge colour changes, composition issues — things that text assertions miss.
//
// Stability measures applied before every screenshot:
//   - All CSS animations/transitions disabled (preparePageForScreenshot)
//   - document.fonts.ready awaited
//   - All <img> elements awaited
//   - Dates stabilised via fixed ISO seed + locale: 'ru-RU' in playwright.visual.config.ts
//
// Baselines live in tests/visual/__snapshots__/ (committed to git).
// To update baselines: npm run test:visual:update

import { test, expect } from '@playwright/test'
import { preparePageForScreenshot } from './helpers/preparePageForScreenshot'
import { seedHistoryPage } from './helpers/seedState'

// ─── A. Application type — full pipeline ─────────────────────────────────────

test('VIS-001 — HistoryPage: application project full pipeline (desktop)', async ({ page }) => {
  // Seed: full pipeline — idea + research + spec + arch + 1 parsed iteration
  await seedHistoryPage(page, 'application')

  // Sanity: page rendered correctly before screenshot.
  // Use heading level 1 to avoid strict-mode violations (CardHeader also renders
  // the project name as h3; Sidebar and TopBar also repeat the name).
  await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI Task Manager Pro' })).toBeVisible()

  // Stabilise for screenshot
  await preparePageForScreenshot(page)

  // Visual assertion — full-page captures the entire summary composition
  await expect(page).toHaveScreenshot('history-app-desktop.png', {
    fullPage: true,
  })
})

// ─── B. Website type — full pipeline ─────────────────────────────────────────

test('VIS-002 — HistoryPage: website project full pipeline (desktop)', async ({ page }) => {
  // Seed: website type — verifies type badge and website-specific stack/spec rendering
  await seedHistoryPage(page, 'website')

  // Sanity
  await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Studio Blog Platform' })).toBeVisible()

  // Stabilise for screenshot
  await preparePageForScreenshot(page)

  // Visual assertion
  await expect(page).toHaveScreenshot('history-web-desktop.png', {
    fullPage: true,
  })
})
