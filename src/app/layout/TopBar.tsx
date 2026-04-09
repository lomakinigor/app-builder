import { useProjectStore } from '../store/projectStore'
import { StageIndicator } from '../../shared/ui/StageIndicator'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { activeProject } = useProjectStore()

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-700/60 dark:bg-zinc-900">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 lg:hidden"
        aria-label="Open menu"
      >
        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Center: stage pipeline (desktop) */}
      <div className="hidden flex-1 items-center justify-center lg:flex">
        {activeProject ? (
          <StageIndicator currentStage={activeProject.currentStage} />
        ) : (
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            Start a project to see your build pipeline
          </span>
        )}
      </div>

      {/* Right: project name pill */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <span className="hidden max-w-[180px] truncate rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 sm:block">
            {activeProject.name}
          </span>
        )}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm dark:bg-violet-900/40">
          🧠
        </div>
      </div>
    </header>
  )
}
