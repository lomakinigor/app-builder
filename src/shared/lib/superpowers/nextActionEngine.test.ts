// Tests for computeNextAction pure function.
// Implements T-209t / F-024, T-210 (getRecommendedPhaseId / getRecommendedTaskId).
//
// Verifies the decision-priority chain:
//   Brainstorm → Spec → Plan → Tasks → Code+Tests → Review → none

import { describe, it, expect } from 'vitest'
import { computeNextAction, getRecommendedPhaseId, getRecommendedTaskId } from './nextActionEngine'
import type { NextAction } from './nextActionEngine'
import type { CyclePhaseProgress, CyclePhaseId, CyclePhaseStatus } from './cycleProgress'
import type { PromptIteration, ParsedClaudeResponse } from '../../../entities/prompt-iteration/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PHASE_META: Record<CyclePhaseId, { label: string; icon: string; path: string }> = {
  brainstorm:     { label: 'Идея',        icon: '💡', path: '/idea' },
  spec:           { label: 'Спец',        icon: '🔍', path: '/research' },
  plan:           { label: 'План',        icon: '📋', path: '/spec' },
  tasks:          { label: 'Задачи',      icon: '🏗️', path: '/architecture' },
  code_and_tests: { label: 'Код + Тесты', icon: '⚡', path: '/prompt-loop' },
  review:         { label: 'Обзор',       icon: '🔍', path: '/history' },
}

const PHASE_ORDER: CyclePhaseId[] = [
  'brainstorm', 'spec', 'plan', 'tasks', 'code_and_tests', 'review',
]

/**
 * Build a CyclePhaseProgress[] where all phases default to 'not_started'
 * and the given overrides are applied.
 */
function makePhases(
  overrides: Partial<Record<CyclePhaseId, CyclePhaseStatus>> = {},
): CyclePhaseProgress[] {
  return PHASE_ORDER.map((id) => ({
    id,
    label: PHASE_META[id].label,
    icon: PHASE_META[id].icon,
    path: PHASE_META[id].path,
    status: overrides[id] ?? 'not_started',
    hint: '',
  }))
}

/** All phases done */
const allDonePhases = makePhases({
  brainstorm: 'done',
  spec: 'done',
  plan: 'done',
  tasks: 'done',
  code_and_tests: 'done',
  review: 'done',
})

/** Phases up through tasks are done; code_and_tests is in_progress */
const codeActivePhases = makePhases({
  brainstorm: 'done',
  spec: 'done',
  plan: 'done',
  tasks: 'done',
  code_and_tests: 'in_progress',
})

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: '',
    plan: '',
    changedFiles: [],
    implementationSummary: '',
    nextStep: '',
    warnings: [],
    hasTests: false,
    implementedTaskIds: [],
    nextTaskId: null,
    inferredNextPhase: null,
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-1',
    projectId: 'proj-1',
    iterationNumber: 1,
    promptText: 'Do something',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-10T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: null,
    roadmapPhaseNumber: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeNextAction', () => {

  // ── Scenario 1: empty project ──────────────────────────────────────────────

  describe('empty project (all phases not_started)', () => {
    const action = computeNextAction(makePhases(), [])

    it('kind is phase', () => {
      expect(action.kind).toBe('phase')
    })

    it('targets brainstorm', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('brainstorm')
    })

    it('path leads to /idea', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/idea')
    })

    it('reason is non-empty Russian text', () => {
      expect(action.reason.length).toBeGreaterThan(10)
    })
  })

  // ── Scenario 2: idea present, no spec ─────────────────────────────────────

  describe('brainstorm done, spec not_started', () => {
    const phases = makePhases({ brainstorm: 'done' })
    const action = computeNextAction(phases, [])

    it('targets spec phase', () => {
      expect(action.kind).toBe('phase')
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('spec')
    })

    it('path leads to /research', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/research')
    })
  })

  // ── Scenario 3: spec done, plan not started ────────────────────────────────

  describe('brainstorm + spec done, plan not_started', () => {
    const phases = makePhases({ brainstorm: 'done', spec: 'done' })
    const action = computeNextAction(phases, [])

    it('targets plan phase', () => {
      expect(action.kind).toBe('phase')
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('plan')
    })

    it('path leads to /spec (spec+arch generation page)', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/spec')
    })
  })

  // ── Scenario 4: plan done, tasks not started ───────────────────────────────

  describe('brainstorm + spec + plan done, tasks not_started', () => {
    const phases = makePhases({ brainstorm: 'done', spec: 'done', plan: 'done' })
    const action = computeNextAction(phases, [])

    it('targets tasks phase', () => {
      expect(action.kind).toBe('phase')
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('tasks')
    })

    it('path leads to /architecture', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/architecture')
    })
  })

  // ── Scenario 5: code+tests active, no iterations ──────────────────────────

  describe('tasks done, code_and_tests in_progress, no iterations', () => {
    const phases = makePhases({
      brainstorm: 'done', spec: 'done', plan: 'done', tasks: 'done',
      code_and_tests: 'in_progress',
    })
    const action = computeNextAction(phases, [])

    it('targets code_and_tests phase', () => {
      expect(action.kind).toBe('phase')
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('code_and_tests')
    })

    it('path leads to /prompt-loop', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/prompt-loop')
    })
  })

  // ── Scenario 6: active task with no inferredNextPhase ─────────────────────

  describe('code_and_tests active, last iteration has targetTaskId, no inferred phase', () => {
    const iter = makeIteration({ targetTaskId: 'T-005', parsedSummary: makeParsed() })
    const action = computeNextAction(codeActivePhases, [iter])

    it('kind is task', () => {
      expect(action.kind).toBe('task')
    })

    it('taskId matches the iteration targetTaskId', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).taskId).toBe('T-005')
    })

    it('phaseId is code_and_tests', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).phaseId).toBe('code_and_tests')
    })

    it('path leads to /prompt-loop', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).path).toBe('/prompt-loop')
    })

    it('reason mentions the task ID', () => {
      expect(action.reason).toContain('T-005')
    })
  })

  // ── Scenario 7: inferredNextPhase = 'code_and_tests' → same task, keep coding

  describe('last iteration inferredNextPhase=code_and_tests → continue coding', () => {
    const iter = makeIteration({
      targetTaskId: 'T-007',
      parsedSummary: makeParsed({ inferredNextPhase: 'code_and_tests' }),
    })
    const action = computeNextAction(codeActivePhases, [iter])

    it('kind is task (not phase)', () => {
      expect(action.kind).toBe('task')
    })

    it('phaseId is code_and_tests', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).phaseId).toBe('code_and_tests')
    })
  })

  // ── Scenario 8: inferredNextPhase = 'review' → suggest review for that task

  describe('last iteration inferredNextPhase=review → suggest task review', () => {
    const iter = makeIteration({
      targetTaskId: 'T-003',
      parsedSummary: makeParsed({ inferredNextPhase: 'review' }),
    })
    const action = computeNextAction(codeActivePhases, [iter])

    it('kind is task', () => {
      expect(action.kind).toBe('task')
    })

    it('taskId matches', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).taskId).toBe('T-003')
    })

    it('phaseId is review', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).phaseId).toBe('review')
    })

    it('path leads to /history', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).path).toBe('/history')
    })

    it('reason mentions the task ID', () => {
      expect(action.reason).toContain('T-003')
    })
  })

  // ── Scenario 9: inferredNextPhase = 'tasks' → pick from backlog ───────────

  describe('last iteration inferredNextPhase=tasks → go pick a task', () => {
    const iter = makeIteration({
      targetTaskId: 'T-002',
      parsedSummary: makeParsed({ inferredNextPhase: 'tasks' }),
    })
    const action = computeNextAction(codeActivePhases, [iter])

    it('kind is phase', () => {
      expect(action.kind).toBe('phase')
    })

    it('phaseId is tasks', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).phaseId).toBe('tasks')
    })

    it('path leads to /architecture (roadmap)', () => {
      expect((action as Extract<typeof action, { kind: 'phase' }>).path).toBe('/architecture')
    })
  })

  // ── Scenario 10: review phase active, iteration signals review ─────────────

  describe('code_and_tests done, review in_progress, iteration flags review', () => {
    const phases = makePhases({
      brainstorm: 'done', spec: 'done', plan: 'done', tasks: 'done',
      code_and_tests: 'done',
      review: 'in_progress',
    })
    const iter = makeIteration({
      targetTaskId: 'T-009',
      parsedSummary: makeParsed({ inferredNextPhase: 'review' }),
    })
    const action = computeNextAction(phases, [iter])

    it('kind is task', () => {
      expect(action.kind).toBe('task')
    })

    it('phaseId is review', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).phaseId).toBe('review')
    })

    it('taskId is the review-flagged iteration', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).taskId).toBe('T-009')
    })
  })

  // ── Scenario 11: all phases done → none ───────────────────────────────────

  describe('all phases done, no further action', () => {
    const action = computeNextAction(allDonePhases, [])

    it('kind is none', () => {
      expect(action.kind).toBe('none')
    })

    it('reason is non-empty text', () => {
      expect(action.reason.length).toBeGreaterThan(10)
    })
  })

  // ── Scenario 12: latest iteration wins when multiple exist ─────────────────


  describe('multiple iterations — latest (highest iterationNumber) governs decision', () => {
    const older = makeIteration({
      iterationNumber: 1,
      targetTaskId: 'T-001',
      parsedSummary: makeParsed({ inferredNextPhase: 'review' }),
    })
    const newer = makeIteration({
      iterationNumber: 2,
      targetTaskId: 'T-002',
      parsedSummary: makeParsed({ inferredNextPhase: 'code_and_tests' }),
    })
    const action = computeNextAction(codeActivePhases, [older, newer])

    it('uses the newer iteration (no review suggested)', () => {
      expect(action.kind).toBe('task')
      expect((action as Extract<typeof action, { kind: 'task' }>).phaseId).toBe('code_and_tests')
    })

    it('taskId comes from the newer iteration', () => {
      expect((action as Extract<typeof action, { kind: 'task' }>).taskId).toBe('T-002')
    })
  })
})

// ─── T-210: presentation helpers ──────────────────────────────────────────────

describe('getRecommendedPhaseId', () => {
  it('returns null for kind=none', () => {
    const action: NextAction = { kind: 'none', reason: 'Всё готово' }
    expect(getRecommendedPhaseId(action)).toBeNull()
  })

  it('returns phaseId for kind=phase (brainstorm)', () => {
    const action: NextAction = { kind: 'phase', phaseId: 'brainstorm', label: 'Идея', path: '/idea', reason: 'x' }
    expect(getRecommendedPhaseId(action)).toBe('brainstorm')
  })

  it('returns phaseId for kind=phase (spec)', () => {
    const action: NextAction = { kind: 'phase', phaseId: 'spec', label: 'Спец', path: '/research', reason: 'x' }
    expect(getRecommendedPhaseId(action)).toBe('spec')
  })

  it('returns code_and_tests for kind=task with code_and_tests', () => {
    const action: NextAction = { kind: 'task', taskId: 'T-005', phaseId: 'code_and_tests', label: 'Код', path: '/prompt-loop', reason: 'x' }
    expect(getRecommendedPhaseId(action)).toBe('code_and_tests')
  })

  it('returns review for kind=task with review', () => {
    const action: NextAction = { kind: 'task', taskId: 'T-003', phaseId: 'review', label: 'Ревью', path: '/history', reason: 'x' }
    expect(getRecommendedPhaseId(action)).toBe('review')
  })
})

describe('getRecommendedTaskId', () => {
  it('returns null for kind=none', () => {
    const action: NextAction = { kind: 'none', reason: 'Всё готово' }
    expect(getRecommendedTaskId(action)).toBeNull()
  })

  it('returns null for kind=phase', () => {
    const action: NextAction = { kind: 'phase', phaseId: 'plan', label: 'План', path: '/spec', reason: 'x' }
    expect(getRecommendedTaskId(action)).toBeNull()
  })

  it('returns taskId for kind=task', () => {
    const action: NextAction = { kind: 'task', taskId: 'T-007', phaseId: 'code_and_tests', label: 'Код', path: '/prompt-loop', reason: 'x' }
    expect(getRecommendedTaskId(action)).toBe('T-007')
  })

  it('returns taskId even when phaseId is review', () => {
    const action: NextAction = { kind: 'task', taskId: 'T-009', phaseId: 'review', label: 'Ревью', path: '/history', reason: 'x' }
    expect(getRecommendedTaskId(action)).toBe('T-009')
  })
})
