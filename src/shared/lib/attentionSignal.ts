// attentionSignal.ts — Platform-wide repeating attention signal helper.
//
// Contract:
//   - Two signal reasons: 'awaiting_confirmation' | 'task_completed'
//   - First beep fires immediately; repeats every 15 s; max 3 total
//   - Priority: awaiting_confirmation (2) > task_completed (1)
//     → lower-priority start() is silently dropped while a higher-priority
//       signal is active; same/higher replaces (resets count and timer)
//   - 'task_completed' stops automatically on first meaningful user activity
//     (click / keydown / pointerdown on the document)
//   - 'awaiting_confirmation' requires explicit stopAttentionSignal() call
//   - Global kill switch: setSoundNotificationsEnabled(false)
//   - Graceful degradation when AudioContext is unavailable or autoplay-blocked:
//     helper never throws; if context is suspended it attempts resume() first
//
// Usage:
//   import { startAttentionSignal, stopAttentionSignal } from '…/attentionSignal'
//
//   // When async work finishes and user may have walked away:
//   startAttentionSignal('task_completed')
//
//   // When UI is blocking and waiting for explicit user input:
//   startAttentionSignal('awaiting_confirmation')
//
//   // On confirm / reject / unmount:
//   stopAttentionSignal('awaiting_confirmation')   // or stopAttentionSignal()
//
// See docs/platform-attention-signals.md for full platform contract.

export type SignalReason = 'awaiting_confirmation' | 'task_completed'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY: Record<SignalReason, number> = {
  awaiting_confirmation: 2,
  task_completed: 1,
}

/** Milliseconds between beeps */
export const SIGNAL_INTERVAL_MS = 15_000

/** Maximum number of beeps per cycle (including the immediate first one) */
export const SIGNAL_MAX_BEEPS = 3

/** Events that stop a 'task_completed' signal when the user returns */
const ACTIVITY_EVENTS = ['click', 'keydown', 'pointerdown'] as const

// ─── Module-level singleton state ─────────────────────────────────────────────

let soundEnabled = true

/** Lazily created; shared across all beeps to avoid AudioContext quota issues */
let audioCtx: AudioContext | null = null

interface ActiveSignal {
  reason: SignalReason
  beepCount: number
  timerId: ReturnType<typeof setTimeout> | null
  activityCleanup: (() => void) | null
}

let active: ActiveSignal | null = null

// ─── Audio ────────────────────────────────────────────────────────────────────

function doBeep(): void {
  if (!audioCtx) return
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880 // A5 — short, pleasant attention tone
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.18)
  } catch {
    // AudioContext may have been closed; fail silently
  }
}

function playBeep(): void {
  if (!soundEnabled) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor: typeof AudioContext | undefined = (window as any).AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return

    if (!audioCtx) audioCtx = new Ctor()

    if (audioCtx.state === 'suspended') {
      // Autoplay policy blocked context; try to resume and defer the beep
      audioCtx.resume().then(() => doBeep()).catch(() => {})
      return
    }

    doBeep()
  } catch {
    // Missing API, permission error — degrade silently
  }
}

// ─── Timer chain ──────────────────────────────────────────────────────────────

function scheduleNext(): void {
  if (!active) return
  if (active.beepCount >= SIGNAL_MAX_BEEPS) {
    cleanup()
    return
  }
  active.timerId = setTimeout(() => {
    if (!active) return
    active.beepCount++
    playBeep()
    scheduleNext()
  }, SIGNAL_INTERVAL_MS)
}

// ─── User activity auto-stop (task_completed only) ───────────────────────────

function registerActivityStop(): () => void {
  const handler = () => stopAttentionSignal('task_completed')
  ACTIVITY_EVENTS.forEach((ev) =>
    document.addEventListener(ev, handler, { once: true, capture: true }),
  )
  return () => {
    ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, handler, true))
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanup(): void {
  if (!active) return
  if (active.timerId !== null) clearTimeout(active.timerId)
  if (active.activityCleanup) active.activityCleanup()
  active = null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a repeating attention signal.
 *
 * Priority rules:
 *   - If an 'awaiting_confirmation' (priority 2) signal is active and caller
 *     passes 'task_completed' (priority 1), the call is ignored.
 *   - All other cases (same priority or incoming is higher) replace the
 *     current cycle: timer is reset, beep count starts at 1.
 */
export function startAttentionSignal(reason: SignalReason): void {
  if (active && PRIORITY[active.reason] > PRIORITY[reason]) return

  cleanup()

  active = { reason, beepCount: 1, timerId: null, activityCleanup: null }

  playBeep()

  if (reason === 'task_completed') {
    active.activityCleanup = registerActivityStop()
  }

  scheduleNext()
}

/**
 * Stop the active signal.
 *
 * @param reason  If provided, only stops when the active signal matches.
 *                Omit to stop unconditionally (e.g. on component unmount).
 */
export function stopAttentionSignal(reason?: SignalReason): void {
  if (reason !== undefined && active?.reason !== reason) return
  cleanup()
}

/** Returns true while a signal cycle is running. */
export function isAttentionSignalActive(): boolean {
  return active !== null
}

/**
 * Enable or disable all sound notifications globally.
 * Disabling also stops any currently active signal.
 */
export function setSoundNotificationsEnabled(enabled: boolean): void {
  soundEnabled = enabled
  if (!enabled) cleanup()
}

/** Returns the current global sound-enabled setting. */
export function isSoundNotificationsEnabled(): boolean {
  return soundEnabled
}

/**
 * Play a single test beep without starting a signal cycle.
 * Respects the global soundEnabled kill switch.
 * Safe to call at any time (does not affect active signal state).
 */
export function playTestBeep(): void {
  playBeep()
}

/**
 * Reset all singleton state. **Test use only.**
 * @internal
 */
export function _resetForTest(): void {
  cleanup()
  soundEnabled = true
  audioCtx = null
}
