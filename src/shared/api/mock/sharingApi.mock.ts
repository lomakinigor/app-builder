// T-401 — Mock SharingApi
// T-403 — Added inviteByEmail (email format validation, simulated send)
// T-404 — Added getAuditTrail (3 deterministic events per project)
// T-405 — Added editor share tokens: share-edit-<projectId> → canEdit:true
// T-406 — Added listCollaborators, updateCollaboratorRole, revokeCollaborator;
//          inviteByEmail now accepts optional role ('viewer' | 'editor')
//
// Token conventions:
//   share-<projectId>      → viewer  (canEdit: false)
//   share-edit-<projectId> → editor  (canEdit: true)
// resolveShare reverses both formats to extract projectId.
// Works entirely offline — no network, no auth required for demo/dev mode.

import type {
  SharingApi,
  ShareInfo,
  ResolvedShare,
  InviteResult,
  SharingAuditEvent,
  ProjectCollaborator,
} from '../types'

function makeShareId(projectId: string): string {
  return `share-${projectId}`
}

/** Editor share token — resolves to canEdit:true. */
export function makeEditShareId(projectId: string): string {
  return `share-edit-${projectId}`
}

function extractProjectId(shareId: string): string | null {
  if (shareId.startsWith('share-edit-')) return shareId.slice('share-edit-'.length)
  if (shareId.startsWith('share-')) return shareId.slice('share-'.length)
  return null
}

function canEditFromShareId(shareId: string): boolean {
  return shareId.startsWith('share-edit-')
}

function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.')
}

// ─── In-memory collaborator store (T-406) ────────────────────────────────────
// Seeded with 2 deterministic entries. Mutable so role changes / revokes persist
// within a single session (tests mock this API directly so mutation is safe).

function makeInitialCollaborators(): Map<string, ProjectCollaborator> {
  return new Map<string, ProjectCollaborator>([
    [
      'collab-1',
      {
        id: 'collab-1',
        email: 'alice@example.com',
        role: 'viewer',
        status: 'active',
        shareId: 'share-proj-demo',
        invitedAt: '2026-04-22T10:18:00.000Z',
      },
    ],
    [
      'collab-2',
      {
        id: 'collab-2',
        email: 'bob@example.com',
        role: 'editor',
        status: 'invited',
        shareId: 'share-edit-proj-demo',
        invitedAt: '2026-04-22T11:00:00.000Z',
      },
    ],
  ])
}

let _collaborators = makeInitialCollaborators()

/** Reset collaborator store — useful for tests that want a clean slate. */
export function resetCollaboratorStore(): void {
  _collaborators = makeInitialCollaborators()
}

let _nextCollaboratorIndex = 3

export const sharingApiMock: SharingApi = {
  async generateShareToken(projectId: string): Promise<ShareInfo> {
    const shareId = makeShareId(projectId)
    const shareUrl = `/shared/${shareId}`
    return { shareId, shareUrl }
  },

  async resolveShare(shareId: string): Promise<ResolvedShare> {
    const projectId = extractProjectId(shareId)
    if (!projectId) {
      throw new Error(`Invalid share token: ${shareId}`)
    }
    return { projectId, canEdit: canEditFromShareId(shareId) }
  },

  async inviteByEmail(
    shareId: string,
    email: string,
    role: 'viewer' | 'editor' = 'viewer',
  ): Promise<InviteResult> {
    if (!isValidEmail(email)) {
      throw new Error(`Invalid email address: ${email}`)
    }
    const id = `collab-${_nextCollaboratorIndex++}`
    _collaborators.set(id, {
      id,
      email,
      role,
      status: 'invited',
      shareId,
      invitedAt: new Date().toISOString(),
    })
    return { invitedEmail: email, status: 'sent' }
  },

  async getAuditTrail(projectId: string): Promise<SharingAuditEvent[]> {
    const shareId = makeShareId(projectId)
    return [
      {
        id: `audit-${projectId}-1`,
        projectId,
        type: 'share_link_created',
        timestamp: '2026-04-22T10:15:00.000Z',
        actorLabel: 'owner',
        shareId,
      },
      {
        id: `audit-${projectId}-2`,
        projectId,
        type: 'share_invite_sent',
        timestamp: '2026-04-22T10:18:00.000Z',
        actorLabel: 'owner',
        targetEmail: 'alice@example.com',
        shareId,
      },
      {
        id: `audit-${projectId}-3`,
        projectId,
        type: 'share_link_opened',
        timestamp: '2026-04-22T10:24:00.000Z',
        actorLabel: 'anonymous viewer',
        shareId,
      },
    ]
  },

  async listCollaborators(_projectId: string): Promise<ProjectCollaborator[]> {
    return Array.from(_collaborators.values())
  },

  async updateCollaboratorRole(
    collaboratorId: string,
    role: 'viewer' | 'editor',
  ): Promise<ProjectCollaborator> {
    const collab = _collaborators.get(collaboratorId)
    if (!collab) throw new Error(`Collaborator not found: ${collaboratorId}`)
    const updated: ProjectCollaborator = { ...collab, role }
    _collaborators.set(collaboratorId, updated)
    return updated
  },

  async revokeCollaborator(collaboratorId: string): Promise<{ success: true }> {
    if (!_collaborators.has(collaboratorId)) {
      throw new Error(`Collaborator not found: ${collaboratorId}`)
    }
    _collaborators.delete(collaboratorId)
    return { success: true }
  },
}
