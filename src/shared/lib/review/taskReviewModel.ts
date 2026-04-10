import type { PromptIteration } from '../../../entities/prompt-iteration/types'
import type { CyclePhase } from '../../../entities/prompt-iteration/types'

// ─── View model ───────────────────────────────────────────────────────────────
// implements F-024 / T-207

export interface TaskReviewRow {
  /** T-xxx task ID, or '(unassigned)' for iterations with no targetTaskId */
  taskId: string
  /** Ordered list of cycle phases this task has touched (deduplicated) */
  phasesVisited: CyclePhase[]
  /** Total number of prompt iterations targeting this task */
  iterationCount: number
  /** Highest iteration number seen for this task (for "last activity") */
  lastIterationNumber: number
  /** True if any iteration for this task had hasTests=true */
  hasTests: boolean
  /** True if any iteration for this task had cyclePhase='review' */
  hasReview: boolean
  /** Snippet from the last parsed iteration's analysis (≤120 chars) */
  lastAnalysisSnippet: string | null
  /** Deduplicated warnings from all iterations for this task */
  warnings: string[]
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Pure function: groups prompt iterations by targetTaskId and produces one
 * TaskReviewRow per task. No store reads; fully testable with inline fixtures.
 */
export function buildTaskReviewModel(iterations: PromptIteration[]): TaskReviewRow[] {
  const grouped = new Map<string, PromptIteration[]>()

  for (const iter of iterations) {
    const key = iter.targetTaskId ?? '(unassigned)'
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.push(iter)
    } else {
      grouped.set(key, [iter])
    }
  }

  const rows: TaskReviewRow[] = []

  for (const [taskId, iters] of grouped.entries()) {
    // Phase order mirrors the Superpowers cycle for consistent badge display
    const phaseOrder: CyclePhase[] = [
      'brainstorm', 'spec', 'plan', 'tasks', 'code_and_tests', 'review',
    ]
    const phasesSet = new Set<CyclePhase>()
    let hasTests = false
    let hasReview = false
    let lastIterationNumber = 0
    let lastAnalysisSnippet: string | null = null
    const warningSet = new Set<string>()

    const sorted = [...iters].sort((a, b) => a.iterationNumber - b.iterationNumber)

    for (const iter of sorted) {
      phasesSet.add(iter.cyclePhase)
      if (iter.cyclePhase === 'review') hasReview = true
      if (iter.parsedSummary?.hasTests) hasTests = true
      if (iter.iterationNumber > lastIterationNumber) {
        lastIterationNumber = iter.iterationNumber
        const raw = iter.parsedSummary?.analysis ?? null
        if (raw) {
          lastAnalysisSnippet = raw.replace(/\n/g, ' ').slice(0, 120) + (raw.length > 120 ? '…' : '')
        }
      }
      for (const w of iter.parsedSummary?.warnings ?? []) {
        warningSet.add(w)
      }
    }

    rows.push({
      taskId,
      phasesVisited: phaseOrder.filter((p) => phasesSet.has(p)),
      iterationCount: iters.length,
      lastIterationNumber,
      hasTests,
      hasReview,
      lastAnalysisSnippet,
      warnings: [...warningSet],
    })
  }

  // Sort: T-xxx entries in lexicographic order, then '(unassigned)' last
  return rows.sort((a, b) => {
    if (a.taskId === '(unassigned)') return 1
    if (b.taskId === '(unassigned)') return -1
    return a.taskId.localeCompare(b.taskId)
  })
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

export type PhaseFilter = CyclePhase | 'all'
export type TestFilter = 'all' | 'has_tests' | 'missing_tests'

export function filterTaskRows(
  rows: TaskReviewRow[],
  phaseFilter: PhaseFilter,
  testFilter: TestFilter,
): TaskReviewRow[] {
  return rows.filter((row) => {
    if (phaseFilter !== 'all' && !row.phasesVisited.includes(phaseFilter)) return false
    if (testFilter === 'has_tests' && !row.hasTests) return false
    if (testFilter === 'missing_tests' && row.hasTests) return false
    return true
  })
}
