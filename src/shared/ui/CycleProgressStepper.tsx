// ─── Cycle Progress Stepper ───────────────────────────────────────────────────
// Implements T-204 / F-024.
// T-210: adds optional recommendedPhaseId prop for inline next-action highlight.
//
// Renders the 6 Superpowers cycle phases for a project as a horizontal stepper.
// Each phase is clickable and navigates to its associated page.
// Status: not_started | in_progress | done — derived from artifact presence.
// Recommended phase (from computeNextAction) shows an amber ring + badge.

import { useNavigate } from 'react-router-dom'
import type { CyclePhaseProgress } from '../lib/superpowers/cycleProgress'
import type { CyclePhaseId } from '../lib/superpowers/cycleProgress'

interface CycleProgressStepperProps {
  phases: CyclePhaseProgress[]
  /** Optional: phaseId from getRecommendedPhaseId(). Highlights that step. */
  recommendedPhaseId?: CyclePhaseId | null
}

export function CycleProgressStepper({ phases, recommendedPhaseId }: CycleProgressStepperProps) {
  const navigate = useNavigate()

  return (
    <div className="w-full">
      {/* Step row */}
      <ol className="flex w-full items-start gap-0">
        {phases.map((phase, index) => {
          const isDone = phase.status === 'done'
          const isActive = phase.status === 'in_progress'
          const isRecommended = !isDone && recommendedPhaseId === phase.id
          const isLast = index === phases.length - 1

          return (
            <li key={phase.id} className="flex flex-1 flex-col items-center">
              {/* Step + connector row */}
              <div className="flex w-full items-center">
                {/* Left connector */}
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? 'bg-violet-400 dark:bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                )}

                {/* Step circle — clickable */}
                <button
                  onClick={() => navigate(phase.path)}
                  title={phase.label}
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                    isRecommended
                      ? 'border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-300 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-700/50'
                      : isDone
                      ? 'border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-300'
                      : isActive
                      ? 'border-violet-500 bg-white shadow-sm ring-2 ring-violet-200 dark:border-violet-400 dark:bg-zinc-900 dark:ring-violet-900'
                      : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500',
                  ].join(' ')}
                  aria-label={`${phase.label}: ${phase.status}${isRecommended ? ' — рекомендуется' : ''}`}
                >
                  {isDone ? (
                    <span className="text-sm text-violet-500 dark:text-violet-400">✓</span>
                  ) : (
                    <span>{phase.icon}</span>
                  )}
                </button>

                {/* Right connector */}
                {!isLast && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? 'bg-violet-400 dark:bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                )}
              </div>

              {/* Label + hint + recommended badge below the circle */}
              <div className="mt-2 flex flex-col items-center px-0.5 text-center">
                <span
                  className={`text-xs font-medium leading-tight ${
                    isRecommended
                      ? 'text-amber-600 dark:text-amber-400'
                      : isDone
                      ? 'text-violet-600 dark:text-violet-400'
                      : isActive
                      ? 'text-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {phase.label}
                </span>
                <span className="mt-0.5 hidden text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 sm:block">
                  {phase.hint}
                </span>
                {isRecommended && (
                  <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-400">
                    Рекомендуется
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
