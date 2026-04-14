// ─── GateDiagnostics ─────────────────────────────────────────────────────────
// Shared component for displaying stage gate blocking reasons.
// Implements T-017: unified diagnostics UI layer over gate functions.
//
// Usage:
//   <GateDiagnostics reasons={gate.reason ? [gate.reason] : []} />
//   <GateDiagnostics reasons={reviewGate.blockingDiagnostics.map(d => resolveGateDiagnostic(d).label)} />
//
// Renders nothing when reasons array is empty — always safe to mount.

interface GateDiagnosticsProps {
  /** Human-readable blocking reasons. Renders nothing if empty. */
  reasons: string[]
  /** Visual emphasis. Default: 'warning' (amber). Use 'error' for broken state. */
  variant?: 'warning' | 'error' | 'neutral'
  /** Optional action link shown below the reasons. */
  cta?: { label: string; onClick: () => void }
}

const VARIANT_STYLES = {
  warning: {
    wrapper:
      'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20',
    icon: '⚠️',
    text: 'text-amber-800 dark:text-amber-300',
    muted: 'text-amber-700/80 dark:text-amber-400',
  },
  error: {
    wrapper:
      'border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20',
    icon: '🚫',
    text: 'text-red-800 dark:text-red-300',
    muted: 'text-red-700/80 dark:text-red-400',
  },
  neutral: {
    wrapper:
      'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50',
    icon: 'ℹ️',
    text: 'text-zinc-700 dark:text-zinc-300',
    muted: 'text-zinc-500 dark:text-zinc-400',
  },
} as const

export function GateDiagnostics({
  reasons,
  variant = 'warning',
  cta,
}: GateDiagnosticsProps) {
  if (reasons.length === 0) return null

  const s = VARIANT_STYLES[variant]

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.wrapper}`}
      data-testid="gate-diagnostics"
    >
      <span className="mt-0.5 shrink-0 text-lg">{s.icon}</span>
      <div className="min-w-0 flex-1 space-y-1">
        {reasons.map((r, i) => (
          <p key={i} className={`text-sm ${s.text}`}>
            {r}
          </p>
        ))}
        {cta && (
          <button
            onClick={cta.onClick}
            className={`mt-1 text-sm underline ${s.muted}`}
          >
            {cta.label} →
          </button>
        )}
      </div>
    </div>
  )
}
