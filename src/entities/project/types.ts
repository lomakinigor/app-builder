// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProjectType = 'application' | 'website'

export type ProjectStage =
  | 'idea'
  | 'research'
  | 'specification'
  | 'architecture'
  | 'first_prompt'
  | 'iterative_loop'
  | 'done'

export type ProjectStatus = 'active' | 'paused' | 'archived' | 'completed'

// ─── Core project entity ──────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  projectType: ProjectType
  createdAt: string
  updatedAt: string
  status: ProjectStatus
  currentStage: ProjectStage
}

// ─── Idea ─────────────────────────────────────────────────────────────────────

export interface IdeaDraft {
  title: string
  rawIdea: string
  targetUser: string
  problem: string
  constraints: string
  notes: string
}
