// Blog development diary page.
// Implements F-028 / T-301
//
// Features:
//   - List of posts per day with kind icon (regular / fun_fallback)
//   - Post editor with channel tabs: Сайт / Telegram / MAX / VK
//   - Copy button per channel
//   - Publish buttons (per channel + "all at once")
//   - Publication status badge
//   - Auto-generate today's post (fun_fallback if no activity)
//   - Export all posts as Blog.md

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { useBlogStore } from '../../app/store/blogStore'
import { Card } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import type { BlogPost, ChannelName, PostStatus } from '../../entities/blog/types'
import { exportBlogToMarkdown } from '../../entities/blog/exporter'
import { BLOG_RULES_MD, BLOG_MD_HEADER } from '../../entities/blog/scaffold'
import { createEmptyRegularPost } from '../../entities/blog/utils'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<ChannelName, string> = {
  site: 'Сайт',
  telegram: 'Telegram',
  max: 'MAX',
  vk: 'VK',
}

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: 'Черновик',
  ready: 'Готов',
  scheduled: 'Запланирован',
  published: 'Опубликован',
  failed: 'Ошибка',
}

const STATUS_VARIANT: Record<PostStatus, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  ready: 'warning',
  scheduled: 'warning',
  published: 'success',
  failed: 'error',
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostListItem({
  post,
  isSelected,
  onClick,
}: {
  post: BlogPost
  isSelected: boolean
  onClick: () => void
}) {
  const icon = post.kind === 'fun_fallback' ? '😴' : '📝'
  const allPublished = (['site', 'telegram', 'max', 'vk'] as ChannelName[]).every(
    (ch) => post.channels[ch].publication.status === 'published'
  )

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
        isSelected
          ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {post.title || '(без заголовка)'}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{post.date}</p>
        </div>
        {allPublished && (
          <Badge variant="success" className="shrink-0 text-xs">✓</Badge>
        )}
      </div>
    </button>
  )
}

function ChannelEditor({
  post,
  channel,
  projectId,
}: {
  post: BlogPost
  channel: ChannelName
  projectId: string
}) {
  const { updateChannelBody, updatePublicationStatus, markCopied } = useBlogStore()
  const cp = post.channels[channel]
  const [copying, setCopying] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const charCount = cp.body.length
  const overLimit = cp.characterLimit !== undefined && charCount > cp.characterLimit

  async function handleCopy() {
    setCopying(true)
    await copyMarkdown(cp.body)
    markCopied(projectId, post.id, channel)
    setCopying(false)
  }

  async function handlePublish() {
    setPublishing(true)
    // Mock publish: just mark as published after a short delay
    await new Promise((r) => setTimeout(r, 600))
    updatePublicationStatus(projectId, post.id, channel, 'published')
    setPublishing(false)
  }

  const status = cp.publication.status

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {CHANNEL_LABELS[channel]}
          </span>
          <Badge variant={STATUS_VARIANT[status]} className="text-xs">
            {STATUS_LABEL[status]}
          </Badge>
          {cp.copiedAt && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              скопировано {new Date(cp.copiedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            loading={copying}
          >
            Копировать
          </Button>
          <Button
            variant={status === 'published' ? 'ghost' : 'primary'}
            size="sm"
            onClick={handlePublish}
            loading={publishing}
            disabled={status === 'published'}
          >
            {status === 'published' ? '✓ Опубликовано' : 'Опубликовать'}
          </Button>
        </div>
      </div>

      <textarea
        className={[
          'w-full rounded-xl border px-3 py-2.5 text-sm font-mono',
          'focus:outline-none focus:ring-2 focus:ring-violet-500',
          'resize-y bg-white dark:bg-zinc-900',
          overLimit
            ? 'border-red-300 dark:border-red-700'
            : 'border-zinc-200 dark:border-zinc-700',
          'text-zinc-800 dark:text-zinc-200',
        ].join(' ')}
        rows={channel === 'site' ? 8 : channel === 'max' ? 3 : 5}
        value={cp.body}
        onChange={(e) => updateChannelBody(projectId, post.id, channel, e.target.value)}
        placeholder={`Текст для ${CHANNEL_LABELS[channel]}…`}
      />

      {cp.characterLimit !== undefined && (
        <p className={`text-right text-xs ${overLimit ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {charCount} / {cp.characterLimit} симв.
        </p>
      )}
    </div>
  )
}

function PostEditor({
  post,
  projectId,
}: {
  post: BlogPost
  projectId: string
}) {
  const { updatePost, updatePublicationStatus, deletePost } = useBlogStore()
  const [activeChannel, setActiveChannel] = useState<ChannelName>('site')
  const [publishingAll, setPublishingAll] = useState(false)
  const channels: ChannelName[] = ['site', 'telegram', 'max', 'vk']

  async function handlePublishAll() {
    setPublishingAll(true)
    await new Promise((r) => setTimeout(r, 800))
    for (const ch of channels) {
      updatePublicationStatus(projectId, post.id, ch, 'published')
    }
    setPublishingAll(false)
  }

  const allPublished = channels.every(
    (ch) => post.channels[ch].publication.status === 'published'
  )

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Заголовок
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            value={post.title}
            onChange={(e) => updatePost(projectId, post.id, { title: e.target.value })}
            placeholder="Заголовок дня…"
          />
        </div>
        <div className="shrink-0 pt-5">
          <Badge variant={post.kind === 'fun_fallback' ? 'warning' : 'default'}>
            {post.kind === 'fun_fallback' ? '😴 Без активности' : '📝 Обычный'}
          </Badge>
        </div>
      </div>

      {/* Publish all */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {allPublished ? '✓ Все площадки опубликованы' : 'Опубликовать сразу везде'}
        </span>
        <Button
          variant={allPublished ? 'ghost' : 'primary'}
          size="sm"
          onClick={handlePublishAll}
          loading={publishingAll}
          disabled={allPublished}
        >
          {allPublished ? 'Готово' : 'Везде сразу'}
        </Button>
      </div>

      {/* Channel tabs */}
      <div>
        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
          {channels.map((ch) => {
            const status = post.channels[ch].publication.status
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={[
                  'flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeChannel === ch
                    ? 'border-b-2 border-violet-600 text-violet-700 dark:text-violet-300'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                ].join(' ')}
              >
                {CHANNEL_LABELS[ch]}
                {status === 'published' && (
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="pt-4">
          <ChannelEditor post={post} channel={activeChannel} projectId={projectId} />
        </div>
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deletePost(projectId, post.id)}
          className="text-red-500 hover:text-red-700"
        >
          Удалить пост
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function BlogPage() {
  const navigate = useNavigate()
  const { activeProject } = useProjectStore()
  const { getPostsForProject, upsertPost, ensureTodayPost } = useBlogStore()

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [showScaffold, setShowScaffold] = useState(false)
  const [scaffoldFile, setScaffoldFile] = useState<'rules' | 'blog'>('rules')
  const [copying, setCopying] = useState(false)

  const projectId = activeProject?.id ?? ''
  // postsByProject is the reactive dep — it changes on every mutation.
  // getPostsForProject is a stable store method reference; it reads via get() so always fresh.
  const { postsByProject } = useBlogStore()
  const posts = useMemo(
    () => getPostsForProject(projectId).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, postsByProject]
  )
  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? posts[0] ?? null

  if (!activeProject) {
    return (
      <EmptyState
        icon="📖"
        title="Проект не выбран"
        description="Выберите или создайте проект, чтобы начать вести дневник разработки."
        action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
      />
    )
  }

  function handleNewRegularPost() {
    const today = todayString()
    const post = createEmptyRegularPost(today)
    upsertPost(projectId, post)
    setSelectedPostId(post.id)
  }

  function handleAutoGenerate() {
    const post = ensureTodayPost(projectId, 0) // 0 activity → fun_fallback on weekday
    if (post) setSelectedPostId(post.id)
  }

  async function handleExportBlog() {
    const md = exportBlogToMarkdown(posts)
    setCopying(true)
    await copyMarkdown(md)
    setCopying(false)
  }

  async function handleCopyScaffold() {
    const content = scaffoldFile === 'rules' ? BLOG_RULES_MD : BLOG_MD_HEADER
    setCopying(true)
    await copyMarkdown(content)
    setCopying(false)
  }

  const scaffoldContent = scaffoldFile === 'rules' ? BLOG_RULES_MD : BLOG_MD_HEADER

  return (
    <div className="space-y-6">
      <PageHeader
        title="Блог разработки"
        description="Дневник проекта: ежедневные посты для сайта, Telegram, MAX и VK."
        badge={posts.length > 0 ? `${posts.length} постов` : undefined}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleNewRegularPost} variant="primary" size="sm">
          + Новый пост
        </Button>
        <Button onClick={handleAutoGenerate} variant="secondary" size="sm">
          Сгенерировать сегодняшний
        </Button>
        <Button onClick={handleExportBlog} variant="secondary" size="sm" loading={copying}>
          Экспорт Blog.md
        </Button>
        <Button
          onClick={() => setShowScaffold((v) => !v)}
          variant="ghost"
          size="sm"
        >
          {showScaffold ? 'Скрыть шаблоны' : 'Шаблоны файлов'}
        </Button>
      </div>

      {/* Scaffold export panel */}
      {showScaffold && (
        <Card>
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Шаблоны для вашего проекта
            </p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              Скопируйте и создайте файлы в директории <code>blog/</code> вашего репозитория.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button
                variant={scaffoldFile === 'rules' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setScaffoldFile('rules')}
              >
                BLOG_RULES.md
              </Button>
              <Button
                variant={scaffoldFile === 'blog' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setScaffoldFile('blog')}
              >
                Blog.md (шапка)
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 whitespace-pre-wrap">
              {scaffoldContent}
            </pre>
            <Button onClick={handleCopyScaffold} variant="secondary" size="sm" loading={copying}>
              Копировать
            </Button>
          </div>
        </Card>
      )}

      {/* Main layout: list + editor */}
      {posts.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="text-4xl">📖</span>
            <div>
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                Постов ещё нет
              </p>
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                Нажмите «Сгенерировать сегодняшний» — и система создаст первый пост.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAutoGenerate} variant="primary">
                Сгенерировать сегодняшний
              </Button>
              <Button onClick={handleNewRegularPost} variant="secondary">
                Написать вручную
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Post list */}
          <div className="space-y-1.5">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Все посты
            </p>
            {posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                isSelected={selectedPost?.id === post.id}
                onClick={() => setSelectedPostId(post.id)}
              />
            ))}
          </div>

          {/* Editor */}
          {selectedPost && (
            <Card>
              <div className="mb-4">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedPost.date}
                </p>
              </div>
              <div className="p-4">
                <PostEditor post={selectedPost} projectId={projectId} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
