// T-401 — ReadOnlyBanner: shown to viewer-mode sessions across the whole app.
// T-402 — Hidden when VITE_FEATURE_SHARING is off so stale viewer state can't leak.
// T-405 — Also renders a soft EditorBanner for editor-mode sessions.

import { useViewingModeStore } from '../../app/store/viewingModeStore'
import { isSharingEnabled } from '../config/features'

export function ReadOnlyBanner() {
  const viewingMode = useViewingModeStore((s) => s.viewingMode)

  if (!isSharingEnabled() || viewingMode === 'owner') return null

  if (viewingMode === 'viewer') {
    return (
      <div
        role="banner"
        aria-label="Режим просмотра"
        className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300"
      >
        <span aria-hidden="true">👁</span>
        <span className="font-medium">Только просмотр</span>
        <span className="text-amber-700/70 dark:text-amber-400/70">
          — этот проект открыт по ссылке. Редактирование и генерация недоступны.
        </span>
      </div>
    )
  }

  // editor mode
  return (
    <div
      role="banner"
      aria-label="Режим редактора"
      className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300"
    >
      <span aria-hidden="true">✏️</span>
      <span className="font-medium">Режим редактора</span>
      <span className="text-blue-700/70 dark:text-blue-400/70">
        — вы работаете как редактор shared-проекта.
      </span>
    </div>
  )
}
