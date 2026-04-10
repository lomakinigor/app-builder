import { NavLink, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { StageIndicator } from '../../shared/ui/StageIndicator'
import { Badge } from '../../shared/ui/Badge'

interface NavItem {
  label: string
  path: string
  icon: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Главная', path: '/', icon: '🏠', end: true },
  { label: 'Идея', path: '/idea', icon: '💡' },
  { label: 'Исследование', path: '/research', icon: '🔍' },
  { label: 'Спецификация', path: '/spec', icon: '📋' },
  { label: 'Архитектура', path: '/architecture', icon: '🏗️' },
  { label: 'Цикл промптов', path: '/prompt-loop', icon: '⚡' },
  { label: 'История', path: '/history', icon: '📜' },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { activeProject, ui, toggleSidebar } = useProjectStore()
  const navigate = useNavigate()

  const handleNavClick = () => {
    if (ui.sidebarOpen) toggleSidebar()
    onClose?.()
  }

  return (
    <aside className="flex h-full flex-col bg-white dark:bg-zinc-900">
      {/* Logo / brand */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-700/60">
        <button
          onClick={() => { navigate('/'); handleNavClick() }}
          className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100"
        >
          <span className="text-xl">🧠</span>
          <span className="text-sm">AI Product Studio</span>
        </button>
        {/* Mobile close */}
        <button
          onClick={handleNavClick}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 lg:hidden"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* Active project */}
      {activeProject && (
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700/60">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Активный проект
          </p>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">
            {activeProject.name}
          </p>
          <div className="mt-2">
            <StageIndicator currentStage={activeProject.currentStage} compact />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                  ].join(' ')
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {item.label === 'Цикл промптов' && activeProject?.currentStage === 'iterative_loop' && (
                  <Badge variant="success" className="ml-auto">Активен</Badge>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700/60">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          MVP · Локальный режим · Без бэкенда
        </p>
      </div>
    </aside>
  )
}
