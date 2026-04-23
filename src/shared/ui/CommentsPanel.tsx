// T-407 — Reusable comments panel for project artifacts.
// Shows comment list for all roles. Add form visible only for owner/editor (canPost=true).

import { useState, useEffect } from 'react'
import { getCommentsApi } from '../api'
import type { ArtifactComment, ArtifactType } from '../api'

const MAX_COMMENT_LENGTH = 1000

interface CommentsPanelProps {
  projectId: string
  artifactType: ArtifactType
  artifactId: string
  /** true for owner and editor; false for viewer */
  canPost: boolean
}

export function CommentsPanel({ projectId, artifactType, artifactId, canPost }: CommentsPanelProps) {
  const [comments, setComments] = useState<ArtifactComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCommentsApi()
      .listComments(projectId, artifactType, artifactId)
      .then((result) => {
        if (!cancelled) {
          setComments(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки комментариев')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [projectId, artifactType, artifactId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const comment = await getCommentsApi().addComment({ projectId, artifactType, artifactId, body: trimmed })
      setComments((prev) => [...prev, comment])
      setBody('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении комментария')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="comments-panel" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Комментарии</p>

      {loading && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Загрузка комментариев…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && comments.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Комментариев пока нет</p>
      )}

      {!loading && comments.length > 0 && (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{c.authorLabel}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(c.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canPost && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            aria-label="Текст комментария"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Добавить комментарий…"
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {body.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!body.trim() || body.length > MAX_COMMENT_LENGTH || submitting}
              className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Отправка…' : 'Добавить комментарий'}
            </button>
          </div>
        </form>
      )}

      {!canPost && (
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Только для чтения</p>
      )}
    </div>
  )
}
