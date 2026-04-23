# Technical Specification

## Rule
Any architecture or technology decision must be described in this document **before** it is propagated to `plan.md`, `tasks.md`, or source code.
If a change contradicts this spec, update this spec first and note the reason.

---

## 1. Architecture and components

### Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI framework | React 19 + TypeScript (strict) | Component model, ecosystem, Claude Code compatibility |
| Build tool | Vite 8 | Fast dev server, native ESM, minimal config |
| Routing | React Router v7 | Nested routes, Outlet pattern, file-based readability |
| State | Zustand v5 + persist middleware | Minimal boilerplate, selector-based re-renders, localStorage persistence |
| Styling | Tailwind CSS v4 | Utility-first, dark mode via class strategy, no runtime CSS |
| Validation | Zod (planned) | Schema-first validation aligned with typed domain models |
| Component primitives | Custom shared/ui | No external component library dependency for MVP |

### Module structure
```
src/
  app/          — router, store, providers, layout
  entities/     — typed domain models (no UI, no logic)
  features/     — feature-level components and logic (one folder per feature)
  pages/        — route-level page components (thin orchestrators)
  shared/       — ui primitives, lib utilities, constants, types barrel
  mocks/        — mock services and seed data
```

### Layering rules
- `pages/` may import from `features/`, `shared/`, `app/store`
- `features/` may import from `entities/`, `shared/`, `app/store`
- `entities/` has no imports from other src layers
- `mocks/` may import from `entities/` and `shared/` only
- No circular imports between layers

---

## 2. Core flows

These flows apply when building any application or website through AI Product Studio.

### Project creation
1. User lands on Home and enters or loads a project.
2. `IdeaDraft` is saved to the Zustand store.
3. Stage gate `canAdvanceFromIdea` evaluates before allowing navigation to Research.

### Research flow
4. User selects a provider and mode, or switches to the Import tab.
5. For generated research: `mockResearchService.runResearch()` returns a `ResearchRun` with a `ResearchBrief`.
6. For imported research: `mockResearchService.normalizeImportedArtifact()` runs the deterministic normalizer and returns `{ brief, warnings }`.
7. `ResearchBrief` is stored in the project store regardless of source.
8. Stage gate `canAdvanceFromResearch` evaluates before allowing navigation to Spec.

### Spec and architecture flow
9. `mockSpecService.generateSpec(researchBrief)` returns a `SpecPack`.
10. User edits the SpecPack via `EditableSpecPack`; changes are saved via `updateSpecPack`.
11. Stage gate `canAdvanceFromSpec` evaluates before allowing navigation to Architecture.
12. `mockSpecService.generateArchitecture(specPack)` returns an `ArchitectureDraft`.
13. User edits via `EditableArchitectureDraft`; changes saved via `updateArchitectureDraft`.
14. Stage gate `canAdvanceFromArchitecture` evaluates before allowing navigation to Prompt Loop.

### Prompt loop flow
15. `mockPromptService.generateFirstPrompt()` builds the first Claude Code prompt from spec + architecture context.
16. User runs the prompt in Claude Code and pastes the response.
17. `mockPromptService.parseClaudeResponse()` extracts analysis / plan / files / nextStep / warnings.
18. `mockPromptService.generateNextPrompt()` uses parsed output to build the next prompt.
19. Each iteration is stored as a `PromptIteration` in the project store.
20. Loop repeats until the application or website is complete.

### Future: backend migration path
- All mock services implement an interface/adapter pattern.
- Replacing a mock with a real backend adapter requires changing only the service file — no page or feature components need rewriting.
- The orchestration logic in steps 5–19 can move to a server without touching the UI.

### Adapter layer (T-302 — implemented)

Pages and features call factory functions instead of importing mock services directly.

**Factory module:** `src/shared/api/index.ts`

| Factory | Interface | Mock adapter | HTTP adapter |
|---------|-----------|-------------|-----------|
| `getSpecApi()` | `SpecApi` | `src/shared/api/mock/specApi.mock.ts` | `src/shared/api/http/specApi.http.ts` (**HTTP-ready — T-305**) |
| `getPromptLoopApi()` | `PromptLoopApi` | `src/shared/api/mock/promptLoopApi.mock.ts` | `src/shared/api/http/promptLoopApi.http.ts` (**HTTP-ready — T-304**) |
| `getResearchApi()` | `ResearchApi` | `src/shared/api/mock/researchApi.mock.ts` | `src/shared/api/http/researchApi.http.ts` (**HTTP-ready — T-303**) |
| `getSharingApi()` | `SharingApi` | `src/shared/api/mock/sharingApi.mock.ts` | `src/shared/api/http/sharingApi.http.ts` (**HTTP-ready — T-401**) |
| `getCommentsApi()` | `CommentsApi` | `src/shared/api/mock/commentsApi.mock.ts` | `src/shared/api/http/commentsApi.http.ts` (**HTTP-ready — T-407**) |

**Env switching:**

| `VITE_API_MODE` | `VITE_API_BASE_URL` | Result |
|-----------------|---------------------|--------|
| `mock` (default / unset) | — | mock adapters (no network) |
| `real` | `https://api.example.com` | HTTP adapters (backend required) |

All three HTTP adapters are production-ready fetch implementations: `ResearchApi` (T-303), `PromptLoopApi` (T-304), `SpecApi` (T-305). Phase 1 adapter migration is complete. `parseClaudeResponse` is pure client-side logic and always runs in the mock adapter regardless of mode.

**Shared HTTP client (T-307, T-309, T-310):** `src/shared/api/http/client.ts` centralises all adapter infrastructure. Every HTTP request goes through this client and sends:

| Header | Value | When |
|--------|-------|------|
| `Content-Type` | `application/json` | always |
| `Accept` | `application/json` | always |
| `X-Request-Id` | UUID per call | always — generated by `crypto.randomUUID()` or timestamp fallback |
| `Authorization` | `Bearer <token>` | when `VITE_API_BEARER_TOKEN` is set (or token provider returns non-null) |
| `X-Session-Id` | opaque string | when `VITE_SESSION_ID` is set (or session id provider returns non-null) |

**Auth token source:** `getApiAuthToken()` reads `VITE_API_BEARER_TOKEN` at call time by default. Can be overridden via `setApiTokenProvider(fn)` for runtime auth integration without changing adapters.

**Request tracing (T-309):** every request gets a unique `X-Request-Id` for correlation with backend logs and APM. The id is generated at call time via `crypto.randomUUID()` (fallback: `timestamp-random`). Override with `setApiRequestIdProvider(fn)` / `resetApiRequestIdProvider()` for stable ids in tests.

**Run-level session correlation (T-311):** `X-Session-Id` ties all HTTP requests from a single staging smoke run together so backend logs for the whole run are queryable by one id.

| Scope | Header | Lifecycle |
|-------|--------|-----------|
| Per HTTP call | `X-Request-Id` | new UUID generated each time `postJson` is called |
| Per smoke run | `X-Session-Id` | constant for the life of one `npm run test:e2e:staging:session` invocation |

Recommended format for `VITE_SESSION_ID`:
- Local/manual: `smoke-<YYYYMMDDHHmm>-<4-hex>` — auto-generated by `scripts/staging-smoke.sh`
- CI/nightly: `staging-<GITHUB_RUN_ID>-<GITHUB_RUN_ATTEMPT>` — set in `staging-nightly.yml`

Set `setApiSessionIdProvider(fn)` / `resetApiSessionIdProvider()` to source it from a runtime auth store or test fixture instead of env.

**Backend guidance:** log `X-Request-Id` on every request; echo it in error responses as `{ message, requestId }` to close the correlation loop. For APM span correlation, also accept `X-Session-Id` as the trace root. The frontend's `ApiError` stores `requestId` — it is available in thrown errors for logging or debug UIs without any extra instrumentation.

**Error correlation contract (T-310):** on non-2xx responses the shared client attempts to extract:
1. `message` from `response.json().message` — falls back to `"HTTP <status>"` if absent or non-JSON.
2. `requestId` from `response.json().requestId` (primary) — falls back to `response.headers.get('x-request-id')` if body has none.

`ApiError` shape: `{ status: number, message: string, requestId: string | null }`. The field is always present; it is `null` when the backend returns neither body nor header correlation id.

**Env vars:**

| Variable | Purpose |
|----------|---------|
| `VITE_API_MODE` | `mock` (default) or `real` |
| `VITE_API_BASE_URL` | Base URL for HTTP adapters (required when `real`) |
| `VITE_API_BEARER_TOKEN` | Optional bearer token; omitted from requests when not set |
| `VITE_SESSION_ID` | Optional session/run id sent as `X-Session-Id`; useful for CI smoke tagging |

To add a new real endpoint: implement the HTTP adapter method (use `postJson` from `client.ts`), test with `VITE_API_MODE=real VITE_API_BASE_URL=...`, then flip the default in the factory.

### ResearchApi HTTP contract (T-303)

`researchApi.http.ts` implements two endpoints. Activated when `VITE_API_MODE=real`.

| Method | Endpoint | Request body | Response |
|--------|----------|-------------|----------|
| `runResearch` | `POST /api/research/run` | `{ projectId, mode, inputSummary }` | `ResearchBrief` (JSON) |
| `normalizeImportedArtifact` | `POST /api/research/normalize` | `{ artifact: ImportedResearchArtifact, ideaDraft?: IdeaDraft \| null }` | `{ brief: ResearchBrief, warnings: string[] }` |

**Error handling:** non-2xx responses throw `ApiError(status, message)`. The `message` field is extracted from `response.json().message` if present, otherwise `"HTTP <status>"`. UI error handling is the caller's responsibility (ResearchPage shows existing warning banners).

**Simplifications for MVP:** no AbortController (no timeout / cancellation); no retry logic; no request deduplication. Add when backend integration begins.

### PromptLoopApi HTTP contract (T-304)

`promptLoopApi.http.ts` implements two endpoints. Activated when `VITE_API_MODE=real`. `parseClaudeResponse` always uses the mock adapter (client-side only; HTTP adapter throws).

**POST /api/prompt-loop/first → PromptIteration**

Request body:
```json
{
  "projectId": "string",
  "projectType": "application" | "website",
  "taskId": "T-xxx" | null,
  "taskDescription": "string" | null,
  "spec": {
    "productSummary": "string",
    "MVPScope": "string",
    "featureList": [...],
    "constraints": [...]
  },
  "arch": {
    "roadmapPhases": [...],
    "recommendedStack": [...]
  }
}
```

**POST /api/prompt-loop/next → PromptIteration**

Request body:
```json
{
  "projectId": "string",
  "projectType": "application" | "website",
  "nextIterationNumber": 2,
  "targetPhase": "code_and_tests" | "review",
  "prevIteration": {
    "id": "string",
    "iterationNumber": 1,
    "targetTaskId": "T-xxx" | null,
    "roadmapPhaseNumber": 0 | null
  },
  "parsedSummary": {
    "implementationSummary": "string",
    "changedFiles": ["string"],
    "nextStep": "string",
    "hasTests": true,
    "nextTaskId": "T-xxx" | null,
    "implementedTaskIds": ["T-xxx"]
  }
}
```

Both endpoints return a full `PromptIteration` JSON object. Error handling follows the same `ApiError(status, message)` pattern as ResearchApi. Simplifications for MVP: no AbortController, no retry, no bulk loading.

### SpecApi HTTP contract (T-305)

`specApi.http.ts` implements two endpoints. Activated when `VITE_API_MODE=real`. Completes Phase 1 adapter migration.

**POST /api/spec/generate → SpecPack**

Request body:
```json
{
  "projectType": "application" | "website",
  "brief": {
    "problemSummary": "string",
    "targetUsers": ["string"],
    "valueHypothesis": "string",
    "competitorNotes": "string",
    "risks": ["string"],
    "opportunities": ["string"],
    "recommendedMVP": "string",
    "openQuestions": ["string"]
  }
}
```

**POST /api/architecture/generate → ArchitectureDraft**

Request body:
```json
{
  "projectType": "application" | "website",
  "spec": {
    "productSummary": "string",
    "MVPScope": "string",
    "featureList": [...],
    "constraints": ["string"],
    "assumptions": ["string"]
  }
}
```

Both endpoints return a full typed JSON object (`SpecPack` / `ArchitectureDraft`). Error handling follows the same `ApiError(status, message)` pattern. Simplifications for MVP: no AbortController, no retry, no response schema versioning.

---

## 3. Constraints and trade-offs

| Constraint | Decision | Trade-off |
|-----------|----------|-----------|
| No backend in MVP | All state in Zustand + localStorage | State is per-browser; no cross-device sync |
| No real provider APIs | Mock services return deterministic data | Demo flow works anywhere; no live research |
| No authentication | Project is single-user, single-browser | Multi-user requires architecture change |
| Provider-agnostic research | All research normalizes to `ResearchBrief` | Upstream fidelity lost; brief may lose detail |
| Heuristic normalizer (no AI) | Deterministic text extraction via aliases + keyword scoring | Works on well-structured text; degrades on very freeform content |
| No test runner configured yet | Test tasks defined in tasks.md; not yet wired to Vitest | Must be wired before T-011 through T-017 can be marked done |

### ViewingMode (T-401 / T-405)

Sharing introduces a three-role session concept on the frontend (non-persisted, resets on page reload).

| Concept | Location | Behaviour |
|---------|----------|-----------|
| `ViewingMode` | `src/app/store/viewingModeStore.ts` | `'owner'` (default) \| `'editor'` \| `'viewer'` |
| `useIsViewer()` | same file | `true` only for `'viewer'` sessions (backward compat) |
| `useCanEditProject()` | same file | `true` for `'owner'` and `'editor'` — workflow write actions |
| `useCanManageSharing()` | same file | `true` only for `'owner'` — sharing controls, audit panel, project completion |
| Share link | `/shared/:shareId` | Resolves to `{ projectId, canEdit: boolean }` via `getSharingApi()` |
| `ReadOnlyBanner` | `src/shared/ui/ReadOnlyBanner.tsx` | Amber banner for viewer; blue banner for editor; hidden for owner |

**Role permission matrix (T-405):**

| Action | owner | editor | viewer |
|--------|-------|--------|--------|
| Research / Spec / Architecture / PromptLoop generate & save | ✅ | ✅ | ❌ |
| History: mark review tasks complete | ✅ | ✅ | ❌ |
| History: "Завершить проект" | ✅ | ❌ | ❌ |
| Share button / invite panel / audit panel | ✅ | ❌ | ❌ |

**Write action gating rule:** all workflow pages check `useCanEditProject()` — both owner and editor see write actions. `useCanManageSharing()` gates sharing management and project-level governance.

**Mock token convention:** `share-<projectId>` → viewer (`canEdit: false`); `share-edit-<projectId>` → editor (`canEdit: true`). The `makeEditShareId(projectId)` helper is exported from `sharingApi.mock.ts` for test use.

**SharingApi HTTP contract (T-401 / T-403 / T-404 / T-406):**

| Method | Endpoint | HTTP | Request body | Response |
|--------|----------|------|-------------|----------|
| `generateShareToken` | `/api/shares` | POST | `{ projectId }` | `{ shareId, shareUrl }` |
| `resolveShare` | `/api/shares/:shareId` | GET | — | `{ projectId, canEdit: boolean }` |
| `inviteByEmail` | `/api/shares/:shareId/invite` | POST | `{ email, role: 'viewer'\|'editor' }` | `{ invitedEmail, status: 'sent'\|'pending' }` |
| `getAuditTrail` | `/api/projects/:projectId/sharing-audit` | GET | — | `SharingAuditEvent[]` |
| `listCollaborators` | `/api/projects/:projectId/collaborators` | GET | — | `ProjectCollaborator[]` |
| `updateCollaboratorRole` | `/api/collaborators/:collaboratorId` | PATCH | `{ role: 'viewer'\|'editor' }` | `ProjectCollaborator` |
| `revokeCollaborator` | `/api/collaborators/:collaboratorId` | DELETE | — | `{ success: true }` |

**Error codes (standard `ApiError` with `requestId` correlation):**

| Status | Trigger |
|--------|---------|
| 404 | Share token not found; collaborator not found |
| 403 | Caller has no access to this share / audit trail / collaborator list |
| 400 | Invalid email address (inviteByEmail) |
| 409 | Email already invited (inviteByEmail) |

**Mock adapter:** `share-<projectId>` token format (deterministic, reversible). `inviteByEmail` validates `@` + `.` in email and returns `status: 'sent'`. `getAuditTrail` returns 3 deterministic events (link created, invite sent, link opened). Collaborator list is seeded with 2 entries (alice@example.com viewer/active, bob@example.com editor/invited) and is mutable within a session. Activated for real backend via `VITE_API_MODE=real`.

**Authentication:** all endpoints send `Authorization: Bearer <token>` when `VITE_API_BEARER_TOKEN` is set. The backend uses both auth token and `shareId` to determine access — a bearer token is required to `generateShareToken` and `inviteByEmail`; `resolveShare` may be public or auth-gated depending on backend policy. `getAuditTrail`, `listCollaborators`, `updateCollaboratorRole`, `revokeCollaborator` are owner-only and always require auth.

**HTTP client helpers (T-403 / T-406):** `src/shared/api/http/client.ts` exports `getJson<T>(path)`, `postJson<T>(path, body)`, `patchJson<T>(path, body)`, and `deleteJson<T>(path)`. All share the same `ApiError` semantics: non-2xx → extract message + requestId from body, fall back to `x-request-id` header.

**SharingAuditEvent schema (T-404):**

```ts
interface SharingAuditEvent {
  id: string
  projectId: string
  type: 'share_link_created' | 'share_link_opened' | 'share_invite_sent'
  timestamp: string          // ISO-8601
  actorLabel?: string | null // 'owner', 'anonymous viewer', or email
  targetEmail?: string | null
  shareId?: string | null
}
```

**Audit trail UI (T-404):** Owner-facing panel in `HomePage` inside the selected-project card. Loads `getAuditTrail(projectId)` via `useEffect` when `isSharingEnabled()` and a project is selected. Renders human-readable rows in Russian (e.g. "Ссылка создана — 22.04.2026, 10:15"). Shows empty state, loading state, and inline error message. Hidden when sharing flag is OFF.

**ProjectCollaborator schema (T-406):**

```ts
interface ProjectCollaborator {
  id: string
  email: string
  role: 'viewer' | 'editor'
  status: 'invited' | 'active'
  shareId?: string | null
  invitedAt?: string
}
```

**Collaborator management UI (T-406):** Owner-facing panel in `HomePage` (data-testid="collaborator-panel"), gated by `isSharingEnabled() && canManageSharing`. Loads `listCollaborators(projectId)` on mount and after invite. Each row shows email, role select (viewer / editor), status, and "Отозвать" button. Role change calls `updateCollaboratorRole` with optimistic UI update. Revoke calls `revokeCollaborator` and removes the row. Invite panel updated: role select (Просмотр / Редактор) added alongside email input; selected role is sent to `inviteByEmail`. Editor and viewer never see the collaborator panel.

### Comments on artifacts (T-407)

**Comment model:**
```ts
type ArtifactType = 'spec' | 'architecture' | 'prompt_iteration'
interface ArtifactComment {
  id: string; projectId: string; artifactType: ArtifactType; artifactId: string
  body: string; authorLabel: string; createdAt: string
}
```

**CommentsApi HTTP contract:**
| Method | Endpoint | HTTP | Body | Response |
|--------|----------|------|------|----------|
| `listComments` | `/api/projects/:projectId/comments?artifactType=...&artifactId=...` | GET | — | `ArtifactComment[]` |
| `addComment` | `/api/projects/:projectId/comments` | POST | `{ artifactType, artifactId, body }` | `ArtifactComment` |

**Artifact targeting:**
- Spec: `artifactType='spec'`, `artifactId=projectId` (one spec per project)
- Architecture: `artifactType='architecture'`, `artifactId=projectId`
- Prompt iteration: `artifactType='prompt_iteration'`, `artifactId=iteration.id`

**CommentsPanel (`src/shared/ui/CommentsPanel.tsx`, data-testid="comments-panel"):** Reusable. Shown in SpecPage (when specPack present), ArchitecturePage (when architectureDraft present), PromptLoopPage (when activeIteration present). NOT gated by `isSharingEnabled()` — comments are collaboration, not sharing management. All roles see the list. `canPost=true` (owner/editor) → shows textarea + submit. `canPost=false` (viewer) → shows "Только для чтения". Max 1000 chars. Empty body disables submit. On success, new comment appended optimistically. Cancellation token prevents state update after unmount.

### Invite acceptance flow (T-408)

**Invite types:**
```ts
interface InviteInfo {
  projectId: string
  projectName: string
  role: 'viewer' | 'editor'
  email: string
}
interface AcceptedInvite {
  projectId: string
  role: 'viewer' | 'editor'
}
```

**InviteApi HTTP contract:**
| Method | Endpoint | HTTP | Body | Response |
|--------|----------|------|------|----------|
| `resolveInvite` | `/api/invites/:inviteToken` | GET | — | `InviteInfo` |
| `acceptInvite` | `/api/invites/:inviteToken/accept` | POST | `{}` | `AcceptedInvite` |

**Mock token convention:** `inviteToken = invite-<collaboratorId>` (e.g. `invite-collab-2`). Deterministic — owner invites produce a collaborator whose accept URL is `/invite/invite-<id>`.

**Status transition:** `resolveInvite` reads collaborator at-rest (status=`invited`). `acceptInvite` mutates status to `active` and returns `AcceptedInvite`.

**InviteAcceptPage (`src/pages/invite-accept/InviteAcceptPage.tsx`, route `/invite/:inviteToken`):**
1. On mount: calls `resolveInvite(token)` → shows project name, role (редактор / просмотр), email.
2. CTA "Принять приглашение" → `acceptInvite(token)` → `selectProject(projectId)` → `setViewingMode(role === 'editor' ? 'editor' : 'viewer')` → `navigate('/history', { replace: true })`.
3. Invalid/expired token or failed accept → error state with `data-testid="invite-error"`.
4. No auth/signup flow — operates on existing in-session project registry.

### Feature flags (T-402)

Feature flags are managed in `src/shared/config/features.ts` as plain typed boolean functions reading Vite env vars.

| Flag | Env var | Default | Controls |
|------|---------|---------|---------|
| `isSharingEnabled()` | `VITE_FEATURE_SHARING` | `false` | Share button on HomePage; `/shared/:shareId` page behaviour; ReadOnlyBanner |

**Behaviour when flag is OFF:**
- HomePage hides "🔗 Поделиться" button — no share UI exposed.
- `/shared/:shareId` route remains registered but `SharedProjectPage` renders an "unavailable" screen; `resolveShare` is never called; `viewingMode` is never set to `viewer`.
- `ReadOnlyBanner` does not render even if `viewingMode` is somehow `viewer`.

**Behaviour when flag is ON:**
- Full T-401 sharing flow active: share button, `/shared/:shareId` resolution, viewer gating, ReadOnlyBanner.

**Recommended rollout defaults:**

| Environment | Value |
|-------------|-------|
| Local dev | `VITE_FEATURE_SHARING=true` in `.env.local` (opt-in) |
| Staging / internal | `VITE_FEATURE_SHARING=true` (set in CI/deploy config) |
| Production | `VITE_FEATURE_SHARING=false` until backend `/api/shares` endpoints are live |

---

## 4. Risks and open questions

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Normalizer quality degrades on freeform research input | Medium | Warn user; allow full manual edit of brief — see D-003 |
| Zustand localStorage schema drift on model changes | Medium | Version the store key; write migration helper — follow data-model.md schema-change rule |
| Prompt loop quality depends on Claude response format | High | Parser is lenient; fallback to raw text; user can edit parsed result |
| Mock services diverge from future real service contracts | Medium | Define TypeScript interfaces now; mocks implement the same interface — see D-001 |
| No test runner means acceptance criteria are manual | High | T-018 (ops) must be completed before T-011–T-017 — see D-004 and testing-strategy.md |
| Stage gates block demo user on first load | Low | Seed data includes a complete demo project that passes all gates |

### Open questions
- Should `SpecPack.featureList` be a separate top-level entity with its own ID namespace, or stay embedded?
- Should `ArchitectureDraft.roadmapPhases` link to specific `SpecFeature` IDs?
- What is the minimum Claude response format contract that the parser should enforce?
- Should the Brainstorm stage be a dedicated screen before Idea, or stay merged with the Idea page?

---

## 5. User project artifacts and the cycle

When a user builds their own application or website through AI Product Studio, the in-app data model mirrors the Brainstorm → Spec → Plan → Tasks → Code+Tests → Review cycle directly.

| Cycle stage | What the user does in AI Product Studio | Artifact produced |
|---|---|---|
| Brainstorm | Enters raw idea, target user, problem, constraints | `IdeaDraft` |
| Spec | Runs or imports research; brief is normalized | `ResearchBrief` |
| Spec (continued) | Generates and edits the spec pack | `SpecPack` (product summary, MVP scope, feature list) |
| Plan | Generates and edits the architecture draft | `ArchitectureDraft` (stack, module structure, `RoadmapPhase[]`) |
| Tasks | Each `RoadmapPhase` becomes a scoped prompt | First `PromptIteration` generated |
| Code+Tests | User runs the prompt in Claude Code; pastes response | `PromptIteration.claudeResponseRaw` populated |
| Review | App parses response; next prompt generated | `ParsedClaudeResponse`; next `PromptIteration` queued |

The `ProjectStage` enum tracks which cycle stage the active project is currently at.
The stage gate functions (`canAdvanceFromIdea`, `canAdvanceFromResearch`, `canAdvanceFromSpec`, `canAdvanceFromArchitecture`) enforce that no stage is skipped.

Every project has a `projectType` (`application` | `website`) that is used to tailor generated spec language and architecture suggestions. The cycle is the same for both; the content differs.

A user who completes the guided flow will have produced a per-project documentation set equivalent to:
- `PRD.md` and user stories — captured in the Research Brief and SpecPack,
- `features.md` — the feature list with priorities and status,
- `tech-spec.md` and `plan.md` — captured in the ArchitectureDraft and roadmap phases,
- `data-model.md` — the typed entity definitions implied by the SpecPack,
- `tasks.md` — the roadmap phases, each scoped to one prompt iteration,
- `decisions.md` — any trade-offs recorded during architecture and review.

These artifacts are the natural output of moving through the app; they are not separate documents the user has to write in advance.

**AI Product Studio itself is built using this same cycle and this same doc set.** The `docs/` folder in this repository is the proof: every feature, task, and architecture decision that governs this codebase went through Brainstorm → Spec → Plan → Tasks → Code+Tests → Review before a line of code was written. The platform uses the same pattern it teaches.
