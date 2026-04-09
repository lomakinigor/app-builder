import { Link } from 'react-router-dom'
import { STAGES, isStageComplete, isStageActive } from '../constants/stages'
import type { ProjectStage } from '../types'

interface StageIndicatorProps {
  currentStage: ProjectStage
  compact?: boolean
}

export function StageIndicator({ currentStage, compact = false }: StageIndicatorProps) {
  // Only show the main pipeline stages (not iterative_loop / done separately)
  const pipelineStages = STAGES.filter((s) => s.id !== 'iterative_loop')

  if (compact) {
    const current = STAGES.find((s) => s.id === currentStage)
    const currentIndex = pipelineStages.findIndex((s) => s.id === currentStage)
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{current?.icon}</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {current?.label}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          {currentIndex + 1}/{pipelineStages.length}
        </span>
      </div>
    )
  }

  return (
    <nav aria-label="Build pipeline stages">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {pipelineStages.map((stage, index) => {
          const complete = isStageComplete(currentStage, stage.id)
          const active = isStageActive(currentStage, stage.id)
          const reachable = complete || active

          return (
            <li key={stage.id} className="flex items-center">
              {index > 0 && (
                <span
                  className={`mx-1 h-px w-4 shrink-0 sm:w-6 ${
                    complete ? 'bg-violet-400' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              )}
              <Link
                to={stage.path}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : complete
                    ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                    : reachable
                    ? 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    : 'cursor-default text-zinc-300 dark:text-zinc-600',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={active ? 'step' : undefined}
                onClick={(e) => !reachable && e.preventDefault()}
              >
                <span>{stage.icon}</span>
                <span className="hidden sm:inline">{stage.shortLabel}</span>
                {complete && <span className="text-emerald-500">✓</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
