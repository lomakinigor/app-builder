// T-016 — Stage gate unit tests: canAdvanceFromPromptLoop / canAdvanceToReview
// Implements F-007 / T-016
//
// Tests the two Prompt Loop gate functions against all T-014 contracts:
//   A. No iteration / no parsedSummary
//   B. Has iteration but no tests (hasTests=false)
//   C. Has tests but has parser warnings
//   D. Has tests, no warnings, non-review phase → only canAdvanceFromPromptLoop passes
//   E. Has tests, no warnings, review phase + targetTaskId → both gates pass
//   F. Partial parse (hasTests=true, some warnings, inferredNextPhase='code_and_tests')
//
// Design contract confirmed (from T-014):
// - PromptStatus has no 'error' variant — errors manifest as hasTests=false + warnings.length>0.
// - Gate logic reads structured fields ONLY (hasTests, parsedSummary, inferredNextPhase, targetTaskId).
// - Parser warning strings are informational display text; gate uses blockingDiagnostics codes.

import { describe, it, expect } from 'vitest'
import type { PromptIteration, ParsedClaudeResponse } from '../types'
import {
  canAdvanceFromPromptLoop,
  canAdvanceToReview,
  PROMPT_LOOP_DIAG,
} from './stageGates'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented T-005.',
    plan: 'Write tests first.',
    changedFiles: ['src/lib/stageGates.ts', 'src/lib/stageGates.test.ts'],
    implementationSummary: 'Added canAdvanceFromIdea.',
    nextStep: 'Proceed to T-006.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: ['T-005'],
    nextTaskId: 'T-006',
    inferredNextPhase: 'code_and_tests',
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-001',
    projectId: 'proj-001',
    iterationNumber: 1,
    promptText: 'Prompt.',
    claudeResponseRaw: 'Response.',
    parsedSummary: makeParsed(),
    recommendedNextStep: 'Proceed to T-006.',
    status: 'parsed',
    createdAt: '2026-04-14T00:00:00.000Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-005',
    roadmapPhaseNumber: 1,
    ...overrides,
  }
}

// ─── A. No iteration / no parsedSummary ──────────────────────────────────────

describe('A. canAdvanceFromPromptLoop — no iteration / no parsedSummary', () => {
  it('null → canAdvance=false', () => {
    expect(canAdvanceFromPromptLoop(null).canAdvance).toBe(false)
  })

  it('null → diag: no_iteration', () => {
    expect(canAdvanceFromPromptLoop(null).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_ITERATION)
  })

  it('null → reason is non-empty', () => {
    expect(canAdvanceFromPromptLoop(null).reason).toBeTruthy()
  })

  it('parsedSummary=null → canAdvance=false', () => {
    const iter = makeIteration({ parsedSummary: null, status: 'draft' })
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(false)
  })

  it('parsedSummary=null → diag: no_parsed_summary', () => {
    const iter = makeIteration({ parsedSummary: null })
    expect(canAdvanceFromPromptLoop(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY)
  })
})

describe('A. canAdvanceToReview — no iteration / no parsedSummary', () => {
  it('null → canAdvance=false', () => {
    expect(canAdvanceToReview(null).canAdvance).toBe(false)
  })

  it('null → diag: no_iteration (inherits from base gate)', () => {
    expect(canAdvanceToReview(null).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_ITERATION)
  })

  it('parsedSummary=null → diag: no_parsed_summary', () => {
    const iter = makeIteration({ parsedSummary: null })
    expect(canAdvanceToReview(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY)
  })
})

// ─── B. Iteration without tests ───────────────────────────────────────────────

describe('B. No tests (hasTests=false)', () => {
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: false,
      warnings: ['No test files detected in this response. The next prompt will request missing tests before continuing.'],
    }),
  })

  it('canAdvanceFromPromptLoop → canAdvance=false', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(false)
  })

  it('canAdvanceFromPromptLoop → diag: no_tests_detected', () => {
    expect(canAdvanceFromPromptLoop(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_TESTS)
  })

  it('canAdvanceToReview → canAdvance=false', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })

  it('canAdvanceToReview → diag: no_tests_detected (inherits from base gate)', () => {
    expect(canAdvanceToReview(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_TESTS)
  })

  it('reasons array is non-empty for both gates', () => {
    expect(canAdvanceFromPromptLoop(iter).reasons.length).toBeGreaterThan(0)
    expect(canAdvanceToReview(iter).reasons.length).toBeGreaterThan(0)
  })
})

// ─── C. Has tests but has parser warnings ─────────────────────────────────────

describe('C. Has tests but parser warnings present', () => {
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      warnings: ['Could not parse "Brief analysis" section.', 'Could not parse "Recommended next step" section.'],
    }),
  })

  it('canAdvanceFromPromptLoop → canAdvance=false', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(false)
  })

  it('canAdvanceFromPromptLoop → diag: parse_warnings_present', () => {
    expect(canAdvanceFromPromptLoop(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.PARSE_WARNINGS)
  })

  it('canAdvanceToReview → canAdvance=false', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })

  it('canAdvanceToReview → diag: parse_warnings_present (inherits from base gate)', () => {
    expect(canAdvanceToReview(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.PARSE_WARNINGS)
  })

  it('reasons include reference to the specific warning texts', () => {
    const result = canAdvanceFromPromptLoop(iter)
    // reasons[0] is the gate message, remaining items are warning texts
    const allReasons = result.reasons.join(' ')
    expect(allReasons).toContain('предупреждения парсера')
  })

  it('single critical warning blocks both gates (not just "no_tests")', () => {
    const singleWarnIter = makeIteration({
      parsedSummary: makeParsed({
        hasTests: true,
        warnings: ['Could not parse "Brief analysis" section.'],
      }),
    })
    expect(canAdvanceFromPromptLoop(singleWarnIter).canAdvance).toBe(false)
    expect(canAdvanceToReview(singleWarnIter).canAdvance).toBe(false)
  })
})

// ─── D. Has tests, no warnings, non-review phase ─────────────────────────────

describe('D. Clean parse, phase=code_and_tests (not yet ready for review)', () => {
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      warnings: [],
      inferredNextPhase: 'code_and_tests',
    }),
    targetTaskId: 'T-005',
  })

  it('canAdvanceFromPromptLoop → canAdvance=true', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(true)
  })

  it('canAdvanceFromPromptLoop → blockingDiagnostics is empty', () => {
    expect(canAdvanceFromPromptLoop(iter).blockingDiagnostics).toHaveLength(0)
  })

  it('canAdvanceFromPromptLoop → reason is null', () => {
    expect(canAdvanceFromPromptLoop(iter).reason).toBeNull()
  })

  it('canAdvanceToReview → canAdvance=false (phase is not review)', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })

  it('canAdvanceToReview → diag: inferred_phase_not_review', () => {
    expect(canAdvanceToReview(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
  })

  it('canAdvanceToReview → reason mentions the current phase', () => {
    const result = canAdvanceToReview(iter)
    expect(result.reason).toContain('code_and_tests')
  })

  it('canAdvanceFromPromptLoop does NOT check inferredNextPhase (phase-agnostic)', () => {
    // The base gate passes for any valid inferredNextPhase including 'tasks'
    const tasksPhaseIter = makeIteration({
      parsedSummary: makeParsed({ hasTests: true, warnings: [], inferredNextPhase: 'tasks' }),
    })
    expect(canAdvanceFromPromptLoop(tasksPhaseIter).canAdvance).toBe(true)
  })
})

// ─── E. Ideal case for Review ─────────────────────────────────────────────────

describe('E. Clean parse, phase=review, targetTaskId set — both gates pass', () => {
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      warnings: [],
      inferredNextPhase: 'review',
    }),
    targetTaskId: 'T-005',
  })

  it('canAdvanceFromPromptLoop → canAdvance=true', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(true)
  })

  it('canAdvanceToReview → canAdvance=true', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(true)
  })

  it('canAdvanceToReview → blockingDiagnostics is empty', () => {
    expect(canAdvanceToReview(iter).blockingDiagnostics).toHaveLength(0)
  })

  it('canAdvanceToReview → reason is null', () => {
    expect(canAdvanceToReview(iter).reason).toBeNull()
  })

  it('canAdvanceToReview → reasons array is empty', () => {
    expect(canAdvanceToReview(iter).reasons).toHaveLength(0)
  })
})

describe('E. Review gate: missing targetTaskId even with perfect parse', () => {
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      warnings: [],
      inferredNextPhase: 'review',
    }),
    targetTaskId: null,
  })

  it('canAdvanceFromPromptLoop still passes (targetTaskId not its concern)', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(true)
  })

  it('canAdvanceToReview → canAdvance=false (no targetTaskId)', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })

  it('canAdvanceToReview → diag: no_target_task', () => {
    expect(canAdvanceToReview(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_TARGET_TASK)
  })
})

// ─── F. Partial parse scenario (from T-014) ───────────────────────────────────

describe('F. Partial parse — hasTests=true but has warnings, phase=code_and_tests', () => {
  // This scenario maps to T-014 scenario C: partial parse that engine allows
  // (parsedSummary is always set), but gate logic sees it as a blocking state.
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      nextStep: '',
      warnings: ['Could not parse "Recommended next step" section.'],
      inferredNextPhase: 'code_and_tests',
    }),
    targetTaskId: 'T-005',
  })

  it('canAdvanceFromPromptLoop → canAdvance=false (warnings block)', () => {
    // Rule: ANY parser warning is blocking for canAdvanceFromPromptLoop.
    // Even though hasTests=true, a missing nextStep means the response is incomplete.
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(false)
  })

  it('canAdvanceFromPromptLoop → diag: parse_warnings_present', () => {
    expect(canAdvanceFromPromptLoop(iter).blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.PARSE_WARNINGS)
  })

  it('canAdvanceToReview → canAdvance=false', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })

  it('blockingDiagnostics does NOT include no_tests (hasTests=true)', () => {
    // Confirms gate reads structured hasTests field, not warning text
    const result = canAdvanceFromPromptLoop(iter)
    expect(result.blockingDiagnostics).not.toContain(PROMPT_LOOP_DIAG.NO_TESTS)
  })
})

describe('F. Soft scenario — hasTests=true, no warnings, phase=code_and_tests', () => {
  // hasTests=true AND warnings=[] but inferredNextPhase='code_and_tests'
  // → canAdvanceFromPromptLoop passes (it's phase-agnostic)
  // → canAdvanceToReview blocks (phase is not 'review')
  const iter = makeIteration({
    parsedSummary: makeParsed({
      hasTests: true,
      warnings: [],
      inferredNextPhase: 'code_and_tests',
    }),
    targetTaskId: 'T-005',
  })

  it('canAdvanceFromPromptLoop → canAdvance=true (no warnings, has tests)', () => {
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(true)
  })

  it('canAdvanceToReview → canAdvance=false (phase not review)', () => {
    expect(canAdvanceToReview(iter).canAdvance).toBe(false)
  })
})

// ─── Edge cases and diagnostic completeness ───────────────────────────────────

describe('Edge cases', () => {
  it('multiple blocking conditions: no tests + review phase — diag is no_tests (base gate stops first)', () => {
    // canAdvanceToReview delegates to base gate — base returns no_tests before review check runs
    const iter = makeIteration({
      parsedSummary: makeParsed({
        hasTests: false,
        warnings: ['No test files detected.'],
        inferredNextPhase: 'review',
      }),
      targetTaskId: 'T-005',
    })
    const result = canAdvanceToReview(iter)
    expect(result.canAdvance).toBe(false)
    expect(result.blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NO_TESTS)
    // NOT_REVIEW_PHASE is never added because base gate blocked first
    expect(result.blockingDiagnostics).not.toContain(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
  })

  it('inferredNextPhase=null → canAdvanceFromPromptLoop still passes if hasTests=true + no warnings', () => {
    // Null phase is unusual but the base gate does not require it to be set
    const iter = makeIteration({
      parsedSummary: makeParsed({ hasTests: true, warnings: [], inferredNextPhase: null }),
    })
    expect(canAdvanceFromPromptLoop(iter).canAdvance).toBe(true)
  })

  it('inferredNextPhase=null → canAdvanceToReview blocks with not_review_phase diag', () => {
    const iter = makeIteration({
      parsedSummary: makeParsed({ hasTests: true, warnings: [], inferredNextPhase: null }),
      targetTaskId: 'T-005',
    })
    const result = canAdvanceToReview(iter)
    expect(result.canAdvance).toBe(false)
    expect(result.blockingDiagnostics).toContain(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
  })

  it('PROMPT_LOOP_DIAG constants are all unique strings', () => {
    const values = Object.values(PROMPT_LOOP_DIAG)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('passing result has reasons=[] and blockingDiagnostics=[]', () => {
    const iter = makeIteration({
      parsedSummary: makeParsed({
        hasTests: true, warnings: [], inferredNextPhase: 'review',
      }),
      targetTaskId: 'T-005',
    })
    const result = canAdvanceToReview(iter)
    expect(result.reasons).toHaveLength(0)
    expect(result.blockingDiagnostics).toHaveLength(0)
    expect(result.reason).toBeNull()
  })
})
