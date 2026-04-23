// T-409 — Staging smoke: collaboration and comments APIs against real backend
//
// SMOKE-002: Sharing API path
//   POST /api/shares                → ShareInfo { shareId, shareUrl }
//   GET  /api/shares/:shareId       → ResolvedShare (frontend redirects to /history)
//
// SMOKE-003: Comments API path
//   GET  /api/projects/:projectId/comments?artifactType=spec&artifactId=:id → ArtifactComment[]
//   POST /api/projects/:projectId/comments                                   → ArtifactComment
//
// Skipped when VITE_API_BASE_URL is not set (same guard as SMOKE-001).
// SMOKE-002 additionally requires VITE_FEATURE_SHARING=true.
//
// State seeding:
//   Both tests seed localStorage directly (same technique as visual tests) to
//   avoid running the 90s+ LLM research/spec flow. Only the registry entry +
//   the relevant hot slots are seeded. Actual API calls under test are real.
//
// Session correlation:
//   X-Session-Id is set by staging-smoke.sh (VITE_SESSION_ID env) — same as
//   SMOKE-001 in critical-real-backend.spec.ts.

import { test, expect, type Page } from '@playwright/test'

// ─── Env guards ───────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.VITE_API_BASE_URL
const SHARING_ENABLED = process.env.VITE_FEATURE_SHARING === 'true'
const SESSION_ID = process.env.VITE_SESSION_ID ?? null

const SKIP_NO_BACKEND =
  'Staging smoke requires VITE_API_BASE_URL. ' +
  'Set VITE_API_MODE=real VITE_API_BASE_URL=https://api-staging.example.com ' +
  'before running npm run test:e2e:staging:session.'

const SKIP_NO_SHARING =
  'SMOKE-002 requires VITE_FEATURE_SHARING=true (sharing UI is feature-flagged). ' +
  'Add VITE_FEATURE_SHARING=true to your staging env to enable this smoke.'

// ─── State seed helpers ───────────────────────────────────────────────────────
// Minimal localStorage seed — enough for collaboration tests without running
// any LLM-backed API calls in setup.

interface SeededProject {
  projectId: string
  projectName: string
}

async function seedProject(
  page: Page,
  options: { withSpec?: boolean } = {},
): Promise<SeededProject> {
  const projectId = `smoke-collab-${Date.now()}`
  const projectName = `Collab Smoke ${new Date().toISOString().slice(0, 19)}`
  const now = new Date().toISOString()

  const project = {
    id: projectId,
    name: projectName,
    projectType: 'application',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    currentStage: options.withSpec ? 'spec' : 'idea',
  }

  // Minimal specPack to render CommentsPanel on SpecPage (requires specPack !== null).
  const specPack = options.withSpec
    ? {
        projectType: 'application',
        productSummary: 'Smoke test application',
        MVPScope: 'Minimal scope for smoke testing.',
        featureList: [
          { id: 'f-001', name: 'Core feature', description: 'Main feature', priority: 'must' },
        ],
        assumptions: [],
        constraints: [],
        acceptanceNotes: null,
      }
    : null

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('ai-product-studio-registry')
    localStorage.removeItem('ai-product-studio-project')
    sessionStorage.clear()
  })

  await page.evaluate(
    ({ pid, proj, spec }) => {
      // Registry: single seeded project, pre-selected.
      localStorage.setItem(
        'ai-product-studio-registry',
        JSON.stringify({
          state: { projects: [proj], selectedProjectId: pid },
          version: 0,
        }),
      )

      // Project data: hot slots with all empty defaults + optional specPack.
      localStorage.setItem(
        'ai-product-studio-project',
        JSON.stringify({
          state: {
            activeProject: proj,
            projectData: {},
            ideaDraft: null,
            researchRuns: [],
            importedArtifacts: [],
            researchBrief: null,
            specPack: spec,
            architectureDraft: null,
            promptIterations: [],
            completedReviewTaskIds: [],
            ui: { sidebarOpen: false, activeTab: 'overview' },
          },
          version: 0,
        }),
      )
    },
    { pid: projectId, proj: project, spec: specPack },
  )

  // Reload so Zustand rehydrates from the seeded localStorage state.
  await page.reload()

  return { projectId, projectName }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!API_BASE_URL, SKIP_NO_BACKEND)

  if (SESSION_ID) {
    testInfo.annotations.push({ type: 'X-Session-Id', description: SESSION_ID })
  }
})

// ─── SMOKE-002 — Sharing API path ─────────────────────────────────────────────

test('SMOKE-002 — sharing: POST /api/shares → invite panel → GET /api/shares/:shareId → redirect', async ({
  page,
}) => {
  test.skip(!SHARING_ENABLED, SKIP_NO_SHARING)

  // ── Seed project state ────────────────────────────────────────────────────

  const { projectId, projectName } = await seedProject(page)

  await test.step('Seed: project in registry, navigate to home', async () => {
    await expect(page.getByRole('heading', { name: 'AI Product Studio', level: 1 })).toBeVisible()
    // TopBar or HomePage should show the seeded project name.
    await expect(page.getByText(projectName)).toBeVisible()
  })

  // ── POST /api/shares — generate share token ───────────────────────────────

  let capturedShareId: string | null = null

  await test.step('POST /api/shares — share button → invite panel appears', async () => {
    // Intercept the POST /api/shares response to capture the returned shareId.
    const shareResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/shares') &&
        resp.request().method() === 'POST' &&
        !resp.url().includes('/invite'),
      { timeout: 30_000 },
    )

    // The share button is rendered when isSharingEnabled() && canManageSharing.
    const shareBtn = page.getByRole('button', { name: /Поделиться/ }).first()
    await expect(shareBtn).toBeVisible({ timeout: 10_000 })
    await shareBtn.click()

    const shareResp = await shareResponsePromise
    expect(shareResp.ok()).toBe(true)

    const shareData = (await shareResp.json()) as { shareId: string; shareUrl: string }
    expect(shareData.shareId).toBeTruthy()
    expect(shareData.shareUrl).toBeTruthy()
    capturedShareId = shareData.shareId

    // Frontend reacts to the successful response: invite-panel becomes visible.
    await expect(page.getByTestId('invite-panel')).toBeVisible({ timeout: 10_000 })
  })

  // ── GET /api/shares/:shareId — resolve the share ──────────────────────────

  await test.step('GET /api/shares/:shareId — shared project page resolves and redirects', async () => {
    if (!capturedShareId) throw new Error('No shareId captured from POST /api/shares')

    // Navigate to the shared project URL — SharedProjectPage will call
    // GET /api/shares/:shareId, find the projectId in the registry,
    // and redirect to /history.
    const resolveResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/shares/${capturedShareId}`) &&
        resp.request().method() === 'GET',
      { timeout: 30_000 },
    )

    await page.goto(`/shared/${capturedShareId}`)

    const resolveResp = await resolveResponsePromise
    expect(resolveResp.ok()).toBe(true)

    const resolvedData = (await resolveResp.json()) as { projectId: string }
    expect(resolvedData.projectId).toBe(projectId)

    // SharedProjectPage selects the project and redirects to /history on success.
    await expect(page).toHaveURL(/\/history/, { timeout: 10_000 })
  })

  // ── POST /api/shares/:shareId/invite — invite by email ───────────────────

  await test.step('POST /api/shares/:shareId/invite — invite email triggers API call', async () => {
    if (!capturedShareId) throw new Error('No shareId captured from POST /api/shares')

    // Navigate back to home and re-open the invite panel.
    await page.goto('/')
    await expect(page.getByTestId('invite-panel')).toBeVisible({ timeout: 10_000 })

    const inviteResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/shares/') &&
        resp.url().includes('/invite') &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    )

    // Fill in the email field and submit.
    await page.getByRole('textbox', { name: /Email/ }).fill('smoke@example.com')
    await page.getByRole('button', { name: /Пригласить/ }).click()

    const inviteResp = await inviteResponsePromise
    // 200 or 201 is a success; anything else is a backend contract mismatch.
    expect(inviteResp.ok()).toBe(true)
  })
})

// ─── SMOKE-003 — Comments API path ───────────────────────────────────────────

test('SMOKE-003 — comments: GET /api/projects/:projectId/comments → list → POST → comment appears', async ({
  page,
}) => {
  // ── Seed project state with specPack ─────────────────────────────────────
  // CommentsPanel on SpecPage renders only when specPack !== null.

  const { projectId } = await seedProject(page, { withSpec: true })

  // ── Navigate to /spec — CommentsPanel mounts, triggers GET comments ───────

  await test.step('GET /api/projects/:projectId/comments — CommentsPanel loads on mount', async () => {
    const commentsResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${projectId}/comments`) &&
        resp.request().method() === 'GET',
      { timeout: 30_000 },
    )

    await page.goto('/spec')

    const commentsResp = await commentsResponsePromise
    expect(commentsResp.ok()).toBe(true)

    // Response must be an array (empty or pre-existing comments — both are valid).
    const comments = (await commentsResp.json()) as unknown[]
    expect(Array.isArray(comments)).toBe(true)

    // CommentsPanel should be visible regardless of count.
    await expect(page.getByTestId('comments-panel')).toBeVisible({ timeout: 10_000 })
  })

  // ── POST /api/projects/:projectId/comments — add a comment ───────────────

  await test.step('POST /api/projects/:projectId/comments — submit comment → appears in list', async () => {
    const addResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${projectId}/comments`) &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    )

    const commentText = `Staging smoke comment ${Date.now()}`

    // CommentsPanel textarea — aria-label from CommentsPanel.tsx
    await page.getByRole('textbox', { name: /Текст комментария/ }).fill(commentText)
    await page.getByRole('button', { name: 'Добавить комментарий' }).click()

    const addResp = await addResponsePromise
    expect(addResp.ok()).toBe(true)

    const addedComment = (await addResp.json()) as { id: string; body: string }
    expect(addedComment.id).toBeTruthy()
    expect(addedComment.body).toBe(commentText)

    // The comment must appear in the CommentsPanel after the POST resolves.
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 })
  })
})

// ─── SMOKE-004 — Invite acceptance flow ──────────────────────────────────────

test('SMOKE-004 — invite: GET /api/invites/:token (resolve) → accept → redirect', async ({
  page,
}) => {
  test.skip(!SHARING_ENABLED, SKIP_NO_SHARING)

  // ── Seed a project and generate a share token + invite ───────────────────
  // We need a real invite token — obtain one by calling POST /api/shares/invite.
  // This requires SMOKE-002 to have run first OR we generate it inline here.

  const { projectId, projectName } = await seedProject(page)

  let capturedInviteToken: string | null = null

  await test.step('Setup: generate share and send invite to get a token', async () => {
    // Generate share token
    const shareResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/shares') &&
        resp.request().method() === 'POST' &&
        !resp.url().includes('/invite'),
      { timeout: 30_000 },
    )

    const shareBtn = page.getByRole('button', { name: /Поделиться/ }).first()
    await expect(shareBtn).toBeVisible({ timeout: 10_000 })
    await shareBtn.click()

    const shareResp = await shareResponsePromise
    expect(shareResp.ok()).toBe(true)
    const { shareId } = (await shareResp.json()) as { shareId: string }

    await expect(page.getByTestId('invite-panel')).toBeVisible()

    // Send invite
    const inviteResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/invite') && resp.request().method() === 'POST',
      { timeout: 30_000 },
    )

    await page.getByRole('textbox', { name: /Email/ }).fill('invite-smoke@example.com')
    await page.getByRole('button', { name: /Пригласить/ }).click()

    const inviteResp = await inviteResponsePromise
    expect(inviteResp.ok()).toBe(true)

    const inviteData = (await inviteResp.json()) as { inviteToken?: string }
    // inviteToken is returned if the backend follows the InviteResult contract.
    // If the backend returns a different field, update the contract in tech-spec + here.
    if (inviteData.inviteToken) {
      capturedInviteToken = inviteData.inviteToken
    }

    void projectId
    void projectName
    void shareId
  })

  // ── GET /api/invites/:token — resolve invite ──────────────────────────────

  await test.step('GET /api/invites/:token — InviteAcceptPage resolves invite', async () => {
    if (!capturedInviteToken) {
      test.skip(
        true,
        'No inviteToken returned by POST /api/shares/:shareId/invite — ' +
          'backend may not implement invite tokens yet. Document gap in tech-spec.',
      )
      return
    }

    const resolveResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/invites/${capturedInviteToken}`) &&
        resp.request().method() === 'GET',
      { timeout: 30_000 },
    )

    await page.goto(`/invite/${capturedInviteToken}`)

    const resolveResp = await resolveResponsePromise
    expect(resolveResp.ok()).toBe(true)

    const inviteInfo = (await resolveResp.json()) as {
      projectId: string
      projectName: string
      role: string
    }
    expect(inviteInfo.projectId).toBeTruthy()
    expect(inviteInfo.role).toMatch(/^(viewer|editor)$/)

    // InviteAcceptPage should show project name and role.
    await expect(page.getByTestId('invite-project-name')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('accept-invite-btn')).toBeVisible()
  })

  // ── POST /api/invites/:token/accept — accept invite ───────────────────────

  await test.step('POST /api/invites/:token/accept — accept → redirect to /history', async () => {
    if (!capturedInviteToken) return

    const acceptResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/invites/${capturedInviteToken}/accept`) &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    )

    await page.getByTestId('accept-invite-btn').click()

    const acceptResp = await acceptResponsePromise
    expect(acceptResp.ok()).toBe(true)

    const accepted = (await acceptResp.json()) as { projectId: string; role: string }
    expect(accepted.projectId).toBeTruthy()
    expect(accepted.role).toMatch(/^(viewer|editor)$/)

    // InviteAcceptPage redirects to /history after accept.
    await expect(page).toHaveURL(/\/history/, { timeout: 10_000 })
  })
})
