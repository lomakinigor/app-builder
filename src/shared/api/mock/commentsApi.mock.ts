// T-407 — Mock CommentsApi
// In-memory store keyed by "projectId:artifactType:artifactId".
// Seeded with deterministic comments for proj-demo artifacts.
// Mutable: addComment appends in-memory.
// resetCommentStore() available for tests.

import type { CommentsApi, ArtifactComment, AddCommentInput, ArtifactType } from '../types'

function storeKey(projectId: string, artifactType: ArtifactType, artifactId: string): string {
  return `${projectId}:${artifactType}:${artifactId}`
}

function makeInitialComments(): Map<string, ArtifactComment[]> {
  const m = new Map<string, ArtifactComment[]>()
  m.set(storeKey('proj-demo', 'spec', 'proj-demo'), [
    {
      id: 'comment-spec-1',
      projectId: 'proj-demo',
      artifactType: 'spec',
      artifactId: 'proj-demo',
      body: 'MVP scope looks reasonable. Let\'s start with the must-have features.',
      authorLabel: 'owner',
      createdAt: '2026-04-22T10:20:00.000Z',
    },
  ])
  m.set(storeKey('proj-demo', 'architecture', 'proj-demo'), [
    {
      id: 'comment-arch-1',
      projectId: 'proj-demo',
      artifactType: 'architecture',
      artifactId: 'proj-demo',
      body: 'The tech stack choice looks solid. React + Zustand scales well for this use case.',
      authorLabel: 'editor',
      createdAt: '2026-04-22T11:30:00.000Z',
    },
  ])
  m.set(storeKey('proj-demo', 'prompt_iteration', 'prompt-demo-1'), [
    {
      id: 'comment-iter-1',
      projectId: 'proj-demo',
      artifactType: 'prompt_iteration',
      artifactId: 'prompt-demo-1',
      body: 'Good progress on T-001. Tests are passing.',
      authorLabel: 'owner',
      createdAt: '2026-04-22T12:00:00.000Z',
    },
  ])
  return m
}

let _comments = makeInitialComments()
let _nextCommentIndex = 100

export function resetCommentStore(): void {
  _comments = makeInitialComments()
  _nextCommentIndex = 100
}

export const commentsApiMock: CommentsApi = {
  async listComments(projectId, artifactType, artifactId): Promise<ArtifactComment[]> {
    return _comments.get(storeKey(projectId, artifactType, artifactId)) ?? []
  },

  async addComment(input: AddCommentInput): Promise<ArtifactComment> {
    const comment: ArtifactComment = {
      id: `comment-${_nextCommentIndex++}`,
      projectId: input.projectId,
      artifactType: input.artifactType,
      artifactId: input.artifactId,
      body: input.body,
      authorLabel: 'owner',
      createdAt: new Date().toISOString(),
    }
    const key = storeKey(input.projectId, input.artifactType, input.artifactId)
    const existing = _comments.get(key) ?? []
    _comments.set(key, [...existing, comment])
    return comment
  },
}
