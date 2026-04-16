import { defineConfig, devices } from '@playwright/test'

// E2E-001 — Playwright config for AI Product Studio.
// Runs a single Chromium-only happy path against the Vite dev server.
// Trace + video captured on retry so failures are fully reproducible.

export default defineConfig({
  testDir: 'tests/e2e',

  // Per-test timeout (covers mock service delays: ~1.5s research + ~1.2s spec + ~1s arch + ~0.8s prompt)
  timeout: 40_000,

  // Assertion timeout — allows waiting for async UI signals without explicit waits
  expect: { timeout: 10_000 },

  // Happy path is stateful; run sequentially so tests don't share server state
  fullyParallel: false,

  // One retry in CI to rule out transient flake; none locally
  retries: process.env.CI ? 1 : 0,

  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    // Desktop viewport so the sidebar nav is visible (≥lg breakpoint = 1024px)
    viewport: { width: 1280, height: 720 },
    // Collect trace / video only on retry — keeps normal runs fast
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // Reuse a running dev server locally; CI always starts fresh
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
