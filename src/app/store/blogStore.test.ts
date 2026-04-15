// T-015 — Local persistence correctness: blogStore
// Implements F-028 / T-015 / T-302
//
// Covers:
//   A. CRUD operations — upsert, getById, updatePost, updateChannelBody,
//      updatePublicationStatus, markCopied, deletePost
//   B. ensureTodayPost — weekday/weekend + activity/no-activity decision logic
//   C. Per-project isolation — posts are strictly scoped by project ID
//   D. Rehydration simulation — posts survive setState(capturedState) cycle
//
// Note: blogStore uses Zustand persist with version=1. We do not test the
// persist middleware itself; we test the store logic and shape.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBlogStore } from './blogStore'
import type { BlogPost, ChannelName } from '../../entities/blog/types'
import { generatePostId } from '../../entities/blog/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_BLOG_STATE = { postsByProject: {} }

function resetBlogStore() {
  // Do NOT pass replace=true — that would wipe the action functions out of the store.
  useBlogStore.setState(INITIAL_BLOG_STATE)
}

function makeChannelPost(channel: ChannelName, body = 'Body text.'): BlogPost['channels'][ChannelName] {
  return {
    channel,
    format: channel === 'site' ? 'full' : channel === 'max' ? 'short' : 'social',
    body,
    requiresAdaptation: channel !== 'site',
    publication: { status: 'draft', attempts: 0 },
  }
}

function makePost(id: string, date = '2026-04-15', overrides: Partial<BlogPost> = {}): BlogPost {
  const now = '2026-04-15T10:00:00.000Z'
  return {
    id,
    date,
    kind: 'regular',
    title: `Post ${id}`,
    slug: `post-${id}`,
    tags: ['test'],
    canonicalContent: 'Some content.',
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

// ─── A. CRUD operations ───────────────────────────────────────────────────────

describe('A. CRUD — upsert, read, update, delete', () => {
  beforeEach(resetBlogStore)

  it('getPostsForProject returns [] for unknown projectId', () => {
    const posts = useBlogStore.getState().getPostsForProject('proj-unknown')
    expect(posts).toEqual([])
  })

  it('getPostById returns undefined for unknown id', () => {
    const post = useBlogStore.getState().getPostById('proj-x', 'post-unknown')
    expect(post).toBeUndefined()
  })

  it('upsertPost adds a post', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p1'))
    expect(useBlogStore.getState().getPostsForProject('proj-1')).toHaveLength(1)
  })

  it('upsertPost with same id replaces existing post (idempotent)', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p1', '2026-04-15', { title: 'Original' }))
    useBlogStore.getState().upsertPost('proj-1', makePost('p1', '2026-04-15', { title: 'Replaced' }))

    const posts = useBlogStore.getState().getPostsForProject('proj-1')
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('Replaced')
  })

  it('upsertPost preserves insertion order for different posts', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('pa', '2026-04-14'))
    useBlogStore.getState().upsertPost('proj-1', makePost('pb', '2026-04-15'))

    const posts = useBlogStore.getState().getPostsForProject('proj-1')
    expect(posts[0].id).toBe('pa')
    expect(posts[1].id).toBe('pb')
  })

  it('getPostById returns the correct post after upsert', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-find'))
    const found = useBlogStore.getState().getPostById('proj-1', 'p-find')
    expect(found).toBeDefined()
    expect(found!.id).toBe('p-find')
  })

  it('updatePost patches a field without replacing the whole post', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-upd', '2026-04-15', { title: 'Old title' }))
    useBlogStore.getState().updatePost('proj-1', 'p-upd', { title: 'New title' })

    const post = useBlogStore.getState().getPostById('proj-1', 'p-upd')
    expect(post?.title).toBe('New title')
    // Other fields preserved
    expect(post?.canonicalContent).toBe('Some content.')
  })

  it('updatePost regenerates slug when title changes', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-slug', '2026-04-15', { title: 'Old', slug: 'old' }))
    useBlogStore.getState().updatePost('proj-1', 'p-slug', { title: 'New Slug Title' })

    const post = useBlogStore.getState().getPostById('proj-1', 'p-slug')
    expect(post?.slug).not.toBe('old')
    expect(post?.slug).toContain('new')
  })

  it('updatePost sets updatedAt timestamp', () => {
    const original = makePost('p-ts')
    useBlogStore.getState().upsertPost('proj-1', original)
    useBlogStore.getState().updatePost('proj-1', 'p-ts', { title: 'Updated' })

    const post = useBlogStore.getState().getPostById('proj-1', 'p-ts')
    expect(post?.updatedAt).not.toBe(original.updatedAt)
  })

  it('updateChannelBody updates only the target channel body', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-ch'))
    useBlogStore.getState().updateChannelBody('proj-1', 'p-ch', 'telegram', 'New Telegram body.')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-ch')
    expect(post?.channels.telegram.body).toBe('New Telegram body.')
    // Other channels unchanged
    expect(post?.channels.site.body).toBe('Body text.')
    expect(post?.channels.vk.body).toBe('Body text.')
  })

  it('updatePublicationStatus changes status on target channel', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-pub'))
    useBlogStore.getState().updatePublicationStatus('proj-1', 'p-pub', 'site', 'published')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-pub')
    expect(post?.channels.site.publication.status).toBe('published')
  })

  it('updatePublicationStatus increments attempts on published', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-attempts'))
    useBlogStore.getState().updatePublicationStatus('proj-1', 'p-attempts', 'telegram', 'published')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-attempts')
    expect(post?.channels.telegram.publication.attempts).toBe(1)
  })

  it('updatePublicationStatus to non-published does not increment attempts', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-no-inc'))
    useBlogStore.getState().updatePublicationStatus('proj-1', 'p-no-inc', 'vk', 'ready')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-no-inc')
    expect(post?.channels.vk.publication.attempts).toBe(0)
  })

  it('updatePublicationStatus to published sets publishedAt timestamp', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-pub-at'))
    useBlogStore.getState().updatePublicationStatus('proj-1', 'p-pub-at', 'max', 'published')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-pub-at')
    expect(post?.channels.max.publication.publishedAt).toBeDefined()
  })

  it('markCopied sets copiedAt on the target channel', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-copy'))
    useBlogStore.getState().markCopied('proj-1', 'p-copy', 'site')

    const post = useBlogStore.getState().getPostById('proj-1', 'p-copy')
    expect(post?.channels.site.copiedAt).toBeDefined()
    // Other channels not marked as copied
    expect(post?.channels.telegram.copiedAt).toBeUndefined()
  })

  it('deletePost removes the post', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-del'))
    expect(useBlogStore.getState().getPostsForProject('proj-1')).toHaveLength(1)

    useBlogStore.getState().deletePost('proj-1', 'p-del')
    expect(useBlogStore.getState().getPostsForProject('proj-1')).toHaveLength(0)
  })

  it('deletePost does not affect other posts', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-keep'))
    useBlogStore.getState().upsertPost('proj-1', makePost('p-remove'))
    useBlogStore.getState().deletePost('proj-1', 'p-remove')

    const posts = useBlogStore.getState().getPostsForProject('proj-1')
    expect(posts).toHaveLength(1)
    expect(posts[0].id).toBe('p-keep')
  })

  it('deletePost on unknown id is a no-op (no crash)', () => {
    useBlogStore.getState().upsertPost('proj-1', makePost('p-safe'))
    expect(() => useBlogStore.getState().deletePost('proj-1', 'non-existent')).not.toThrow()
    expect(useBlogStore.getState().getPostsForProject('proj-1')).toHaveLength(1)
  })
})

// ─── B. ensureTodayPost — decision logic ──────────────────────────────────────

describe('B. ensureTodayPost — weekday/weekend + activity decision', () => {
  beforeEach(resetBlogStore)

  it('weekday + 0 activity → creates fun_fallback post', () => {
    // Use a known Monday (2026-04-13 is Monday)
    const monday = new Date('2026-04-13T10:00:00Z')
    vi.setSystemTime(monday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-1', 0)
    expect(post).not.toBeNull()
    expect(post!.kind).toBe('fun_fallback')

    vi.useRealTimers()
  })

  it('weekday + activity > 0 → creates regular post', () => {
    const monday = new Date('2026-04-13T10:00:00Z')
    vi.setSystemTime(monday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-2', 5)
    expect(post).not.toBeNull()
    expect(post!.kind).toBe('regular')

    vi.useRealTimers()
  })

  it('weekend + 0 activity → returns null (skip)', () => {
    // Saturday
    const saturday = new Date('2026-04-12T10:00:00Z')
    vi.setSystemTime(saturday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-3', 0)
    expect(post).toBeNull()

    vi.useRealTimers()
  })

  it('weekend + activity > 0 → creates regular post', () => {
    const sunday = new Date('2026-04-14T10:00:00Z')
    vi.setSystemTime(sunday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-4', 3)
    expect(post).not.toBeNull()
    expect(post!.kind).toBe('regular')

    vi.useRealTimers()
  })

  it('calling ensureTodayPost twice on same day → returns existing post (idempotent)', () => {
    const monday = new Date('2026-04-13T10:00:00Z')
    vi.setSystemTime(monday)

    const first = useBlogStore.getState().ensureTodayPost('proj-today-5', 1)
    const second = useBlogStore.getState().ensureTodayPost('proj-today-5', 1)

    expect(second!.id).toBe(first!.id)
    expect(useBlogStore.getState().getPostsForProject('proj-today-5')).toHaveLength(1)

    vi.useRealTimers()
  })

  it('fun_fallback post has all 4 channels with non-empty body', () => {
    const tuesday = new Date('2026-04-14T10:00:00Z')
    vi.setSystemTime(tuesday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-6', 0)
    const channels: ChannelName[] = ['site', 'telegram', 'max', 'vk']
    for (const ch of channels) {
      expect(post!.channels[ch].body.length).toBeGreaterThan(0)
    }

    vi.useRealTimers()
  })

  it('ensureTodayPost stores post in the project', () => {
    const wednesday = new Date('2026-04-15T10:00:00Z')
    vi.setSystemTime(wednesday)

    useBlogStore.getState().ensureTodayPost('proj-today-7', 2)
    expect(useBlogStore.getState().getPostsForProject('proj-today-7')).toHaveLength(1)

    vi.useRealTimers()
  })

  it('today post id follows generatePostId convention (post_YYYY_MM_DD)', () => {
    const friday = new Date('2026-04-17T10:00:00Z')
    vi.setSystemTime(friday)

    const post = useBlogStore.getState().ensureTodayPost('proj-today-8', 1)
    expect(post!.id).toBe(generatePostId('2026-04-17'))

    vi.useRealTimers()
  })
})

// ─── C. Per-project isolation ─────────────────────────────────────────────────

describe('C. Per-project isolation — posts are scoped by projectId', () => {
  beforeEach(resetBlogStore)

  it('P1 posts do not appear in P2 posts', () => {
    useBlogStore.getState().upsertPost('proj-A', makePost('post-a1'))
    useBlogStore.getState().upsertPost('proj-B', makePost('post-b1'))

    expect(useBlogStore.getState().getPostsForProject('proj-A')).toHaveLength(1)
    expect(useBlogStore.getState().getPostsForProject('proj-A')[0].id).toBe('post-a1')

    expect(useBlogStore.getState().getPostsForProject('proj-B')).toHaveLength(1)
    expect(useBlogStore.getState().getPostsForProject('proj-B')[0].id).toBe('post-b1')
  })

  it('deleting P1 post does not affect P2', () => {
    useBlogStore.getState().upsertPost('proj-A', makePost('post-del'))
    useBlogStore.getState().upsertPost('proj-B', makePost('post-safe'))
    useBlogStore.getState().deletePost('proj-A', 'post-del')

    expect(useBlogStore.getState().getPostsForProject('proj-A')).toHaveLength(0)
    expect(useBlogStore.getState().getPostsForProject('proj-B')).toHaveLength(1)
  })

  it('updateChannelBody on P1 does not touch P2', () => {
    useBlogStore.getState().upsertPost('proj-A', makePost('post-ch-a'))
    useBlogStore.getState().upsertPost('proj-B', makePost('post-ch-b'))
    useBlogStore.getState().updateChannelBody('proj-A', 'post-ch-a', 'telegram', 'Changed.')

    const p2post = useBlogStore.getState().getPostById('proj-B', 'post-ch-b')
    expect(p2post?.channels.telegram.body).toBe('Body text.')
  })

  it('getPostById with wrong projectId returns undefined', () => {
    useBlogStore.getState().upsertPost('proj-A', makePost('post-id-check'))
    const result = useBlogStore.getState().getPostById('proj-B', 'post-id-check')
    expect(result).toBeUndefined()
  })

  it('multiple projects have independent postsByProject entries', () => {
    useBlogStore.getState().upsertPost('proj-X', makePost('px1'))
    useBlogStore.getState().upsertPost('proj-X', makePost('px2'))
    useBlogStore.getState().upsertPost('proj-Y', makePost('py1'))

    const state = useBlogStore.getState().postsByProject
    expect(Object.keys(state)).toHaveLength(2)
    expect(state['proj-X']).toHaveLength(2)
    expect(state['proj-Y']).toHaveLength(1)
  })
})

// ─── D. Rehydration simulation ────────────────────────────────────────────────

describe('D. Rehydration simulation — posts survive reset + setState cycle', () => {
  beforeEach(resetBlogStore)

  it('posts survive simulated reload', () => {
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr1'))
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr2'))

    const captured = useBlogStore.getState()
    resetBlogStore()
    useBlogStore.setState(captured)

    expect(useBlogStore.getState().getPostsForProject('proj-reload')).toHaveLength(2)
  })

  it('channel bodies survive reload', () => {
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr-body'))
    useBlogStore.getState().updateChannelBody('proj-reload', 'pr-body', 'site', 'Saved site body.')

    const captured = useBlogStore.getState()
    resetBlogStore()
    useBlogStore.setState(captured)

    const post = useBlogStore.getState().getPostById('proj-reload', 'pr-body')
    expect(post?.channels.site.body).toBe('Saved site body.')
  })

  it('publication status survives reload', () => {
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr-status'))
    useBlogStore.getState().updatePublicationStatus('proj-reload', 'pr-status', 'telegram', 'published')

    const captured = useBlogStore.getState()
    resetBlogStore()
    useBlogStore.setState(captured)

    const post = useBlogStore.getState().getPostById('proj-reload', 'pr-status')
    expect(post?.channels.telegram.publication.status).toBe('published')
  })

  it('fun_fallback kind is preserved through reload', () => {
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr-kind', '2026-04-15', { kind: 'fun_fallback' }))

    const captured = useBlogStore.getState()
    resetBlogStore()
    useBlogStore.setState(captured)

    const post = useBlogStore.getState().getPostById('proj-reload', 'pr-kind')
    expect(post?.kind).toBe('fun_fallback')
  })

  it('postsByProject is empty object after reset', () => {
    useBlogStore.getState().upsertPost('proj-reload', makePost('pr-reset'))
    resetBlogStore()
    expect(useBlogStore.getState().postsByProject).toEqual({})
  })

  it('multi-project posts survive reload', () => {
    useBlogStore.getState().upsertPost('proj-ma', makePost('ma1'))
    useBlogStore.getState().upsertPost('proj-mb', makePost('mb1'))
    useBlogStore.getState().upsertPost('proj-mb', makePost('mb2'))

    const captured = useBlogStore.getState()
    resetBlogStore()
    useBlogStore.setState(captured)

    expect(useBlogStore.getState().getPostsForProject('proj-ma')).toHaveLength(1)
    expect(useBlogStore.getState().getPostsForProject('proj-mb')).toHaveLength(2)
  })
})
