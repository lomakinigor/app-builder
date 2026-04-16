// @vitest-environment jsdom
// Unit tests for the attentionSignal platform helper.
//
// Coverage groups:
//   A. Timing logic           (1–3)
//   B. Awaiting confirmation  (4–6)
//   C. Task completed         (7–8)
//   D. Anti-overlap           (9–11)
//   E. Disabled mode          (12–13)
//   F. Browser constraints    (14–15)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  startAttentionSignal,
  stopAttentionSignal,
  isAttentionSignalActive,
  setSoundNotificationsEnabled,
  isSoundNotificationsEnabled,
  _resetForTest,
  SIGNAL_INTERVAL_MS,
  SIGNAL_MAX_BEEPS,
} from './attentionSignal'

// ─── AudioContext mock factory ────────────────────────────────────────────────
// IMPORTANT: AudioContext must be mocked with `function` (not arrow), so that
// `new AudioContext()` works — arrow functions cannot be constructors.

function makeMockAudioCtx(state: 'running' | 'suspended' = 'running') {
  const oscillator = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
  }
  const gainNode = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  }
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    resume: vi.fn(() => Promise.resolve()),
  }
  return { ctx, oscillator, gainNode }
}

// ─── Per-test mock context reference ─────────────────────────────────────────

let mockCtx: ReturnType<typeof makeMockAudioCtx>['ctx']

function beepCount(): number {
  return mockCtx.createOscillator.mock.calls.length
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  _resetForTest()
  const { ctx } = makeMockAudioCtx('running')
  mockCtx = ctx
  // Must use `function` — arrow functions cannot be used as constructors.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).AudioContext = vi.fn(function () { return ctx })
  setSoundNotificationsEnabled(true)
})

afterEach(() => {
  vi.useRealTimers()
  _resetForTest()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).AudioContext
})

// ─── A. Timing logic ──────────────────────────────────────────────────────────

describe('A. Timing logic', () => {
  it('1. first beep fires immediately on start', () => {
    startAttentionSignal('task_completed')
    expect(beepCount()).toBe(1)
  })

  it('2. second beep fires after SIGNAL_INTERVAL_MS', () => {
    startAttentionSignal('task_completed')
    expect(beepCount()).toBe(1)

    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS)
    expect(beepCount()).toBe(2)
  })

  it('3. stops after SIGNAL_MAX_BEEPS total (no further beeps beyond max)', () => {
    startAttentionSignal('task_completed')
    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS * (SIGNAL_MAX_BEEPS - 1))
    expect(beepCount()).toBe(SIGNAL_MAX_BEEPS)

    // Further time must not produce additional beeps
    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS * 3)
    expect(beepCount()).toBe(SIGNAL_MAX_BEEPS)
    expect(isAttentionSignalActive()).toBe(false)
  })
})

// ─── B. Awaiting confirmation ─────────────────────────────────────────────────

describe('B. Awaiting confirmation', () => {
  it('4. stopAttentionSignal with matching reason stops the cycle', () => {
    startAttentionSignal('awaiting_confirmation')
    expect(isAttentionSignalActive()).toBe(true)

    stopAttentionSignal('awaiting_confirmation')
    expect(isAttentionSignalActive()).toBe(false)
  })

  it('5. stopAttentionSignal without reason (unconditional) stops any cycle', () => {
    startAttentionSignal('awaiting_confirmation')
    stopAttentionSignal()
    expect(isAttentionSignalActive()).toBe(false)
  })

  it('6. no further beeps fire after the signal is stopped', () => {
    startAttentionSignal('awaiting_confirmation')
    const beepsAtStop = beepCount()

    stopAttentionSignal('awaiting_confirmation')
    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS * 5)

    expect(beepCount()).toBe(beepsAtStop)
  })
})

// ─── C. Task completed ────────────────────────────────────────────────────────

describe('C. Task completed', () => {
  it('7. first user activity (click) stops the signal', () => {
    startAttentionSignal('task_completed')
    expect(isAttentionSignalActive()).toBe(true)

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(isAttentionSignalActive()).toBe(false)
  })

  it('8. no user activity → signal still capped at max beeps', () => {
    startAttentionSignal('task_completed')
    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS * (SIGNAL_MAX_BEEPS - 1))

    expect(beepCount()).toBe(SIGNAL_MAX_BEEPS)
    expect(isAttentionSignalActive()).toBe(false)
  })
})

// ─── D. Anti-overlap ──────────────────────────────────────────────────────────

describe('D. Anti-overlap', () => {
  it('9. second startAttentionSignal replaces first — no parallel cycles', () => {
    startAttentionSignal('task_completed')
    const beepsAfterFirst = beepCount() // 1 — immediate first beep

    // Replace with a new cycle (same priority); resets counter
    startAttentionSignal('task_completed')
    // Replacement fires its own immediate beep
    expect(beepCount()).toBe(beepsAfterFirst + 1)

    // Advance one full interval — only the new cycle fires (not two simultaneous)
    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS)
    expect(beepCount()).toBe(beepsAfterFirst + 2)
  })

  it('10. lower-priority task_completed does not interrupt active awaiting_confirmation', () => {
    startAttentionSignal('awaiting_confirmation')
    const beepsAfterFirst = beepCount()

    // Should be dropped — lower priority
    startAttentionSignal('task_completed')

    expect(isAttentionSignalActive()).toBe(true)
    // No additional immediate beep from the dropped call
    expect(beepCount()).toBe(beepsAfterFirst)
  })

  it('11. higher-priority awaiting_confirmation replaces active task_completed', () => {
    startAttentionSignal('task_completed')
    expect(isAttentionSignalActive()).toBe(true)

    startAttentionSignal('awaiting_confirmation')

    // Now awaiting_confirmation is active — should NOT auto-stop on user activity
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(isAttentionSignalActive()).toBe(true)

    stopAttentionSignal('awaiting_confirmation')
    expect(isAttentionSignalActive()).toBe(false)
  })
})

// ─── E. Disabled mode ─────────────────────────────────────────────────────────

describe('E. Disabled mode', () => {
  it('12. when disabled, startAttentionSignal produces no beep', () => {
    setSoundNotificationsEnabled(false)
    startAttentionSignal('task_completed')

    expect(beepCount()).toBe(0)
  })

  it('13. timer chain runs when disabled but no oscillators are created; re-enabling does not retroactively play', () => {
    setSoundNotificationsEnabled(false)
    startAttentionSignal('task_completed')

    vi.advanceTimersByTime(SIGNAL_INTERVAL_MS * 2)
    expect(beepCount()).toBe(0)

    setSoundNotificationsEnabled(true)
    expect(isSoundNotificationsEnabled()).toBe(true)
    // Still no retroactive beeps
    expect(beepCount()).toBe(0)
  })
})

// ─── F. Browser constraints ───────────────────────────────────────────────────

describe('F. Browser constraints', () => {
  it('14. missing AudioContext does not throw; cycle state is still tracked', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).AudioContext
    expect(() => startAttentionSignal('task_completed')).not.toThrow()
    expect(isAttentionSignalActive()).toBe(true)
    stopAttentionSignal()
    expect(isAttentionSignalActive()).toBe(false)
  })

  it('15. suspended AudioContext calls resume() without throwing', () => {
    const { ctx } = makeMockAudioCtx('suspended')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).AudioContext = vi.fn(function () { return ctx })

    expect(() => startAttentionSignal('task_completed')).not.toThrow()
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    stopAttentionSignal()
  })
})
