import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: string
  action?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ title, description, icon, action, badge }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-1 text-2xl leading-none">{icon}</span>}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
