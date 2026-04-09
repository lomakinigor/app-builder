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
