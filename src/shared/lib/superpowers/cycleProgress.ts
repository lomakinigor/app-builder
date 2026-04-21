// ─── Superpowers Cycle Progress ───────────────────────────────────────────────
// Implements T-204 / F-024.
//
// Pure functions that compute per-project cycle phase progress from artifact
// presence. No store reads — callers pass in the ProjectData snapshot.
//
// Superpowers cycle: Brainstorm → Spec → Plan → Tasks → Code+Tests → Review
// (superpowers-workflow.md)

import type { ProjectData } from '../../../app/store/projectStore'

// ─── Phase definition ─────────────────────────────────────────────────────────

export type CyclePhaseId =
  | 'brainstorm'
  | 'spec'
  | 'plan'
  | 'tasks'
  | 'code_and_tests'
  | 'review'

export type CyclePhaseStatus = 'not_started' | 'in_progress' | 'done'

export interface CyclePhaseProgress {
  id: CyclePhaseId
  label: string
  /** Screen the user should navigate to for this phase */
  path: string
  icon: string
  status: CyclePhaseStatus
  /** Short note shown below the label */
  hint: string
}

// ─── Phase configs ────────────────────────────────────────────────────────────

const PHASE_META: Record<CyclePhaseId, { label: string; icon: string; path: string }> = {
  brainstorm:    { label: 'Идея',          icon: '💡', path: '/idea' },
  spec:          { label: 'Спец',          icon: '🔍', path: '/research' },
  plan:          { label: 'План',          icon: '📋', path: '/spec' },
  tasks:         { label: 'Задачи',        icon: '🏗️', path: '/architecture' },
  code_and_tests:{ label: 'Код + Тесты',   icon: '⚡', path: '/prompt-loop' },
  review:        { label: 'Обзор',         icon: '🔍', path: '/history' },
}

const PHASE_ORDER: CyclePhaseId[] = [
  'brainstorm',
  'spec',
  'plan',
  'tasks',
  'code_and_tests',
  'review',
]

// ─── Status derivation ────────────────────────────────────────────────────────
// Each function returns the status for one phase given the project's artifact data.

function brainstormStatus(data: ProjectData): CyclePhaseStatus {
  if (data.ideaDraft?.rawIdea && data.ideaDraft.rawIdea.trim().length > 0) return 'done'
  return 'not_started'
}

function specStatus(data: ProjectData): CyclePhaseStatus {
  if (data.researchBrief) return 'done'
  if (data.ideaDraft?.rawIdea) return 'in_progress'
  return 'not_started'
}

function planStatus(data: ProjectData): CyclePhaseStatus {
  if (data.specPack && data.architectureDraft) return 'done'
  if (data.researchBrief) return 'in_progress'
  return 'not_started'
}

function tasksStatus(data: ProjectData): CyclePhaseStatus {
  if (!data.architectureDraft) return 'not_started'
  if (data.architectureDraft.roadmapPhases.length > 0) return 'done'
  return 'in_progress'
}

function codeAndTestsStatus(data: ProjectData): CyclePhaseStatus {
  if (!data.promptIterations.length) return 'not_started'
  const hasTests = data.promptIterations.some((i) => i.parsedSummary?.hasTests === true)
  if (hasTests) return 'done'
  return 'in_progress'
}

function reviewStatus(data: ProjectData): CyclePhaseStatus {
  if (!data.promptIterations.length) return 'not_started'
  // User explicitly marked at least one task as review-complete (T-212)
  const completed = Array.isArray(data.completedReviewTaskIds) ? data.completedReviewTaskIds : []
  if (completed.length > 0) return 'done'
  const hasReview = data.promptIterations.some((i) => i.cyclePhase === 'review')
  if (hasReview) return 'done'
  // Any parsed iteration = review is in progress
  const hasParsed = data.promptIterations.some((i) => i.parsedSummary !== null)
  if (hasParsed) return 'in_progress'
  return 'not_started'
}

// ─── Hint text ────────────────────────────────────────────────────────────────

function hintFor(id: CyclePhaseId, status: CyclePhaseStatus, data: ProjectData): string {
  if (status === 'done') return 'Готово'
  switch (id) {
    case 'brainstorm':
      return 'Введите идею'
    case 'spec':
      return data.ideaDraft ? 'Запустите или импортируйте исследование' : 'Сначала добавьте идею'
    case 'plan':
      return data.researchBrief ? 'Сгенерируйте спец + архитектуру' : 'Сначала завершите исследование'
    case 'tasks':
      return data.architectureDraft ? 'Просмотрите фазы дорожной карты' : 'Сначала завершите план'
    case 'code_and_tests':
      if (!data.promptIterations.length) return 'Сгенерируйте первый промпт'
      return 'Вставьте ответы Claude'
    case 'review':
      return data.promptIterations.length ? 'Просмотрите результаты' : 'Сначала запустите цикл промптов'
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the Superpowers cycle phase progress for a project given its artifact data.
 * Pure function — no side effects, no store reads.
 */
export function computeCycleProgress(data: ProjectData): CyclePhaseProgress[] {
  const statusFns: Record<CyclePhaseId, (d: ProjectData) => CyclePhaseStatus> = {
    brainstorm:     brainstormStatus,
    spec:           specStatus,
    plan:           planStatus,
    tasks:          tasksStatus,
    code_and_tests: codeAndTestsStatus,
    review:         reviewStatus,
  }

  return PHASE_ORDER.map((id) => {
    const status = statusFns[id](data)
    const meta = PHASE_META[id]
    return {
      id,
      label: meta.label,
      icon: meta.icon,
      path: meta.path,
      status,
      hint: hintFor(id, status, data),
    }
  })
}

/**
 * Returns the first in_progress phase, or the first not_started phase,
 * or null if all phases are done.
 */
export function getActiveCyclePhase(phases: CyclePhaseProgress[]): CyclePhaseProgress | null {
  return (
    phases.find((p) => p.status === 'in_progress') ??
    phases.find((p) => p.status === 'not_started') ??
    null
  )
}
