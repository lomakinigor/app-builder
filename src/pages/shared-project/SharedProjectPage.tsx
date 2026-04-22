// T-401 — SharedProjectPage: entry point for read-only share links.
// T-402 — Guarded by VITE_FEATURE_SHARING flag; shows "unavailable" when off.
// T-405 — Branches on canEdit: editor → viewingMode='editor', viewer → viewingMode='viewer'.
//
// Route: /shared/:shareId
// Flow:
//   1. Resolve shareId → { projectId, canEdit } via SharingApi.
//   2. Find the project in the registry; if not present, show error.
//   3. Select the project and set viewingMode based on canEdit.
//   4. Redirect to /history.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSharingApi } from '../../shared/api'
import { useProjectRegistry } from '../../app/store/projectRegistryStore'
import { useViewingModeStore } from '../../app/store/viewingModeStore'
import { isSharingEnabled } from '../../shared/config/features'

type Status = 'loading' | 'error' | 'redirecting'

export function SharedProjectPage() {
  const { shareId } = useParams<{ shareId: string }>()
  const navigate = useNavigate()
  const { projects, selectProject } = useProjectRegistry()
  const { setViewingMode } = useViewingModeStore()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sharingEnabled = isSharingEnabled()

  useEffect(() => {
    if (!sharingEnabled) return

    if (!shareId) {
      setErrorMessage('Ссылка не содержит идентификатор проекта.')
      setStatus('error')
      return
    }

    let cancelled = false

    getSharingApi()
      .resolveShare(shareId)
      .then(({ projectId, canEdit }) => {
        if (cancelled) return

        const found = projects.find((p) => p.id === projectId)
        if (!found) {
          setErrorMessage(
            'Проект по этой ссылке не найден. Возможно, он был удалён или ссылка устарела.',
          )
          setStatus('error')
          return
        }

        selectProject(projectId)
        setViewingMode(canEdit ? 'editor' : 'viewer')
        setStatus('redirecting')
        navigate('/history', { replace: true })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setErrorMessage(`Не удалось открыть ссылку: ${msg}`)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, sharingEnabled])

  if (!sharingEnabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-3xl">🔒</div>
          <p className="font-medium text-zinc-800 dark:text-zinc-200">Функция недоступна</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Совместный доступ к проектам пока не активирован.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-violet-600 underline dark:text-violet-400"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl">🔗</div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Открываем проект…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="max-w-sm text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <p className="font-medium text-zinc-800 dark:text-zinc-200">Не удалось открыть ссылку</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{errorMessage}</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-violet-600 underline dark:text-violet-400"
        >
          На главную
        </button>
      </div>
    </div>
  )
}
