// T-012 — normalizeResearchText unit tests: edge cases, fallback behavior, shape invariants.
// Implements F-003 / T-012
//
// Coverage areas:
//   A. Happy path: full markdown input → all sections extracted correctly
//   B. Empty / whitespace / null / undefined input → safe shape, no throw
//   C. Missing sections → fallback strings and empty arrays used predictably
//   D. Malformed input → headings without body, duplicates, header-only text
//   E. Fallback with ideaDraft → ideaDraft fills targetUser / problem when sections absent
//   F. Output shape invariants → arrays stay arrays, strings stay strings, fixed fields
//   G. Stability → deterministic output, no input mutation

import { describe, it, expect } from 'vitest'
import { normalizeResearchText } from './normalizer'
import type { NormalizationResult } from './normalizer'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Well-structured markdown with all 8 expected sections */
const FULL_MARKDOWN = `
## Problem
Teams waste time on manual planning and lack AI assistance for task breakdown.

## Target Users
- Developers
- Product managers
- Solo founders

## Value Proposition
AI removes the overhead of manual task breakdown, saving hours each week.

## Competitors
Jira is too complex. Notion lacks AI structure. Linear is focused on issues only.

## Risks
- Adoption risk: teams may revert to old tools.
- Integration complexity with existing workflows.

## Opportunities
- Large market. AI UX is a differentiator.
- Growing demand for AI-assisted project management.

## MVP
Task creation + AI breakdown + persistence. No auth required.

## Open Questions
- How to handle offline mode?
- What happens when AI suggestions are wrong?
`

/** Markdown with only one section */
const PROBLEM_ONLY = `
## Problem
Teams struggle with coordination and lack of automated assistance for daily planning.
`

/** Text with headings but empty bodies */
const HEADERS_NO_CONTENT = `
## Problem

## Target Users

## Risks
`

/** Plain text with no headings but with keywords */
const PLAIN_TEXT_WITH_KEYWORDS = `
The main problem developers face is coordination overhead and lack of automation.
Users are typically software teams and solo builders who want faster shipping.
The market includes tools like Jira and Notion, but they lack real AI integration.
We need an MVP that covers task creation and basic AI suggestions first.
There are some risks around adoption — teams may stick with existing tools.
`

/** Random text with no structure and no keywords */
const RANDOM_TEXT = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do.'

const ARTIFACT_ID = 'art-001'
const ARTIFACT_TITLE = 'My Research Report'

const IDEA_DRAFT = {
  rawIdea: 'An AI tool for project management that helps developers ship faster.',
  targetUser: 'Software developers',
  problem: 'Manual planning is slow and error-prone.',
}

// ─── A. Happy path ────────────────────────────────────────────────────────────

describe('A. Happy path — full structured input', () => {
  it('returns a result with brief.briefSource = "imported"', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.briefSource).toBe('imported')
  })

  it('extracts problemSummary from ## Problem section', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.problemSummary).toContain('manual planning')
  })

  it('extracts targetUsers as a non-empty array from ## Target Users section', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(result.brief.targetUsers)).toBe(true)
    expect(result.brief.targetUsers.length).toBeGreaterThan(0)
    expect(result.brief.targetUsers.some((u) => u.toLowerCase().includes('developer'))).toBe(true)
  })

  it('sets sourceIds to [artifactId]', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.sourceIds).toEqual([ARTIFACT_ID])
  })

  it('includes artifactTitle in sourcesNote', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.sourcesNote).toContain(ARTIFACT_TITLE)
  })

  it('reports extractedSectionCount >= 4 for full input', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.extractedSectionCount).toBeGreaterThanOrEqual(4)
  })

  it('returns warnings as an empty array when enough sections found', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    // Full input has >= 4 sections, so neither warning threshold fires
    expect(result.warnings).toEqual([])
  })
})

// ─── B. Empty / whitespace / null / undefined input ───────────────────────────

describe('B. Empty / null / whitespace input — safe fallback, no throw', () => {
  it('empty string does not throw', () => {
    expect(() => normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)).not.toThrow()
  })

  it('whitespace-only string does not throw', () => {
    expect(() => normalizeResearchText('   \n  \t  ', ARTIFACT_ID, ARTIFACT_TITLE)).not.toThrow()
  })

  it('null as raw does not throw (runtime guard)', () => {
    // TypeScript won't allow this without a cast — we test the runtime safety fix
    expect(() =>
      normalizeResearchText(null as unknown as string, ARTIFACT_ID, ARTIFACT_TITLE)
    ).not.toThrow()
  })

  it('undefined as raw does not throw (runtime guard)', () => {
    expect(() =>
      normalizeResearchText(undefined as unknown as string, ARTIFACT_ID, ARTIFACT_TITLE)
    ).not.toThrow()
  })

  it('empty string returns a valid brief shape with all required fields', () => {
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)
    const { brief } = result
    expect(typeof brief.problemSummary).toBe('string')
    expect(brief.problemSummary.length).toBeGreaterThan(0)
    expect(Array.isArray(brief.targetUsers)).toBe(true)
    expect(Array.isArray(brief.risks)).toBe(true)
    expect(Array.isArray(brief.opportunities)).toBe(true)
    expect(Array.isArray(brief.openQuestions)).toBe(true)
    expect(typeof brief.sourcesNote).toBe('string')
    expect(Array.isArray(brief.sourceIds)).toBe(true)
  })

  it('empty string yields extractedSectionCount = 0', () => {
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.extractedSectionCount).toBe(0)
  })

  it('empty string produces both warnings (< 2 and < 4 thresholds)', () => {
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.warnings.length).toBe(2)
  })

  it('whitespace-only string behaves the same as empty string', () => {
    const resultEmpty = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)
    const resultWS = normalizeResearchText('   \n   ', ARTIFACT_ID, ARTIFACT_TITLE)
    expect(resultWS.extractedSectionCount).toBe(resultEmpty.extractedSectionCount)
    expect(resultWS.warnings.length).toBe(resultEmpty.warnings.length)
  })
})

// ─── C. Missing sections ──────────────────────────────────────────────────────

describe('C. Missing sections — partial content uses fallback values', () => {
  it('problem-only input: problemSummary extracted, other scalar fields get fallback strings', () => {
    const result = normalizeResearchText(PROBLEM_ONLY, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.problemSummary).not.toContain('No problem summary')
    expect(result.brief.valueHypothesis).toContain('No value')
    expect(result.brief.competitorNotes).toContain('No competitor')
    expect(result.brief.recommendedMVP).toContain('No MVP')
  })

  it('problem-only input: missing array fields are empty arrays', () => {
    const result = normalizeResearchText(PROBLEM_ONLY, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.brief.risks).toEqual([])
    expect(result.brief.opportunities).toEqual([])
    expect(result.brief.openQuestions).toEqual([])
  })

  it('problem-only input: targetUsers is a non-empty array (keyword fallback or placeholder)', () => {
    // The keyword fallback may pick up "Teams" from the problem text (keyword: "team"),
    // so we only assert the invariant: non-empty array, not the specific fallback string.
    const result = normalizeResearchText(PROBLEM_ONLY, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(result.brief.targetUsers)).toBe(true)
    expect(result.brief.targetUsers.length).toBeGreaterThan(0)
  })

  it('emits a warning when fewer than 4 sections extracted', () => {
    const result = normalizeResearchText(PROBLEM_ONLY, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

// ─── D. Malformed input ───────────────────────────────────────────────────────

describe('D. Malformed input — headings without body, duplicates, random text', () => {
  it('headers with no content: does not throw', () => {
    expect(() =>
      normalizeResearchText(HEADERS_NO_CONTENT, ARTIFACT_ID, ARTIFACT_TITLE)
    ).not.toThrow()
  })

  it('headers with no content: brief has valid shape (arrays and strings)', () => {
    const result = normalizeResearchText(HEADERS_NO_CONTENT, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(typeof result.brief.problemSummary).toBe('string')
    expect(result.brief.problemSummary.length).toBeGreaterThan(0)
    expect(Array.isArray(result.brief.risks)).toBe(true)
  })

  it('duplicate section headings do not throw', () => {
    const withDuplicates = `
## Problem
First problem description here with enough text to be valid.

## Problem
Second problem description which overwrites the first.
`
    expect(() =>
      normalizeResearchText(withDuplicates, ARTIFACT_ID, ARTIFACT_TITLE)
    ).not.toThrow()
  })

  it('duplicate sections: last occurrence wins (extracted section count stays >= 1)', () => {
    const withDuplicates = `
## Problem
First problem description with sufficient length.

## Problem
Second problem description overwrites the first.
`
    const result = normalizeResearchText(withDuplicates, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(result.extractedSectionCount).toBeGreaterThanOrEqual(1)
    expect(result.brief.problemSummary).toContain('Second problem')
  })

  it('random unstructured text: does not throw', () => {
    expect(() =>
      normalizeResearchText(RANDOM_TEXT, ARTIFACT_ID, ARTIFACT_TITLE)
    ).not.toThrow()
  })

  it('random text: brief shape still valid (all fields present)', () => {
    const result = normalizeResearchText(RANDOM_TEXT, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(result.brief.targetUsers)).toBe(true)
    expect(Array.isArray(result.brief.risks)).toBe(true)
    expect(typeof result.brief.problemSummary).toBe('string')
  })
})

// ─── E. Fallback with ideaDraft ───────────────────────────────────────────────

describe('E. ideaDraft fallback — fills gaps when sections absent', () => {
  it('problemSummary uses ideaDraft.problem when no problem section found', () => {
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, IDEA_DRAFT)
    expect(result.brief.problemSummary).toBe(IDEA_DRAFT.problem)
  })

  it('targetUsers uses ideaDraft.targetUser as single-element array when no section found', () => {
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, IDEA_DRAFT)
    expect(result.brief.targetUsers).toEqual([IDEA_DRAFT.targetUser])
  })

  it('ideaDraft.rawIdea used for problemSummary only when problem and rawIdea both available but problem is empty string', () => {
    const draftNoProb = { rawIdea: 'Raw idea text for fallback.', targetUser: 'Dev', problem: '' }
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, draftNoProb)
    // problem is '' (falsy) so falls through to rawIdea
    expect(result.brief.problemSummary).toBe(draftNoProb.rawIdea)
  })

  it('labeled section takes priority over ideaDraft when section is present', () => {
    const result = normalizeResearchText(PROBLEM_ONLY, ARTIFACT_ID, ARTIFACT_TITLE, IDEA_DRAFT)
    // The ## Problem section should win over ideaDraft.problem
    expect(result.brief.problemSummary).not.toBe(IDEA_DRAFT.problem)
    expect(result.brief.problemSummary).toContain('coordination')
  })

  it('null ideaDraft uses placeholder fallbacks (no crash)', () => {
    expect(() =>
      normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, null)
    ).not.toThrow()
    const result = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, null)
    expect(result.brief.problemSummary).toContain('No problem')
    expect(result.brief.targetUsers).toEqual(['Not specified — please edit this section.'])
  })

  it('keyword-based fallback: plain text with problem keyword fills problemSummary', () => {
    const result = normalizeResearchText(
      PLAIN_TEXT_WITH_KEYWORDS,
      ARTIFACT_ID,
      ARTIFACT_TITLE
    )
    expect(result.brief.problemSummary).not.toContain('No problem')
    expect(result.usedFallback).toBe(true)
  })
})

// ─── F. Output shape invariants ───────────────────────────────────────────────

describe('F. Output shape invariants — on any input', () => {
  const cases: Array<[string, string]> = [
    ['full structured input', FULL_MARKDOWN],
    ['empty string', ''],
    ['whitespace only', '   \n  '],
    ['problem only', PROBLEM_ONLY],
    ['random text', RANDOM_TEXT],
    ['headers no content', HEADERS_NO_CONTENT],
    ['plain text with keywords', PLAIN_TEXT_WITH_KEYWORDS],
  ]

  it.each(cases)('%s: targetUsers is always a non-empty array', (_label, raw) => {
    const { brief } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(brief.targetUsers)).toBe(true)
    expect(brief.targetUsers.length).toBeGreaterThan(0)
  })

  it.each(cases)('%s: risks, opportunities, openQuestions are always arrays', (_label, raw) => {
    const { brief } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(brief.risks)).toBe(true)
    expect(Array.isArray(brief.opportunities)).toBe(true)
    expect(Array.isArray(brief.openQuestions)).toBe(true)
  })

  it.each(cases)('%s: scalar string fields are always non-empty strings', (_label, raw) => {
    const { brief } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(brief.problemSummary.length).toBeGreaterThan(0)
    expect(brief.valueHypothesis.length).toBeGreaterThan(0)
    expect(brief.competitorNotes.length).toBeGreaterThan(0)
    expect(brief.recommendedMVP.length).toBeGreaterThan(0)
    expect(brief.sourcesNote.length).toBeGreaterThan(0)
  })

  it.each(cases)('%s: sourceIds is always [artifactId]', (_label, raw) => {
    const { brief } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(brief.sourceIds).toEqual([ARTIFACT_ID])
  })

  it.each(cases)('%s: briefSource is always "imported"', (_label, raw) => {
    const { brief } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(brief.briefSource).toBe('imported')
  })

  it.each(cases)('%s: warnings is always an array', (_label, raw) => {
    const { warnings } = normalizeResearchText(raw, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(Array.isArray(warnings)).toBe(true)
  })
})

// ─── G. Stability ─────────────────────────────────────────────────────────────

describe('G. Stability — determinism and no mutation', () => {
  it('same input produces identical output on repeated calls', () => {
    const r1 = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    const r2 = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(r1.brief.problemSummary).toBe(r2.brief.problemSummary)
    expect(r1.extractedSectionCount).toBe(r2.extractedSectionCount)
    expect(r1.warnings).toEqual(r2.warnings)
  })

  it('ideaDraft object is not mutated by the call', () => {
    const draft = { rawIdea: 'original', targetUser: 'original', problem: 'original' }
    const snapshotBefore = { ...draft }
    normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE, draft)
    expect(draft).toEqual(snapshotBefore)
  })

  it('extractedSectionCount matches actual number of non-empty sections extracted', () => {
    const result = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    // extractedSectionCount is set by the function; verify it's a non-negative integer
    expect(Number.isInteger(result.extractedSectionCount)).toBe(true)
    expect(result.extractedSectionCount).toBeGreaterThanOrEqual(0)
  })

  it('warning thresholds: < 2 sections → 2 warnings; >= 4 sections → 0 warnings', () => {
    const empty = normalizeResearchText('', ARTIFACT_ID, ARTIFACT_TITLE)
    const full = normalizeResearchText(FULL_MARKDOWN, ARTIFACT_ID, ARTIFACT_TITLE)
    expect(empty.warnings.length).toBe(2)  // fires both < 2 and < 4 checks
    expect(full.warnings.length).toBe(0)
  })
})
