// E2E-001 — Happy path: New Project → Idea → Research → Spec → Architecture → Prompt Loop → Review
//
// Verifies what RTL/unit tests cannot:
//   - real SPA routing (URL changes, browser back-forward)
//   - TopBar project switcher reflects the active project
//   - localStorage persistence survives page.reload()
//   - full stage pipeline passes all mock service calls end-to-end
//
// Mock service timings (built into the app):
//   research: ~1 500ms  |  spec: ~1 200ms  |  architecture: ~1 000ms  |  first prompt: ~800ms
//
// Stability notes:
//   - All heading assertions use level: 1 to avoid strict-mode violations.
//     Each page renders a <h1> via PageHeader AND a <h3> via CardHeader with the
//     same title text; without level:1 getByRole matches both and throws.
//   - Async generation steps use a page-level marker (badge/card) as the
//     ready signal, never a fixed timeout.
//   - test.step() wraps each stage for clear trace/report navigation.

import { test, expect } from '@playwright/test'

// ─── Idea text (≥50 chars required by IDEA_MIN_LENGTH) ───────────────────────

const IDEA_TEXT =
  'An AI-powered task management application that helps developers break down complex projects into manageable tasks, track progress, and receive smart next-action suggestions based on what is blocked or overdue.'

// ─── Structured Claude response ───────────────────────────────────────────────
//
// Constructed to satisfy all review-gate conditions in canAdvanceToReview():
//   - "1. Brief analysis" section present   → no "could not parse analysis" warning
//   - "5. Recommended next step" section present → no "could not parse next step" warning
//   - `src/App.test.tsx` in files section   → detectTestFiles() → hasTests = true
//   - T-001 in analysis/plan               → prevTaskId = "T-001"
//   - T-001 in next-step                   → nextTaskId = "T-001" = prevTaskId
//   → inferNextPhase(hasTests=true, prevTaskId=T-001, nextTaskId=T-001) === 'review'
//   → canAdvanceToReview() passes → "Ревью:" button appears

const CLAUDE_RESPONSE = `1. Brief analysis
Implemented T-001 project scaffold. Core application structure created successfully with TypeScript.

2. Implementation plan
- Created main application entry point and routing
- Set up React with proper TypeScript configuration

3. Files created/changed
- \`src/main.tsx\`
- \`src/App.tsx\`
- \`src/App.test.tsx\`

4. Implementation
Application scaffold is complete. All required files are in place with correct module boundaries.

5. Recommended next step
T-001 is complete. All tests pass. The implementation is ready for review.`

// ─── Setup: clean localStorage before each run ────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  // Wait for the app shell to be ready before each test
  await expect(page.getByRole('heading', { name: 'AI Product Studio', level: 1 })).toBeVisible()
})

// ─── Happy path ───────────────────────────────────────────────────────────────

test('E2E-001 — new project → idea → research → spec → architecture → prompt loop → review', async ({ page }) => {

  // ── 1. Home page ──────────────────────────────────────────────────────────────

  await test.step('1. Home — app shell visible, no project selected', async () => {
    await expect(page.getByRole('heading', { name: 'AI Product Studio', level: 1 })).toBeVisible()
    // No project selected yet — TopBar shows "Нет проекта"
    await expect(page.getByText('Нет проекта')).toBeVisible()
  })

  // ── 2. Create new project ─────────────────────────────────────────────────────

  await test.step('2. New project — create E2E Test Project (application type)', async () => {
    // Hero CTA (sidebar nav may also contain a link — target the button)
    await page.getByRole('button', { name: 'Новый проект' }).first().click()
    await expect(page).toHaveURL(/\/project\/new/)
    await expect(page.getByRole('heading', { name: 'Новый проект', level: 1 })).toBeVisible()

    await page.getByPlaceholder(/Менеджер задач/).fill('E2E Test Project')
    // Select project type "Приложение" (rendered as a button in the segmented control)
    await page.getByRole('button', { name: /Приложение/ }).click()
    await page.getByRole('button', { name: 'Создать проект' }).click()
  })

  // ── 3. Idea page ──────────────────────────────────────────────────────────────

  await test.step('3. Idea — fill product idea and advance to research', async () => {
    await expect(page).toHaveURL(/\/idea/)
    await expect(page.getByRole('heading', { name: 'Идея', level: 1 })).toBeVisible()

    // TopBar project switcher shows the new project name
    await expect(page.getByRole('button', { name: /E2E Test Project/ })).toBeVisible()

    // Fill the core idea textarea (located via placeholder)
    await page.getByPlaceholder(/A project management tool/).fill(IDEA_TEXT)

    // Continue to research (button in the actions row at the bottom)
    await page.getByRole('button', { name: /Сохранить и перейти к исследованию/ }).first().click()
  })

  // ── 4. Research page ──────────────────────────────────────────────────────────

  await test.step('4. Research — run mock research, wait for brief', async () => {
    await expect(page).toHaveURL(/\/research/)
    await expect(page.getByRole('heading', { name: 'Исследование', level: 1 })).toBeVisible()

    // Idea gate must be satisfied — "Запустить исследование" must be enabled
    const runResearchBtn = page.getByRole('button', { name: 'Запустить исследование' })
    await expect(runResearchBtn).toBeEnabled()
    await runResearchBtn.click()

    // Wait for mock research (~1 500ms) — badge "Бриф готов" appears when done
    await expect(page.getByText('Бриф готов')).toBeVisible({ timeout: 12_000 })

    // Wait for the CTA to be enabled (React re-renders after async state update)
    // before clicking — prevents a race where the button appears but is mid-render.
    const toSpecBtn = page.getByRole('button', { name: /Перейти к спецификации/ }).first()
    await expect(toSpecBtn).toBeEnabled()
    await toSpecBtn.click()
  })

  // ── 5. Spec page ──────────────────────────────────────────────────────────────

  await test.step('5. Spec — generate spec, wait for completion badge', async () => {
    await expect(page).toHaveURL(/\/spec/)
    await expect(page.getByRole('heading', { name: 'Спецификация', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Сгенерировать спецификацию' }).first().click()
    // Wait for mock spec (~1 200ms) — "Сгенерировано" badge in the PageHeader
    await expect(page.getByText('Сгенерировано').first()).toBeVisible({ timeout: 10_000 })

    const toArchBtn = page.getByRole('button', { name: /Перейти к архитектуре/ }).first()
    await expect(toArchBtn).toBeEnabled()
    await toArchBtn.click()
  })

  // ── 6. Architecture page + persistence checkpoint ─────────────────────────────

  await test.step('6. Architecture — persistence checkpoint + generate arch', async () => {
    await expect(page).toHaveURL(/\/architecture/)
    await expect(page.getByRole('heading', { name: 'Архитектура', level: 1 })).toBeVisible()

    // Persistence checkpoint: verify the registry store is in localStorage
    const registryRaw = await page.evaluate(() =>
      localStorage.getItem('ai-product-studio-registry')
    )
    const registry = JSON.parse(registryRaw ?? 'null')
    expect(registry?.state?.selectedProjectId).toBeTruthy()

    // Reload — project state must survive
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Архитектура', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /E2E Test Project/ })).toBeVisible()

    // Generate architecture after reload
    await page.getByRole('button', { name: 'Сгенерировать архитектуру' }).first().click()
    // Wait for mock arch (~1 000ms) — "Сгенерировано" badge
    await expect(page.getByText('Сгенерировано').first()).toBeVisible({ timeout: 10_000 })

    const toPromptBtn = page.getByRole('button', { name: /Перейти к циклу промптов/ }).first()
    await expect(toPromptBtn).toBeEnabled()
    await toPromptBtn.click()
  })

  // ── 7. Prompt Loop ────────────────────────────────────────────────────────────

  await test.step('7. Prompt Loop — generate first prompt, paste response, parse', async () => {
    await expect(page).toHaveURL(/\/prompt-loop/)
    await expect(page.getByRole('heading', { name: 'Цикл промптов', level: 1 })).toBeVisible()

    // Fill task ID so targetTaskId is set on the iteration — required for canAdvanceToReview
    await page.getByPlaceholder('T-001').fill('T-001')

    // Wait for the generate button to be enabled — it's disabled until both specPack
    // and architectureDraft are in the Zustand store. On slower machines, the persist
    // middleware rehydration (triggered by page.reload() in step 6) may not have
    // completed by the time PromptLoopPage first renders.
    const genFirstBtn = page.getByRole('button', { name: 'Сгенерировать первый промпт' })
    await expect(genFirstBtn).toBeEnabled({ timeout: 15_000 })
    await genFirstBtn.click()
    // Wait for mock prompt (~800ms) — iteration card header
    await expect(page.getByRole('heading', { name: 'Итерация 1', level: 3 })).toBeVisible({ timeout: 8_000 })

    // Paste structured response and parse
    await page.getByPlaceholder('Вставьте полный ответ Claude здесь…').fill(CLAUDE_RESPONSE)
    await page.getByRole('button', { name: 'Распарсить ответ' }).click()

    // Parsing result: test badge confirms hasTests=true
    await expect(page.getByText('✓ Тесты найдены')).toBeVisible()

    // Review gate passes → "Ревью:" button visible (reviewGate.canAdvance === true)
    // Button label: "Ревью: null →" (no targetTaskId was set for the first prompt)
    await expect(page.getByRole('button', { name: /Ревью/ })).toBeVisible()
  })

  // ── 8. Review (History) page ──────────────────────────────────────────────────

  await test.step('8. Review — navigate to history, verify full-cycle summary', async () => {
    // Navigate via the sidebar nav link "📜 История"
    await page.getByRole('link', { name: /История/ }).click()
    await expect(page).toHaveURL(/\/history/)
    await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeVisible()

    // Project card shows the project name
    await expect(page.getByRole('button', { name: /E2E Test Project/ })).toBeVisible()

    // Prompt iteration is reflected in the review
    await expect(page.getByText('Итерация #1')).toBeVisible()
  })
})
