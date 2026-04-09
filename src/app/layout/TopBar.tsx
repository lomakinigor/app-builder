// ─── TopBar ───────────────────────────────────────────────────────────────────
// Implements T-203 / F-027.
// Adds a project switcher dropdown so the user can switch between registry
// projects without leaving their current page.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { useProjectRegistry, selectSelectedProject } from '../store/projectRegistryStore'
import { StageIndicator } from '../../shared/ui/StageIndicator'

interface TopBarProps {
  onMenuClick: () => void
}

// ─── Project switcher ─────────────────────────────────────────────────────────

function ProjectSwitcher() {
  const navigate = useNavigate()
  const projects = useProjectRegistry((s) => s.projects)
  const { selectProject } = useProjectRegistry()
  const selectedProject = useProjectRegistry(selectSelectedProject)
  const [open, setOpen] = useState(false)

  const typeIcon = (type: string) => (type === 'application' ? '📱' : '🌐')

  return (
    <div className="relative">
      {/* Click-outside backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Trigger pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedProject ? (
          <>
            <span>{typeIcon(selectedProject.projectType)}</span>
            <span className="max-w-[140px] truncate">{selectedProject.name}</span>
          </>
        ) : (
          <span className="italic text-zinc-400 dark:text-zinc-500">No project</span>
        )}
        <svg
          className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="listbox"
        >
          {projects.length > 0 ? (
            <ul className="max-h-52 overflow-y-auto py-1">
              {projects.map((p) => {
                const isSelected = p.id === selectedProject?.id
                return (
                  <li key={p.id}>
                    <button
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        selectProject(p.id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-base">{typeIcon(p.projectType)}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      {isSelected && (
                        <span className="text-violet-500 dark:text-violet-400">✓</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-zinc-400 dark:text-zinc-500">No projects yet</p>
          )}

          {/* New project action */}
          <div className="border-t border-zinc-100 py-1 dark:border-zinc-800">
            <button
              onClick={() => {
                navigate('/project/new')
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
            >
              <span>+</span>
              <span>New project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

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

      {/* Right: project switcher + brand icon */}
      <div className="flex items-center gap-2">
        <ProjectSwitcher />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm dark:bg-violet-900/40">
          🧠
        </div>
      </div>
    </header>
  )
}
