// Blog store — per-project blog posts, persisted via Zustand persist.
// Posts are stored keyed by project ID so switching projects restores the correct blog.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BlogPost, ChannelName, PostStatus } from '../../entities/blog/types'
import {
  createFunFallbackPost,
  createEmptyRegularPost,
  generatePostId,
  generateSlug,
  shouldCreatePost,
} from '../../entities/blog/utils'

// ─── State ─────────────────────────────────────────────────────────────────

interface BlogState {
  /** All posts keyed by project ID */
  postsByProject: Record<string, BlogPost[]>

  // ─── Queries ──────────────────────────────────────────────────────────────

  getPostsForProject(projectId: string): BlogPost[]
  getPostById(projectId: string, postId: string): BlogPost | undefined

  // ─── Mutations ────────────────────────────────────────────────────────────

  /** Add or replace a post (upsert by post.id) */
  upsertPost(projectId: string, post: BlogPost): void

  /** Update one field of a post */
  updatePost(projectId: string, postId: string, patch: Partial<BlogPost>): void

  /** Update the body text of a specific channel */
  updateChannelBody(
    projectId: string,
    postId: string,
    channel: ChannelName,
    body: string
  ): void

  /** Update publication status of a specific channel */
  updatePublicationStatus(
    projectId: string,
    postId: string,
    channel: ChannelName,
    status: PostStatus
  ): void

  /** Mark a channel as copied (set copiedAt timestamp) */
  markCopied(projectId: string, postId: string, channel: ChannelName): void

  /** Delete a post */
  deletePost(projectId: string, postId: string): void

  // ─── Auto-generation ──────────────────────────────────────────────────────

  /**
   * Checks whether today's post already exists for the given project.
   * If not, decides what to create based on activityCount and day of week,
   * then creates and saves it. Returns the post that was created, or null if skipped.
   */
  ensureTodayPost(projectId: string, activityCount: number): BlogPost | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useBlogStore = create<BlogState>()(
  persist(
    (set, get) => ({
      postsByProject: {},

      getPostsForProject(projectId) {
        return get().postsByProject[projectId] ?? []
      },

      getPostById(projectId, postId) {
        return get().getPostsForProject(projectId).find((p) => p.id === postId)
      },

      upsertPost(projectId, post) {
        set((state) => {
          const existing = state.postsByProject[projectId] ?? []
          const idx = existing.findIndex((p) => p.id === post.id)
          const updated =
            idx >= 0
              ? [...existing.slice(0, idx), post, ...existing.slice(idx + 1)]
              : [...existing, post]
          return {
            postsByProject: { ...state.postsByProject, [projectId]: updated },
          }
        })
      },

      updatePost(projectId, postId, patch) {
        set((state) => {
          const existing = state.postsByProject[projectId] ?? []
          const updated = existing.map((p) =>
            p.id === postId
              ? { ...p, ...patch, updatedAt: new Date().toISOString() }
              : p
          )
          // Regenerate slug if title changed
          const post = updated.find((p) => p.id === postId)
          if (post && patch.title) {
            const idx = updated.findIndex((p) => p.id === postId)
            updated[idx] = { ...post, slug: generateSlug(patch.title) }
          }
          return {
            postsByProject: { ...state.postsByProject, [projectId]: updated },
          }
        })
      },

      updateChannelBody(projectId, postId, channel, body) {
        set((state) => {
          const existing = state.postsByProject[projectId] ?? []
          const updated = existing.map((p) => {
            if (p.id !== postId) return p
            return {
              ...p,
              updatedAt: new Date().toISOString(),
              channels: {
                ...p.channels,
                [channel]: { ...p.channels[channel], body },
              },
            }
          })
          return {
            postsByProject: { ...state.postsByProject, [projectId]: updated },
          }
        })
      },

      updatePublicationStatus(projectId, postId, channel, status) {
        set((state) => {
          const existing = state.postsByProject[projectId] ?? []
          const updated = existing.map((p) => {
            if (p.id !== postId) return p
            const ch = p.channels[channel]
            return {
              ...p,
              updatedAt: new Date().toISOString(),
              channels: {
                ...p.channels,
                [channel]: {
                  ...ch,
                  publication: {
                    ...ch.publication,
                    status,
                    publishedAt:
                      status === 'published' ? new Date().toISOString() : ch.publication.publishedAt,
                    attempts: status === 'published' ? ch.publication.attempts + 1 : ch.publication.attempts,
                  },
                },
              },
            }
          })
          return {
            postsByProject: { ...state.postsByProject, [projectId]: updated },
          }
        })
      },

      markCopied(projectId, postId, channel) {
        set((state) => {
          const existing = state.postsByProject[projectId] ?? []
          const updated = existing.map((p) => {
            if (p.id !== postId) return p
            return {
              ...p,
              channels: {
                ...p.channels,
                [channel]: {
                  ...p.channels[channel],
                  copiedAt: new Date().toISOString(),
                },
              },
            }
          })
          return {
            postsByProject: { ...state.postsByProject, [projectId]: updated },
          }
        })
      },

      deletePost(projectId, postId) {
        set((state) => ({
          postsByProject: {
            ...state.postsByProject,
            [projectId]: (state.postsByProject[projectId] ?? []).filter(
              (p) => p.id !== postId
            ),
          },
        }))
      },

      ensureTodayPost(projectId, activityCount) {
        const today = todayString()
        const todayId = generatePostId(today)
        const existing = get().getPostById(projectId, todayId)
        if (existing) return existing

        const decision = shouldCreatePost(new Date(), activityCount)
        if (decision === 'skip') return null

        const post =
          decision === 'fun_fallback'
            ? createFunFallbackPost(today)
            : createEmptyRegularPost(today)

        get().upsertPost(projectId, post)
        return post
      },
    }),
    {
      name: 'ai-studio-blog',
      version: 1,
    }
  )
)
