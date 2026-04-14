// T-017 — gateDiagnosticMessages mapping tests.
//
// Coverage:
//   A. All SPEC_DIAG codes → correct label + hint
//   B. All ARCH_DIAG codes → correct label + hint
//   C. All PROMPT_LOOP_DIAG codes → correct label + hint
//   D. Unknown code → safe fallback (no throw, label contains code)
//   E. All codes return a non-empty label
//   F. Known codes all have a hint (actionable guidance present)

import { describe, it, expect } from 'vitest'
import { resolveGateDiagnostic } from './gateDiagnosticMessages'
import { SPEC_DIAG, ARCH_DIAG, PROMPT_LOOP_DIAG } from './stageGates'

// ─── A. SPEC_DIAG codes ───────────────────────────────────────────────────────

describe('A. SPEC_DIAG codes', () => {
  it('NO_SPEC → label mentions spec not created', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.NO_SPEC)
    expect(msg.label).toMatch(/спецификация не создана/i)
  })

  it('NO_SPEC → hint present', () => {
    expect(resolveGateDiagnostic(SPEC_DIAG.NO_SPEC).hint).toBeTruthy()
  })

  it('EMPTY_SUMMARY → label mentions резюме', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.EMPTY_SUMMARY)
    expect(msg.label).toMatch(/резюме/i)
  })

  it('EMPTY_SUMMARY → hint present', () => {
    expect(resolveGateDiagnostic(SPEC_DIAG.EMPTY_SUMMARY).hint).toBeTruthy()
  })

  it('EMPTY_MVP_SCOPE → label mentions скоуп/MVP', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.EMPTY_MVP_SCOPE)
    expect(msg.label).toMatch(/скоуп|mvp/i)
  })

  it('EMPTY_MVP_SCOPE → hint present', () => {
    expect(resolveGateDiagnostic(SPEC_DIAG.EMPTY_MVP_SCOPE).hint).toBeTruthy()
  })

  it('NO_FEATURES → label mentions фич', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.NO_FEATURES)
    expect(msg.label).toMatch(/фич/i)
  })

  it('NO_FEATURES → hint tells user to add a feature', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.NO_FEATURES)
    expect(msg.hint).toMatch(/добавьте/i)
  })

  it('MISSING_PROJECT_TYPE → label mentions тип проекта', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.MISSING_PROJECT_TYPE)
    expect(msg.label).toMatch(/тип проекта/i)
  })

  it('MISSING_PROJECT_TYPE → hint mentions пересгенерировать', () => {
    const msg = resolveGateDiagnostic(SPEC_DIAG.MISSING_PROJECT_TYPE)
    expect(msg.hint).toMatch(/пересгенерируйте/i)
  })
})

// ─── B. ARCH_DIAG codes ───────────────────────────────────────────────────────

describe('B. ARCH_DIAG codes', () => {
  it('NO_ARCH → label mentions архитектура не создана', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.NO_ARCH)
    expect(msg.label).toMatch(/архитектура не создана/i)
  })

  it('NO_ARCH → hint present', () => {
    expect(resolveGateDiagnostic(ARCH_DIAG.NO_ARCH).hint).toBeTruthy()
  })

  it('EMPTY_STACK → label mentions стек', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.EMPTY_STACK)
    expect(msg.label).toMatch(/стек/i)
  })

  it('EMPTY_STACK → hint tells user to add stack item', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.EMPTY_STACK)
    expect(msg.hint).toMatch(/добавьте/i)
  })

  it('EMPTY_ROADMAP → label mentions дорожная карта / фаз', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.EMPTY_ROADMAP)
    expect(msg.label).toMatch(/дорожная карта|фаз/i)
  })

  it('EMPTY_ROADMAP → hint tells user to add a phase', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.EMPTY_ROADMAP)
    expect(msg.hint).toMatch(/добавьте/i)
  })

  it('MISSING_PROJECT_TYPE → label mentions тип проекта', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.MISSING_PROJECT_TYPE)
    expect(msg.label).toMatch(/тип проекта/i)
  })

  it('MISSING_PROJECT_TYPE → hint mentions пересгенерировать', () => {
    const msg = resolveGateDiagnostic(ARCH_DIAG.MISSING_PROJECT_TYPE)
    expect(msg.hint).toMatch(/пересгенерируйте/i)
  })
})

// ─── C. PROMPT_LOOP_DIAG codes ────────────────────────────────────────────────

describe('C. PROMPT_LOOP_DIAG codes', () => {
  it('NO_ITERATION → label mentions итерации', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_ITERATION)
    expect(msg.label).toMatch(/итерац/i)
  })

  it('NO_ITERATION → hint tells user to run a cycle', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_ITERATION)
    expect(msg.hint).toMatch(/запустите/i)
  })

  it('NO_PARSED_SUMMARY → label mentions не распарсена', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY)
    expect(msg.label).toMatch(/не распарсена/i)
  })

  it('NO_PARSED_SUMMARY → hint mentions вставьте ответ', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY)
    expect(msg.hint).toMatch(/вставьте/i)
  })

  it('NO_TESTS → label mentions тесты', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_TESTS)
    expect(msg.label).toMatch(/тесты/i)
  })

  it('NO_TESTS → hint says next prompt must request tests', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_TESTS)
    expect(msg.hint).toMatch(/следующий промпт/i)
  })

  it('PARSE_WARNINGS → label mentions ответ распознан не полностью', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.PARSE_WARNINGS)
    expect(msg.label).toMatch(/не полностью/i)
  })

  it('PARSE_WARNINGS → hint mentions ещё один цикл', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.PARSE_WARNINGS)
    expect(msg.hint).toMatch(/ещё один цикл/i)
  })

  it('NOT_REVIEW_PHASE → label mentions ревью', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
    expect(msg.label).toMatch(/ревью/i)
  })

  it('NOT_REVIEW_PHASE → hint tells user to finish current task first', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE)
    expect(msg.hint).toMatch(/завершите/i)
  })

  it('NO_TARGET_TASK → label mentions задача для ревью', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_TARGET_TASK)
    expect(msg.label).toMatch(/задача для ревью/i)
  })

  it('NO_TARGET_TASK → hint mentions T-xxx', () => {
    const msg = resolveGateDiagnostic(PROMPT_LOOP_DIAG.NO_TARGET_TASK)
    expect(msg.hint).toMatch(/T-xxx/i)
  })
})

// ─── D. Unknown code fallback ─────────────────────────────────────────────────

describe('D. Unknown code — safe fallback', () => {
  it('does NOT throw for unknown codes', () => {
    expect(() => resolveGateDiagnostic('some_future_unknown_code')).not.toThrow()
  })

  it('returns a non-empty label for unknown codes', () => {
    const msg = resolveGateDiagnostic('some_future_unknown_code')
    expect(msg.label.length).toBeGreaterThan(0)
  })

  it('includes the code in the fallback label', () => {
    const msg = resolveGateDiagnostic('my_special_code')
    expect(msg.label).toContain('my_special_code')
  })

  it('hint may be undefined for unknown codes (no crash)', () => {
    const msg = resolveGateDiagnostic('unknown')
    // hint is optional — just ensure no exception accessing it
    expect(() => msg.hint).not.toThrow()
  })
})

// ─── E. All known codes return non-empty label ────────────────────────────────

describe('E. All known codes return non-empty label', () => {
  const allCodes = [
    ...Object.values(SPEC_DIAG),
    ...Object.values(ARCH_DIAG),
    ...Object.values(PROMPT_LOOP_DIAG),
  ]

  for (const code of allCodes) {
    it(`code "${code}" returns non-empty label`, () => {
      const msg = resolveGateDiagnostic(code)
      expect(msg.label.trim().length).toBeGreaterThan(0)
    })
  }
})

// ─── F. All known codes have actionable hints ─────────────────────────────────

describe('F. All known codes have actionable hints', () => {
  const allCodes = [
    ...Object.values(SPEC_DIAG),
    ...Object.values(ARCH_DIAG),
    ...Object.values(PROMPT_LOOP_DIAG),
  ]

  for (const code of allCodes) {
    it(`code "${code}" has a non-empty hint`, () => {
      const msg = resolveGateDiagnostic(code)
      expect(msg.hint).toBeTruthy()
      expect((msg.hint ?? '').trim().length).toBeGreaterThan(0)
    })
  }
})
