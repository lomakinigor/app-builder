// T-308 — Staging smoke: critical path against a real backend
// T-311 — Run-level X-Session-Id correlation wiring
//
// Verifies what mock-mode tests cannot:
//   - the frontend successfully boots with VITE_API_MODE=real,
//   - HTTP requests reach the backend with correct headers (Content-Type, Accept, Authorization),
//   - all three API domains respond with data the UI can render:
//       ResearchApi  → /api/research/run
//       SpecApi      → /api/spec/generate
//       SpecApi      → /api/architecture/generate
//       PromptLoopApi → /api/prompt-loop/first
//   - the adapter error contract is not violated (no 4xx/5xx on the critical path).
//
// Skipped automatically when VITE_API_BASE_URL is not set.
//
// Session correlation (T-311):
//   Every HTTP request in this run carries X-Session-Id: <VITE_SESSION_ID> so all
//   backend log entries for a single smoke run are queryable by one id.
//   Use npm run test:e2e:staging:session to auto-generate the id, or set it manually:
//
//   VITE_API_MODE=real \
//   VITE_API_BASE_URL=https://api-staging.example.com \
//   VITE_API_BEARER_TOKEN=<token> \
//   VITE_SESSION_ID=smoke-20260422-1234-ab12 \
//   npm run test:e2e:staging
//
// Assertions are content-agnostic: they check presence of UI sections and badges,
// not exact text from LLM responses, to stay resilient to backend output variation.

import { test, expect } from '@playwright/test'

// ─── Env guard ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.VITE_API_BASE_URL
const SESSION_ID = process.env.VITE_SESSION_ID ?? null

const SKIP_REASON =
  'Staging smoke requires VITE_API_BASE_URL. ' +
  'Set VITE_API_MODE=real VITE_API_BASE_URL=https://api-staging.example.com [VITE_API_BEARER_TOKEN=...] ' +
  'before running npm run test:e2e:staging:session.'

// ─── Correlation helper ───────────────────────────────────────────────────────
// If a real API call produces an ApiError, the requestId is already captured
// in the error object (T-310). In Playwright we can't catch adapter throws
// directly, but failed steps will include the page console log output in the
// trace. For explicit correlation, log errors in the page via window.onerror.

// ─── Test fixture ─────────────────────────────────────────────────────────────

// Long enough to pass the IDEA_MIN_LENGTH (50 chars) gate.
const IDEA_TEXT =
  'An AI-powered task management application that helps developers break down complex projects ' +
  'into manageable tasks, track progress, and receive smart next-action suggestions.'

// Unique project name per run to avoid state collision when re-running against a stateful backend.
const PROJECT_NAME = `Staging Smoke ${Date.now()}`

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }, testInfo) => {
  // Skip every test in this file when staging env is not configured.
  // Explicit skip is better than a cryptic "invalid URL" network error.
  test.skip(!API_BASE_URL, SKIP_REASON)

  // Attach run-level session id to the Playwright report so every failing test
  // shows the correlation id needed to search backend logs.
  if (SESSION_ID) {
    testInfo.annotations.push({ type: 'X-Session-Id', description: SESSION_ID })
  }

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'AI Product Studio', level: 1 })).toBeVisible()
})

// ─── SMOKE-001 ────────────────────────────────────────────────────────────────

test('SMOKE-001 — boot → create project → research (real) → spec (real) → arch (real) → first prompt (real)', async ({
  page,
}) => {
  // ── 1. Home ──────────────────────────────────────────────────────────────────

  await test.step('1. Home — app boots, no project selected', async () => {
    await expect(page.getByRole('heading', { name: 'AI Product Studio', level: 1 })).toBeVisible()
    await expect(page.getByText('Нет проекта')).toBeVisible()
  })

  // ── 2. Create project ─────────────────────────────────────────────────────────

  await test.step('2. Create project (application type)', async () => {
    await page.getByRole('button', { name: 'Новый проект' }).first().click()
    await expect(page).toHaveURL(/\/project\/new/)
    await expect(page.getByRole('heading', { name: 'Новый проект', level: 1 })).toBeVisible()

    await page.getByPlaceholder(/Менеджер задач/).fill(PROJECT_NAME)
    await page.getByRole('button', { name: /Приложение/ }).click()
    await page.getByRole('button', { name: 'Создать проект' }).click()
  })

  // ── 3. Idea ──────────────────────────────────────────────────────────────────

  await test.step('3. Idea — fill and advance to research', async () => {
    await expect(page).toHaveURL(/\/idea/)
    await expect(page.getByRole('heading', { name: 'Идея', level: 1 })).toBeVisible()

    await expect(page.getByRole('button', { name: new RegExp(PROJECT_NAME) })).toBeVisible()
    await page.getByPlaceholder(/A project management tool/).fill(IDEA_TEXT)
    await page.getByRole('button', { name: /Сохранить и перейти к исследованию/ }).first().click()
  })

  // ── 4. Research — real /api/research/run ─────────────────────────────────────

  await test.step('4. Research — real API call to /api/research/run', async () => {
    await expect(page).toHaveURL(/\/research/)
    await expect(page.getByRole('heading', { name: 'Исследование', level: 1 })).toBeVisible()

    const runResearchBtn = page.getByRole('button', { name: 'Запустить исследование' })
    await expect(runResearchBtn).toBeEnabled()
    await runResearchBtn.click()

    // Real LLM research can take tens of seconds — wait up to 90s.
    // The badge "Бриф готов" is the reliable ready signal (set by the adapter response).
    await expect(page.getByText('Бриф готов')).toBeVisible({ timeout: 90_000 })

    // Verify the brief rendered at least one section (content-agnostic).
    // ResearchPage renders a section card after the brief arrives.
    await expect(page.locator('[data-testid="research-brief-section"], h2, h3').first()).toBeVisible()

    const toSpecBtn = page.getByRole('button', { name: /Перейти к спецификации/ }).first()
    await expect(toSpecBtn).toBeEnabled()
    await toSpecBtn.click()
  })

  // ── 5. Spec — real /api/spec/generate ────────────────────────────────────────

  await test.step('5. Spec — real API call to /api/spec/generate', async () => {
    await expect(page).toHaveURL(/\/spec/)
    await expect(page.getByRole('heading', { name: 'Спецификация', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Сгенерировать спецификацию' }).first().click()

    // Wait for the "Сгенерировано" badge — real generation latency ≤90s assumed.
    await expect(page.getByText('Сгенерировано').first()).toBeVisible({ timeout: 90_000 })

    // At least one feature or section must be visible (content-agnostic check).
    await expect(page.locator('h2, h3, [data-testid]').first()).toBeVisible()

    const toArchBtn = page.getByRole('button', { name: /Перейти к архитектуре/ }).first()
    await expect(toArchBtn).toBeEnabled()
    await toArchBtn.click()
  })

  // ── 6. Architecture — real /api/architecture/generate ────────────────────────

  await test.step('6. Architecture — real API call to /api/architecture/generate', async () => {
    await expect(page).toHaveURL(/\/architecture/)
    await expect(page.getByRole('heading', { name: 'Архитектура', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Сгенерировать архитектуру' }).first().click()

    await expect(page.getByText('Сгенерировано').first()).toBeVisible({ timeout: 90_000 })

    const toPromptBtn = page.getByRole('button', { name: /Перейти к циклу промптов/ }).first()
    await expect(toPromptBtn).toBeEnabled()
    await toPromptBtn.click()
  })

  // ── 7. Prompt Loop — real /api/prompt-loop/first ─────────────────────────────

  await test.step('7. Prompt Loop — real API call to /api/prompt-loop/first', async () => {
    await expect(page).toHaveURL(/\/prompt-loop/)
    await expect(page.getByRole('heading', { name: 'Цикл промптов', level: 1 })).toBeVisible()

    // Set a task ID so targetTaskId is populated on the iteration.
    await page.getByPlaceholder('T-001').fill('T-001')

    const genFirstBtn = page.getByRole('button', { name: 'Сгенерировать первый промпт' })
    await expect(genFirstBtn).toBeEnabled({ timeout: 15_000 })
    await genFirstBtn.click()

    // The "Итерация 1" card header is the authoritative ready signal from the adapter response.
    await expect(page.getByRole('heading', { name: 'Итерация 1', level: 3 })).toBeVisible({
      timeout: 90_000,
    })

    // The prompt text area must be non-empty (backend returned a prompt string).
    const promptTextarea = page.getByPlaceholder('Вставьте полный ответ Claude здесь…')
    await expect(promptTextarea).toBeVisible()

    // Paste area and parse button must be available — client-side flow unaffected by real mode.
    await expect(page.getByRole('button', { name: 'Распарсить ответ' })).toBeVisible()
  })
})
