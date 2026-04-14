import type { IdeaDraft, ResearchBrief, SpecPack, ArchitectureDraft, ProjectType, PromptIteration } from '../types'
import { IDEA_MIN_LENGTH } from '../../features/idea-input/validation'

// ─── Stage gate result ────────────────────────────────────────────────────────

export interface StageGateResult {
  canAdvance: boolean
  /** Human-readable reason shown on the blocked button tooltip / banner */
  reason: string | null
  /**
   * Machine-readable diagnostic code. Stable identifier — do NOT change.
   * Undefined when canAdvance=true or for gates that predate this extension.
   * Used by: unit tests, T-017 hint panels, Review page indicators.
   */
  diagnostic?: string
}

// ─── Prompt Loop gate result (extended) ──────────────────────────────────────
// Extends the base result with a `reasons` array (multiple blocking conditions)
// and machine-readable `blockingDiagnostics` codes for downstream consumers
// (stage gate badges, T-016 unit tests, future Review page indicators).

export interface PromptLoopGateResult {
  canAdvance: boolean
  /** Primary human-readable reason (null when canAdvance=true). Compatible with StageGateResult.reason usage. */
  reason: string | null
  /** All blocking reasons when canAdvance=false. Empty when canAdvance=true. */
  reasons: string[]
  /** Machine-readable diagnostic codes. Stable identifiers — do NOT change. */
  blockingDiagnostics: string[]
}

/**
 * Stable diagnostic codes for Prompt Loop gates.
 * Downstream consumers (UI hints, Review page, History indicators) should
 * reference these constants, NOT the warning text strings from parsedSummary.
 *
 * Design contract (from T-014):
 * - There is NO 'error' PromptStatus value.
 * - "Error" is diagnosed through: warnings.length > 0 + hasTests=false.
 * - Gate logic reads STRUCTURED fields only (hasTests, parsedSummary, inferredNextPhase).
 */
export const PROMPT_LOOP_DIAG = {
  /** No iteration has been generated yet, or no iteration was passed. */
  NO_ITERATION: 'no_iteration',
  /** The latest iteration has no parsedSummary (draft / not yet parsed). */
  NO_PARSED_SUMMARY: 'no_parsed_summary',
  /** parsedSummary.hasTests === false — TDD rule violated. */
  NO_TESTS: 'no_tests_detected',
  /** parsedSummary.warnings is non-empty — parser could not fully extract the response. */
  PARSE_WARNINGS: 'parse_warnings_present',
  /** inferredNextPhase !== 'review' — cycle engine says keep building, not reviewing. */
  NOT_REVIEW_PHASE: 'inferred_phase_not_review',
  /** latestIteration.targetTaskId is null — no task identified for the review. */
  NO_TARGET_TASK: 'no_target_task',
} as const

export type PromptLoopDiag = typeof PROMPT_LOOP_DIAG[keyof typeof PROMPT_LOOP_DIAG]

// ─── Spec gate diagnostic codes ───────────────────────────────────────────────

export const SPEC_DIAG = {
  /** specPack is null — not generated yet */
  NO_SPEC: 'spec_no_spec',
  /** productSummary is empty — required PRD field */
  EMPTY_SUMMARY: 'spec_empty_summary',
  /** MVPScope is empty — required PRD field */
  EMPTY_MVP_SCOPE: 'spec_empty_mvp_scope',
  /** featureList has no entries — spec shell without features is not actionable */
  NO_FEATURES: 'spec_no_features',
  /** projectType not set — required for type-aware generation downstream */
  MISSING_PROJECT_TYPE: 'spec_missing_project_type',
} as const

export type SpecDiag = typeof SPEC_DIAG[keyof typeof SPEC_DIAG]

// ─── Architecture gate diagnostic codes ──────────────────────────────────────

export const ARCH_DIAG = {
  /** architectureDraft is null — not generated yet */
  NO_ARCH: 'arch_no_arch',
  /** recommendedStack is empty — stack is the primary deliverable */
  EMPTY_STACK: 'arch_empty_stack',
  /** roadmapPhases is empty — phases required for Prompt Loop task targeting */
  EMPTY_ROADMAP: 'arch_empty_roadmap',
  /** projectType not set — required for type-aware Prompt Loop prompts */
  MISSING_PROJECT_TYPE: 'arch_missing_project_type',
} as const

export type ArchDiag = typeof ARCH_DIAG[keyof typeof ARCH_DIAG]

function plPass(): PromptLoopGateResult {
  return { canAdvance: true, reason: null, reasons: [], blockingDiagnostics: [] }
}

function plBlock(reasons: string[], blockingDiagnostics: PromptLoopDiag[]): PromptLoopGateResult {
  return { canAdvance: false, reason: reasons[0] ?? null, reasons, blockingDiagnostics }
}

// ─── Idea → Research ──────────────────────────────────────────────────────────

export function canAdvanceFromIdea(
  ideaDraft: IdeaDraft | null,
  projectType: ProjectType | null,
): StageGateResult {
  if (!ideaDraft) {
    return { canAdvance: false, reason: 'Идея ещё не сохранена. Сначала заполните поле идеи продукта.' }
  }

  const rawIdea = ideaDraft.rawIdea.trim()

  if (!rawIdea) {
    return { canAdvance: false, reason: 'Идея продукта пуста. Опишите, что вы хотите создать.' }
  }

  if (rawIdea.length < IDEA_MIN_LENGTH) {
    return {
      canAdvance: false,
      reason: `Идея слишком короткая (${rawIdea.length}/${IDEA_MIN_LENGTH} символов). Добавьте больше деталей перед продолжением.`,
    }
  }

  if (!projectType) {
    return { canAdvance: false, reason: 'Выберите, что вы создаёте — приложение или сайт.' }
  }

  return { canAdvance: true, reason: null }
}

// ─── Research → Spec ──────────────────────────────────────────────────────────

export function canAdvanceFromResearch(researchBrief: ResearchBrief | null): StageGateResult {
  if (!researchBrief) {
    return {
      canAdvance: false,
      reason: 'Бриф исследования ещё не готов. Запустите исследование или импортируйте готовое.',
    }
  }

  if (!researchBrief.problemSummary?.trim()) {
    return {
      canAdvance: false,
      reason: 'Бриф исследования неполный — отсутствует описание проблемы. Отредактируйте бриф перед продолжением.',
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Spec → Architecture ──────────────────────────────────────────────────────

export function canAdvanceFromSpec(specPack: SpecPack | null): StageGateResult {
  if (!specPack) {
    return {
      canAdvance: false,
      reason: 'Спецификации ещё нет. Сгенерируйте или отредактируйте спек перед продолжением.',
      diagnostic: SPEC_DIAG.NO_SPEC,
    }
  }

  if (!specPack.productSummary?.trim()) {
    return {
      canAdvance: false,
      reason: 'Спецификация неполная — резюме продукта пусто. Отредактируйте спек перед продолжением.',
      diagnostic: SPEC_DIAG.EMPTY_SUMMARY,
    }
  }

  if (!specPack.MVPScope?.trim()) {
    return {
      canAdvance: false,
      reason: 'Спецификация неполная — объём MVP пуст. Отредактируйте спек перед продолжением.',
      diagnostic: SPEC_DIAG.EMPTY_MVP_SCOPE,
    }
  }

  if (!specPack.featureList?.length) {
    return {
      canAdvance: false,
      reason: 'Спецификация неполная — список фич пуст. Добавьте хотя бы одну фичу перед продолжением.',
      diagnostic: SPEC_DIAG.NO_FEATURES,
    }
  }

  if (!specPack.projectType) {
    return {
      canAdvance: false,
      reason: 'В спецификации отсутствует тип проекта. Пересгенерируйте спецификацию.',
      diagnostic: SPEC_DIAG.MISSING_PROJECT_TYPE,
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Architecture → Prompt Loop ───────────────────────────────────────────────

export function canAdvanceFromArchitecture(architectureDraft: ArchitectureDraft | null): StageGateResult {
  if (!architectureDraft) {
    return {
      canAdvance: false,
      reason: 'Черновика архитектуры ещё нет. Сгенерируйте или отредактируйте архитектуру перед продолжением.',
      diagnostic: ARCH_DIAG.NO_ARCH,
    }
  }

  if (!architectureDraft.recommendedStack?.length) {
    return {
      canAdvance: false,
      reason: 'Архитектура неполная — не определены элементы стека. Отредактируйте архитектуру перед продолжением.',
      diagnostic: ARCH_DIAG.EMPTY_STACK,
    }
  }

  if (!architectureDraft.roadmapPhases?.length) {
    return {
      canAdvance: false,
      reason: 'Архитектура неполная — не определены фазы роадмапа. Отредактируйте архитектуру перед продолжением.',
      diagnostic: ARCH_DIAG.EMPTY_ROADMAP,
    }
  }

  if (!architectureDraft.projectType) {
    return {
      canAdvance: false,
      reason: 'В архитектуре отсутствует тип проекта. Пересгенерируйте архитектуру.',
      diagnostic: ARCH_DIAG.MISSING_PROJECT_TYPE,
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Prompt Loop → Next stage ─────────────────────────────────────────────────
// Gate for leaving the Prompt Loop (code+tests phase).
// Passes when: iteration exists, parsedSummary set, hasTests=true, no parser warnings.
//
// Rule: any parser warning is blocking. Rationale — if Claude's response could not be
// fully parsed (missing analysis or next-step sections), we need another iteration to
// get a clean, reviewable output. hasTests alone is not sufficient.
//
// Does NOT check inferredNextPhase — that is only relevant for canAdvanceToReview.

export function canAdvanceFromPromptLoop(
  latestIteration: PromptIteration | null,
): PromptLoopGateResult {
  if (!latestIteration) {
    return plBlock(
      ['Нет завершённой итерации Prompt Loop. Запустите хотя бы один цикл.'],
      [PROMPT_LOOP_DIAG.NO_ITERATION],
    )
  }

  if (!latestIteration.parsedSummary) {
    return plBlock(
      ['Итерация ещё не распарсена. Вставьте ответ Claude и запустите парсинг.'],
      [PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY],
    )
  }

  const { parsedSummary } = latestIteration

  if (!parsedSummary.hasTests) {
    return plBlock(
      ['В итерации отсутствуют тесты. Следующий промпт должен включить тесты перед продолжением.'],
      [PROMPT_LOOP_DIAG.NO_TESTS],
    )
  }

  if (parsedSummary.warnings.length > 0) {
    return plBlock(
      [
        'Ответ Claude содержит предупреждения парсера — требуется ещё один цикл:',
        ...parsedSummary.warnings,
      ],
      [PROMPT_LOOP_DIAG.PARSE_WARNINGS],
    )
  }

  return plPass()
}

// ─── Prompt Loop → Review (stricter gate) ────────────────────────────────────
// Runs all canAdvanceFromPromptLoop checks first, then adds:
// - inferredNextPhase === 'review' (cycle engine explicitly signals readiness)
// - targetTaskId is non-null (review needs a task to check against DoD)

export function canAdvanceToReview(
  latestIteration: PromptIteration | null,
): PromptLoopGateResult {
  const base = canAdvanceFromPromptLoop(latestIteration)
  if (!base.canAdvance) return base

  // latestIteration and parsedSummary are non-null at this point (base gate passed)
  const ps = latestIteration!.parsedSummary!
  const reasons: string[] = []
  const diags: PromptLoopDiag[] = []

  if (ps.inferredNextPhase !== 'review') {
    reasons.push(
      ps.inferredNextPhase
        ? `Парсер рекомендует фазу «${ps.inferredNextPhase}», а не «review». Завершите текущую задачу перед обзором.`
        : 'Следующая фаза не определена — нельзя перейти к обзору без явного сигнала "ready for review".',
    )
    diags.push(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
  }

  if (!latestIteration!.targetTaskId) {
    reasons.push('Задача для обзора не указана. Укажите T-xxx в поле задачи.')
    diags.push(PROMPT_LOOP_DIAG.NO_TARGET_TASK)
  }

  if (reasons.length > 0) return plBlock(reasons, diags)

  return plPass()
}
