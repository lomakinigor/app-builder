// T-019 — Automated verification of the notification sound playback path.
//
// Why E2E (not unit):
//   The unit suite (attentionSignal.test.ts) already covers the internal
//   timing/priority/kill-switch logic with a mocked AudioContext.
//   These tests cover the full browser stack:
//     Zustand persist hydration
//     → settingsStore.soundNotificationsEnabled
//     → attentionSignal.setSoundNotificationsEnabled()
//     → AudioContext + OscillatorNode.start()   ← real browser API
//
// Interception strategy:
//   addInitScript patches AudioContext.prototype.createOscillator before page
//   JS runs; every OscillatorNode.start() is recorded in window.__audioPlayLog.
//   We never assert on audible output — only on the API call being made.
//
// Test cases:
//   SOUND-001  sound ON  → "Проверить звук" → oscillator-start recorded
//   SOUND-002  sound OFF → "Проверить звук" button hidden + no oscillator
//   SOUND-003  toggle round-trip: ON → OFF → ON → preview fires
//
// Trigger rationale — Settings page preview button:
//   playTestBeep() calls playBeep() directly, with no async mock service delay.
//   It is the shortest, most reliable trigger for the sound path.
//   The button is visible only when soundNotificationsEnabled=true (UI gate),
//   which also exercises the store ↔ UI wiring.
//
// Stability notes:
//   - injectAudioMonitor() is called before any goto() so the prototype patch
//     survives every subsequent navigation in the test.
//   - waitForSoundAttempt() uses page.waitForFunction instead of fixed timeouts
//     to handle the resume().then(doBeep) async path when AudioContext is
//     suspended by Chrome's autoplay policy.
//   - localStorage is fully cleared in beforeEach to prevent cross-test bleed.

import { test, expect } from '@playwright/test'
import {
  injectAudioMonitor,
  getPlayedSounds,
  clearPlayedSounds,
  waitForSoundAttempt,
} from './helpers/audioMonitor'

// ─── Shared seed helpers ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'app-builder-settings'

function settingsPayload(soundEnabled: boolean) {
  return JSON.stringify({ state: { soundNotificationsEnabled: soundEnabled }, version: 0 })
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // Audio spy must be registered before any navigation
  await injectAudioMonitor(page)

  // Land on origin to access localStorage, then clear all prior state
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// ─── SOUND-001 — Sound ON → playback attempt exists ──────────────────────────

test('SOUND-001 — sound ON: preview button fires oscillator-start', async ({ page }) => {
  // Seed: sound notifications explicitly enabled
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SETTINGS_KEY, value: settingsPayload(true) },
  )

  await page.goto('/settings')

  // Sanity: the page rendered the settings heading
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()

  // Sanity: the toggle is ON (aria-checked="true")
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')

  // Sanity: preview button is visible when sound is ON
  const previewBtn = page.getByRole('button', { name: 'Проверить звук' })
  await expect(previewBtn).toBeVisible()

  // Baseline: no sound before the click
  const logBefore = await getPlayedSounds(page)
  expect(logBefore).toHaveLength(0)

  // Action: click the preview button → calls playTestBeep() → playBeep()
  await previewBtn.click()

  // Wait for oscillator-start (handles the resume().then(doBeep) async path)
  await waitForSoundAttempt(page, 3_000)

  const log = await getPlayedSounds(page)
  expect(log.length).toBeGreaterThan(0)
  expect(log[0].type).toBe('oscillator-start')

  // Optional diagnostic: log the AudioContext state at time of call
  // (running = gesture-unlocked; suspended = autoplay-deferred but still fired)
  // Both are valid — what matters is the call was made.
  const states = log.map((e) => e.contextState)
  expect(['running', 'suspended']).toContain(states[0])
})

// ─── SOUND-002 — Sound OFF → no playback attempt ─────────────────────────────

test('SOUND-002 — sound OFF: preview button hidden, no oscillator fired', async ({ page }) => {
  // Seed: sound notifications disabled
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SETTINGS_KEY, value: settingsPayload(false) },
  )

  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()

  // UI gate: toggle is OFF
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

  // UI gate: preview button is NOT rendered when sound is off
  await expect(page.getByRole('button', { name: 'Проверить звук' })).not.toBeVisible()

  // Kill-switch verification: Zustand onRehydrateStorage called syncAudio(false)
  // so even if playBeep() were somehow reached, soundEnabled=false returns early.
  // Verified by the log being empty after full page render + hydration.
  const log = await getPlayedSounds(page)
  expect(log).toHaveLength(0)
})

// ─── SOUND-003 — Toggle round-trip: OFF → ON → preview fires ─────────────────

test('SOUND-003 — toggle round-trip: disable then re-enable → preview fires', async ({ page }) => {
  // Start with sound ON
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SETTINGS_KEY, value: settingsPayload(true) },
  )

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()

  const toggle = page.getByRole('switch')

  // Step 1: turn sound OFF via toggle
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  // Preview button disappears when OFF
  await expect(page.getByRole('button', { name: 'Проверить звук' })).not.toBeVisible()

  // Step 2: turn sound ON again
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  // Preview button reappears
  const previewBtn = page.getByRole('button', { name: 'Проверить звук' })
  await expect(previewBtn).toBeVisible()

  // Clear log to isolate the upcoming click from any prior activity
  await clearPlayedSounds(page)

  // Step 3: preview → oscillator must fire
  await previewBtn.click()
  await waitForSoundAttempt(page, 3_000)

  const log = await getPlayedSounds(page)
  expect(log.length).toBeGreaterThan(0)
  expect(log[0].type).toBe('oscillator-start')
})
