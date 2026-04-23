// Tests for inferNextPhase and typeAwareGuidance pure functions.
// Implements T-208t / F-007 / F-024 / F-025.
//
// Locks in:
//   - inferNextPhase: DoD-met signals → 'review'; backlog signals → 'tasks';
//     hasTests+same-task → 'review'; default (missing tests / new task) → 'code_and_tests'.
//   - typeAwareGuidance: SPA vocabulary for 'application'; pages/SEO/SSR vocabulary for 'website';
//     the two outputs are distinct.

import { describe, it, expect } from 'vitest'
import { inferNextPhase, typeAwareGuidance } from './promptService'

// ─── inferNextPhase ───────────────────────────────────────────────────────────

describe('inferNextPhase', () => {
  // ── Scenario A: DoD / ready-for-review signals → 'review' ─────────────────

  describe('DoD / review-ready signals in text → review', () => {
    const cases: Array<[string, string]> = [
      ['definition of done met',   'nothing special'],
      ['dod met for T-005',        ''],
      ['all tests pass',           ''],
      ['ready for review',         ''],
      ['ready to review',          ''],
      ['task complete',            ''],
      ['mark as done',             ''],
      ['can be marked done',       ''],
    ]

    it.each(cases)('analysis=%j nextStep=%j → review', (analysis, nextStep) => {
      expect(inferNextPhase(analysis, nextStep, false, null, null)).toBe('review')
    })

    it('review signal in nextStep (not analysis) is detected', () => {
      expect(inferNextPhase('', 'ready for review', false, null, null)).toBe('review')
    })
  })

  // ── Scenario B: tests present + no new task → 'review' ────────────────────

  describe('hasTests=true + no new task → review', () => {
    it('hasTests=true, nextTaskId=null, prevTaskId set → review', () => {
      expect(inferNextPhase('', '', true, null, 'T-001')).toBe('review')
    })

    it('hasTests=true, nextTaskId === prevTaskId → review', () => {
      expect(inferNextPhase('', '', true, 'T-001', 'T-001')).toBe('review')
    })

    it('hasTests=true but prevTaskId=null → does NOT infer review (no task context)', () => {
      // Rule requires prevTaskId to be set before assuming task is done
      expect(inferNextPhase('', '', true, null, null)).toBe('code_and_tests')
    })
  })

  // ── Scenario C: backlog selection signals → 'tasks' ───────────────────────

  describe('backlog / pick-next-task signals → tasks', () => {
    it('"check docs/tasks" in analysis → tasks', () => {
      expect(inferNextPhase('check docs/tasks for the next item', '', false, null, null)).toBe('tasks')
    })

    it('"pick the next task" in nextStep → tasks', () => {
      expect(inferNextPhase('', 'you should pick the next task from the list', false, null, null)).toBe('tasks')
    })

    it('"check docs/tasks" takes priority over hasTests=true (no prevTaskId)', () => {
      expect(inferNextPhase('check docs/tasks', '', true, null, null)).toBe('tasks')
    })
  })

  // ── Scenario D: missing tests default → 'code_and_tests' ─────────────────

  describe('missing tests with no special signal → code_and_tests', () => {
    it('empty inputs → code_and_tests', () => {
      expect(inferNextPhase('', '', false, null, null)).toBe('code_and_tests')
    })

    it('parsedSummary present but hasTests=false, no review keywords → code_and_tests', () => {
      expect(
        inferNextPhase(
          'Implemented the login component.',
          'Add T-002 form validation next.',
          false,
          'T-002',
          'T-001',
        ),
      ).toBe('code_and_tests')
    })
  })

  // ── Scenario E: new task suggested → documented rule is 'code_and_tests' ──

  describe('new task ID suggested (nextTaskId !== prevTaskId) → code_and_tests', () => {
    // Rule: when a new T-xxx is suggested (different from the current task) and there
    // are no DoD-met / ready-for-review signals, inferNextPhase returns 'code_and_tests'.
    // Rationale: the builder should stay in the Code+Tests phase to implement the new task.
    // The user / UI can manually promote to 'tasks' if they want to pick a different task.
    it('nextTaskId differs from prevTaskId, no review signals, hasTests=false → code_and_tests', () => {
      expect(inferNextPhase('Implemented T-001.', 'Proceed to T-002.', false, 'T-002', 'T-001')).toBe(
        'code_and_tests',
      )
    })

    it('nextTaskId differs, hasTests=true → still code_and_tests (prevTaskId check fails)', () => {
      // hasTests=true branch only fires when nextTaskId is null OR equal to prevTaskId.
      // A genuinely new task (T-002 ≠ T-001) means the current task is NOT done — keep building.
      expect(inferNextPhase('', '', true, 'T-002', 'T-001')).toBe('code_and_tests')
    })
  })

  // ── Scenario F: case-insensitivity ────────────────────────────────────────

  describe('keyword matching is case-insensitive', () => {
    it('upper-case "READY FOR REVIEW" → review', () => {
      expect(inferNextPhase('', 'READY FOR REVIEW', false, null, null)).toBe('review')
    })

    it('mixed-case "Definition of Done Met" → review', () => {
      expect(inferNextPhase('Definition of Done Met for T-007', '', false, null, null)).toBe('review')
    })
  })
})

// ─── typeAwareGuidance ────────────────────────────────────────────────────────

describe('typeAwareGuidance', () => {
  // ── Application markers ────────────────────────────────────────────────────

  describe('application guidance contains SPA domain vocabulary', () => {
    const appGuidance = typeAwareGuidance('application')

    it('mentions "SPA" or "Single Page Application"', () => {
      expect(appGuidance.toLowerCase()).toMatch(/\bspa\b|single page application/i)
    })

    it('mentions "React Router" (client-side routing)', () => {
      expect(appGuidance).toContain('React Router')
    })

    it('mentions "Zustand" (state management)', () => {
      expect(appGuidance).toContain('Zustand')
    })

    it('mentions "state" (cross-component data)', () => {
      expect(appGuidance.toLowerCase()).toContain('состояни')
    })

    it('mentions "component" (UI decomposition pattern)', () => {
      expect(appGuidance.toLowerCase()).toContain('компонент')
    })
  })

  // ── Website markers ────────────────────────────────────────────────────────

  describe('website guidance contains pages / SSR / SEO vocabulary', () => {
    const webGuidance = typeAwareGuidance('website')

    it('mentions "website" (project type declaration)', () => {
      expect(webGuidance.toLowerCase()).toContain('сайт')
    })

    it('mentions "pages" or "routes" (content surfaces)', () => {
      expect(webGuidance.toLowerCase()).toMatch(/страниц|маршрут/)
    })

    it('mentions "SSG" or "SSR" (server-side rendering patterns)', () => {
      expect(webGuidance).toMatch(/SSG|SSR/)
    })

    it('mentions "SEO" (search engine requirements)', () => {
      expect(webGuidance).toContain('SEO')
    })

    it('mentions "semantic HTML" (accessibility + SEO structure)', () => {
      expect(webGuidance.toLowerCase()).toContain('семантическ')
    })

    it('mentions "layout" or "navigation" (page-level structure)', () => {
      expect(webGuidance.toLowerCase()).toMatch(/лейаут|навигац/)
    })
  })

  // ── Distinctness ───────────────────────────────────────────────────────────

  describe('application and website guidance are meaningfully distinct', () => {
    const appGuidance = typeAwareGuidance('application')
    const webGuidance = typeAwareGuidance('website')

    it('the two strings are not equal', () => {
      expect(appGuidance).not.toBe(webGuidance)
    })

    it('application guidance does NOT mention SEO (SPA concern)', () => {
      expect(appGuidance).not.toContain('SEO')
    })

    it('website guidance does NOT mention Zustand (SPA state management)', () => {
      expect(webGuidance).not.toContain('Zustand')
    })

    it('website guidance does NOT mention React Router (client-only routing)', () => {
      expect(webGuidance).not.toContain('React Router')
    })

    it('application guidance does NOT mention SSG/SSR patterns', () => {
      expect(appGuidance).not.toMatch(/SSG|SSR/)
    })
  })
})
