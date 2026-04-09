// ─── Enums ────────────────────────────────────────────────────────────────────

export type ResearchMode = 'quick' | 'pro' | 'deep' | 'manual' | 'imported'

export type RunStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed'

export type ResearchSourceType =
  | 'generated_in_app'
  | 'perplexity_export'
  | 'chat_export'
  | 'markdown_notes'
  | 'pasted_summary'
  | 'uploaded_document'
  | 'other'

// ─── Research provider ────────────────────────────────────────────────────────

export interface ResearchProvider {
  id: string
  name: string
  type: 'perplexity' | 'manual' | 'mock'
  supportsModelSelection: boolean
  supportsDeepResearch: boolean
  status: 'available' | 'unavailable' | 'coming_soon'
}

// ─── Research run ─────────────────────────────────────────────────────────────

export interface ResearchRun {
  id: string
  projectId: string
  providerId: string
  mode: ResearchMode
  status: RunStatus
  startedAt: string | null
  finishedAt: string | null
  inputSummary: string
}

// ─── Imported research ────────────────────────────────────────────────────────

export interface ImportedResearchArtifact {
  id: string
  projectId: string
  title: string
  sourceType: ResearchSourceType
  sourceLabel: string
  rawContent: string
  importedAt: string
  notes: string
}

// ─── Research source ──────────────────────────────────────────────────────────

export interface ResearchSource {
  id: string
  kind: ResearchSourceType
  label: string
  origin: string
  linkedRunId: string | null
  linkedArtifactId: string | null
}

// ─── Normalized research brief ────────────────────────────────────────────────
// All research inputs — generated in-app or imported — are normalized into this
// single structure before any downstream use (spec, architecture, prompts).

export type ResearchBriefSource = 'generated' | 'imported' | 'manual'

export interface ResearchBrief {
  problemSummary: string
  targetUsers: string[]
  valueHypothesis: string
  competitorNotes: string
  risks: string[]
  opportunities: string[]
  recommendedMVP: string
  openQuestions: string[]
  sourcesNote: string
  sourceIds: string[]
  /** Tracks whether the brief came from in-app generation, an import, or manual entry */
  briefSource?: ResearchBriefSource
}
