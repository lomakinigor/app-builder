// T-401 — HTTP SharingApi adapter
// T-403 — Full contract: generateShareToken, resolveShare, inviteByEmail
// T-404 — getAuditTrail: GET /api/projects/:projectId/sharing-audit
// T-406 — listCollaborators, updateCollaboratorRole, revokeCollaborator;
//          inviteByEmail now sends role in body
//
// Activated when VITE_API_MODE=real.
// Backend contracts:
//   POST   /api/shares                                       { projectId }           → ShareInfo
//   GET    /api/shares/:shareId                                                       → ResolvedShare
//   POST   /api/shares/:shareId/invite                       { email, role }         → InviteResult
//   GET    /api/projects/:projectId/sharing-audit                                    → SharingAuditEvent[]
//   GET    /api/projects/:projectId/collaborators                                    → ProjectCollaborator[]
//   PATCH  /api/collaborators/:collaboratorId                { role }                → ProjectCollaborator
//   DELETE /api/collaborators/:collaboratorId                                         → { success: true }
//
// Error handling: all methods throw ApiError on non-2xx (from shared client helpers).
// ApiError.requestId is populated from backend error body or x-request-id header.

import type {
  SharingApi,
  ShareInfo,
  ResolvedShare,
  InviteResult,
  SharingAuditEvent,
  ProjectCollaborator,
} from '../types'
import { postJson, getJson, patchJson, deleteJson } from './client'

export const sharingApiHttp: SharingApi = {
  async generateShareToken(projectId: string): Promise<ShareInfo> {
    return postJson<ShareInfo>('/api/shares', { projectId })
  },

  async resolveShare(shareId: string): Promise<ResolvedShare> {
    return getJson<ResolvedShare>(`/api/shares/${encodeURIComponent(shareId)}`)
  },

  async inviteByEmail(
    shareId: string,
    email: string,
    role: 'viewer' | 'editor' = 'viewer',
  ): Promise<InviteResult> {
    return postJson<InviteResult>(`/api/shares/${encodeURIComponent(shareId)}/invite`, { email, role })
  },

  async getAuditTrail(projectId: string): Promise<SharingAuditEvent[]> {
    return getJson<SharingAuditEvent[]>(`/api/projects/${encodeURIComponent(projectId)}/sharing-audit`)
  },

  async listCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    return getJson<ProjectCollaborator[]>(`/api/projects/${encodeURIComponent(projectId)}/collaborators`)
  },

  async updateCollaboratorRole(
    collaboratorId: string,
    role: 'viewer' | 'editor',
  ): Promise<ProjectCollaborator> {
    return patchJson<ProjectCollaborator>(`/api/collaborators/${encodeURIComponent(collaboratorId)}`, { role })
  },

  async revokeCollaborator(collaboratorId: string): Promise<{ success: true }> {
    return deleteJson<{ success: true }>(`/api/collaborators/${encodeURIComponent(collaboratorId)}`)
  },
}
