import { defineConfig, devices } from '@playwright/test'

// T-018 — Visual regression config for AI Product Studio.
//
// Intentionally separate from playwright.config.ts (E2E happy-path):
//   - Different testDir — visual snapshots live in tests/visual/
//   - Pinned locale so toLocaleDateString() / toLocaleString() produce
//     stable output across machines (always 'ru-RU' format: 15.01.2026)
//   - Wider viewport for richer desktop composition
//   - No retries — snapshots must be deterministic, not retried
//
// Usage:
//   npx playwright test --config=playwright.visual.config.ts
//   npm run test:visual
//
// Update baselines (only do this intentionally, after visual review):
//   npm run test:visual:update

export default defineConfig({
  testDir: 'tests/visual',

  // Visual tests are deterministic; no retries.
  retries: 0,
  fullyParallel: false,

  // Per-test timeout: navigation + seed + fonts.ready + screenshot
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    // Pixel diff threshold — 0.2% max diff per pixel before the test fails.
    // Tight enough to catch regressions; loose enough to avoid font-hinting flake.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
    },
  },

  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:5173',

    // Desktop-first visual baseline — wide enough to show sidebar + content.
    viewport: { width: 1440, height: 900 },

    // Pin locale so toLocaleDateString() / toLocaleString() always renders
    // in the same format regardless of the CI machine's system locale.
    locale: 'ru-RU',

    // Colour scheme: light mode baseline (dark mode is a separate concern).
    colorScheme: 'light',

    // Capture screenshot on every failure for quick visual diagnosis.
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        locale: 'ru-RU',
        colorScheme: 'light',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
