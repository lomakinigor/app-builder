// T-108 — Cycle-aware Prompt Loop service tests
// Implements F-007 / T-108
//
// Pins the contracts that promptService uses type + stack + roadmap data
// from Architecture as the source of truth for generated prompts.
//
// What is NOT re-tested here (already covered by promptService.engine.test.ts
// and promptService.test.ts):
//   - PromptIteration shape fields (id, status, iterationNumber, cyclePhase, etc.)
//   - inferNextPhase keyword logic
//   - typeAwareGuidance vocabulary completeness
//   - parseClaudeResponse section extraction / file detection / warning logic
//
// What IS new in T-108:
//   A. generateFirstPrompt — tech context for website type (Next.js + TypeScript + SSG/SEO)
//   B. generateFirstPrompt — stack entries formatted verbatim "Name — Role" in the prompt
//   C. generateFirstPrompt — roadmap vocabulary: phase title + goals from arch.roadmapPhases[0]
//   D. generateNextPrompt — type-aware guidance injected for both application and website
//   E. generateNextPrompt — cycle-aware structural differences: first vs next, review vs code_and_tests
//   F. Combined: type + stack + phase all present together in a single prompt

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
} from '../../shared/types'
import { mockPromptService } from './promptService'
import { createAppArch, createAppArchCoreFlow, createWebArch, createWebArchCorePages, createWebArchBlog } from '../fixtures/archFixtures'
import { createAppSpec, createWebSpec } from '../fixtures/specFixtures'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
//
// Arch and spec are loaded from shared canonical fixtures (archFixtures / specFixtures).
// Single-phase variants (CORE_FLOW, CORE_PAGES, BLOG) are used in group C tests
// to assert that phase title + goals appear verbatim in the generated prompt.

const APP_SPEC = createAppSpec()
const APP_ARCH = createAppArch()
const APP_ARCH_CORE_FLOW = createAppArchCoreFlow()

const WEB_SPEC = createWebSpec()
const WEB_ARCH = createWebArch()
const WEB_ARCH_CORE_PAGES = createWebArchCorePages()
const WEB_ARCH_BLOG = createWebArchBlog()

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ID = 'proj-001'
const PROMPT_ID = 'prompt-001'
const PROMPT_ID_2 = 'prompt-002'

/** Helper: generate first prompt and wait for fake timers */
async function runFirst(
  spec: SpecPack,
  arch: ArchitectureDraft,
  projectType: 'application' | 'website',
  taskId: string | null = 'T-001',
  taskDesc: string | null = null,
): Promise<PromptIteration> {
  const p = mockPromptService.generateFirstPrompt(spec, arch, projectType, PROJECT_ID, PROMPT_ID, taskId, taskDesc)
  await vi.runAllTimersAsync()
  return p
}

function makeParsed(overrides: Partial<ParsedClaudeResponse> = {}): ParsedClaudeResponse {
  return {
    analysis: 'Implemented T-001.',
    plan: 'Write tests first.',
    changedFiles: ['src/lib/thing.ts', 'src/lib/thing.test.ts'],
    implementationSummary: 'Added the thing function with tests.',
    nextStep: 'Proceed to T-002.',
    warnings: [],
    hasTests: true,
    implementedTaskIds: ['T-001'],
    nextTaskId: 'T-002',
    inferredNextPhase: 'code_and_tests',
    ...overrides,
  }
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: PROMPT_ID,
    projectId: PROJECT_ID,
    iterationNumber: 1,
    promptText: 'some prompt text',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: new Date().toISOString(),
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-001',
    roadmapPhaseNumber: 0,
    ...overrides,
  }
}

/** Helper: generate next prompt and wait for fake timers */
async function runNext(
  prevIteration: PromptIteration,
  parsed: ParsedClaudeResponse,
  projectType: 'application' | 'website',
  targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
): Promise<PromptIteration> {
  const p = mockPromptService.generateNextPrompt(
    prevIteration,
    parsed,
    projectType,
    PROJECT_ID,
    PROMPT_ID_2,
    2,
    targetPhase,
  )
  await vi.runAllTimersAsync()
  return p
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ─── A. generateFirstPrompt — tech context: website ───────────────────────────
// The website type must inject Next.js from the stack and SSG/SEO from guidance.
// These tests are the "website side" complement of the existing engine test
// that already checks application → 'React'.

describe('A. generateFirstPrompt — website tech context (stack + guidance)', () => {
  it('website prompt contains "Next.js" (from recommendedStack[0].name)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('Next.js')
  })

  it('website prompt contains "TypeScript" (cross-type stack entry)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('TypeScript')
  })

  it('website prompt contains "MDX" (website-specific stack entry)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('MDX')
  })

  it('website prompt contains "Vercel" (website-specific hosting entry)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('Vercel')
  })

  it('website prompt contains SSG/SSR guidance (from typeAwareGuidance)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toMatch(/SSG|SSR/)
  })

  it('website prompt contains "SEO" (from typeAwareGuidance)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('SEO')
  })

  it('website prompt contains "website" type label in intro', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('создающий сайт')
  })

  it('application prompt contains "React" (from recommendedStack[0].name)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('React')
  })

  it('application prompt contains "TypeScript" (cross-type stack entry)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('TypeScript')
  })

  it('application prompt contains "Zustand" (from typeAwareGuidance and stack)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('Zustand')
  })

  it('application prompt contains SPA guidance (from typeAwareGuidance)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toMatch(/\bSPA\b|Single Page Application/)
  })

  it('application prompt contains "application" type label in intro', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('создающий приложение')
  })
})

// ─── B. generateFirstPrompt — stack format + no cross-contamination ───────────
// The stack is embedded verbatim as "Name — Role" lines.
// Type-specific technologies must not leak into the opposing type's prompt.

describe('B. generateFirstPrompt — stack format and no cross-contamination', () => {
  it('application stack: "React — UI-слой" appears as formatted stack entry', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('React — UI-слой')
  })

  it('application stack: "TypeScript — Типобезопасность" appears as formatted stack entry', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('TypeScript — Типобезопасность')
  })

  it('website stack: "Next.js — Фреймворк" appears as formatted stack entry', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('Next.js — Фреймворк')
  })

  it('website stack: "TypeScript — Типобезопасность" appears as formatted stack entry', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).toContain('TypeScript — Типобезопасность')
  })

  it('application prompt does NOT contain "Next.js" (not in application stack)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).not.toContain('Next.js')
  })

  it('website prompt does NOT contain "React Router" (application guidance, not injected for website)', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    expect(iter.promptText).not.toContain('React Router')
  })

  it('website prompt does NOT contain "Zustand" in the stack section (not in website stack)', async () => {
    // Zustand appears in application stack and guidance; website has neither
    const iter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    // Zustand should not appear anywhere in the website prompt
    expect(iter.promptText).not.toContain('Zustand')
  })

  it('application prompt does NOT contain "SEO" (website guidance not injected for application)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).not.toContain('SEO')
  })
})

// ─── C. generateFirstPrompt — roadmap vocabulary ──────────────────────────────
// arch.roadmapPhases[0] supplies the phase label and goals for the first prompt.
// The phase title and goals must appear verbatim in the prompt text.

describe('C. generateFirstPrompt — roadmap phase vocabulary from arch', () => {
  it('application "Фундамент" phase (phase 0) → "Фундамент" in prompt', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('Фундамент')
  })

  it('application "Фундамент" phase → phase 0 number appears in prompt', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('Фаза 0')
  })

  it('application "Фундамент" goals appear in prompt ("Оболочка приложения")', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('Оболочка приложения')
  })

  it('application "Фундамент" goals appear in prompt ("Маршрутизация")', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('Маршрутизация')
  })

  it('application "Основной поток" phase (phase 1 as first phase) → "Основной поток" in prompt', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH_CORE_FLOW, 'application')
    expect(iter.promptText).toContain('Основной поток')
  })

  it('application "Основной поток" goals appear ("Экран онбординга")', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH_CORE_FLOW, 'application')
    expect(iter.promptText).toContain('Экран онбординга')
  })

  it('website "Основные страницы" phase → "Основные страницы" in prompt', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_CORE_PAGES, 'website')
    expect(iter.promptText).toContain('Основные страницы')
  })

  it('website "Основные страницы" goals appear ("MDX-пайплайн")', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_CORE_PAGES, 'website')
    expect(iter.promptText).toContain('MDX-пайплайн')
  })

  it('website "Блог" phase → "Блог" in prompt', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_BLOG, 'website')
    expect(iter.promptText).toContain('Блог')
  })

  it('website "Блог" goals appear ("Страница списка статей")', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_BLOG, 'website')
    expect(iter.promptText).toContain('Страница списка статей')
  })

  it('complexity label appears for the current phase (low / medium / high)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    // Foundation has estimatedComplexity: 'low'
    expect(iter.promptText).toContain('low')
  })

  it('roadmap phase vocabulary differs between application and website (Foundation goals differ)', async () => {
    const appIter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    const webIter = await runFirst(WEB_SPEC, WEB_ARCH, 'website')
    // Application Фундамент goals: 'Оболочка приложения', 'Маршрутизация'
    // Website Фундамент goals: 'Скаффолд Next.js', 'Настройка Tailwind'
    expect(appIter.promptText).toContain('Оболочка приложения')
    expect(webIter.promptText).not.toContain('Оболочка приложения')
    expect(webIter.promptText).toContain('Скаффолд Next.js')
    expect(appIter.promptText).not.toContain('Скаффолд Next.js')
  })
})

// ─── D. generateNextPrompt — type-aware guidance injected ─────────────────────
// generateNextPrompt does NOT re-embed the arch stack.
// Type context is carried forward exclusively through typeAwareGuidance(projectType).

describe('D. generateNextPrompt — type-aware guidance inherited per type', () => {
  it('application next prompt contains SPA guidance', async () => {
    const prev = makeIteration({ projectType: 'application' })
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).toMatch(/\bSPA\b|Single Page Application/)
  })

  it('application next prompt contains "Zustand" (from typeAwareGuidance)', async () => {
    const prev = makeIteration({ projectType: 'application' })
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).toContain('Zustand')
  })

  it('application next prompt contains "React Router" (from typeAwareGuidance)', async () => {
    const prev = makeIteration({ projectType: 'application' })
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).toContain('React Router')
  })

  it('website next prompt contains SSG/SSR guidance', async () => {
    const prev = makeIteration({ projectType: 'website' })
    const iter = await runNext(prev, makeParsed(), 'website')
    expect(iter.promptText).toMatch(/SSG|SSR/)
  })

  it('website next prompt contains "SEO" (from typeAwareGuidance)', async () => {
    const prev = makeIteration({ projectType: 'website' })
    const iter = await runNext(prev, makeParsed(), 'website')
    expect(iter.promptText).toContain('SEO')
  })

  it('website next prompt does NOT contain "Zustand" (application-only guidance)', async () => {
    const prev = makeIteration({ projectType: 'website' })
    const iter = await runNext(prev, makeParsed(), 'website')
    expect(iter.promptText).not.toContain('Zustand')
  })

  it('application next prompt does NOT contain "SEO" (website-only guidance)', async () => {
    const prev = makeIteration({ projectType: 'application' })
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).not.toContain('SEO')
  })

  it('website next prompt references "website" type label', async () => {
    const prev = makeIteration({ projectType: 'website' })
    const iter = await runNext(prev, makeParsed(), 'website')
    expect(iter.promptText).toContain('сайт')
  })
})

// ─── E. generateNextPrompt — cycle-aware behavior ─────────────────────────────
// Verifies structural differences between:
//   - code_and_tests phase vs review phase
//   - prompts with missing tests vs prompts with tests present
//   - task linkage: nextTaskId propagation

describe('E. generateNextPrompt — cycle-aware structural behavior', () => {
  it('code_and_tests phase: stage label says "Стадия 5 из 6"', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application', 'code_and_tests')
    expect(iter.promptText).toContain('Стадия 5 из 6')
  })

  it('review phase: stage label says "Стадия 6 из 6"', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application', 'review')
    expect(iter.promptText).toContain('Стадия 6 из 6')
  })

  it('review phase: prompt contains "Задача Review" section', async () => {
    const prev = makeIteration({ targetTaskId: 'T-001' })
    const iter = await runNext(prev, makeParsed(), 'application', 'review')
    expect(iter.promptText).toContain('Задача Review')
  })

  it('review phase: prompt does NOT contain the mandatory TDD rule block (review has no new code work)', async () => {
    // The review task checklist references "TDD" by name, but the mandatory
    // ## Правило TDD (обязательно) block is NOT injected in review prompts.
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application', 'review')
    expect(iter.promptText).not.toContain('## Правило TDD (обязательно)')
  })

  it('code_and_tests phase: prompt contains "Правило TDD"', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application', 'code_and_tests')
    expect(iter.promptText).toContain('Правило TDD')
  })

  it('hasTests=false in previous iteration → "Отсутствующие тесты" warning injected in next prompt', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed({ hasTests: false }), 'application', 'code_and_tests')
    expect(iter.promptText).toContain('Отсутствующие тесты из итерации')
  })

  it('hasTests=true → no "Отсутствующие тесты" warning in next prompt', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed({ hasTests: true }), 'application', 'code_and_tests')
    expect(iter.promptText).not.toContain('Отсутствующие тесты из итерации')
  })

  it('hasTests=false but review phase → no "Отсутствующие тесты" warning', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed({ hasTests: false }), 'application', 'review')
    expect(iter.promptText).not.toContain('Отсутствующие тесты из итерации')
  })

  it('next prompt contains implementation summary from previous iteration', async () => {
    const prev = makeIteration()
    const parsed = makeParsed({ implementationSummary: 'Implemented the onboarding flow.' })
    const iter = await runNext(prev, parsed, 'application')
    expect(iter.promptText).toContain('Implemented the onboarding flow.')
  })

  it('next prompt references "итерации #1" (the previous iteration)', async () => {
    const prev = makeIteration({ iterationNumber: 1 })
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).toContain('итерации #1')
  })

  it('next prompt includes "T-002" as the next task when nextTaskId=T-002', async () => {
    const prev = makeIteration()
    const parsed = makeParsed({ nextTaskId: 'T-002' })
    const iter = await runNext(prev, parsed, 'application')
    expect(iter.promptText).toContain('T-002')
  })
})

// ─── F. generateFirstPrompt vs generateNextPrompt — structural differences ────
// The two generators produce structurally distinct prompts:
// first = baseline context with full Spec + Architecture details
// next  = continuation with previous iteration context, no arch stack re-embedding

describe('F. First vs Next — structural differences', () => {
  it('generateFirstPrompt includes "## Стек" section (arch embedded)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('## Стек')
  })

  it('generateNextPrompt does NOT include "## Стек" section (arch not re-embedded)', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).not.toContain('## Стек')
  })

  it('generateFirstPrompt includes "## Скоуп MVP" from spec', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('## Скоуп MVP')
  })

  it('generateNextPrompt does NOT include "## Скоуп MVP" (focus shifts to next task)', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).not.toContain('## Скоуп MVP')
  })

  it('generateFirstPrompt starts with "создающий" (first engagement)', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).toContain('создающий приложение')
  })

  it('generateNextPrompt starts with "продолжающий реализацию" (not first engagement)', async () => {
    const prev = makeIteration()
    const iter = await runNext(prev, makeParsed(), 'application')
    expect(iter.promptText).toContain('продолжающий реализацию')
  })

  it('generateFirstPrompt has iterationNumber = 1', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.iterationNumber).toBe(1)
  })
})

// ─── G. Combined: type + stack + phase in one prompt ─────────────────────────
// These tests confirm that all three dimensions are simultaneously present.

describe('G. Combined: type + stack + phase all present', () => {
  it('application + React stack + "Основной поток" phase → all three in one prompt', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH_CORE_FLOW, 'application')
    // type context
    expect(iter.promptText).toMatch(/\bSPA\b|Single Page Application/)
    // stack
    expect(iter.promptText).toContain('React')
    expect(iter.promptText).toContain('TypeScript')
    // phase
    expect(iter.promptText).toContain('Основной поток')
  })

  it('website + Next.js stack + "Основные страницы" phase → all three in one prompt', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_CORE_PAGES, 'website')
    // type context
    expect(iter.promptText).toMatch(/SSG|SSR/)
    expect(iter.promptText).toContain('SEO')
    // stack
    expect(iter.promptText).toContain('Next.js')
    expect(iter.promptText).toContain('TypeScript')
    // phase
    expect(iter.promptText).toContain('Основные страницы')
  })

  it('website + Next.js stack + "Блог" phase → all three in one prompt', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_BLOG, 'website')
    // type context
    expect(iter.promptText).toMatch(/SSG|SSR/)
    // stack
    expect(iter.promptText).toContain('Next.js')
    // phase
    expect(iter.promptText).toContain('Блог')
    expect(iter.promptText).toContain('Страница списка статей')
  })

  it('application + React stack + "Фундамент" phase: no Next.js and no "Основные страницы"', async () => {
    const iter = await runFirst(APP_SPEC, APP_ARCH, 'application')
    expect(iter.promptText).not.toContain('Next.js')
    expect(iter.promptText).not.toContain('Основные страницы')
  })

  it('website + website stack + "Core pages" phase: no React Router and no "Core flow"', async () => {
    const iter = await runFirst(WEB_SPEC, WEB_ARCH_CORE_PAGES, 'website')
    expect(iter.promptText).not.toContain('React Router')
    expect(iter.promptText).not.toContain('Core flow')
  })
})
