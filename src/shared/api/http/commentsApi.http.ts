// T-407 — HTTP CommentsApi adapter
//
// Contracts:
//   GET  /api/projects/:projectId/comments?artifactType=...&artifactId=...  → ArtifactComment[]
//   POST /api/projects/:projectId/comments                                  → ArtifactComment
//     body: { artifactType, artifactId, body }
//
// Activated when VITE_API_MODE=real.
// Error handling: throws ApiError on non-2xx (from shared client helpers).

import type { CommentsApi, ArtifactComment, AddCommentInput, ArtifactType } from '../types'
import { getJson, postJson } from './client'

export const commentsApiHttp: CommentsApi = {
  async listComments(
    projectId: string,
    artifactType: ArtifactType,
    artifactId: string,
  ): Promise<ArtifactComment[]> {
    const params = new URLSearchParams({ artifactType, artifactId })
    return getJson<ArtifactComment[]>(
      `/api/projects/${encodeURIComponent(projectId)}/comments?${params.toString()}`,
    )
  },

  async addComment(input: AddCommentInput): Promise<ArtifactComment> {
    return postJson<ArtifactComment>(
      `/api/projects/${encodeURIComponent(input.projectId)}/comments`,
      { artifactType: input.artifactType, artifactId: input.artifactId, body: input.body },
    )
  },
}
