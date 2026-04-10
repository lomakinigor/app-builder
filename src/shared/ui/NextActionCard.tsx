// ─── Next Action Card ─────────────────────────────────────────────────────────
// Implements T-209 / F-024.
//
// Displays the single most useful next step for the selected project, derived
// from computeNextAction().  Rendered on HomePage and HistoryPage.

import { useNavigate } from 'react-router-dom'
import type { NextAction } from '../lib/superpowers/nextActionEngine'
import { Button } from './Button'
import { Card } from './Card'

interface NextActionCardProps {
  action: NextAction
}

export function NextActionCard({ action }: NextActionCardProps) {
  const navigate = useNavigate()

  // All-done state — subtle success tone
  if (action.kind === 'none') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Следующий шаг</p>
            <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400">{action.reason}</p>
          </div>
        </div>
      </Card>
    )
  }

  const ctaLabel =
    action.kind === 'task'
      ? `Перейти к задаче ${action.taskId} →`
      : `Перейти к фазе: ${action.label} →`

  return (
    <Card className="border-violet-200 bg-violet-50/30 dark:border-violet-800/40 dark:bg-violet-950/10">
      <div className="flex items-start gap-3">
        <span className="text-xl">🎯</span>
        <div className="flex-1">
          <p className="font-semibold text-violet-800 dark:text-violet-300">Следующий шаг</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{action.reason}</p>
          <div className="mt-3">
            <Button size="sm" onClick={() => navigate(action.path)}>
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
