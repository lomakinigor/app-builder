# Platform Attention Signals

Developer contract for the repeating audio attention signal used by AI Product Studio
and all future applications in this platform.

## Purpose

When the app performs a long async operation (1–3 s), the user may switch focus.
The attention signal gives a brief audio cue — immediately when the state changes and
at most twice more over the next 30 seconds — so the user returns without needing to
watch a spinner.

## Two signal reasons

| Reason | Meaning | Stops when |
|--------|---------|------------|
| `task_completed` | Async work finished; app is idle, waiting for the user to return. | First user activity (click / keydown / pointerdown) OR after 3 beeps. |
| `awaiting_confirmation` | App is blocked; user must make an explicit choice before work continues. | Explicit `stopAttentionSignal()` call (on confirm / cancel / unmount). |

## Timing rules

- **Immediate**: first beep fires the moment `startAttentionSignal()` is called.
- **Interval**: 15 000 ms between subsequent beeps (`SIGNAL_INTERVAL_MS`).
- **Maximum**: 3 beeps total (`SIGNAL_MAX_BEEPS`), including the immediate one.
- After the third beep the cycle self-terminates; no further audio or timers.

## Priority

`awaiting_confirmation` (priority 2) **>** `task_completed` (priority 1).

When an `awaiting_confirmation` signal is active, calling
`startAttentionSignal('task_completed')` is silently dropped. This prevents a
lower-urgency "you can come back now" signal from interrupting "you must act now".

Calling `startAttentionSignal` with equal or higher priority replaces the current
cycle (resets beep count and timer).

## API

```typescript
import {
  startAttentionSignal,
  stopAttentionSignal,
  isAttentionSignalActive,
  setSoundNotificationsEnabled,
  isSoundNotificationsEnabled,
} from 'src/shared/lib/attentionSignal'
```

### `startAttentionSignal(reason)`

Starts or replaces a signal cycle. Priority rules apply (see above).

### `stopAttentionSignal(reason?)`

Stops the active cycle.
- With `reason`: only stops if the active signal matches that reason.
- Without `reason`: unconditional stop (use on component unmount).

### `isAttentionSignalActive()`

Returns `true` while a cycle is running.

### `setSoundNotificationsEnabled(enabled)`

Global kill switch. When `false`, no AudioContext is created, no beep is played.
A disabled `startAttentionSignal` call still starts the cycle state but produces
no audio, so `isAttentionSignalActive()` remains consistent for tests / UI toggles.

## Integration pattern

```typescript
// 1. Component mount cleanup (prevents stale signals after navigation)
useEffect(() => {
  return () => stopAttentionSignal()
}, [])

// 2. After async task finishes — user may have walked away:
async function handleGenerate() {
  setGenerating(true)
  try {
    const result = await service.generate(...)
    setState(result)
    startAttentionSignal('task_completed')   // ← add here
  } finally {
    setGenerating(false)
  }
}

// 3. After system enters a blocking wait state:
async function handleGeneratePrompt() {
  setGenerating(true)
  try {
    const prompt = await service.generatePrompt(...)
    setIteration(prompt)
    startAttentionSignal('awaiting_confirmation')  // ← waiting for response paste
  } finally {
    setGenerating(false)
  }
}

// 4. When user provides the required input (textarea focus, confirm button, etc.):
<textarea
  onFocus={() => stopAttentionSignal('awaiting_confirmation')}
  onChange={() => stopAttentionSignal('awaiting_confirmation')}
  ...
/>

// 5. On explicit confirm / cancel:
function handleConfirm() {
  stopAttentionSignal('awaiting_confirmation')
  // ... proceed with confirmed action
}
```

## Anti-overlap guarantee

Only one signal cycle runs at any moment. The module uses a singleton `active`
reference. Starting a new cycle calls `cleanup()` on the previous one (clears
`setTimeout`, removes activity listeners) before creating the new state.

## Web Audio and autoplay

The helper uses Web Audio API (`AudioContext` + `OscillatorNode`). Browsers require
a user gesture before audio can play. The helper handles this gracefully:

- If `AudioContext.state === 'suspended'`: calls `resume()` then defers the beep.
  The cycle state and timer chain remain active; only the audio is deferred.
- If `AudioContext` is unavailable (e.g. very old browser, non-standard runtime):
  the helper silently skips audio but the cycle state still tracks correctly.
- In VS Code webviews: Web Audio is fully supported. The base helper is used
  directly; no special adapter is required for audio.

## VS Code webview integration

`src/shared/lib/attentionSignalVSCodeAdapter.ts` wraps the base helper with:

- **Status bar sync**: posts `attention/start` / `attention/stop` messages to the
  extension host so the VS Code status bar item can reflect the attention state.
- **Extension host stop events**: listens for `attention/confirmed` / `attention/rejected`
  messages from the host (e.g. user clicked a VS Code notification button) and
  calls `stopAttentionSignal` accordingly.

Mount once at app root in a VS Code context:

```typescript
import { initVSCodeAttentionSignalAdapter } from 'src/shared/lib/attentionSignalVSCodeAdapter'

useEffect(() => initVSCodeAttentionSignalAdapter(), [])
```

The adapter is a no-op when `acquireVsCodeApi` is unavailable (standalone browser).

## Checklist for new apps / features

When adding a new async workflow, ask:

- [ ] Does the operation take > 500 ms and could the user have switched focus?
  → add `startAttentionSignal('task_completed')` after the await.
- [ ] Does the app enter a blocking state where the user must act before progress continues?
  → add `startAttentionSignal('awaiting_confirmation')` on enter,
  `stopAttentionSignal('awaiting_confirmation')` on confirm / cancel / unmount.
- [ ] Is there a `useEffect` cleanup that calls `stopAttentionSignal()`?
  → prevents stale audio cycles after navigation.
- [ ] Is there a settings toggle for `setSoundNotificationsEnabled`?
  → if the app has a settings panel, wire it up.
