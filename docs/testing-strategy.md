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

## How this applies to user projects

When AI Product Studio generates prompts for a user's application or website, the same discipline applies:

1. The first prompt generated for any impl work should include a request for the corresponding test (unit or integration) as part of the same Claude Code task.
2. The response parser checks for test file mentions in the list of changed files.
3. If no test is present in the parsed response, the next prompt should explicitly request it before moving to the next feature.

This is the "Code (+Tests)" step of the Superpowers cycle surfaced at the user level.
The app should never generate a prompt that says "implement X" without also requesting "write at least one test for X."
