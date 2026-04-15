// @vitest-environment jsdom
// T-302 — BlogPage acceptance tests: guards, empty states, CRUD, editor, isolation.
// Implements F-028 / T-301 / T-302
//
// Coverage areas:
//   A. Guard / empty states: no project, project with no posts
//   B. Create post: toolbar button creates post visible in list
//   C. Post editor: channel tabs, title edit, delete
//   D. Delete: last post returns page to empty state
//   E. Multi-project isolation: posts stay scoped per project
//   F. Channel / status presentation: tabs, badge labels, textarea

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlogPage } from './BlogPage'
import { useBlogStore } from '../../app/store/blogStore'
import type { BlogPost, ChannelName, ChannelPost } from '../../entities/blog/types'
import type { Project } from '../../shared/types'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseProjectStore = vi.fn()
vi.mock('../../app/store/projectStore', () => ({
  useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}))

vi.mock('../../shared/lib/clipboard/copyMarkdown', () => ({
  copyMarkdown: vi.fn().mockResolvedValue({ method: 'clipboard' }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProject(id = 'proj-1', name = 'Test Project'): Project {
  return {
    id,
    name,
    projectType: 'application',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'active',
    currentStage: 'research',
  }
}

function makeChannelPost(channel: ChannelName, body = ''): ChannelPost {
  return {
    channel,
    format: channel === 'site' ? 'full' : channel === 'max' ? 'short' : 'social',
    body,
    requiresAdaptation: channel !== 'site',
    publication: { status: 'draft', attempts: 0 },
    ...(channel === 'max' ? { characterLimit: 300 } : {}),
  }
}

function makeBlogPost(
  id: string,
  date = '2026-04-15',
  overrides: Partial<BlogPost> = {}
): BlogPost {
  const now = new Date().toISOString()
  return {
    id,
    date,
    kind: 'regular',
    title: `Post ${id}`,
    slug: `post-${id}`,
    tags: [],
    canonicalContent: '',
    channels: {
      site: makeChannelPost('site'),
      telegram: makeChannelPost('telegram'),
      max: makeChannelPost('max'),
      vk: makeChannelPost('vk'),
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function seedPost(projectId: string, post: BlogPost) {
  useBlogStore.getState().upsertPost(projectId, post)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Reset real blogStore to empty — does not wipe action methods
  useBlogStore.setState({ postsByProject: {} })
  // Default: project is active
  mockUseProjectStore.mockImplementation(() => ({ activeProject: makeProject() }))
})

function renderPage(activeProject: Project | null = makeProject()) {
  mockUseProjectStore.mockImplementation(() => ({ activeProject }))
  return render(<BlogPage />)
}

// ─── A. Guard / empty states ──────────────────────────────────────────────────

describe('A. Guard — no project', () => {
  it('shows "Проект не выбран" when activeProject is null', () => {
    renderPage(null)
    expect(screen.getByText('Проект не выбран')).toBeInTheDocument()
  })

  it('shows "Создать проект" CTA button when activeProject is null', () => {
    renderPage(null)
    expect(screen.getByRole('button', { name: 'Создать проект' })).toBeInTheDocument()
  })

  it('"Создать проект" navigates to /project/new', () => {
    renderPage(null)
    fireEvent.click(screen.getByRole('button', { name: 'Создать проект' }))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('does NOT show "Постов ещё нет" when there is no project', () => {
    renderPage(null)
    expect(screen.queryByText('Постов ещё нет')).not.toBeInTheDocument()
  })
})

describe('A2. Empty state — project present, no posts', () => {
  it('shows "Постов ещё нет" when project exists but has no posts', () => {
    renderPage()
    expect(screen.getByText('Постов ещё нет')).toBeInTheDocument()
  })

  it('shows "Сгенерировать сегодняшний" button in empty state area', () => {
    renderPage()
    // There are two buttons with this label (toolbar + empty state CTA)
    const btns = screen.getAllByRole('button', { name: /Сгенерировать сегодняшний/ })
    expect(btns.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Написать вручную" CTA in empty state', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Написать вручную' })).toBeInTheDocument()
  })

  it('does NOT show "Все посты" section label when there are no posts', () => {
    renderPage()
    expect(screen.queryByText('Все посты')).not.toBeInTheDocument()
  })
})

// ─── B. Create post via toolbar button ────────────────────────────────────────

describe('B. Create post — toolbar "+ Новый пост"', () => {
  it('clicking "+ Новый пост" makes the empty state disappear', () => {
    renderPage()
    expect(screen.getByText('Постов ещё нет')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Новый пост' }))
    expect(screen.queryByText('Постов ещё нет')).not.toBeInTheDocument()
  })

  it('clicking "+ Новый пост" shows "Все посты" list label', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '+ Новый пост' }))
    expect(screen.getByText('Все посты')).toBeInTheDocument()
  })

  it('created post shows "(без заголовка)" in list (empty title)', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '+ Новый пост' }))
    expect(screen.getByText('(без заголовка)')).toBeInTheDocument()
  })

  it('post count badge appears in header after creation', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '+ Новый пост' }))
    expect(screen.getByText('1 постов')).toBeInTheDocument()
  })
})

// ─── C. Post editor ───────────────────────────────────────────────────────────

describe('C. Post editor — seeded post', () => {
  const PROJECT_ID = 'proj-1'

  beforeEach(() => {
    seedPost(PROJECT_ID, makeBlogPost('post-1', '2026-04-15', { title: 'My Test Post' }))
  })

  it('seeded post title visible in post list', () => {
    renderPage()
    expect(screen.getByText('My Test Post')).toBeInTheDocument()
  })

  it('post editor shows all four channel tabs', () => {
    renderPage()
    // "Сайт" appears as tab button + as channel label inside the active ChannelEditor
    expect(screen.getAllByText('Сайт').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Telegram')).toBeInTheDocument()
    expect(screen.getByText('MAX')).toBeInTheDocument()
    expect(screen.getByText('VK')).toBeInTheDocument()
  })

  it('"Удалить пост" button is visible in editor', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Удалить пост' })).toBeInTheDocument()
  })

  it('title input reflects the seeded post title', () => {
    renderPage()
    const titleInput = screen.getByPlaceholderText('Заголовок дня…') as HTMLInputElement
    expect(titleInput.value).toBe('My Test Post')
  })

  it('editing the title input updates the displayed value', () => {
    renderPage()
    const titleInput = screen.getByPlaceholderText('Заголовок дня…') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })
    expect((screen.getByPlaceholderText('Заголовок дня…') as HTMLInputElement).value).toBe(
      'Updated Title'
    )
  })

  it('"Везде сразу" button is visible in editor when not all published', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Везде сразу' })).toBeInTheDocument()
  })

  it('fun_fallback post shows "😴 Без активности" badge in editor', () => {
    const projectId = 'proj-fun'
    seedPost(projectId, makeBlogPost('post-fun', '2026-04-15', { kind: 'fun_fallback', title: 'Quiet day' }))
    renderPage(makeProject(projectId))
    expect(screen.getByText(/Без активности/)).toBeInTheDocument()
  })
})

// ─── D. Delete post ───────────────────────────────────────────────────────────

describe('D. Delete — removing a post', () => {
  const PROJECT_ID = 'proj-1'

  it('deleting the only post returns to "Постов ещё нет" empty state', () => {
    seedPost(PROJECT_ID, makeBlogPost('post-1'))
    renderPage()
    expect(screen.queryByText('Постов ещё нет')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить пост' }))
    expect(screen.getByText('Постов ещё нет')).toBeInTheDocument()
  })

  it('deleting one of two posts keeps the other in the list', () => {
    seedPost(PROJECT_ID, makeBlogPost('post-1', '2026-04-15', { title: 'First Post' }))
    seedPost(PROJECT_ID, makeBlogPost('post-2', '2026-04-14', { title: 'Second Post' }))
    renderPage()
    // Both posts appear; posts are sorted descending so post-1 is first (selected by default)
    expect(screen.getByText('First Post')).toBeInTheDocument()
    expect(screen.getByText('Second Post')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить пост' }))
    // After deleting the selected post (first), the other should remain
    expect(screen.queryByText('Постов ещё нет')).not.toBeInTheDocument()
    expect(screen.getByText('Second Post')).toBeInTheDocument()
  })

  it('after deleting last post, "Все посты" label is gone', () => {
    seedPost(PROJECT_ID, makeBlogPost('post-1'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить пост' }))
    expect(screen.queryByText('Все посты')).not.toBeInTheDocument()
  })
})

// ─── E. Multi-project isolation ───────────────────────────────────────────────

describe('E. Multi-project isolation', () => {
  it('project A posts are NOT shown when project B is active', () => {
    seedPost('proj-a', makeBlogPost('post-a', '2026-04-15', { title: 'Project A Post' }))
    renderPage(makeProject('proj-b', 'Project B'))
    expect(screen.queryByText('Project A Post')).not.toBeInTheDocument()
    expect(screen.getByText('Постов ещё нет')).toBeInTheDocument()
  })

  it('project B posts are NOT shown when project A is active', () => {
    seedPost('proj-b', makeBlogPost('post-b', '2026-04-15', { title: 'Project B Post' }))
    renderPage(makeProject('proj-a', 'Project A'))
    expect(screen.queryByText('Project B Post')).not.toBeInTheDocument()
  })

  it('switching to a project with posts shows its posts', () => {
    const projectA = makeProject('proj-a', 'Project A')
    seedPost('proj-a', makeBlogPost('post-a', '2026-04-15', { title: 'Alpha Post' }))
    renderPage(projectA)
    expect(screen.getByText('Alpha Post')).toBeInTheDocument()
  })

  it('switching project via rerender updates the post list', () => {
    seedPost('proj-a', makeBlogPost('post-a', '2026-04-15', { title: 'Alpha Post' }))
    seedPost('proj-b', makeBlogPost('post-b', '2026-04-15', { title: 'Beta Post' }))

    const { rerender } = renderPage(makeProject('proj-a'))
    expect(screen.getByText('Alpha Post')).toBeInTheDocument()
    expect(screen.queryByText('Beta Post')).not.toBeInTheDocument()

    // Switch to project B
    mockUseProjectStore.mockImplementation(() => ({
      activeProject: makeProject('proj-b', 'Project B'),
    }))
    rerender(<BlogPage />)

    expect(screen.queryByText('Alpha Post')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Post')).toBeInTheDocument()
  })
})

// ─── F. Channel / status presentation ────────────────────────────────────────

describe('F. Channel / status presentation', () => {
  const PROJECT_ID = 'proj-1'

  beforeEach(() => {
    seedPost(PROJECT_ID, makeBlogPost('post-1', '2026-04-15', { title: 'Channel Test Post' }))
  })

  it('"Черновик" status badge visible in the active channel (draft by default)', () => {
    renderPage()
    // All channels start as draft; site tab is active by default
    const badges = screen.getAllByText('Черновик')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('"Копировать" button visible in channel editor', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Копировать' })).toBeInTheDocument()
  })

  it('"Опубликовать" button is enabled when channel status is draft', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Опубликовать' })).toBeEnabled()
  })

  it('channel textarea reflects seeded channel body', () => {
    useBlogStore.setState({ postsByProject: {} })
    seedPost(
      PROJECT_ID,
      makeBlogPost('post-body', '2026-04-15', {
        title: 'Body Post',
        channels: {
          site: makeChannelPost('site', 'Hello from site channel'),
          telegram: makeChannelPost('telegram'),
          max: makeChannelPost('max'),
          vk: makeChannelPost('vk'),
        },
      })
    )
    renderPage()
    const siteTextarea = screen.getByPlaceholderText('Текст для Сайт…') as HTMLTextAreaElement
    expect(siteTextarea.value).toBe('Hello from site channel')
  })

  it('typing in the site textarea updates the displayed value', () => {
    renderPage()
    const siteTextarea = screen.getByPlaceholderText('Текст для Сайт…') as HTMLTextAreaElement
    fireEvent.change(siteTextarea, { target: { value: 'New content here' } })
    expect((screen.getByPlaceholderText('Текст для Сайт…') as HTMLTextAreaElement).value).toBe(
      'New content here'
    )
  })
})

// ─── G. Toolbar / scaffold panel ─────────────────────────────────────────────

describe('G. Toolbar and scaffold panel', () => {
  it('"Шаблоны файлов" button is visible in toolbar', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Шаблоны файлов' })).toBeInTheDocument()
  })

  it('clicking "Шаблоны файлов" shows the scaffold panel', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Шаблоны файлов' }))
    expect(screen.getByText('Шаблоны для вашего проекта')).toBeInTheDocument()
  })

  it('clicking "Шаблоны файлов" again hides the scaffold panel', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Шаблоны файлов' }))
    expect(screen.getByText('Скрыть шаблоны')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть шаблоны' }))
    expect(screen.queryByText('Шаблоны для вашего проекта')).not.toBeInTheDocument()
  })
})
