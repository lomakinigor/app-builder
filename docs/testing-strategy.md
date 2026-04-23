# Testing Strategy

This document defines how testing works in AI Product Studio — both for building the app itself and for the applications and websites users build with it.

---

## Scope

Testing in AI Product Studio serves two purposes:

1. **Internal quality gate:** verify that the app behaves correctly as it is developed.
2. **Workflow model:** the same TDD discipline the app enforces on itself is what it teaches users to apply when building their own applications and websites through the prompt loop.

---

## Testing levels

### Unit
What: individual functions, utilities, and domain logic with no UI or store dependency.
Examples in this project:
- `normalizeResearchText()` — heuristic normalizer correctness (T-012)
- `canAdvanceFromIdea/Research/Spec/Architecture()` — stage gate logic (T-016)
- `validateIdeaDraft()` — idea validation rules

Tool: Vitest (to be wired in T-018)
When to write: for every pure function in `src/shared/lib/` and `src/features/*/` that carries meaningful logic.

### Integration
What: components or page flows that exercise store interactions, mock service calls, and rendered UI together.
Examples in this project:
- Idea page: enter idea → validate → advance gate opens (T-011)
- Import tab: paste text → normalizer runs → brief displayed with warnings (T-011, T-012)
- Spec page: generate spec → edit → save → store updated → gate passes (T-013)

Tool: Vitest + Testing Library
When to write: for every impl task (T-xxx) that changes a page or feature component, before that task is marked done.

### HTTP adapter contracts
What: verify that each HTTP adapter hits the correct URL and HTTP method, serializes the documented compact payload, maps the response to the correct entity type, throws `ApiError` on non-2xx responses, and sends the correct HTTP headers (including bearer auth when configured).

These tests sit between unit and integration: they test the network boundary without a real backend by intercepting `fetch()` with MSW v2 (Mock Service Worker) in Node.

Test file: `src/shared/api/http/adapters.contract.test.ts`

| Group | Domain | What is verified |
|-------|--------|-----------------|
| A | ResearchApi | URL, compact body, response mapping, `ApiError` |
| B | PromptLoopApi | URL, compact body, response mapping, `ApiError` |
| C | SpecApi | URL, compact body, response mapping, `ApiError` |
| D | Error semantics | `ApiError` message extraction; non-JSON fallback |
| E | Header / auth contract | `Content-Type`, `Accept` on all adapters; `Authorization: Bearer` when token set; header absent when no token |
| F | Tracing contract | `X-Request-Id` present and unique by default; custom request id provider overrides id; `X-Session-Id` present when session provider set; `X-Session-Id` absent otherwise |
| G | Error correlation contract | `ApiError.requestId` extracted from body `{ requestId }`; falls back to response `x-request-id` header; `null` when neither present; no crash on non-JSON body |

Key properties verified per test:
- Correct URL path (MSW only matches exact path — wrong URL → unhandled request → test fails)
- Compact request body shape (only the fields in the documented contract, not the full entity)
- Response fields mapped correctly to entity types (`ResearchBrief`, `SpecPack`, `ArchitectureDraft`, `PromptIteration`)
- `ApiError(status, message, requestId)` on non-2xx; `message` from `response.json().message`; fallback to `"HTTP <status>"`
- `ApiError.requestId` from `response.json().requestId` (primary) or `response.headers.get('x-request-id')` (fallback); `null` when absent
- `Content-Type: application/json` and `Accept: application/json` on every request (via shared client)
- `Authorization: Bearer <token>` present when token provider returns non-null; header absent otherwise
- `X-Request-Id` present on every request, unique per call by default, overrideable via `setApiRequestIdProvider`
- `X-Session-Id` present when `setApiSessionIdProvider` returns non-null or `VITE_SESSION_ID` is set; absent otherwise

Tool: Vitest + MSW v2 (`setupServer` from `msw/node`)
When to write: whenever a new HTTP adapter endpoint is added, an existing compact payload changes, or a new standard header is added to the shared client.

**Relationship to other test levels:**

| Level | Mode | What it tests | Backend needed |
|-------|------|--------------|----------------|
| Unit / RTL (`VITE_API_MODE=mock`) | mock | Page UI, stores, stage gates, service logic | no |
| HTTP contract (MSW) | HTTP adapters directly | URL, payload shape, response mapping, error handling, auth headers | no (MSW intercepts) |
| E2E Playwright mock (`VITE_API_MODE=mock`) | mock | Full user journey in a real browser | no |
| Staging smoke (`VITE_API_MODE=real`) | real backend | Critical path with live HTTP adapters and real API | yes |

RTL tests and E2E Playwright mock-mode tests never touch the HTTP adapters and are unaffected by MSW.

### Staging smoke
What: minimal real-backend smoke that proves the frontend ↔ backend integration works end-to-end. Not a regression suite — a small set of tests covering the critical API paths.

Test files:
- `tests/e2e/critical-real-backend.spec.ts` — core flow (SMOKE-001)
- `tests/e2e/collaboration-real-backend.spec.ts` — sharing and comments (SMOKE-002/003/004, T-409)

Config: `playwright.staging.config.ts` (port 5174, no retries, 3-minute test timeout, always captures trace + video)

**Scripts:**

| Script | When to use |
|--------|-------------|
| `npm run test:e2e:staging` | Manual, caller sets all env vars including `VITE_SESSION_ID` |
| `npm run test:e2e:staging:session` | Recommended — auto-generates `VITE_SESSION_ID` via `scripts/staging-smoke.sh` |

**Required env vars:**

| Variable | Required for | Purpose |
|----------|-------------|---------|
| `VITE_API_MODE` | all tests | Set to `real` — activates HTTP adapters instead of mocks |
| `VITE_API_BASE_URL` | all tests | Base URL of the staging backend (no trailing slash) |
| `VITE_API_BEARER_TOKEN` | optional | Bearer auth; omitted from requests when absent |
| `VITE_SESSION_ID` | recommended | Run-level session id — all HTTP requests send `X-Session-Id: <id>` |
| `VITE_FEATURE_SHARING` | SMOKE-002, SMOKE-004 | Set to `true` — enables sharing UI (share button, invite panel). Tests skipped when absent |

See `.env.staging.example` for a ready-to-copy template with all variables.

**Skip strategy:** when `VITE_API_BASE_URL` is not set, every test is skipped with an explicit reason before any network call is attempted. A missing env = skip; an unreachable backend = real failure. SMOKE-002 and SMOKE-004 additionally skip when `VITE_FEATURE_SHARING` ≠ `true`.

**Run-level session correlation (T-311):**

Every smoke run should have a unique `VITE_SESSION_ID` so all backend log entries for the run are queryable by one id:

```sh
# Auto-generate session id (recommended):
VITE_API_MODE=real \
VITE_API_BASE_URL=https://api-staging.example.com \
VITE_API_BEARER_TOKEN=<token> \
VITE_FEATURE_SHARING=true \
npm run test:e2e:staging:session

# Manual override:
VITE_SESSION_ID=smoke-debug-001 \
VITE_API_MODE=real \
VITE_API_BASE_URL=https://api-staging.example.com \
VITE_FEATURE_SHARING=true \
npm run test:e2e:staging
```

Generated format: `smoke-<YYYYMMDDHHmm>-<4-hex>` (e.g. `smoke-202604221030-ab12`).
CI nightly format: `staging-<GITHUB_RUN_ID>-<GITHUB_RUN_ATTEMPT>` (set in `staging-nightly.yml`).

The session id appears in:
- `[staging] Run session id: ...` log line at config time
- `X-Session-Id` request header on every HTTP call in the run
- `X-Session-Id` annotation on every test in the Playwright report
- Artifact name: `staging-smoke-<session-id>` for direct log correlation

**Critical path covered (SMOKE-001) — `critical-real-backend.spec.ts`:**
1. App boots with `VITE_API_MODE=real`
2. Project created + idea filled
3. `POST /api/research/run` — brief badge appears
4. `POST /api/spec/generate` — "Сгенерировано" badge appears
5. `POST /api/architecture/generate` — "Сгенерировано" badge appears
6. `POST /api/prompt-loop/first` — "Итерация 1" card appears

**Collaboration path covered (T-409) — `collaboration-real-backend.spec.ts`:**

State seeding: SMOKE-002/003/004 seed a project into localStorage at test start so
the expensive research/spec LLM flow is not repeated. Only the collaboration/comments
API calls under test are real.

| Smoke | Endpoints tested | Skip condition |
|-------|-----------------|----------------|
| SMOKE-002 | `POST /api/shares` → invite panel visible; `GET /api/shares/:shareId` → redirect to /history; `POST /api/shares/:shareId/invite` → InviteResult | `VITE_FEATURE_SHARING≠true` |
| SMOKE-003 | `GET /api/projects/:projectId/comments` → comments-panel loads; `POST /api/projects/:projectId/comments` → comment appears in list | none |
| SMOKE-004 | `GET /api/invites/:token` → InviteAcceptPage shows project+role; `POST /api/invites/:token/accept` → redirect to /history | `VITE_FEATURE_SHARING≠true`; also skipped when backend does not return `inviteToken` in InviteResult |

**Endpoints not yet covered by staging smoke (backend not implemented):**
- `GET /api/projects/:projectId/collaborators`
- `PATCH /api/collaborators/:id`
- `DELETE /api/collaborators/:id`
- `GET /api/projects/:projectId/sharing-audit`

These endpoints have complete HTTP adapters and MSW contract tests (Groups I, J) but no staging smoke coverage until a real backend implements them.

Assertions are content-agnostic (presence of badges and headings, not exact LLM text) to stay resilient to backend output variation.

**When to run:** on-demand before a real backend rollout, or as a nightly CI step via `.github/workflows/staging-nightly.yml` against a stable staging environment.

### E2E
What: full user journey through the app from Idea to Prompt Loop, running in a real browser.
Examples in this project:
- Happy path: idea → research → spec → architecture → first prompt generated
- Import path: paste research → brief normalized → spec generated → first prompt

Tool: Playwright (planned, not yet configured)
When to write: once the happy path is stable (after T-008 is done). One E2E per major user story set.

### Smoke
What: minimal check that the app starts, routes resolve, and no obvious crashes occur.
Examples in this project:
- `npm run dev` starts without errors
- all 7 routes render without throwing
- demo seed data loads and displays correctly

Tool: manual for now; can be automated with a Playwright health-check script.
When to run: before any PR or deployment.

---

## TDD contract

Every impl task (type=impl) must have at least one paired test task (type=test) defined in `tasks.md` before the impl task begins.

The test task defines:
- which testing level applies (unit / integration / e2e / smoke)
- the acceptance criteria (explicit, checkable statements)
- which impl task it pairs with

### Pairing table (current)

| Impl task | Test task | Level |
|-----------|-----------|-------|
| T-005 (Idea + Research workflow) | T-011 | integration |
| T-006 (Import research) | T-011, T-012 | integration, unit |
| T-007 (Spec + Architecture workflow) | T-013, T-016 | integration, unit |
| T-008 (Prompt Loop MVP) | T-014 | integration |
| T-009 (Local persistence) | T-015 | integration |
| T-010 (Polish, empty states) | T-017 | integration |
| T-001–T-004 (foundation) | T-016 (partial) | unit |

### Test task format (in tasks.md)

```
## T-0xx — Tests: [feature area]
Type: test
Description: what is being verified
Links: F-xxx, US-xxx — pairs with T-xxx
Status: todo
Owner: human | AI
Acceptance criteria:
- [checkable statement]
- [checkable statement]
```

Acceptance criteria must be checkable by a person or a test runner — not vague ("works correctly") but specific ("canAdvanceFromSpec returns false when productSummary is empty").

---

## Test runner setup (T-018)

Completed. Vitest is configured in `vite.config.ts` with `environment: 'node'` as default; individual test files annotate `// @vitest-environment jsdom` when they need browser APIs. Testing Library (`@testing-library/react`, `@testing-library/user-event`) and `jsdom` are installed. `npm test` runs `vitest run`.

See: D-004 in `decisions.md` for the rationale behind deferring this.

---

## CI gate (T-113)

All tests run automatically via GitHub Actions on every push to `main` and every pull request targeting `main`.

Workflow file: `.github/workflows/test.yml`

Steps: checkout → Node 20 LTS → `npm ci` → `npm test`

**To enforce blocking merges**, configure branch protection in GitHub:
> Settings → Branches → Add rule for `main` → ✓ Require status checks to pass before merging → add the `test` check

Once branch protection is enabled, a failing `npm test` will prevent a PR from being merged into main. No other pipeline changes are needed — `npm test` runs identically locally and in CI.

---

## Critical E2E gate (T-020)

E2E-001 (the full happy-path scenario in `tests/e2e/happy-path.spec.ts`) is promoted to a **required merge-blocking status check**.

Workflow file: `.github/workflows/e2e-critical.yml`
Job name (for branch protection): **`e2e-critical`**

Steps: checkout → Node 20 LTS → `npm ci` → `npx playwright install chromium --with-deps` → `npm run test:e2e:critical`

On failure: trace + screenshots uploaded as artifact `e2e-critical-report` (14-day retention).

**To enforce blocking merges**, configure branch protection in GitHub:
> Settings → Branches → Add rule for `main` → ✓ Require status checks to pass before merging → add the **`e2e-critical`** check

### Scope

| Workflow | Scope | Blocking |
|----------|-------|----------|
| `test.yml` (`test` job) | Vitest unit + integration suite | yes (T-113) |
| `e2e-critical.yml` (`e2e-critical` job) | E2E-001 happy-path only | yes (T-020) |
| `e2e.yml` (`e2e` job) | Full Playwright suite (all specs) | no — informational |

The full suite (`e2e.yml`) continues to run on every push/PR but is **not** a merge gate. Only `e2e-critical` is required.

### Local reproduction

```sh
npm run test:e2e:critical
```

This runs the exact same command as the CI gate — `playwright test tests/e2e/happy-path.spec.ts` — using the shared `playwright.config.ts`.

---

## Visual regression baselines (T-018, T-021)

Full-page desktop screenshots are committed alongside each visual spec under `tests/visual/**-snapshots/`. Baselines are captured at 1440×900, `locale: 'ru-RU'`, light mode.

| Baseline file | Test ID | Screen |
|---------------|---------|--------|
| `history-app-desktop.png` | VIS-001 | HistoryPage — application project |
| `history-web-desktop.png` | VIS-002 | HistoryPage — website project |
| `promptloop-summary-desktop.png` | VIS-003 | PromptLoopPage — parsed iteration (T-001, application) |

**To refresh a baseline after an intentional UI change:**

```sh
npm run test:visual:update
```

Review the diff in the Playwright report, confirm the change is intentional, then commit the updated PNG. Visual tests are **non-blocking** in CI (not added to branch protection) — they run with the full E2E suite via `e2e.yml`.

---

## Import normalizer unit tests (T-012)

`src/features/imported-research-input/normalizer.test.ts` — 77 tests across 7 groups. Pure unit tests for `normalizeResearchText()` — no UI, no store. Runs in node environment (no jsdom needed).

| Group | What it verifies |
|-------|-----------------|
| A — Happy path (7 tests) | Full markdown with all 8 sections: correct field extraction, `extractedSectionCount ≥ 4`, zero warnings, `sourceIds=[artifactId]`, `briefSource="imported"` |
| B — Empty/null/whitespace (8 tests) | `""`, whitespace-only, `null`, `undefined` inputs: no throw, valid brief shape with all fields present, `extractedSectionCount=0`, 2 warnings fired (both thresholds) |
| C — Missing/partial sections (4 tests) | Single-section input: absent scalar fields get placeholder strings; absent array fields are `[]`; `targetUsers` invariant holds; warnings emitted |
| D — Malformed input (7 tests) | Headers without body, duplicate headings (last wins), random unstructured text: no throw, valid shape |
| E — ideaDraft fallback (7 tests) | `ideaDraft.problem`/`.targetUser`/`.rawIdea` fill gaps when sections absent; labeled section beats ideaDraft; `null` draft is safe; keyword fallback flag set |
| F — Shape invariants (35 tests) | 7-input matrix × 5 invariants: `targetUsers` non-empty array, `risks`/`opportunities`/`openQuestions` arrays, scalar fields non-empty strings, `sourceIds=[artifactId]`, `warnings` array |
| G — Stability (4 tests) | Deterministic output on repeated calls; ideaDraft not mutated; `extractedSectionCount` is non-negative integer; warning threshold contract (< 2 sections → 2 warnings, ≥ 4 → 0) |

---

## Idea and Research workflow acceptance tests (T-011)

Two acceptance test files covering the early user flow from project entry through Research → Spec transition.

**IdeaPage** — `src/pages/idea/IdeaPage.acceptance.test.tsx` — 24 tests, 5 groups:

| Group | What it verifies |
|-------|-----------------|
| A — Entry guard (5 tests) | No-project → EmptyState "Проект не выбран"; "Создать проект" CTA navigates to /project/new; form and type selector absent |
| B — Empty idea state (4 tests) | Project present + empty idea → textarea rendered; type selector visible; draft button disabled; no premature errors |
| C — Blocking (5 tests) | Submit with empty/short idea → validation errors shown; blocked-state banner visible; no navigation; setIdeaDraft not called |
| D — Happy path (7 tests) | Valid idea pre-seeded → form pre-populated with stored values; type pre-selected; continue saves + navigates to /research; draft-save-only path does not navigate |
| E — Persistence contract (3 tests) | Stored ideaDraft is form init source of truth; no error banner for valid idle state; "Проект активен" badge |

**ResearchPage** — `src/pages/research/ResearchPage.acceptance.test.tsx` — 29 tests, 6 groups:

| Group | What it verifies |
|-------|-----------------|
| A — Entry guard (5 tests) | No-project → EmptyState; "Создать проект" navigates to /project/new; no run button or tabs |
| B — Idea gate (5 tests) | Null/short ideaDraft → GateBanner with reason + link to /idea; run button disabled; no banner when idea valid |
| C — Research empty state (6 tests) | Valid idea + no brief → "Бриф ещё не создан"; tabs visible; run button enabled; "Бриф отсутствует" badge |
| D — Research happy path (5 tests) | Valid brief → editable brief rendered; "Бриф готов" badge; "Перейти к спецификации" button appears and navigates |
| E — Research blocking (3 tests) | Brief with empty problemSummary → advance disabled; gate reason text shown; no navigation |
| F — Cross-stage acceptance (5 tests) | Idea state flows into Research readiness: no ideaDraft blocks run + advance; valid ideaDraft + valid brief unlocks advance; incomplete brief blocks advance despite valid idea |

---

## HistoryPage review phase tests (T-110)

`src/pages/history/HistoryPage.review.test.tsx` — 44 tests across 4 groups.

Distinct from `HistoryPage.history-view.test.tsx` (which covers type/stack/roadmap/cross-type) — this file pins the review-phase contract: cycle stage UI, test/task badges from parsed iterations, decisions panel, and partial-state safety.

| Group | What it verifies |
|-------|-----------------|
| A — Cycle stages (14 tests) | All 6 CycleTimeline stage labels; "Фаза обзора" top banner; "← вы здесь" on Review (unconditional); completion details per data state ("Идея зафиксирована", "Спек-пакет сгенерирован", "Архитектура и роадмап готовы", "Цикл промптов активен"); "Готово" badge on completed stages |
| B — Task and test badges (11 tests) | `hasTests=true` → "✓ Тесты обнаружены"; `hasTests=false` → "⚠ Тестовые файлы не обнаружены"; `parsedSummary=null` → no test badge; `targetTaskId` badge; `implementedTaskIds` badges + "Упомянутые задачи:" label; `nextTaskId` + "Следующая:" label; status badges (Распарсено/Отправлено); warnings text |
| C — Decisions panel + review checklist (10 tests) | "Ключевые решения" heading; D-001/D-002 IDs and D-001 title; linked tasks (T-001) and features (F-008); "Чеклист обзора" heading; docs/PRD.md and docs/tasks.md checklist entries; guidance text |
| D — Partial/empty states (9 tests) | null activeProject; no promptIterations; no specPack; no architectureDraft; null parsedSummary + null targetTaskId crash-safety; all-null stability; roadmapPhaseNumber=null/1 |

---

## Cycle-aware prompt generation and phase badges (T-108)

Two test files covering the full cycle-aware + type-aware contract for the Prompt Loop.

**Service layer** — `src/mocks/services/promptService.cycle-aware.test.ts` — 63 tests, 7 groups:

| Group | What it verifies |
|-------|-----------------|
| A — Website tech context | Next.js, MDX, Vercel, SSG/SEO in first prompt for website type |
| B — Stack format + no cross-contamination | "Name — Role" format; website vocab absent from application prompts and vice versa |
| C — Roadmap vocabulary | Phase title and goals from `arch.roadmapPhases[0]` appear verbatim in first prompt |
| D — Next-prompt type guidance | `typeAwareGuidance()` injected in next prompts for both types |
| E — Cycle-aware structural behavior | TDD rule present in `code_and_tests`; absent in `review`; missing-tests warning when `hasTests=false` |
| F — First vs Next structural differences | `## Stack` and `## MVP scope` only in first prompt; "continuing the implementation" only in next |
| G — Combined: type + stack + phase | All three dimensions co-present in a single prompt |

**UI layer** — `src/pages/prompt-loop/PromptLoopPage.cycle-badges.test.tsx` — 24 tests, 4 groups:

| Group | What it verifies |
|-------|-----------------|
| A — Phase label badges | All 6 CyclePhase values map to correct Russian label in CycleContextBar |
| B — projectType badges | "📱 Приложение" for application, "🌐 Сайт" for website; cross-contamination absent |
| C — Supporting data | `targetTaskId` and `roadmapPhaseNumber` appear in context bar |
| D — Visibility rules | Bar shown with active iteration or architectureDraft; hidden otherwise; phase badge absent when no iteration |

---

## IdeaPage project type selector (T-104)

`src/pages/idea/IdeaPage.projectType.test.tsx` — 20 tests across 4 groups. IdeaPage is the primary UI entry point for `projectType` selection.

| Group | What it verifies |
|-------|-----------------|
| A — Initial render | Both option buttons render; `aria-pressed` reflects `activeProject.projectType` on mount |
| B — Interaction | Click switches `aria-pressed` state; idempotent re-click does not crash; round-trip stable |
| C — Store wiring | Each click calls `setProjectType` with the correct type; two-click sequence calls it twice |
| D — Null activeProject | EmptyState renders, type selector absent, `setProjectType` never called |

`ProjectTypeSelector` buttons carry `aria-pressed` for semantic testability (added in T-104).

---

## ProjectType store behavior (T-102)

`src/app/store/projectStore.projectType.test.ts` — 21 tests across 4 groups.

| Group | What it verifies |
|-------|-----------------|
| A — Happy path | `setProjectType('application'/'website')` updates `activeProject.projectType`; round-trip; idempotent; `updatedAt` bumped; other project fields untouched |
| B — Null-safety | No throw when `activeProject=null`; state stays null; earlier no-op call has no effect on subsequent `setActiveProject` |
| C — Persist round-trip | Both supported types survive `capture → resetStore → setState` (Zustand rehydration simulation); `updatedAt` preserved |
| D — Seed data pin | `mockProject.projectType === 'application'` structural pin |

Complements T-015 (`projectStore.persist.test.ts`) which covers artifact hot/cold slots; T-102 focuses exclusively on the `projectType` field lifecycle.

---

## Type-aware spec and architecture tests (T-106)

`src/mocks/services/specService.type-aware.test.ts` — 90 tests across 6 groups.

| Group | What it verifies |
|-------|-----------------|
| A — Spec differentiation | featureList, constraints, assumptions, acceptanceNotes, productSummary, MVPScope differ meaningfully between `application` and `website` |
| B — Arch differentiation | stack (React vs Next.js), moduleArchitecture, dataFlow, roadmap phases, technicalRisks are distinct per type |
| C — Minimal contract | All required fields non-empty for every supported type; `canAdvanceFromSpec` and `canAdvanceFromArchitecture` pass |
| D — Brief integration | `valueHypothesis`, `recommendedMVP`, and `targetUsers` from the ResearchBrief propagate correctly into the spec |
| E — Fallback | Unknown/unsupported `projectType` cast falls through to application shape without throwing; gate still passes |
| F — Determinism | Identical inputs produce byte-for-byte identical spec and arch outputs across multiple calls |

Uses `vi.useFakeTimers()` to suppress async delays. No UI, store, or page dependencies — pure service layer.

---

## Full-route render smoke (T-025 / SMOKE-RTL-002)

`src/app/router/FullRoute.smoke.test.tsx` — 10 it.each cases, one per main route.

Renders each page component directly (no AppLayout / RouterProvider) with a minimal null-project store state shared across all mocks.  Confirms the page surfaces its expected heading or guard text without crashing.

| Route | Component | Expected text |
|-------|-----------|---------------|
| `/` | `HomePage` | "AI Product Studio" |
| `/idea` | `IdeaPage` | "Идея" |
| `/research` | `ResearchPage` | "Исследование" |
| `/spec` | `SpecPage` | "Спецификация" |
| `/architecture` | `ArchitecturePage` | "Архитектура" |
| `/prompt-loop` | `PromptLoopPage` | "Цикл промптов" |
| `/history` | `HistoryPage` | "Обзор" |
| `/blog` | `BlogPage` | "Проект не выбран" (guard — no PageHeader in this branch) |
| `/settings` | `SettingsPage` | "Настройки" |
| `/project/new` | `ProjectNewPage` | "Новый проект" |

---

## Sound notification test coverage (T-019, T-023, T-024, SOUND-004)

| Test ID | Level | File | Signal path |
|---------|-------|------|------------|
| SOUND-001 | E2E | `tests/e2e/sound-notifications.spec.ts` | Settings preview → `playTestBeep()` → oscillator-start |
| SOUND-002 | E2E | `tests/e2e/sound-notifications.spec.ts` | Sound OFF → preview button absent → no oscillator |
| SOUND-003 | E2E | `tests/e2e/sound-notifications.spec.ts` | Toggle round-trip OFF→ON → preview fires |
| SOUND-004 | E2E | `tests/e2e/sound-awaiting-confirmation.spec.ts` | PromptLoop generate → `awaiting_confirmation` → oscillator-start; textarea input stops signal |
| attentionSignal groups A–G | Unit | `src/shared/lib/attentionSignal.test.ts` | Timing, priority, anti-overlap, disabled mode, browser constraints, `playTestBeep` results |
| SettingsPage groups A–F | RTL | `src/pages/settings/SettingsPage.test.tsx` | Toggle wiring, preview button guard, blocked audio UI (`role="status"`) |

All E2E sound tests are **non-blocking** (run via `e2e.yml`, not added to branch protection).
Playwright requires system Chromium dependencies; tests run in CI (`e2e.yml`) and must be validated in an environment with `libatk-1.0.so.0` present.

---

## How this applies to user projects

When AI Product Studio generates prompts for a user's application or website, the same discipline applies:

1. The first prompt generated for any impl work should include a request for the corresponding test (unit or integration) as part of the same Claude Code task.
2. The response parser checks for test file mentions in the list of changed files.
3. If no test is present in the parsed response, the next prompt should explicitly request it before moving to the next feature.

This is the "Code (+Tests)" step of the Superpowers cycle surfaced at the user level.
The app should never generate a prompt that says "implement X" without also requesting "write at least one test for X."
