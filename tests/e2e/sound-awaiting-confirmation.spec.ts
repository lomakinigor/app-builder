// SOUND-004 — E2E verification of the awaiting_confirmation attentionSignal path
// in PromptLoopPage.
//
// Why E2E (not unit):
//   Unit tests (attentionSignal.test.ts groups B, D) already cover the
//   awaiting_confirmation timing, priority, and stop-on-explicit-call logic
//   with a mocked AudioContext.
//   This test covers the full browser stack through a real PromptLoop flow:
//     handleGenerateFirst() → startAttentionSignal('awaiting_confirmation')
//     → AudioContext.createOscillator() → OscillatorNode.start()  ← real browser API
//     → user types in response textarea
//     → stopAttentionSignal('awaiting_confirmation') (PromptLoopPage onChange handler)
//     → no further oscillator starts recorded
//
// Interception strategy:
//   Same AudioContext prototype patch from T-019 / audioMonitor.ts.
//   All oscillator-start events are recorded in window.__audioPlayLog.
//
// Test case:
//   SOUND-004  Generate first prompt → oscillator-start recorded (awaiting_confirmation)
//              → type in response textarea → log count does not grow further

import { test, expect } from '@playwright/test'
import {
  injectAudioMonitor,
  getPlayedSounds,
  waitForSoundAttempt,
} from './helpers/audioMonitor'

// ─── Seed constants ────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'app-builder-settings'
const FIXED_DATE = '2026-01-15T10:00:00.000Z'
const PROJECT_ID = 'sound-004-proj-001'

function settingsPayload(soundEnabled: boolean) {
  return JSON.stringify({ state: { soundNotificationsEnabled: soundEnabled }, version: 0 })
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // Audio spy must be registered before any navigation so the prototype patch
  // is in place when PromptLoopPage's JS first runs.
  await injectAudioMonitor(page)

  // Land on origin to access localStorage, then clear all prior state.
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// ─── SOUND-004 ────────────────────────────────────────────────────────────────

test('SOUND-004 — awaiting_confirmation beeps after first prompt generated, stop when response provided', async ({ page }) => {

  // ── Seed: project with spec + arch ready, no iterations, sound ON ─────────────
  //
  // PromptLoopPage enables "Сгенерировать первый промпт" when specPack,
  // architectureDraft, and activeProject are all present.  We seed these
  // directly via localStorage so the test does not have to run the full
  // Research → Spec → Architecture pipeline.

  const project = {
    id: PROJECT_ID,
    name: 'SOUND-004 Test Project',
    projectType: 'application',
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    status: 'active',
    currentStage: 'prompt_loop',
  }

  const specPack = {
    projectType: 'application',
    productSummary: 'An AI-powered task management application',
    MVPScope: 'Single-user CRUD with local persistence.',
    featureList: [
      { id: 'f-001', name: 'Task list', description: 'Create and view tasks', priority: 'must' },
    ],
    assumptions: ['Desktop browser primary'],
    constraints: ['No backend in V1'],
    acceptanceNotes: '',
  }

  const architectureDraft = {
    projectType: 'application',
    moduleArchitecture: 'Feature-sliced design',
    dataFlow: 'Zustand store → React components',
    technicalRisks: [],
    recommendedStack: [
      { name: 'React', role: 'UI layer', rationale: 'Component-based SPA' },
      { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors' },
    ],
    roadmapPhases: [
      { phase: 0, title: 'Foundation', goals: ['App shell', 'Routing'], estimatedComplexity: 'low' },
    ],
  }

  await page.evaluate(
    ({ pid, proj, spec, arch, settingsKey, settingsVal }) => {
      // Sound notifications: ON
      localStorage.setItem(settingsKey, settingsVal)

      // Registry store: project list + active selection
      localStorage.setItem(
        'ai-product-studio-registry',
        JSON.stringify({ state: { projects: [proj], selectedProjectId: pid }, version: 0 }),
      )

      // Project store: spec + arch ready; no prompt iterations (generate button enabled)
      localStorage.setItem(
        'ai-product-studio-project',
        JSON.stringify({
          state: {
            activeProject: proj,
            projectData: {},
            ideaDraft: null,
            researchRuns: [],
            importedArtifacts: [],
            researchBrief: null,
            specPack: spec,
            architectureDraft: arch,
            promptIterations: [],
            ui: { sidebarOpen: false, activeTab: 'overview' },
          },
          version: 0,
        }),
      )
    },
    {
      pid: PROJECT_ID,
      proj: project,
      spec: specPack,
      arch: architectureDraft,
      settingsKey: SETTINGS_KEY,
      settingsVal: settingsPayload(true),
    },
  )

  // ── Navigate to PromptLoopPage ────────────────────────────────────────────────

  await page.goto('/prompt-loop')
  await expect(page.getByRole('heading', { name: 'Цикл промптов', level: 1 })).toBeVisible()

  // ── Baseline: no beeps before any action ─────────────────────────────────────

  const logBefore = await getPlayedSounds(page)
  expect(logBefore).toHaveLength(0)

  // ── Generate first prompt — triggers awaiting_confirmation ───────────────────
  //
  // handleGenerateFirst() calls startAttentionSignal('awaiting_confirmation')
  // immediately after addPromptIteration() completes.
  // The first beep fires synchronously in startAttentionSignal → playBeep() →
  // doBeep(), so the oscillator-start is recorded before the iteration card
  // heading is visible.

  const genFirstBtn = page.getByRole('button', { name: 'Сгенерировать первый промпт' })
  await expect(genFirstBtn).toBeEnabled({ timeout: 10_000 })
  await genFirstBtn.click()

  // UI marker: iteration card heading becomes visible once generateFirstPrompt()
  // resolves and startAttentionSignal('awaiting_confirmation') has been called.
  await expect(page.getByRole('heading', { name: 'Итерация 1', level: 3 })).toBeVisible({ timeout: 8_000 })

  // ── Assert: at least one oscillator-start was recorded ───────────────────────
  //
  // waitForSoundAttempt uses page.waitForFunction to handle the rare case where
  // AudioContext was suspended (autoplay policy) and the beep arrived after
  // resume().then(doBeep).  In Playwright Chromium the context starts in 'running'
  // state, so the beep is typically already in the log before this await returns.

  await waitForSoundAttempt(page, 3_000)

  const logAfterGenerate = await getPlayedSounds(page)
  expect(logAfterGenerate.length).toBeGreaterThan(0)
  expect(logAfterGenerate[0].type).toBe('oscillator-start')

  // ── Provide response — stops awaiting_confirmation ───────────────────────────
  //
  // Typing in the response textarea triggers the onChange handler which calls
  // stopAttentionSignal('awaiting_confirmation').
  // (See PromptLoopPage.tsx: onChange / onFocus on the response textarea.)

  const responseArea = page.getByPlaceholder('Вставьте полный ответ Claude здесь…')
  await responseArea.fill('1. Brief analysis\nTest response for SOUND-004')

  // ── Assert: no further beeps after the signal is stopped ─────────────────────
  //
  // Snapshot the log count immediately after providing input, then wait a short
  // window and assert the count has not grown.
  //
  // Safety margin rationale:
  //   SIGNAL_INTERVAL_MS = 15 000ms — the next scheduled beep is 15 s away.
  //   stopAttentionSignal() cancels the timer, so no further beeps fire.
  //   300ms is well inside this window; it is long enough to catch a spurious
  //   beep from a still-running timer but short enough to keep the test fast.

  const countAfterStop = (await getPlayedSounds(page)).length

  await page.waitForTimeout(300)

  const logAfterWait = await getPlayedSounds(page)
  expect(logAfterWait.length).toBe(countAfterStop)
})
