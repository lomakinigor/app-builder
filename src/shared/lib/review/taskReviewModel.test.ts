// ─── taskReviewModel unit tests ───────────────────────────────────────────────
// Implements T-012A / F-024.
//
// Covers buildTaskReviewModel and filterTaskRows — the rule-engine / aggregation
// layer that turns raw PromptIteration[] into typed TaskReviewRow[] used by
// HistoryPage and the ReviewPhase view.
//
// What is tested here:
//   - Grouping by targetTaskId (including '(unassigned)' fallback)
//   - Aggregation: hasTests, hasReview, phasesVisited, lastIterationNumber,
//     lastAnalysisSnippet, warnings deduplication
//   - Sort order (T-xxx lexicographic, '(unassigned)' last)
//   - filterTaskRows: phaseFilter and testFilter combinations
//   - Edge cases: empty input, single iteration, many iterations per task

import { describe, it, expect } from 'vitest'
import {
  buildTaskReviewModel,
  filterTaskRows,
  type TaskReviewRow,
} from './taskReviewModel'
import type { PromptIteration, ParsedClaudeResponse } from '../../../entities/prompt-iteration/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

// ─── buildTaskReviewModel — grouping ─────────────────────────────────────────

describe('buildTaskReviewModel — grouping', () => {
  it('returns empty array for empty input', () => {
    expect(buildTaskReviewModel([])).toEqual([])
  })

  it('single iteration → one row', () => {
    const rows = buildTaskReviewModel([makeIteration({ targetTaskId: 'T-001' })])
    expect(rows).toHaveLength(1)
    expect(rows[0].taskId).toBe('T-001')
  })

  it('groups two iterations under the same task into one row', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', iterationNumber: 1, targetTaskId: 'T-005' }),
      makeIteration({ id: 'i2', iterationNumber: 2, targetTaskId: 'T-005' }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].iterationCount).toBe(2)
  })

  it('two different task IDs → two rows', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001' }),
      makeIteration({ targetTaskId: 'T-002' }),
    ])
    expect(rows).toHaveLength(2)
  })

  it('null targetTaskId is grouped under "(unassigned)"', () => {
    const rows = buildTaskReviewModel([makeIteration({ targetTaskId: null })])
    expect(rows[0].taskId).toBe('(unassigned)')
  })

  it('mix of assigned and unassigned → separate rows', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001' }),
      makeIteration({ targetTaskId: null }),
    ])
    expect(rows.some((r) => r.taskId === 'T-001')).toBe(true)
    expect(rows.some((r) => r.taskId === '(unassigned)')).toBe(true)
  })
})

// ─── buildTaskReviewModel — sort order ───────────────────────────────────────

describe('buildTaskReviewModel — sort order', () => {
  it('T-xxx rows are sorted lexicographically', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-010' }),
      makeIteration({ targetTaskId: 'T-002' }),
      makeIteration({ targetTaskId: 'T-007' }),
    ])
    expect(rows.map((r) => r.taskId)).toEqual(['T-002', 'T-007', 'T-010'])
  })

  it('"(unassigned)" always sorts last', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: null }),
      makeIteration({ targetTaskId: 'T-001' }),
    ])
    expect(rows[rows.length - 1].taskId).toBe('(unassigned)')
  })

  it('"(unassigned)" is last even when only one T-xxx row exists', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'a', targetTaskId: 'T-003' }),
      makeIteration({ id: 'b', targetTaskId: null }),
    ])
    expect(rows[0].taskId).toBe('T-003')
    expect(rows[1].taskId).toBe('(unassigned)')
  })
})

// ─── buildTaskReviewModel — hasTests aggregation ─────────────────────────────

describe('buildTaskReviewModel — hasTests aggregation', () => {
  it('hasTests=false when no iteration has tests', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: makeParsed({ hasTests: false }) }),
    ])
    expect(rows[0].hasTests).toBe(false)
  })

  it('hasTests=true when ANY iteration has tests', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', parsedSummary: makeParsed({ hasTests: false }) }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', parsedSummary: makeParsed({ hasTests: true }) }),
    ])
    expect(rows[0].hasTests).toBe(true)
  })

  it('hasTests=false when parsedSummary is null', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: null }),
    ])
    expect(rows[0].hasTests).toBe(false)
  })
})

// ─── buildTaskReviewModel — hasReview aggregation ────────────────────────────

describe('buildTaskReviewModel — hasReview aggregation', () => {
  it('hasReview=false when no iteration has cyclePhase="review"', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
    ])
    expect(rows[0].hasReview).toBe(false)
  })

  it('hasReview=true when ANY iteration has cyclePhase="review"', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', cyclePhase: 'review' }),
    ])
    expect(rows[0].hasReview).toBe(true)
  })
})

// ─── buildTaskReviewModel — phasesVisited ────────────────────────────────────

describe('buildTaskReviewModel — phasesVisited', () => {
  it('single code_and_tests iteration → phasesVisited = [code_and_tests]', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
    ])
    expect(rows[0].phasesVisited).toEqual(['code_and_tests'])
  })

  it('phases are deduplicated', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
    ])
    expect(rows[0].phasesVisited).toEqual(['code_and_tests'])
  })

  it('phases follow Superpowers cycle order regardless of insertion order', () => {
    // Iterations arrive in reverse order (review before code_and_tests)
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', cyclePhase: 'review' }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', cyclePhase: 'code_and_tests' }),
    ])
    // phasesVisited must be ordered as in the cycle: code_and_tests before review
    const idx = (p: string) => rows[0].phasesVisited.indexOf(p as never)
    expect(idx('code_and_tests')).toBeLessThan(idx('review'))
  })
})

// ─── buildTaskReviewModel — lastIterationNumber ───────────────────────────────

describe('buildTaskReviewModel — lastIterationNumber', () => {
  it('single iteration → lastIterationNumber equals its iterationNumber', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', iterationNumber: 3 }),
    ])
    expect(rows[0].lastIterationNumber).toBe(3)
  })

  it('multiple iterations → lastIterationNumber is the highest', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', iterationNumber: 1 }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', iterationNumber: 5 }),
      makeIteration({ id: 'i3', targetTaskId: 'T-001', iterationNumber: 3 }),
    ])
    expect(rows[0].lastIterationNumber).toBe(5)
  })
})

// ─── buildTaskReviewModel — lastAnalysisSnippet ───────────────────────────────

describe('buildTaskReviewModel — lastAnalysisSnippet', () => {
  it('null when parsedSummary is null', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: null }),
    ])
    expect(rows[0].lastAnalysisSnippet).toBeNull()
  })

  it('null when parsedSummary.analysis is empty string', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: makeParsed({ analysis: '' }) }),
    ])
    expect(rows[0].lastAnalysisSnippet).toBeNull()
  })

  it('short analysis is returned verbatim (no ellipsis)', () => {
    const rows = buildTaskReviewModel([
      makeIteration({
        targetTaskId: 'T-001',
        parsedSummary: makeParsed({ analysis: 'Short analysis.' }),
      }),
    ])
    expect(rows[0].lastAnalysisSnippet).toBe('Short analysis.')
  })

  it('long analysis (> 120 chars) is truncated with ellipsis', () => {
    const long = 'A'.repeat(150)
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: makeParsed({ analysis: long }) }),
    ])
    const snippet = rows[0].lastAnalysisSnippet!
    expect(snippet.length).toBeLessThanOrEqual(124) // 120 chars + '…'
    expect(snippet.endsWith('…')).toBe(true)
  })

  it('snippet comes from the LAST (highest iterationNumber) iteration', () => {
    const rows = buildTaskReviewModel([
      makeIteration({
        id: 'i1',
        iterationNumber: 1,
        targetTaskId: 'T-001',
        parsedSummary: makeParsed({ analysis: 'First iteration analysis.' }),
      }),
      makeIteration({
        id: 'i2',
        iterationNumber: 2,
        targetTaskId: 'T-001',
        parsedSummary: makeParsed({ analysis: 'Second iteration analysis.' }),
      }),
    ])
    expect(rows[0].lastAnalysisSnippet).toContain('Second iteration')
  })

  it('newlines in analysis are replaced with spaces in snippet', () => {
    const rows = buildTaskReviewModel([
      makeIteration({
        targetTaskId: 'T-001',
        parsedSummary: makeParsed({ analysis: 'Line one.\nLine two.' }),
      }),
    ])
    expect(rows[0].lastAnalysisSnippet).not.toContain('\n')
    expect(rows[0].lastAnalysisSnippet).toContain('Line one. Line two.')
  })
})

// ─── buildTaskReviewModel — warnings aggregation ─────────────────────────────

describe('buildTaskReviewModel — warnings aggregation', () => {
  it('empty warnings when parsedSummary is null', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ targetTaskId: 'T-001', parsedSummary: null }),
    ])
    expect(rows[0].warnings).toEqual([])
  })

  it('collects warnings from a single parsed iteration', () => {
    const rows = buildTaskReviewModel([
      makeIteration({
        targetTaskId: 'T-001',
        parsedSummary: makeParsed({ warnings: ['No tests detected.'] }),
      }),
    ])
    expect(rows[0].warnings).toContain('No tests detected.')
  })

  it('deduplicates identical warnings across iterations', () => {
    const w = 'No test files detected.'
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', parsedSummary: makeParsed({ warnings: [w] }) }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', parsedSummary: makeParsed({ warnings: [w] }) }),
    ])
    expect(rows[0].warnings.filter((s) => s === w)).toHaveLength(1)
  })

  it('accumulates distinct warnings from multiple iterations', () => {
    const rows = buildTaskReviewModel([
      makeIteration({ id: 'i1', targetTaskId: 'T-001', parsedSummary: makeParsed({ warnings: ['Warning A.'] }) }),
      makeIteration({ id: 'i2', targetTaskId: 'T-001', parsedSummary: makeParsed({ warnings: ['Warning B.'] }) }),
    ])
    expect(rows[0].warnings).toContain('Warning A.')
    expect(rows[0].warnings).toContain('Warning B.')
  })
})

// ─── filterTaskRows — phaseFilter ────────────────────────────────────────────

describe('filterTaskRows — phaseFilter', () => {
  const rows: TaskReviewRow[] = [
    {
      taskId: 'T-001',
      phasesVisited: ['code_and_tests'],
      iterationCount: 1,
      lastIterationNumber: 1,
      hasTests: false,
      hasReview: false,
      lastAnalysisSnippet: null,
      warnings: [],
    },
    {
      taskId: 'T-002',
      phasesVisited: ['code_and_tests', 'review'],
      iterationCount: 2,
      lastIterationNumber: 2,
      hasTests: true,
      hasReview: true,
      lastAnalysisSnippet: null,
      warnings: [],
    },
  ]

  it('phaseFilter="all" returns all rows', () => {
    expect(filterTaskRows(rows, 'all', 'all')).toHaveLength(2)
  })

  it('phaseFilter="review" returns only rows that visited review', () => {
    const result = filterTaskRows(rows, 'review', 'all')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-002')
  })

  it('phaseFilter="code_and_tests" returns rows that visited that phase', () => {
    const result = filterTaskRows(rows, 'code_and_tests', 'all')
    expect(result).toHaveLength(2)
  })

  it('phaseFilter for unvisited phase returns empty array', () => {
    const result = filterTaskRows(rows, 'brainstorm', 'all')
    expect(result).toHaveLength(0)
  })
})

// ─── filterTaskRows — testFilter ─────────────────────────────────────────────

describe('filterTaskRows — testFilter', () => {
  const rows: TaskReviewRow[] = [
    {
      taskId: 'T-001',
      phasesVisited: ['code_and_tests'],
      iterationCount: 1,
      lastIterationNumber: 1,
      hasTests: true,
      hasReview: false,
      lastAnalysisSnippet: null,
      warnings: [],
    },
    {
      taskId: 'T-002',
      phasesVisited: ['code_and_tests'],
      iterationCount: 1,
      lastIterationNumber: 1,
      hasTests: false,
      hasReview: false,
      lastAnalysisSnippet: null,
      warnings: [],
    },
  ]

  it('testFilter="all" returns all rows', () => {
    expect(filterTaskRows(rows, 'all', 'all')).toHaveLength(2)
  })

  it('testFilter="has_tests" returns only rows with hasTests=true', () => {
    const result = filterTaskRows(rows, 'all', 'has_tests')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-001')
  })

  it('testFilter="missing_tests" returns only rows with hasTests=false', () => {
    const result = filterTaskRows(rows, 'all', 'missing_tests')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-002')
  })
})

// ─── filterTaskRows — combined filters ───────────────────────────────────────

describe('filterTaskRows — combined phaseFilter + testFilter', () => {
  const rows: TaskReviewRow[] = [
    {
      taskId: 'T-001',
      phasesVisited: ['code_and_tests', 'review'],
      iterationCount: 2,
      lastIterationNumber: 2,
      hasTests: true,
      hasReview: true,
      lastAnalysisSnippet: null,
      warnings: [],
    },
    {
      taskId: 'T-002',
      phasesVisited: ['code_and_tests'],
      iterationCount: 1,
      lastIterationNumber: 1,
      hasTests: false,
      hasReview: false,
      lastAnalysisSnippet: null,
      warnings: [],
    },
    {
      taskId: 'T-003',
      phasesVisited: ['review'],
      iterationCount: 1,
      lastIterationNumber: 1,
      hasTests: false,
      hasReview: true,
      lastAnalysisSnippet: null,
      warnings: [],
    },
  ]

  it('review phase + has_tests → only T-001', () => {
    const result = filterTaskRows(rows, 'review', 'has_tests')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-001')
  })

  it('review phase + missing_tests → T-003 only (visited review, no tests)', () => {
    const result = filterTaskRows(rows, 'review', 'missing_tests')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-003')
  })

  it('code_and_tests + missing_tests → T-002 only', () => {
    const result = filterTaskRows(rows, 'code_and_tests', 'missing_tests')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('T-002')
  })

  it('no match → empty array', () => {
    const result = filterTaskRows(rows, 'brainstorm', 'has_tests')
    expect(result).toHaveLength(0)
  })
})
