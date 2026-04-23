// ─── parseClaudeResponse unit tests ─────────────────────────────────────────
// Implements T-012A / F-007 / F-024.
//
// Locks in the behaviour of mockPromptService.parseClaudeResponse() —
// the core parser that turns a raw Claude response string into a typed
// ParsedClaudeResponse.
//
// Companion tests:
//   inferNextPhase + typeAwareGuidance → promptService.test.ts (T-208t)
//   computeNextAction / getRecommended* → nextActionEngine.test.ts (T-210t)
//   buildTaskReviewModel / filterTaskRows → taskReviewModel.test.ts (T-012A)
//
// Warning-string contract (locked in section 5):
//   'Could not parse "Brief analysis" section.'
//   'Could not parse "Recommended next step" section.'
//   'No test files detected in this response. The next prompt will request…'

import { describe, it, expect } from 'vitest'
import { mockPromptService } from './promptService'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Build a well-formed 5-section Claude response.
 * Any section can be overridden to test partial/missing scenarios.
 */
function makeFullResponse({
  analysis = 'Implementing T-005. This adds the Idea page gate.',
  plan = 'Add canAdvanceFromIdea. Write unit tests first (T-016).',
  files = '`src/shared/lib/stageGates.ts`\n[TEST] src/shared/lib/stageGates.test.ts',
  implementation = 'export function canAdvanceFromIdea(idea: string) { return idea.trim().length > 0 }',
  next = 'Proceed to T-006. Run the normalizer tests next.',
}: {
  analysis?: string
  plan?: string
  files?: string
  implementation?: string
  next?: string
} = {}): string {
  return [
    '1. Brief analysis',
    analysis,
    '',
    '2. Implementation plan',
    plan,
    '',
    '3. Files created/changed',
    files,
    '',
    '4. Implementation',
    implementation,
    '',
    '5. Recommended next step',
    next,
  ].join('\n')
}

// ─── 1. Successful full parsing ───────────────────────────────────────────────

describe('parseClaudeResponse — successful full parsing', () => {
  describe('all five sections present and well-formed', () => {
    const raw = makeFullResponse()
    const result = mockPromptService.parseClaudeResponse(raw)

    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse(raw)).not.toThrow()
    })

    it('returns an object (not null/undefined)', () => {
      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    })

    it('analysis contains the task reference', () => {
      expect(result.analysis).toContain('T-005')
    })

    it('plan is extracted', () => {
      expect(result.plan).toContain('canAdvanceFromIdea')
    })

    it('implementationSummary is extracted (section 4)', () => {
      expect(result.implementationSummary).toContain('canAdvanceFromIdea')
    })

    it('nextStep is extracted', () => {
      expect(result.nextStep).toContain('T-006')
    })

    it('analysis does not include raw fallback (section was found)', () => {
      // When section is found and non-empty, analysis should be that section's content,
      // not the raw.slice(0, 500) fallback.
      expect(result.analysis).not.toContain('2. Implementation plan')
    })
  })

  describe('changedFiles — backtick-quoted path extraction', () => {
    const raw = makeFullResponse({
      files: '- `src/pages/HomePage.tsx`\n- `src/app/store/projectStore.ts`',
    })
    const result = mockPromptService.parseClaudeResponse(raw)

    it('extracts both backtick-quoted files', () => {
      expect(result.changedFiles).toContain('src/pages/HomePage.tsx')
      expect(result.changedFiles).toContain('src/app/store/projectStore.ts')
    })

    it('changedFiles has exactly 2 entries', () => {
      expect(result.changedFiles).toHaveLength(2)
    })
  })

  describe('changedFiles — [TEST] marker extraction', () => {
    const raw = makeFullResponse({
      files: '`src/lib/stageGates.ts`\n[TEST] src/lib/stageGates.test.ts',
    })
    const result = mockPromptService.parseClaudeResponse(raw)

    it('includes [TEST]-marked file path', () => {
      expect(result.changedFiles).toContain('src/lib/stageGates.test.ts')
    })

    it('hasTests is true when [TEST] marker is present', () => {
      expect(result.hasTests).toBe(true)
    })
  })

  describe('changedFiles — deduplication when backtick and [TEST] both match same path', () => {
    const raw = makeFullResponse({
      files: '`src/lib/foo.test.ts`\n[TEST] src/lib/foo.test.ts',
    })
    const result = mockPromptService.parseClaudeResponse(raw)

    it('file appears only once in changedFiles (REG-003)', () => {
      const count = result.changedFiles.filter((f) => f === 'src/lib/foo.test.ts').length
      expect(count).toBe(1)
    })
  })
})

// ─── 2. hasTests detection ────────────────────────────────────────────────────

describe('parseClaudeResponse — hasTests detection', () => {
  it('detects .test.ts extension in changedFiles', () => {
    const raw = makeFullResponse({ files: '`src/lib/utils.test.ts`' })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('detects .spec.ts extension in changedFiles', () => {
    const raw = makeFullResponse({ files: '`src/lib/utils.spec.ts`' })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('detects .test.tsx extension in changedFiles', () => {
    const raw = makeFullResponse({ files: '`src/components/Button.test.tsx`' })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('detects .spec.tsx extension in changedFiles', () => {
    const raw = makeFullResponse({ files: '`src/components/Button.spec.tsx`' })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('detects .test. mentioned in raw files section text (not backtick-wrapped)', () => {
    const raw = makeFullResponse({
      files: 'See stageGates.test.ts for all assertions.',
    })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('detects .spec. mentioned in raw files section text', () => {
    const raw = makeFullResponse({
      files: 'All assertions are in foo.spec.ts.',
    })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(true)
  })

  it('hasTests is false when only non-test files are listed', () => {
    const raw = makeFullResponse({ files: '`src/pages/HomePage.tsx`' })
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(false)
  })

  it('hasTests is false when files section is absent', () => {
    const raw = [
      '1. Brief analysis',
      'Did something.',
      '',
      '5. Recommended next step',
      'T-002 is next.',
    ].join('\n')
    expect(mockPromptService.parseClaudeResponse(raw).hasTests).toBe(false)
  })
})

// ─── 3. Section header format tolerance ──────────────────────────────────────

describe('parseClaudeResponse — section header format tolerance', () => {
  it('parses "## 1." markdown heading variant', () => {
    const raw = [
      '## 1. Brief analysis',
      'Implemented the auth flow.',
      '',
      '## 5. Recommended next step',
      'Proceed to T-010.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.analysis).toContain('auth flow')
    expect(result.nextStep).toContain('T-010')
  })

  it('parses "**1.**" bold heading variant', () => {
    const raw = [
      '**1. Brief analysis**',
      'Added the spec generator.',
      '',
      '**5. Recommended next step**',
      'Continue with T-007.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.analysis).toContain('spec generator')
    expect(result.nextStep).toContain('T-007')
  })

  it('parses "5. What is recommended next" variant header', () => {
    const raw = [
      '1. Brief analysis',
      'Some analysis text.',
      '',
      '5. What is recommended next',
      'Try T-015 next.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.nextStep).toContain('T-015')
  })

  it('tolerates extra blank lines between section header and content', () => {
    const raw = [
      '1. Brief analysis',
      '',
      '',
      'Analysis after two blank lines.',
      '',
      '5. Recommended next step',
      '',
      'Next step after blank line.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.analysis).toContain('Analysis after two blank lines')
    expect(result.nextStep).toContain('Next step after blank line')
  })

  it('section content does not bleed into adjacent section (REG-004)', () => {
    const raw = makeFullResponse({
      plan: 'Plan step A. Plan step B.',
      files: '`src/a.ts`',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.plan).not.toContain('src/a.ts')
    expect(result.changedFiles).toContain('src/a.ts')
  })
})

// ─── 4. T-xxx task ID extraction ─────────────────────────────────────────────

describe('parseClaudeResponse — T-xxx task ID extraction', () => {
  it('extracts multiple T-xxx IDs from analysis section', () => {
    const raw = makeFullResponse({
      analysis: 'Implementing T-005 and T-006 as part of phase 1.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.implementedTaskIds).toContain('T-005')
    expect(result.implementedTaskIds).toContain('T-006')
  })

  it('extracts T-xxx IDs from plan section', () => {
    const raw = makeFullResponse({
      analysis: 'General analysis.',
      plan: 'Implement T-008 first, then T-009.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.implementedTaskIds).toContain('T-008')
    expect(result.implementedTaskIds).toContain('T-009')
  })

  it('deduplicates repeated T-xxx mentions across sections', () => {
    const raw = makeFullResponse({
      analysis: 'Working on T-005. T-005 is the focus.',
      plan: 'T-005 plan details here.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    const count = result.implementedTaskIds.filter((id) => id === 'T-005').length
    expect(count).toBe(1)
  })

  it('extracts nextTaskId from next step section', () => {
    const raw = makeFullResponse({ next: 'Proceed to T-009 for the persistence layer.' })
    expect(mockPromptService.parseClaudeResponse(raw).nextTaskId).toBe('T-009')
  })

  it('nextTaskId is null when no T-xxx appears in next step', () => {
    const raw = makeFullResponse({ next: 'Continue with the implementation as planned.' })
    expect(mockPromptService.parseClaudeResponse(raw).nextTaskId).toBeNull()
  })

  it('nextTaskId returns the FIRST T-xxx when multiple are in next step', () => {
    const raw = makeFullResponse({ next: 'Start with T-010 before tackling T-011.' })
    expect(mockPromptService.parseClaudeResponse(raw).nextTaskId).toBe('T-010')
  })

  it('T-xxx in next step is NOT included in implementedTaskIds', () => {
    // implementedTaskIds scans analysis+plan+implementation only, not "next"
    const raw = makeFullResponse({
      analysis: 'Implemented T-001.',
      next: 'Proceed to T-099.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.implementedTaskIds).toContain('T-001')
    expect(result.implementedTaskIds).not.toContain('T-099')
  })

  it('handles 4-digit task IDs (T-1234)', () => {
    const raw = makeFullResponse({ analysis: 'Working on T-1234.' })
    expect(mockPromptService.parseClaudeResponse(raw).implementedTaskIds).toContain('T-1234')
  })

  it('REG-001: T-01 (2 digits) is NOT extracted — avoids confusing T-01 with T-010 prefix', () => {
    // Guard: regex /T-\d{3,}/ requires ≥ 3 digits.
    const raw = makeFullResponse({
      analysis: 'T-01 and T-1 should be ignored. T-010 is the real task.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.implementedTaskIds).not.toContain('T-01')
    expect(result.implementedTaskIds).not.toContain('T-1')
    expect(result.implementedTaskIds).toContain('T-010')
  })
})

// ─── 5. Partial parsing — missing sections ───────────────────────────────────

describe('parseClaudeResponse — partial parsing', () => {
  describe('analysis section absent', () => {
    const raw = [
      '2. Implementation plan',
      'Plan details here.',
      '',
      '3. Files created/changed',
      '`src/foo.ts`',
      '',
      '4. Implementation',
      'Code here.',
      '',
      '5. Recommended next step',
      'Do T-007 next.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)

    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse(raw)).not.toThrow()
    })

    it('analysis falls back to raw.slice(0, 500)', () => {
      expect(result.analysis).toBe(raw.slice(0, 500))
    })

    it('adds "Brief analysis" warning', () => {
      expect(result.warnings.some((w) => w.includes('Краткий анализ'))).toBe(true)
    })

    it('nextStep is still extracted correctly despite missing analysis', () => {
      expect(result.nextStep).toContain('T-007')
    })
  })

  describe('next step section absent', () => {
    const raw = [
      '1. Brief analysis',
      'Analysis text with T-003.',
      '',
      '4. Implementation',
      'Code goes here.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)

    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse(raw)).not.toThrow()
    })

    it('nextStep is empty string', () => {
      expect(result.nextStep).toBe('')
    })

    it('adds "Recommended next step" warning (REG-002)', () => {
      // Regression: early parser did not emit this warning on missing next section.
      expect(result.warnings.some((w) => w.includes('Рекомендуемый следующий шаг'))).toBe(true)
    })

    it('nextTaskId is null', () => {
      expect(result.nextTaskId).toBeNull()
    })
  })

  describe('both analysis AND next step absent', () => {
    const raw = '4. Implementation\nSome code.'
    const result = mockPromptService.parseClaudeResponse(raw)

    it('warnings include both missing-section messages', () => {
      const text = result.warnings.join(' ')
      expect(text).toContain('Краткий анализ')
      expect(text).toContain('Рекомендуемый следующий шаг')
    })
  })

  describe('files section absent', () => {
    const raw = [
      '1. Brief analysis',
      'Did something.',
      '',
      '5. Recommended next step',
      'T-002 is next.',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)

    it('changedFiles is empty array', () => {
      expect(result.changedFiles).toEqual([])
    })

    it('hasTests is false', () => {
      expect(result.hasTests).toBe(false)
    })
  })

  describe('section present but content is whitespace-only', () => {
    const raw = [
      '1. Brief analysis',
      '   ',
      '',
      '5. Recommended next step',
      '   ',
    ].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)

    it('analysis trims to empty → falls back to raw.slice(0, 500)', () => {
      // sections.analysis = '   \n\n' → .trim() = '' (falsy) → fallback
      expect(result.analysis.length).toBeGreaterThan(0)
    })

    it('nextStep trims to empty string', () => {
      expect(result.nextStep).toBe('')
    })
  })
})

// ─── 6. Warning strings contract ─────────────────────────────────────────────

describe('parseClaudeResponse — warning strings contract', () => {
  // These exact substrings are consumed by PromptLoopPage.tsx.
  // Changing them without updating the UI is a breaking change.

  it('missing analysis → warning contains "Краткий анализ"', () => {
    const w = mockPromptService.parseClaudeResponse('5. Recommended next step\nDo T-001.').warnings
    expect(w.some((s) => s.includes('Краткий анализ'))).toBe(true)
  })

  it('missing next step → warning contains "Рекомендуемый следующий шаг"', () => {
    const w = mockPromptService.parseClaudeResponse('1. Brief analysis\nDid stuff.').warnings
    expect(w.some((s) => s.includes('Рекомендуемый следующий шаг'))).toBe(true)
  })

  it('no test files → warning contains "тестовые"', () => {
    const raw = makeFullResponse({ files: '`src/foo.ts`' })
    const w = mockPromptService.parseClaudeResponse(raw).warnings
    expect(w.some((s) => s.toLowerCase().includes('тестовые'))).toBe(true)
  })

  it('test files present → no-test warning is NOT produced', () => {
    const raw = makeFullResponse({ files: '`src/foo.test.ts`' })
    const w = mockPromptService.parseClaudeResponse(raw).warnings
    expect(w.some((s) => s.toLowerCase().includes('тестовые'))).toBe(false)
  })

  it('warnings is always an array (never null/undefined)', () => {
    expect(Array.isArray(mockPromptService.parseClaudeResponse('').warnings)).toBe(true)
    expect(Array.isArray(mockPromptService.parseClaudeResponse(makeFullResponse()).warnings)).toBe(true)
  })

  it('every warning is a plain string (not a structured object)', () => {
    const raw = '4. Implementation\nCode.'
    mockPromptService.parseClaudeResponse(raw).warnings.forEach((w) => {
      expect(typeof w).toBe('string')
    })
  })
})

// ─── 7. Degenerate / error inputs ────────────────────────────────────────────

describe('parseClaudeResponse — degenerate inputs', () => {
  describe('empty string', () => {
    const result = mockPromptService.parseClaudeResponse('')

    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse('')).not.toThrow()
    })

    it('returns an object', () => {
      expect(typeof result).toBe('object')
      expect(result).not.toBeNull()
    })

    it('analysis is empty string (raw.slice(0,500) of "")', () => {
      expect(result.analysis).toBe('')
    })

    it('changedFiles is empty array', () => {
      expect(result.changedFiles).toEqual([])
    })

    it('implementedTaskIds is empty array', () => {
      expect(result.implementedTaskIds).toEqual([])
    })

    it('nextTaskId is null', () => {
      expect(result.nextTaskId).toBeNull()
    })

    it('hasTests is false', () => {
      expect(result.hasTests).toBe(false)
    })

    it('warnings include both missing-section messages', () => {
      const text = result.warnings.join(' ')
      expect(text).toContain('Краткий анализ')
      expect(text).toContain('Рекомендуемый следующий шаг')
    })
  })

  describe('completely unstructured text (no section headers)', () => {
    const raw = 'I did some stuff. It looks good. No particular structure here at all.'
    const result = mockPromptService.parseClaudeResponse(raw)

    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse(raw)).not.toThrow()
    })

    it('analysis falls back to raw.slice(0, 500)', () => {
      expect(result.analysis).toBe(raw.slice(0, 500))
    })

    it('nextStep is empty string', () => {
      expect(result.nextStep).toBe('')
    })

    it('changedFiles is empty', () => {
      expect(result.changedFiles).toEqual([])
    })

    it('warnings include both missing-section messages', () => {
      const text = result.warnings.join(' ')
      expect(text).toContain('Краткий анализ')
      expect(text).toContain('Рекомендуемый следующий шаг')
    })
  })

  describe('whitespace-only input', () => {
    it('does not throw', () => {
      expect(() => mockPromptService.parseClaudeResponse('   \n\n\t  ')).not.toThrow()
    })
  })

  describe('very large input (> 10 000 chars)', () => {
    it('does not throw', () => {
      const large = '1. Brief analysis\n' + 'x '.repeat(6_000) + '\n5. Recommended next step\nT-001.'
      expect(() => mockPromptService.parseClaudeResponse(large)).not.toThrow()
    })
  })

  describe('response with no T-xxx IDs anywhere', () => {
    const raw = makeFullResponse({
      analysis: 'Just did some general refactoring work.',
      plan: 'Refactor the helpers.',
      implementation: 'Minor internal cleanup.',
      next: 'Continue as planned.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)

    it('implementedTaskIds is empty', () => {
      expect(result.implementedTaskIds).toEqual([])
    })

    it('nextTaskId is null', () => {
      expect(result.nextTaskId).toBeNull()
    })
  })
})

// ─── 8. inferredNextPhase integration ────────────────────────────────────────

describe('parseClaudeResponse — inferredNextPhase integration', () => {
  it('"ready for review" in analysis → inferredNextPhase = review', () => {
    const raw = makeFullResponse({
      analysis: 'T-005 is ready for review. All tests pass.',
      files: '`src/foo.ts`',
    })
    expect(mockPromptService.parseClaudeResponse(raw).inferredNextPhase).toBe('review')
  })

  it('test files + same task in next step → inferredNextPhase = review', () => {
    const raw = makeFullResponse({
      analysis: 'Implemented T-005.',
      files: '`src/foo.test.ts`',
      next: 'T-005 is complete, proceed to review.',
    })
    expect(mockPromptService.parseClaudeResponse(raw).inferredNextPhase).toBe('review')
  })

  it('no tests detected → inferredNextPhase defaults to code_and_tests', () => {
    const raw = makeFullResponse({
      analysis: 'Added some code.',
      files: '`src/foo.ts`',
      next: 'Continue building.',
    })
    expect(mockPromptService.parseClaudeResponse(raw).inferredNextPhase).toBe('code_and_tests')
  })

  it('"check docs/tasks" in analysis → inferredNextPhase = tasks', () => {
    const raw = makeFullResponse({
      analysis: 'Please check docs/tasks for the next item.',
    })
    expect(mockPromptService.parseClaudeResponse(raw).inferredNextPhase).toBe('tasks')
  })

  it('empty input → inferredNextPhase = code_and_tests (safe default)', () => {
    expect(mockPromptService.parseClaudeResponse('').inferredNextPhase).toBe('code_and_tests')
  })
})

// ─── 9. Return type contract ──────────────────────────────────────────────────

describe('parseClaudeResponse — return type contract', () => {
  // Locks the shape of ParsedClaudeResponse so future refactors don't
  // silently break downstream consumers (PromptLoopPage, HistoryPage, etc.).

  const result = mockPromptService.parseClaudeResponse(makeFullResponse())

  it('analysis is a string', () => expect(typeof result.analysis).toBe('string'))
  it('plan is a string', () => expect(typeof result.plan).toBe('string'))
  it('implementationSummary is a string', () => expect(typeof result.implementationSummary).toBe('string'))
  it('nextStep is a string', () => expect(typeof result.nextStep).toBe('string'))
  it('changedFiles is an array', () => expect(Array.isArray(result.changedFiles)).toBe(true))
  it('warnings is an array', () => expect(Array.isArray(result.warnings)).toBe(true))
  it('hasTests is a boolean', () => expect(typeof result.hasTests).toBe('boolean'))
  it('implementedTaskIds is an array', () => expect(Array.isArray(result.implementedTaskIds)).toBe(true))
  it('nextTaskId is string or null', () => {
    expect(result.nextTaskId === null || typeof result.nextTaskId === 'string').toBe(true)
  })
  it('inferredNextPhase is a valid CyclePhase string or null', () => {
    const valid = new Set(['brainstorm', 'spec', 'plan', 'tasks', 'code_and_tests', 'review', null])
    expect(valid.has(result.inferredNextPhase)).toBe(true)
  })
})

// ─── 10. Regression tests ─────────────────────────────────────────────────────

describe('parseClaudeResponse — regression', () => {
  it('REG-001: T-01 (2-digit) is NOT extracted — avoids prefix confusion with T-010', () => {
    const raw = makeFullResponse({
      analysis: 'Partial ref T-01 should be ignored. T-010 is the real task.',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.implementedTaskIds).not.toContain('T-01')
    expect(result.implementedTaskIds).toContain('T-010')
  })

  it('REG-002: missing next step produces a warning — was silently empty in early versions', () => {
    const raw = ['1. Brief analysis', 'Feature implemented.'].join('\n')
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.warnings.some((w) => w.includes('Рекомендуемый следующий шаг'))).toBe(true)
  })

  it('REG-003: [TEST] path not double-counted when also backtick-wrapped', () => {
    const raw = makeFullResponse({
      files: '`src/foo.test.ts`\n[TEST] src/foo.test.ts',
    })
    const count = mockPromptService
      .parseClaudeResponse(raw)
      .changedFiles.filter((f) => f === 'src/foo.test.ts').length
    expect(count).toBe(1)
  })

  it('REG-004: section content does not bleed into the next section', () => {
    const raw = makeFullResponse({
      plan: 'Plan details only.',
      files: '`src/a.ts`',
    })
    const result = mockPromptService.parseClaudeResponse(raw)
    expect(result.plan).not.toContain('src/a.ts')
    expect(result.changedFiles).toContain('src/a.ts')
  })
})
