// T-301 — API factory
//
// Usage:
//   import { getSpecApi, getPromptLoopApi, getResearchApi } from '../../shared/api'
//
// Env vars:
//   VITE_API_MODE=mock  (default) — use local mock adapters
//   VITE_API_MODE=real  — use HTTP adapters (requires VITE_API_BASE_URL)

import type { SpecApi, PromptLoopApi, ResearchApi, SharingApi, CommentsApi } from './types'
import { specApiMock } from './mock/specApi.mock'
import { promptLoopApiMock } from './mock/promptLoopApi.mock'
import { researchApiMock } from './mock/researchApi.mock'
import { sharingApiMock } from './mock/sharingApi.mock'
import { commentsApiMock } from './mock/commentsApi.mock'
import { specApiHttp } from './http/specApi.http'
import { promptLoopApiHttp } from './http/promptLoopApi.http'
import { researchApiHttp } from './http/researchApi.http'
import { sharingApiHttp } from './http/sharingApi.http'
import { commentsApiHttp } from './http/commentsApi.http'

function isRealMode(): boolean {
  return import.meta.env.VITE_API_MODE === 'real'
}

export function getSpecApi(): SpecApi {
  return isRealMode() ? specApiHttp : specApiMock
}

export function getPromptLoopApi(): PromptLoopApi {
  return isRealMode() ? promptLoopApiHttp : promptLoopApiMock
}

export function getResearchApi(): ResearchApi {
  return isRealMode() ? researchApiHttp : researchApiMock
}

export function getSharingApi(): SharingApi {
  return isRealMode() ? sharingApiHttp : sharingApiMock
}

export function getCommentsApi(): CommentsApi {
  return isRealMode() ? commentsApiHttp : commentsApiMock
}

export type { SpecApi, PromptLoopApi, ResearchApi, SharingApi, CommentsApi, ShareInfo, ResolvedShare, InviteResult, InviteInfo, AcceptedInvite, SharingAuditEvent, ProjectCollaborator, ArtifactComment, ArtifactType, AddCommentInput } from './types'
