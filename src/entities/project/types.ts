// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProjectStage =
  | 'idea'
  | 'research'
  | 'specification'
  | 'architecture'
  | 'first_prompt'
  | 'iterative_loop'
  | 'done'

export type ProjectStatus = 'active' | 'paused' | 'archived'

// ─── Core project entity ──────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
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
