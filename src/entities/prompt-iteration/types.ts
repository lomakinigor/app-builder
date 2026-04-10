import type { ProjectType } from '../project/types'

// ─── Cycle phase ──────────────────────────────────────────────────────────────
// Position in the Superpowers cycle that this prompt iteration targets.
// Mirrors the full 6-stage vocabulary from superpowers-workflow.md.
// In practice, Prompt Loop iterations are Code+Tests or Review;
// the earlier stages are represented here for completeness and future use.

export type CyclePhase =
  | 'brainstorm'
  | 'spec'
  | 'plan'
  | 'tasks'
  | 'code_and_tests'
  | 'review'

// ─── Prompt loop ──────────────────────────────────────────────────────────────

export type PromptStatus = 'draft' | 'sent' | 'responded' | 'parsed'

export interface PromptIteration {
  id: string
  projectId: string
  iterationNumber: number
  promptText: string
  claudeResponseRaw: string | null
  parsedSummary: ParsedClaudeResponse | null
  recommendedNextStep: string | null
  status: PromptStatus
  createdAt: string
  // ─── Superpowers cycle context ────────────────────────────────────────────
  projectType: ProjectType
  cyclePhase: CyclePhase
  /** T-xxx task ID this prompt targets, e.g. 'T-001' */
  targetTaskId: string | null
  /** Index of the roadmap phase being implemented (0-based) */
  roadmapPhaseNumber: number | null
}

export interface ParsedClaudeResponse {
  analysis: string
  plan: string
  changedFiles: string[]
  implementationSummary: string
  nextStep: string
  warnings: string[]
  // ─── Cycle-awareness fields ───────────────────────────────────────────────
  /** True if test files (.test.ts / .spec.ts / .test.tsx / .spec.tsx) were detected in changedFiles */
  hasTests: boolean
  /** T-xxx IDs mentioned anywhere in the response */
  implementedTaskIds: string[]
  /** First T-xxx mentioned in the "next step" section, if any */
  nextTaskId: string | null
  /**
   * Phase the parser infers the project should move to next.
   * 'review'        — DoD-met signals detected; current task ready to be reviewed.
   * 'code_and_tests' — tests missing or a new T-xxx was suggested; keep building.
   * 'tasks'         — response explicitly suggests picking a new task from the backlog.
   * null            — could not infer (e.g. response not parsed).
   */
  inferredNextPhase: CyclePhase | null
}
