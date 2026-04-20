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
