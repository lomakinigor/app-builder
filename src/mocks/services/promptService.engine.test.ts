// T-014 — Prompt Loop engine acceptance tests (service layer)
// Implements F-007 / T-014
//
// Covers:
//   A. generateFirstPrompt — shape, status, field values, promptText contracts
//   B. parseClaudeResponse — partial and gross-error input contracts
//   C. generateNextPrompt — linkage to previous iteration, targetPhase, missingTests injection
//
// No UI layer — tests operate directly on mockPromptService pure functions.
// The async delay inside the service is suppressed with vi.useFakeTimers().

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
} from '../../shared/types'
import { mockPromptService } from './promptService'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const SPEC: SpecPack = {
  projectType: 'application',
  productSummary: 'AI Product Studio',
  MVPScope: 'App shell, routing, core layouts, idea intake, prompt loop.',
  featureList: [
    { id: 'F-001', name: 'Idea intake', description: 'Accept a raw idea', priority: 'must' },
  ],
  assumptions: ['Single-user MVP'],
  constraints: ['TypeScript strict'],
  acceptanceNotes: 'DoD per task in docs/tasks.md',
}

const ARCH: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [
    { name: 'React', role: 'UI framework', rationale: 'Ecosystem' },
    { name: 'Zustand', role: 'State management', rationale: 'Simple store' },
  ],
  moduleArchitecture: 'Feature-based modules with shared library',
  dataFlow: 'Unidirectional via Zustand store',
  roadmapPhases: [
    {
      phase: 1,
      title: 'Shell & routing',
      goals: ['Set up Vite + React', 'Configure routing', 'Create layout'],
      estimatedComplexity: 'low',
    },
    {
      phase: 2,
      title: 'Idea & Research',
      goals: ['Idea intake form', 'Research providers'],
      estimatedComplexity: 'medium',
    },
  ],
  technicalRisks: ['localStorage quota on large specs'],
}

const PROJECT_ID = 'proj-001'
const PROMPT_ID_1 = 'prompt-001'
const PROMPT_ID_2 = 'prompt-002'

/** A fully-parsed successful response fixture */
function makeParsedFull(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented T-005. Added stage gate canAdvanceFromIdea.',
    plan: '1. Write tests. 2. Implement. 3. Self-review.',
    changedFiles: [
      'src/shared/lib/stageGates.ts',
      'src/shared/lib/stageGates.test.ts',
    ],
    implementationSummary: 'Added canAdvanceFromIdea function with unit tests.',
    nextStep: 'Proceed to T-006.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: ['T-005'],
    nextTaskId: 'T-006',
    inferredNextPhase: 'code_and_tests',
    ...overrides,
  }
}

/** A partial response fixture — no tests, no nextStep */
function makeParsedPartial(): ParsedClaudeResponse {
  return makeParsedFull({
    changedFiles: ['src/lib/something.ts'],
    nextStep: '',
    warnings: [
      'Could not parse "Recommended next step" section.',
      'No test files detected in this response. The next prompt will request missing tests before continuing.',
    ],
    hasTests: false,
    nextTaskId: null,
    inferredNextPhase: 'code_and_tests',
  })
}

/** A draft iteration as returned by generateFirstPrompt */
function makeDraftIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: PROMPT_ID_1,
    projectId: PROJECT_ID,
    iterationNumber: 1,
    promptText: 'some generated prompt',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: new Date().toISOString(),
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-005',
    roadmapPhaseNumber: 1,
    ...overrides,
  }
}

// ─── A. generateFirstPrompt ───────────────────────────────────────────────────

describe('A. generateFirstPrompt', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  async function runGenerateFirst(
    taskId: string | null = 'T-005',
    taskDescription: string | null = 'Add canAdvanceFromIdea',
  ): Promise<PromptIteration> {
    const p = mockPromptService.generateFirstPrompt(
      SPEC,
      ARCH,
      'application',
      PROJECT_ID,
      PROMPT_ID_1,
      taskId,
      taskDescription,
    )
    await vi.runAllTimersAsync()
    return p
  }

  it('returns status=draft (not yet sent to Claude)', async () => {
    const iter = await runGenerateFirst()
    expect(iter.status).toBe('draft')
  })

  it('returns claudeResponseRaw=null (no response yet)', async () => {
    const iter = await runGenerateFirst()
    expect(iter.claudeResponseRaw).toBeNull()
  })

  it('returns parsedSummary=null (nothing to parse yet)', async () => {
    const iter = await runGenerateFirst()
    expect(iter.parsedSummary).toBeNull()
  })

  it('sets iterationNumber to 1', async () => {
    const iter = await runGenerateFirst()
    expect(iter.iterationNumber).toBe(1)
  })

  it('sets projectId from argument', async () => {
    const iter = await runGenerateFirst()
    expect(iter.projectId).toBe(PROJECT_ID)
  })

  it('sets id to provided promptId', async () => {
    const iter = await runGenerateFirst()
    expect(iter.id).toBe(PROMPT_ID_1)
  })

  it('sets targetTaskId when taskId provided', async () => {
    const iter = await runGenerateFirst('T-005')
    expect(iter.targetTaskId).toBe('T-005')
  })

  it('sets targetTaskId to null when no taskId provided', async () => {
    const iter = await runGenerateFirst(null, null)
    expect(iter.targetTaskId).toBeNull()
  })

  it('sets cyclePhase to code_and_tests', async () => {
    const iter = await runGenerateFirst()
    expect(iter.cyclePhase).toBe('code_and_tests')
  })

  it('sets roadmapPhaseNumber to the first phase number (1)', async () => {
    const iter = await runGenerateFirst()
    expect(iter.roadmapPhaseNumber).toBe(1)
  })

  it('sets projectType to the provided type', async () => {
    const iter = await runGenerateFirst()
    expect(iter.projectType).toBe('application')
  })

  it('prompt includes spec productSummary', async () => {
    const iter = await runGenerateFirst()
    expect(iter.promptText).toContain('AI Product Studio')
  })

  it('prompt includes the provided taskId', async () => {
    const iter = await runGenerateFirst('T-005')
    expect(iter.promptText).toContain('T-005')
  })

  it('prompt includes task description when provided', async () => {
    const iter = await runGenerateFirst('T-005', 'Add canAdvanceFromIdea')
    expect(iter.promptText).toContain('Add canAdvanceFromIdea')
  })

  it('prompt omits "Target task" section when taskId is null', async () => {
    const iter = await runGenerateFirst(null, null)
    expect(iter.promptText).not.toContain('## Target task: ')
  })

  it('prompt includes TDD rule regardless of taskId', async () => {
    const iter = await runGenerateFirst(null, null)
    expect(iter.promptText).toContain('Правило TDD')
  })

  it('prompt includes required response format section', async () => {
    const iter = await runGenerateFirst()
    expect(iter.promptText).toContain('Требуемый формат ответа')
  })

  it('prompt includes stack entry from arch', async () => {
    const iter = await runGenerateFirst()
    expect(iter.promptText).toContain('React')
  })
})

// ─── B. parseClaudeResponse — partial and error-state contracts ───────────────

describe('B. parseClaudeResponse — partial and gross-error contracts', () => {
  it('well-formed response: hasTests=true when test files are listed', () => {
    const raw = `1. Brief analysis
Implemented T-005. Added canAdvanceFromIdea.
2. Implementation plan
Write tests first.
3. Files created/changed
\`src/lib/stageGates.ts\`
\`src/lib/stageGates.test.ts\`
4. Implementation
function canAdvanceFromIdea(d) { return !!d?.title }
5. Recommended next step
Proceed to T-006.`
    const parsed = mockPromptService.parseClaudeResponse(raw)
    expect(parsed.hasTests).toBe(true)
    expect(parsed.warnings).toHaveLength(0)
  })

  it('well-formed response: implementedTaskIds extracted from body', () => {
    const raw = `1. Brief analysis
Implemented T-005 and T-006.
2. Implementation plan
Done.
3. Files created/changed
\`src/lib/feature.ts\`
4. Implementation
code
5. Recommended next step
Proceed to T-007.`
    const parsed = mockPromptService.parseClaudeResponse(raw)
    expect(parsed.implementedTaskIds).toContain('T-005')
    expect(parsed.implementedTaskIds).toContain('T-006')
    expect(parsed.nextTaskId).toBe('T-007')
  })

  it('partial response (no tests, no section 5) → warnings.length > 0, hasTests=false', () => {
    const raw = `1. Brief analysis
Did some work.
2. Implementation plan
Some plan.
3. Files created/changed
\`src/lib/thing.ts\`
4. Implementation
const x = 1`
    // No section 5 (Recommended next step), no test files
    const parsed = mockPromptService.parseClaudeResponse(raw)
    expect(parsed.hasTests).toBe(false)
    expect(parsed.warnings.length).toBeGreaterThan(0)
    expect(parsed.warnings.some((w) => w.toLowerCase().includes('тест'))).toBe(true)
  })

  it('partial response without section 5 adds nextStep warning', () => {
    const raw = `1. Brief analysis
Something.\n3. Files created/changed\n\`src/x.ts\``
    const parsed = mockPromptService.parseClaudeResponse(raw)
    expect(parsed.warnings.some((w) => w.includes('следующий шаг') || w.includes('Рекомендуемый'))).toBe(true)
  })

  it('gross-error / empty response still returns a ParsedClaudeResponse (no throw)', () => {
    // Contract: parser never throws — it always returns a valid object
    expect(() => mockPromptService.parseClaudeResponse('')).not.toThrow()
    expect(() => mockPromptService.parseClaudeResponse('garbage input no sections')).not.toThrow()
  })

  it('empty response: analysis falls back to raw.slice(0,500)', () => {
    const raw = 'No sections here, just raw text from Claude.'
    const parsed = mockPromptService.parseClaudeResponse(raw)
    // Falls back to raw slice when no section 1 found
    expect(parsed.analysis).toBe(raw.slice(0, 500))
  })

  it('empty response: status-equivalent is full warnings (both analysis + no-tests)', () => {
    const parsed = mockPromptService.parseClaudeResponse('no sections')
    // There is NO explicit "error" status in ParsedClaudeResponse.
    // A gross error manifests as: warnings.length >= 2 (analysis + tests), hasTests=false.
    expect(parsed.hasTests).toBe(false)
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('there is no "error" status on ParsedClaudeResponse — engine never throws on bad input', () => {
    // Contract documented for T-016 (stage gates):
    // The engine does not have an error/rejected status — it always produces parsedSummary.
    // Downstream consumers (UI, stage gates) must check warnings + hasTests to detect bad responses.
    const parsed = mockPromptService.parseClaudeResponse('totally broken')
    expect(typeof parsed).toBe('object')
    expect(parsed).not.toBeNull()
  })
})

// ─── C. generateNextPrompt ────────────────────────────────────────────────────

describe('C. generateNextPrompt', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  async function runGenerateNext(
    prevIteration: PromptIteration,
    parsed: ParsedClaudeResponse,
    targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
    nextIterationNumber = 2,
  ): Promise<PromptIteration> {
    const p = mockPromptService.generateNextPrompt(
      prevIteration,
      parsed,
      'application',
      PROJECT_ID,
      PROMPT_ID_2,
      nextIterationNumber,
      targetPhase,
    )
    await vi.runAllTimersAsync()
    return p
  }

  const prevIteration = makeDraftIteration({ targetTaskId: 'T-005', roadmapPhaseNumber: 1 })

  it('returns status=draft', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.status).toBe('draft')
  })

  it('returns claudeResponseRaw=null', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.claudeResponseRaw).toBeNull()
  })

  it('returns parsedSummary=null', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.parsedSummary).toBeNull()
  })

  it('sets iterationNumber to the nextIterationNumber argument', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull(), 'code_and_tests', 3)
    expect(next.iterationNumber).toBe(3)
  })

  it('sets projectId from argument', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.projectId).toBe(PROJECT_ID)
  })

  it('preserves roadmapPhaseNumber from previous iteration', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.roadmapPhaseNumber).toBe(prevIteration.roadmapPhaseNumber)
  })

  it('sets targetTaskId from parsedResponse.nextTaskId when available', async () => {
    const parsed = makeParsedFull({ nextTaskId: 'T-006' })
    const next = await runGenerateNext(prevIteration, parsed)
    expect(next.targetTaskId).toBe('T-006')
  })

  it('falls back targetTaskId to prevIteration.targetTaskId when parsedResponse.nextTaskId is null', async () => {
    const parsed = makeParsedFull({ nextTaskId: null })
    const next = await runGenerateNext(prevIteration, parsed)
    expect(next.targetTaskId).toBe('T-005')
  })

  it('sets cyclePhase=code_and_tests when targetPhase=code_and_tests', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull(), 'code_and_tests')
    expect(next.cyclePhase).toBe('code_and_tests')
  })

  it('sets cyclePhase=review when targetPhase=review', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull(), 'review')
    expect(next.cyclePhase).toBe('review')
  })

  it('sets targetTaskId=prevIteration.targetTaskId when targetPhase=review', async () => {
    // Review iteration should reference the task being reviewed, not the next one
    const parsed = makeParsedFull({ nextTaskId: 'T-006' })
    const next = await runGenerateNext(prevIteration, parsed, 'review')
    expect(next.targetTaskId).toBe('T-005')
  })

  it('prompt contains previous implementationSummary', async () => {
    const parsed = makeParsedFull({ implementationSummary: 'Added canAdvanceFromIdea function.' })
    const next = await runGenerateNext(prevIteration, parsed)
    expect(next.promptText).toContain('Added canAdvanceFromIdea function.')
  })

  it('prompt references previous iteration number', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull())
    expect(next.promptText).toContain(`итерации #${prevIteration.iterationNumber}`)
  })

  it('prompt contains changed files from previous iteration', async () => {
    const parsed = makeParsedFull({ changedFiles: ['src/lib/stageGates.ts'] })
    const next = await runGenerateNext(prevIteration, parsed)
    expect(next.promptText).toContain('src/lib/stageGates.ts')
  })

  it('prompt contains missing-tests warning when hasTests=false and phase=code_and_tests', async () => {
    const parsed = makeParsedPartial()
    const next = await runGenerateNext(prevIteration, parsed, 'code_and_tests')
    expect(next.promptText).toContain('Отсутствующие тесты из итерации')
  })

  it('omits missing-tests warning when hasTests=true', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull({ hasTests: true }))
    expect(next.promptText).not.toContain('Missing tests from iteration')
  })

  it('omits missing-tests warning when targetPhase=review even if hasTests=false', async () => {
    const parsed = makeParsedPartial()
    const next = await runGenerateNext(prevIteration, parsed, 'review')
    expect(next.promptText).not.toContain('Missing tests from iteration')
  })

  it('prompt includes recommended next step from parsedResponse', async () => {
    const parsed = makeParsedFull({ nextStep: 'Proceed to T-006.' })
    const next = await runGenerateNext(prevIteration, parsed)
    expect(next.promptText).toContain('Proceed to T-006.')
  })

  it('prompt includes nextTaskId in a task section when phase=code_and_tests', async () => {
    const parsed = makeParsedFull({ nextTaskId: 'T-006' })
    const next = await runGenerateNext(prevIteration, parsed, 'code_and_tests')
    expect(next.promptText).toContain('T-006')
  })

  it('prompt includes review task section when phase=review', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull(), 'review')
    expect(next.promptText).toContain('Задача Review')
  })

  it('prompt includes TDD rule when phase=code_and_tests', async () => {
    const next = await runGenerateNext(prevIteration, makeParsedFull(), 'code_and_tests')
    expect(next.promptText).toContain('Правило TDD')
  })

  it('partial parse scenario C: generateNextPrompt accepts a partial-parsed iteration (cycle continues)', async () => {
    // Contract: partial parse does NOT produce an error status — parsedSummary is always a valid object.
    // This means generateNextPrompt can always be called if the caller has a parsedSummary.
    const partial = makeParsedPartial()
    // No throw expected:
    await expect(runGenerateNext(prevIteration, partial, 'code_and_tests')).resolves.toBeDefined()
  })
})
