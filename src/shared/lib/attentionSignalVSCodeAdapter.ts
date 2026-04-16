// attentionSignalVSCodeAdapter.ts — VS Code webview integration layer.
//
// Context: AI Product Studio runs as a React SPA inside a VS Code webview panel.
// Web Audio API is fully supported in VS Code webviews, so the core
// attentionSignal.ts helper works without modification.
//
// This adapter adds two VS Code–specific concerns on top of the base helper:
//
//   1. STATUS BAR SYNC — posts a message to the extension host so the status
//      bar item can show/clear an attention indicator (⚠ / ✓) alongside the
//      audio signal.
//
//   2. EXTENSION HOST EVENTS — listens for messages from the extension host
//      (e.g. the user confirmed an action via a VS Code notification/command)
//      and forwards them to stopAttentionSignal so cycles terminate correctly.
//
// Usage (mount once, e.g. in AppProviders.tsx):
//
//   import { initVSCodeAttentionSignalAdapter } from '…/attentionSignalVSCodeAdapter'
//
//   // In a top-level useEffect with [] dependency:
//   const cleanup = initVSCodeAttentionSignalAdapter()
//   return () => cleanup()
//
// The adapter is a no-op when running outside VS Code (window.acquireVsCodeApi
// is unavailable), so the same build works in a standalone browser dev server.

import {
  startAttentionSignal,
  stopAttentionSignal,
  type SignalReason,
} from './attentionSignal'

// ─── VS Code Webview API surface ──────────────────────────────────────────────
// VS Code injects window.acquireVsCodeApi() exactly once per webview.
// Calling it more than once throws; we cache the result.

interface VSCodeApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

let _vscodeApi: VSCodeApi | null = null

function getVSCodeApi(): VSCodeApi | null {
  if (_vscodeApi) return _vscodeApi
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (window as any).acquireVsCodeApi
    if (typeof fn === 'function') {
      _vscodeApi = fn() as VSCodeApi
    }
  } catch {
    // Not in VS Code environment — degrade silently
  }
  return _vscodeApi
}

// ─── Status bar messages ──────────────────────────────────────────────────────

type AttentionMessage =
  | { type: 'attention/start'; reason: SignalReason }
  | { type: 'attention/stop' }

function notifyExtensionHost(msg: AttentionMessage): void {
  getVSCodeApi()?.postMessage(msg)
}

// ─── Extension host → webview event handling ──────────────────────────────────
// The extension host can send messages to stop a signal (e.g. user confirmed
// an action via a VS Code notification button).

interface ExtensionMessage {
  type: string
  reason?: SignalReason
}

function handleExtensionMessage(event: MessageEvent): void {
  const data = event.data as ExtensionMessage
  if (!data?.type) return

  switch (data.type) {
    case 'attention/confirmed':
    case 'attention/rejected':
      stopAttentionSignal(data.reason)
      notifyExtensionHost({ type: 'attention/stop' })
      break
  }
}

// ─── Wrapped API ─────────────────────────────────────────────────────────────
// Use these wrappers instead of the raw helpers when VS Code status-bar sync
// is desired. Falls back to the base helper when not in VS Code.

export function startAttentionSignalVS(reason: SignalReason): void {
  startAttentionSignal(reason)
  notifyExtensionHost({ type: 'attention/start', reason })
}

export function stopAttentionSignalVS(reason?: SignalReason): void {
  stopAttentionSignal(reason)
  notifyExtensionHost({ type: 'attention/stop' })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Mount the VS Code adapter.
 *
 * Call once from a top-level component / provider on mount.
 * Returns a cleanup function to remove event listeners on unmount.
 *
 * Outside VS Code (no acquireVsCodeApi) this is a no-op but still safe to call.
 */
export function initVSCodeAttentionSignalAdapter(): () => void {
  window.addEventListener('message', handleExtensionMessage)
  return () => {
    window.removeEventListener('message', handleExtensionMessage)
    stopAttentionSignal() // clear any active signal when adapter is torn down
  }
}

// ─── Extension-host side reference implementation ─────────────────────────────
//
// The extension host (src/extension.ts or similar) should handle these messages:
//
//   panel.webview.onDidReceiveMessage((message) => {
//     if (message.type === 'attention/start') {
//       // Show status bar indicator
//       statusBarItem.text = message.reason === 'awaiting_confirmation'
//         ? '$(bell) Waiting for confirmation'
//         : '$(check) Task completed'
//       statusBarItem.show()
//
//       // Optionally surface a VS Code notification (once, not looping):
//       if (message.reason === 'awaiting_confirmation') {
//         vscode.window.showInformationMessage(
//           'AI Product Studio is waiting for your confirmation.',
//           'Go to app'
//         ).then((selection) => {
//           if (selection === 'Go to app') {
//             panel.reveal()
//             // Send stop signal back to webview
//             panel.webview.postMessage({ type: 'attention/confirmed' })
//           }
//         })
//       }
//     }
//
//     if (message.type === 'attention/stop') {
//       statusBarItem.hide()
//     }
//   })
//
// The key rule: VS Code notifications are ONE-SHOT — do not loop them.
// Looping audio is handled by the webview (attentionSignal.ts).
// The extension host is responsible only for the status bar and a single
// optional notification prompt.
