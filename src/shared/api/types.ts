// T-301 — Adapter interfaces for service layer
// All page components talk to these interfaces; mock vs http is selected via factory.

import type {
  ResearchBrief,
  ImportedResearchArtifact,
  IdeaDraft,
  SpecPack,
  ArchitectureDraft,
  ProjectType,
  PromptIteration,
  ParsedClaudeResponse,
} from '../types'

// ─── Research ─────────────────────────────────────────────────────────────────

export interface ResearchRunOptions {
  projectId: string
  mode: import('../types').ResearchMode
  inputSummary: string
}

export interface ResearchApi {
  runResearch(options: ResearchRunOptions): Promise<ResearchBrief>
  normalizeImportedArtifact(
    artifact: ImportedResearchArtifact,
    ideaDraft?: IdeaDraft | null,
  ): Promise<{ brief: ResearchBrief; warnings: string[] }>
}

// ─── Spec + Architecture ──────────────────────────────────────────────────────

export interface SpecApi {
  generateSpec(brief: ResearchBrief, projectType: ProjectType): Promise<SpecPack>
  generateArchitecture(spec: SpecPack, projectType: ProjectType): Promise<ArchitectureDraft>
}

// ─── Comments (T-407) ────────────────────────────────────────────────────────

export type ArtifactType = 'spec' | 'architecture' | 'prompt_iteration'

/** T-407 — One comment left on a project artifact (spec / architecture / prompt iteration). */
export interface ArtifactComment {
  id: string
  projectId: string
  artifactType: ArtifactType
  artifactId: string
  body: string
  authorLabel: string
  createdAt: string
}

export interface AddCommentInput {
  projectId: string
  artifactType: ArtifactType
  artifactId: string
  body: string
}

export interface CommentsApi {
  /** List all comments for the given artifact. */
  listComments(projectId: string, artifactType: ArtifactType, artifactId: string): Promise<ArtifactComment[]>
  /** Add a comment to the given artifact. */
  addComment(input: AddCommentInput): Promise<ArtifactComment>
}

// ─── Sharing (T-401 / T-403 / T-404 / T-406) ────────────────────────────────

export interface ShareInfo {
  shareId: string
  /** Absolute or root-relative URL the recipient opens. */
  shareUrl: string
}

export interface ResolvedShare {
  projectId: string
  /** T-405: true → editor role, false → viewer (read-only). */
  canEdit: boolean
}

export interface InviteResult {
  invitedEmail: string
  /** 'sent' = email dispatched; 'pending' = queued (e.g. backend rate-limited). */
  status: 'sent' | 'pending'
}

/** T-406 — One invited collaborator on a project (owner-managed). */
export interface ProjectCollaborator {
  id: string
  email: string
  role: 'viewer' | 'editor'
  status: 'invited' | 'active'
  shareId?: string | null
  invitedAt?: string
}

/** T-404 — One sharing-related access/activity event surfaced to the owner. */
export interface SharingAuditEvent {
  id: string
  projectId: string
  type: 'share_link_created' | 'share_link_opened' | 'share_invite_sent'
  timestamp: string
  actorLabel?: string | null
  targetEmail?: string | null
  shareId?: string | null
}

export interface SharingApi {
  /** Generate a share token for the given project. */
  generateShareToken(projectId: string): Promise<ShareInfo>
  /** Resolve a shareId to the backing project + permission. */
  resolveShare(shareId: string): Promise<ResolvedShare>
  /** Send an email invitation for the given share link (T-406: role param added). */
  inviteByEmail(shareId: string, email: string, role?: 'viewer' | 'editor'): Promise<InviteResult>
  /** Return sharing-related audit events for the given project (owner-only). */
  getAuditTrail(projectId: string): Promise<SharingAuditEvent[]>
  /** T-406 — List all collaborators for the given project (owner-only). */
  listCollaborators(projectId: string): Promise<ProjectCollaborator[]>
  /** T-406 — Update a collaborator's role. */
  updateCollaboratorRole(collaboratorId: string, role: 'viewer' | 'editor'): Promise<ProjectCollaborator>
  /** T-406 — Revoke a collaborator's access. */
  revokeCollaborator(collaboratorId: string): Promise<{ success: true }>
}

// ─── Prompt loop ──────────────────────────────────────────────────────────────

export interface PromptLoopApi {
  generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    taskId: string | null,
    taskDescription: string | null,
  ): Promise<PromptIteration>

  parseClaudeResponse(raw: string): ParsedClaudeResponse

  generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    nextIterationNumber: number,
    targetPhase?: 'code_and_tests' | 'review',
  ): Promise<PromptIteration>
}
