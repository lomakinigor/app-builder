import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h3 className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      {description && (
        <p className="mb-4 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
