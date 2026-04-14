// T-014 — Prompt Loop store + integration acceptance tests
// Implements F-007 / T-014
//
// Covers:
//   D. Iteration lifecycle: error/partial-parse contracts, no-error-status finding
//   E. History: addPromptIteration / updatePromptIteration correctness
//   Integration: full first-prompt → parse → next-prompt cycle through the store
//
// Tests operate directly on the Zustand store via useProjectStore.getState() —
// no UI layer involved (PromptLoopPage is covered by T-012B).

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type {
  PromptIteration,
  ParsedClaudeResponse,
  SpecPack,
  ArchitectureDraft,
} from '../../shared/types'
import { useProjectStore, emptyProjectData } from './projectStore'
import { mockPromptService } from '../../mocks/services/promptService'

// ─── Store reset helper ───────────────────────────────────────────────────────

function resetStore() {
  useProjectStore.setState({
    activeProject: null,
    projectData: {},
    ...emptyProjectData,
    ui: { sidebarOpen: false, activeTab: 'overview' },
  })
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROJECT_ID = 'proj-store-001'


function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented T-005.',
    plan: 'Write tests, then implement.',
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
    projectId: PROJECT_ID,
    iterationNumber: 1,
    promptText: 'First prompt.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-14T00:00:00.000Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-005',
    roadmapPhaseNumber: 1,
    ...overrides,
  }
}

const SPEC: SpecPack = {
  projectType: 'application',
  productSummary: 'AI Product Studio',
  MVPScope: 'Shell, routing, prompt loop.',
  featureList: [{ id: 'F-001', name: 'Idea', description: 'Idea intake', priority: 'must' }],
  assumptions: [],
  constraints: [],
  acceptanceNotes: '',
}

const ARCH: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [{ name: 'React', role: 'UI', rationale: 'Ecosystem' }],
  moduleArchitecture: 'Feature-based',
  dataFlow: 'Unidirectional',
  roadmapPhases: [
    { phase: 1, title: 'Shell', goals: ['Routing'], estimatedComplexity: 'low' },
  ],
  technicalRisks: [],
}

// ─── D. Iteration lifecycle / error-state contracts ──────────────────────────

describe('D. Iteration lifecycle — no error status, partial-parse contracts', () => {
  beforeEach(resetStore)

  it('PromptStatus type has no error variant — engine always produces a parsedSummary', () => {
    // Contract: the parser returns a ParsedClaudeResponse for any input, never throws.
    // An "error" response is represented as warnings.length > 0 + hasTests=false,
    // not as a special status value. This is a documented design decision.
    const partial = mockPromptService.parseClaudeResponse('unparseable garbage response')
    expect(partial).toBeDefined()
    expect(typeof partial.analysis).toBe('string')
    expect(typeof partial.hasTests).toBe('boolean')
  })

  it('partial parse (no tests, no nextStep): parsedSummary is still set in store after update', () => {
    const store = useProjectStore.getState()
    const iter = makeIteration({ id: 'iter-p1' })
    store.addPromptIteration(iter)

    const partial = makeParsed({
      hasTests: false,
      nextStep: '',
      warnings: [
        'Could not parse "Recommended next step" section.',
        'No test files detected in this response.',
      ],
    })
    store.updatePromptIteration('iter-p1', {
      parsedSummary: partial,
      claudeResponseRaw: 'some response',
      status: 'parsed',
    })

    const updated = useProjectStore.getState().promptIterations.find((i) => i.id === 'iter-p1')
    expect(updated?.parsedSummary).not.toBeNull()
    expect(updated?.parsedSummary?.hasTests).toBe(false)
    expect(updated?.parsedSummary?.warnings.length).toBeGreaterThan(0)
    expect(updated?.status).toBe('parsed')
  })

  it('partial parse: generateNextPrompt can proceed because parsedSummary is always set', async () => {
    // The guard in PromptLoopPage is: !latestIteration?.parsedSummary → abort generateNext.
    // Since parsedSummary is never null after a parse (even partial), the cycle continues.
    vi.useFakeTimers()
    const partial = makeParsed({ hasTests: false, nextStep: '', nextTaskId: null })
    const prevIter = makeIteration({ id: 'iter-p2', parsedSummary: partial, status: 'parsed' })

    const p = mockPromptService.generateNextPrompt(
      prevIter,
      partial,
      'application',
      PROJECT_ID,
      'iter-p3',
      2,
      'code_and_tests',
    )
    await vi.runAllTimersAsync()
    const next = await p

    expect(next).toBeDefined()
    expect(next.status).toBe('draft')
    expect(next.iterationNumber).toBe(2)
    vi.useRealTimers()
  })

  it('iteration with no parsedSummary (status=draft) is stored and retrievable', () => {
    const store = useProjectStore.getState()
    const iter = makeIteration({ id: 'iter-draft', parsedSummary: null, status: 'draft' })
    store.addPromptIteration(iter)

    const found = useProjectStore.getState().promptIterations.find((i) => i.id === 'iter-draft')
    expect(found?.parsedSummary).toBeNull()
    expect(found?.status).toBe('draft')
  })

  it('updatePromptIteration to status=parsed transitions correctly', () => {
    const store = useProjectStore.getState()
    const iter = makeIteration({ id: 'iter-t1', status: 'draft', parsedSummary: null })
    store.addPromptIteration(iter)

    store.updatePromptIteration('iter-t1', {
      claudeResponseRaw: 'raw response text',
      parsedSummary: makeParsed(),
      recommendedNextStep: 'Proceed to T-006.',
      status: 'parsed',
    })

    const updated = useProjectStore.getState().promptIterations.find((i) => i.id === 'iter-t1')
    expect(updated?.status).toBe('parsed')
    expect(updated?.claudeResponseRaw).toBe('raw response text')
    expect(updated?.parsedSummary?.nextStep).toBe('Proceed to T-006.')
  })
})

// ─── E. History: addPromptIteration / updatePromptIteration ──────────────────

describe('E. History — addPromptIteration and updatePromptIteration', () => {
  beforeEach(resetStore)

  it('starts with an empty iterations array', () => {
    expect(useProjectStore.getState().promptIterations).toHaveLength(0)
  })

  it('addPromptIteration appends to the array (history grows by 1)', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-e1' }))
    expect(useProjectStore.getState().promptIterations).toHaveLength(1)
  })

  it('second addPromptIteration results in 2 iterations', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-e1', iterationNumber: 1 }))
    store.addPromptIteration(makeIteration({ id: 'iter-e2', iterationNumber: 2 }))
    expect(useProjectStore.getState().promptIterations).toHaveLength(2)
  })

  it('preserves insertion order (first added is at index 0)', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-first', iterationNumber: 1 }))
    store.addPromptIteration(makeIteration({ id: 'iter-second', iterationNumber: 2 }))

    const iters = useProjectStore.getState().promptIterations
    expect(iters[0].id).toBe('iter-first')
    expect(iters[1].id).toBe('iter-second')
  })

  it('third iteration appended last — order is chronological', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-a', iterationNumber: 1 }))
    store.addPromptIteration(makeIteration({ id: 'iter-b', iterationNumber: 2 }))
    store.addPromptIteration(makeIteration({ id: 'iter-c', iterationNumber: 3 }))

    const iters = useProjectStore.getState().promptIterations
    expect(iters[2].id).toBe('iter-c')
    expect(iters[2].iterationNumber).toBe(3)
  })

  it('updatePromptIteration modifies only the target iteration', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-u1', status: 'draft' }))
    store.addPromptIteration(makeIteration({ id: 'iter-u2', status: 'draft' }))

    store.updatePromptIteration('iter-u1', { status: 'parsed' })

    const iters = useProjectStore.getState().promptIterations
    const u1 = iters.find((i) => i.id === 'iter-u1')
    const u2 = iters.find((i) => i.id === 'iter-u2')
    expect(u1?.status).toBe('parsed')
    expect(u2?.status).toBe('draft') // unchanged
  })

  it('updatePromptIteration does not change other fields of sibling iterations', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-s1', targetTaskId: 'T-005' }))
    store.addPromptIteration(makeIteration({ id: 'iter-s2', targetTaskId: 'T-006' }))

    store.updatePromptIteration('iter-s1', { status: 'parsed' })

    const s2 = useProjectStore.getState().promptIterations.find((i) => i.id === 'iter-s2')
    expect(s2?.targetTaskId).toBe('T-006')
    expect(s2?.status).toBe('draft')
  })

  it('updatePromptIteration preserves array length (no duplicates created)', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-len1' }))
    store.addPromptIteration(makeIteration({ id: 'iter-len2' }))

    store.updatePromptIteration('iter-len1', { status: 'parsed' })

    expect(useProjectStore.getState().promptIterations).toHaveLength(2)
  })

  it('updating a non-existent id leaves array unchanged (no crash)', () => {
    const store = useProjectStore.getState()
    store.addPromptIteration(makeIteration({ id: 'iter-n1' }))

    // Should not throw
    expect(() => store.updatePromptIteration('iter-MISSING', { status: 'parsed' })).not.toThrow()
    expect(useProjectStore.getState().promptIterations).toHaveLength(1)
  })
})

// ─── Integration: full generate → parse → generate cycle ────────────────────

describe('Integration: generateFirst → parse → generateNext cycle', () => {
  beforeEach(() => {
    resetStore()
    vi.useFakeTimers()
  })
  afterEach(() => { vi.useRealTimers() })

  it('full cycle: 2 iterations in store with correct iterationNumbers after both generates', async () => {
    const store = useProjectStore.getState()

    // Step 1: generate first prompt
    const p1 = mockPromptService.generateFirstPrompt(
      SPEC, ARCH, 'application', PROJECT_ID, 'iter-int-1', 'T-005', null,
    )
    await vi.runAllTimersAsync()
    const iter1 = await p1

    store.addPromptIteration(iter1)
    expect(useProjectStore.getState().promptIterations).toHaveLength(1)

    // Step 2: simulate parse (Claude responds)
    const parsed = mockPromptService.parseClaudeResponse(`1. Brief analysis
Implemented T-005.
2. Implementation plan
Write tests first.
3. Files created/changed
\`src/lib/stageGates.test.ts\`
4. Implementation
code
5. Recommended next step
Proceed to T-006.`)

    store.updatePromptIteration('iter-int-1', {
      claudeResponseRaw: 'response',
      parsedSummary: parsed,
      recommendedNextStep: parsed.nextStep,
      status: 'parsed',
    })

    // Verify iteration 1 is now parsed
    const iter1Updated = useProjectStore.getState().promptIterations[0]
    expect(iter1Updated.status).toBe('parsed')
    expect(iter1Updated.parsedSummary).not.toBeNull()

    // Step 3: generate next prompt using parsed result from iter1
    const p2 = mockPromptService.generateNextPrompt(
      iter1Updated,
      iter1Updated.parsedSummary!,
      'application',
      PROJECT_ID,
      'iter-int-2',
      2,
      'code_and_tests',
    )
    await vi.runAllTimersAsync()
    const iter2 = await p2

    store.addPromptIteration(iter2)

    // Verify final state
    const finalIterations = useProjectStore.getState().promptIterations
    expect(finalIterations).toHaveLength(2)
    expect(finalIterations[0].iterationNumber).toBe(1)
    expect(finalIterations[1].iterationNumber).toBe(2)
    expect(finalIterations[1].status).toBe('draft')
    expect(finalIterations[1].parsedSummary).toBeNull()
  })

  it('full cycle: second iteration references first via iterationNumber in promptText', async () => {
    const store = useProjectStore.getState()

    const p1 = mockPromptService.generateFirstPrompt(
      SPEC, ARCH, 'application', PROJECT_ID, 'iter-ref-1', 'T-005', null,
    )
    await vi.runAllTimersAsync()
    const iter1 = await p1
    store.addPromptIteration(iter1)

    const parsed = makeParsed()
    store.updatePromptIteration('iter-ref-1', {
      parsedSummary: parsed, status: 'parsed', claudeResponseRaw: 'r',
    })

    const iter1Updated = useProjectStore.getState().promptIterations[0]
    const p2 = mockPromptService.generateNextPrompt(
      iter1Updated, parsed, 'application', PROJECT_ID, 'iter-ref-2', 2,
    )
    await vi.runAllTimersAsync()
    const iter2 = await p2

    // The next prompt should reference iteration #1
    expect(iter2.promptText).toContain('iteration #1')
  })

  it('partial parse scenario: cycle does NOT get stuck — generateNext still works', async () => {
    const store = useProjectStore.getState()

    const p1 = mockPromptService.generateFirstPrompt(
      SPEC, ARCH, 'application', PROJECT_ID, 'iter-part-1', 'T-005', null,
    )
    await vi.runAllTimersAsync()
    const iter1 = await p1
    store.addPromptIteration(iter1)

    // Simulate a partial Claude response (no tests, no section 5)
    const partialParsed = mockPromptService.parseClaudeResponse(
      '1. Brief analysis\nDid some work.\n3. Files created/changed\n`src/x.ts`\n4. Implementation\ncode',
    )
    store.updatePromptIteration('iter-part-1', {
      parsedSummary: partialParsed,
      claudeResponseRaw: 'partial',
      status: 'parsed',
    })

    const iter1Updated = useProjectStore.getState().promptIterations[0]
    expect(iter1Updated.parsedSummary).not.toBeNull()

    // Even with partial parse, generateNextPrompt proceeds
    const p2 = mockPromptService.generateNextPrompt(
      iter1Updated,
      iter1Updated.parsedSummary!,
      'application',
      PROJECT_ID,
      'iter-part-2',
      2,
      'code_and_tests',
    )
    await vi.runAllTimersAsync()
    const iter2 = await p2

    store.addPromptIteration(iter2)
    expect(useProjectStore.getState().promptIterations).toHaveLength(2)

    // Missing tests warning injected into the next prompt
    expect(iter2.promptText).toContain('Missing tests from iteration')
  })
})
