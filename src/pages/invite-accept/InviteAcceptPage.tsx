// T-408 — InviteAcceptPage: invite acceptance flow for collaborators.
//
// Route: /invite/:inviteToken
// Flow:
//   1. Resolve inviteToken → { projectId, projectName, role, email } via SharingApi.
//   2. Show project context + role to the invited user.
//   3. On "Accept": call acceptInvite → select project → set viewingMode → redirect /history.
//   4. Invalid/expired token → clear error state.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSharingApi } from '../../shared/api'
import type { InviteInfo } from '../../shared/api'
import { useProjectRegistry } from '../../app/store/projectRegistryStore'
import { useViewingModeStore } from '../../app/store/viewingModeStore'

type Status = 'loading' | 'ready' | 'accepting' | 'error'

const ROLE_LABELS: Record<'viewer' | 'editor', string> = {
  viewer: 'просмотр',
  editor: 'редактор',
}

export function InviteAcceptPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const { projects, selectProject } = useProjectRegistry()
  const { setViewingMode } = useViewingModeStore()

  const [status, setStatus] = useState<Status>('loading')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!inviteToken) {
      setErrorMessage('Ссылка приглашения недействительна.')
      setStatus('error')
      return
    }

    let cancelled = false

    getSharingApi()
      .resolveInvite(inviteToken)
      .then((info) => {
        if (cancelled) return
        setInviteInfo(info)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setErrorMessage(`Приглашение недействительно или истекло: ${msg}`)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [inviteToken])

  function handleAccept() {
    if (!inviteToken || !inviteInfo) return
    setStatus('accepting')

    getSharingApi()
      .acceptInvite(inviteToken)
      .then(({ projectId, role }) => {
        const found = projects.find((p) => p.id === projectId)
        if (found) {
          selectProject(projectId)
        }
        setViewingMode(role === 'editor' ? 'editor' : 'viewer')
        navigate('/history', { replace: true })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setErrorMessage(`Не удалось принять приглашение: ${msg}`)
        setStatus('error')
      })
  }

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl">✉️</div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {status === 'accepting' ? 'Принимаем приглашение…' : 'Загружаем приглашение…'}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    const canRetry = !!inviteInfo
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            {canRetry ? 'Не удалось принять приглашение' : 'Приглашение недействительно'}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="invite-error">
            {errorMessage}
          </p>
          {canRetry && (
            <button
              onClick={() => setStatus('ready')}
              data-testid="retry-invite-btn"
              className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              Попробовать снова
            </button>
          )}
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

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="max-w-sm w-full text-center space-y-6 px-4">
        <div className="text-3xl">👥</div>
        <div className="space-y-2">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-lg" data-testid="invite-project-name">
            {inviteInfo?.projectName}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Вас пригласили как{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300" data-testid="invite-role">
              {inviteInfo ? ROLE_LABELS[inviteInfo.role] : ''}
            </span>
          </p>
          {inviteInfo?.email && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{inviteInfo.email}</p>
          )}
        </div>
        <button
          onClick={handleAccept}
          data-testid="accept-invite-btn"
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
        >
          Принять приглашение
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
        >
          Отклонить
        </button>
      </div>
    </div>
  )
}
