// audioMonitor.ts — Playwright-level Web Audio spy for CI-friendly sound verification.
//
// Why this approach:
//   attentionSignal.ts uses the Web Audio API exclusively:
//     AudioContext → createOscillator() → OscillatorNode.start()
//   No HTMLAudioElement or AudioBufferSourceNode is involved.
//
//   We intercept at AudioContext.prototype.createOscillator so that every
//   oscillator instance (which may be created AFTER addInitScript runs) gets
//   a wrapped start().  This works even though attentionSignal.ts lazily
//   creates its AudioContext on first use, because addInitScript patches the
//   prototype before any page JS runs.
//
//   The spy records each OscillatorNode.start() call into window.__audioPlayLog.
//   Production behaviour is unchanged — the real start() is still called.
//
// Usage in a test:
//
//   // BEFORE any page.goto():
//   await injectAudioMonitor(page)
//
//   await page.goto('/settings')
//   await page.getByRole('button', { name: 'Проверить звук' }).click()
//   await waitForSoundAttempt(page)
//
//   const log = await getPlayedSounds(page)
//   expect(log.length).toBeGreaterThan(0)

import type { Page } from '@playwright/test'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioLogEntry {
  timestamp: number
  /** 'oscillator-start' — OscillatorNode.start() was invoked */
  type: 'oscillator-start'
  /** AudioContext.state at time of the call ('running' | 'suspended' | 'closed') */
  contextState: string
}

// ─── Init script injection ────────────────────────────────────────────────────

/**
 * Register a browser-side spy that intercepts AudioContext.prototype.createOscillator
 * and records every OscillatorNode.start() call in window.__audioPlayLog.
 *
 * MUST be called before any page.goto() — Playwright executes addInitScript
 * scripts before the page's own JavaScript, on every navigation.
 *
 * Graceful degradation: if AudioContext is unavailable (e.g. in a non-browser
 * environment) the spy installs a no-op log and skips patching.
 */
export async function injectAudioMonitor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__audioPlayLog = []

    if (typeof AudioContext === 'undefined') return

    const origCreateOscillator = AudioContext.prototype.createOscillator

    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      const osc = origCreateOscillator.call(this)
      const origStart = osc.start.bind(osc)
      // Capture `this` (the AudioContext) for state logging
      const ctx = this

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      osc.start = function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__audioPlayLog.push({
          timestamp: Date.now(),
          type: 'oscillator-start',
          contextState: ctx.state,
        })
        origStart(...args)
      }

      return osc
    }
  })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Returns all audio playback attempts recorded on the current page.
 * Safe to call at any time; returns [] if no attempts have been made.
 */
export async function getPlayedSounds(page: Page): Promise<AudioLogEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => (window as any).__audioPlayLog ?? [])
}

/**
 * Clears the audio playback log.
 * Call before the action under test to isolate assertions to that action.
 */
export async function clearPlayedSounds(page: Page): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.evaluate(() => { ;(window as any).__audioPlayLog = [] })
}

/**
 * Waits until at least one OscillatorNode.start() has been recorded.
 *
 * attentionSignal.ts may defer doBeep() via AudioContext.resume().then(doBeep)
 * when the context is in 'suspended' state, so the beep is not always
 * synchronous with the UI action.  Use this helper instead of a fixed timeout.
 *
 * @param timeoutMs  Fail if no attempt recorded within this window (default 3s).
 */
export async function waitForSoundAttempt(page: Page, timeoutMs = 3_000): Promise<void> {
  await page.waitForFunction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => ((window as any).__audioPlayLog as unknown[]).length > 0,
    { timeout: timeoutMs },
  )
}
