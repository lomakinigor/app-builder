// ─── Next Action Engine ────────────────────────────────────────────────────────
// Implements T-209 / F-024.
//
// Pure function: given the computed cycle phase progress and the list of prompt
// iterations for a project, returns the single most useful next action the user
// should take.  No store reads — all inputs are passed explicitly so the function
// is trivially testable.
//
// Decision priority (mirrors the Superpowers cycle order):
//   1. Brainstorm not started → go record the idea.
//   2. Spec not started       → go run/import research.
//   3. Plan not started       → go generate spec + architecture.
//   4. Tasks not started      → go review roadmap phases in architecture.
//   5. Code+Tests active      → continue or start the prompt loop.
//      5a. Last iteration signals inferredNextPhase='review' → suggest review.
//      5b. Last iteration signals inferredNextPhase='tasks'  → go pick task.
//      5c. Last iteration has targetTaskId                   → continue that task.
//      5d. No iterations yet                                 → start the loop.
//   6. Review active          → go review the work.
//   7. All done               → kind='none', celebrate.

import type { CyclePhaseProgress, CyclePhaseId } from './cycleProgress'
import type { PromptIteration } from '../../../entities/prompt-iteration/types'

// ─── Result type ──────────────────────────────────────────────────────────────

export type NextAction =
  | {
      kind: 'phase'
      phaseId: CyclePhaseId
      /** Russian label for the phase (Идея / Спец / …) */
      label: string
      /** Route path to navigate to */
      path: string
      /** Human-readable explanation shown in the card (Russian) */
      reason: string
    }
  | {
      kind: 'task'
      taskId: string
      phaseId: 'code_and_tests' | 'review'
      label: string
      path: string
      reason: string
    }
  | {
      kind: 'none'
      reason: string
    }

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Compute the next recommended action for a project.
 *
 * @param cyclePhases  Output of computeCycleProgress(projectData)
 * @param iterations   All PromptIterations for the project (may be empty)
 */
export function computeNextAction(
  cyclePhases: CyclePhaseProgress[],
  iterations: PromptIteration[],
): NextAction {
  const byId = Object.fromEntries(cyclePhases.map((p) => [p.id, p])) as Record<
    CyclePhaseId,
    CyclePhaseProgress
  >

  // ── 1. Brainstorm ──────────────────────────────────────────────────────────
  if (byId.brainstorm.status === 'not_started') {
    return {
      kind: 'phase',
      phaseId: 'brainstorm',
      label: byId.brainstorm.label,
      path: byId.brainstorm.path,
      reason: 'Начните с формулировки идеи продукта и первичного исследования.',
    }
  }

  // ── 2. Spec ────────────────────────────────────────────────────────────────
  if (byId.spec.status === 'not_started') {
    return {
      kind: 'phase',
      phaseId: 'spec',
      label: byId.spec.label,
      path: byId.spec.path,
      reason: 'Соберите первую спецификацию на основе идеи или исследования.',
    }
  }

  // ── 3. Plan ────────────────────────────────────────────────────────────────
  if (byId.plan.status === 'not_started') {
    return {
      kind: 'phase',
      phaseId: 'plan',
      label: byId.plan.label,
      path: byId.plan.path,
      reason: 'Составьте спек и архитектуру с дорожной картой перед написанием кода.',
    }
  }

  // ── 4. Tasks ───────────────────────────────────────────────────────────────
  if (byId.tasks.status === 'not_started') {
    return {
      kind: 'phase',
      phaseId: 'tasks',
      label: byId.tasks.label,
      path: byId.tasks.path,
      reason: 'Просмотрите фазы дорожной карты и определите задачи T-xxx для первой итерации.',
    }
  }

  // ── 5. Code + Tests ────────────────────────────────────────────────────────
  if (byId.code_and_tests.status !== 'done') {
    const lastIteration = latestIteration(iterations)
    const inferred = lastIteration?.parsedSummary?.inferredNextPhase ?? null

    // 5a. Last iteration signals review-readiness
    if (inferred === 'review' && lastIteration?.targetTaskId) {
      return {
        kind: 'task',
        taskId: lastIteration.targetTaskId,
        phaseId: 'review',
        label: 'Ревью',
        path: '/history',
        reason: `Claude сигнализирует о готовности к ревью по задаче ${lastIteration.targetTaskId}. Проверьте Definition of Done.`,
      }
    }

    // 5b. Last iteration says to pick a new task
    if (inferred === 'tasks') {
      return {
        kind: 'phase',
        phaseId: 'tasks',
        label: byId.tasks.label,
        path: byId.tasks.path,
        reason: 'Claude предлагает выбрать следующую задачу из бэклога дорожной карты.',
      }
    }

    // 5c. Continue the active task
    if (lastIteration?.targetTaskId) {
      return {
        kind: 'task',
        taskId: lastIteration.targetTaskId,
        phaseId: 'code_and_tests',
        label: 'Код + Тесты',
        path: '/prompt-loop',
        reason: `Продолжите работу по задаче ${lastIteration.targetTaskId}: допишите код и тесты.`,
      }
    }

    // 5d. No iterations yet — start the loop
    return {
      kind: 'phase',
      phaseId: 'code_and_tests',
      label: byId.code_and_tests.label,
      path: byId.code_and_tests.path,
      reason: 'Сгенерируйте первый промпт для Claude Code и начните итеративную разработку.',
    }
  }

  // ── 6. Review ──────────────────────────────────────────────────────────────
  if (byId.review.status !== 'done') {
    // Prefer an iteration that explicitly flagged review-readiness
    const reviewTarget = [...iterations]
      .sort((a, b) => b.iterationNumber - a.iterationNumber)
      .find((i) => i.parsedSummary?.inferredNextPhase === 'review' && i.targetTaskId)

    if (reviewTarget?.targetTaskId) {
      return {
        kind: 'task',
        taskId: reviewTarget.targetTaskId,
        phaseId: 'review',
        label: 'Ревью',
        path: '/history',
        reason: `Проверьте результат по задаче ${reviewTarget.targetTaskId} и зафиксируйте выводы.`,
      }
    }

    return {
      kind: 'phase',
      phaseId: 'review',
      label: byId.review.label,
      path: byId.review.path,
      reason: 'Проверьте итоги сборки по чеклисту и сравните с PRD и Definition of Done.',
    }
  }

  // ── 7. All done ────────────────────────────────────────────────────────────
  return {
    kind: 'none',
    reason:
      'Для этого проекта нет явных следующих шагов — проведите ретроспективу или запланируйте следующие фичи.',
  }
}

// ─── Presentation helpers ─────────────────────────────────────────────────────

/**
 * Returns the CyclePhaseId that should be highlighted in the stepper/timeline,
 * or null when kind='none'.
 *
 * For kind='phase'  → the target phase.
 * For kind='task'   → the task's owning phase ('code_and_tests' | 'review').
 * For kind='none'   → null (no highlight).
 */
export function getRecommendedPhaseId(action: NextAction): CyclePhaseId | null {
  if (action.kind === 'none') return null
  return action.phaseId
}

/**
 * Returns the task ID that should be highlighted in task-list UI,
 * or null when there is no specific task recommendation.
 */
export function getRecommendedTaskId(action: NextAction): string | null {
  if (action.kind === 'task') return action.taskId
  return null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function latestIteration(iterations: PromptIteration[]): PromptIteration | null {
  if (!iterations.length) return null
  return [...iterations].sort((a, b) => b.iterationNumber - a.iterationNumber)[0]
}
