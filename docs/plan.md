# Plan

## Rule
**No code is written until the current plan is agreed and documented here.**
Any change to scope, phasing, or task ordering must be reflected in this document before implementation begins.

---

## References
| Document | Role in this plan |
|----------|------------------|
| [docs/PRD.md](PRD.md) | Goals, success criteria, non-goals, MVP scope |
| [docs/features.md](features.md) | Feature definitions (F-xxx) that drive all tasks |
| [docs/tech-spec.md](tech-spec.md) | Architecture decisions and constraints |
| [docs/data-model.md](data-model.md) | Entity definitions that tasks must not contradict |
| [docs/tasks.md](tasks.md) | Canonical task list (T-xxx) with type, status, owner |
| [docs/user-stories.md](user-stories.md) | Acceptance direction for Review stage |
| [docs/superpowers-workflow.md](superpowers-workflow.md) | Step-by-step guide for each cycle stage |
| [docs/decisions.md](decisions.md) | Log of architecture and scope decisions (D-xxx) |
| [docs/testing-strategy.md](testing-strategy.md) | TDD contract, test levels, T-xxx pairing rules |

---

## High-level plan

The full build follows the Superpowers cycle at the product level:

| Step | Cycle stage | What happens |
|------|-------------|-------------|
| 1 | Brainstorm | Raw idea captured; user stories written; PRD drafted |
| 2 | Spec | Features defined (F-xxx); PRD finalized; data model established |
| 3 | Plan | Phases and tasks defined (T-xxx); architecture confirmed in tech-spec |
| 4 | Tasks | Each task assigned type, links, status, owner; test tasks paired with impl tasks |
| 5 | Code + Tests | Implementation tasks executed in phase order; test tasks run after each impl task |
| 6 | Review | Output checked against user story acceptance criteria and task DoD |

---

## Implementation plan

Tasks execute in phase order. An impl task may not begin until its paired test task (T-xxx, type=test) is defined.

| Task | Type | Description | Docs touched | Tests expected | Status |
|------|------|-------------|-------------|---------------|--------|
| T-001 | impl | Initialize foundation: shell, routing, layout, theme, store | tech-spec, data-model | T-011 (partial) | done |
| T-002 | impl | Create core screens: 7 route-level pages | features, PRD | T-011 (partial) | done |
| T-003 | impl | Add domain models: typed entities for all data-model entities | data-model, tech-spec | T-016 (partial) | done |
| T-004 | impl | Add mock services: research, spec, architecture, prompt, parser | tech-spec, features | T-011, T-012 (partial) | done |
| T-005 | impl | Build Idea + Research workflow: validation, stage gates, editable brief | F-001, F-002, F-004, US-001–006 | T-011, T-016 | done |
| T-006 | impl | Build imported research workflow: normalizer, artifact store, brief | F-003, F-004, US-004, US-005 | T-011, T-012 | done |
| T-007 | impl | Build Spec + Architecture workflow: editable output, stage gates, store | F-005, F-006, US-007–010 | T-013, T-016 | in-progress |
| T-008 | impl | Build Prompt Loop MVP: first prompt, paste area, parser, next prompt | F-007, US-011–013 | T-014 | todo |
| T-009 | impl | Add local persistence: Zustand persist, restore on reload | F-008, US-013 | T-015 | done |
| T-010 | impl | Polish errors and empty states: validation feedback, parser warnings | F-012, F-023 | T-017 | todo |
| T-011 | test | Tests: Idea and Research workflow acceptance | T-005, T-006 | — | todo |
| T-012 | test | Tests: Import normalizer edge cases | T-006 | — | todo |
| T-013 | test | Tests: Spec and Architecture workflow acceptance | T-007 | — | todo |
| T-014 | test | Tests: Prompt loop engine acceptance | T-008 | — | todo |
| T-015 | test | Tests: Local persistence correctness | T-009 | — | todo |
| T-016 | test | Tests: Stage gate unit tests | T-005, T-007 | — | todo |
| T-017 | test | Tests: Empty states and error display | T-010 | — | todo |
| T-018 | ops | Wire test runner: Vitest + Testing Library | testing-strategy, decisions D-004 | — | done |
| T-101 | impl | Introduce ProjectType ('application' \| 'website') in types, Project entity, store, seed data | data-model, F-025 | T-102 | done |
| T-102 | test | Tests: ProjectType in store — setProjectType action, persist round-trip, seed value | T-101 | — | todo |
| T-103 | impl | Add project type selector (Application / Website) to Idea page; wire stage gate and store | F-025, US-015 | T-104 | done |
| T-104 | test | Tests: project type selector — selection state, validation block, store update, HomePage display | T-103 | — | todo |
| T-105 | impl | Make Spec and Architecture generation aware of ProjectType; type-aware mock outputs, type badges in UI, tightened stage gates | F-025, F-005, F-006, US-015 | T-106 | done |
| T-106 | test | Tests: type-aware spec/arch generation — application vs website outputs, stage gate assertions, badge display | T-105 | — | todo |
| T-107 | impl | Align Prompt Loop with Superpowers cycle — add CyclePhase + projectType to PromptIteration; cycle-aware first/next prompts with TDD requirement; parser extracts hasTests, task IDs; UI shows phase/type/task context | F-007, F-024, US-011, US-012, US-013 | T-108 | done |
| T-108 | test | Tests: cycle-aware prompt generation — first prompt mentions projectType and TDD rule; parser detects test files and task IDs; UI shows correct phase badges | T-107 | — | todo |
| T-109 | impl | Make HistoryPage the visible Review phase — 6-stage cycle timeline, iteration T-xxx/F-xxx/test badges, decisions panel, review checklist | F-024, F-007, US-011–013 | T-110 | done |
| T-110 | test | Tests: Review phase history view — cycle stages, test badges, task ID badges, decisions panel | T-109 | — | todo |
| T-111 | impl | Per-artifact "Copy as markdown" — pure formatters + clipboard/download utility + UI buttons on 4 pages | F-012, F-026, D-006 | T-112 | done |
| T-112 | test | Tests: markdown formatters (content, projectType label) + clipboard utility (copy path, download fallback) | T-111 | — | done |
| T-113 | ops | Wire CI: GitHub Actions workflow runs `npm test` on push/PR to main; failures block merges | testing-strategy, T-018, T-112 | — | done |
| T-201 | impl | Project registry store (projects[], selectedProjectId) + bridge to projectStore + HomePage selected-project summary | F-027, data-model | T-202 | done |
| T-202 | impl | Project creation page: name + type form → createProject + selectProject + navigate /idea; HomePage "Start New Project" → /project/new | F-025, F-027 | T-104 | done |
| T-203 | impl | Per-project state map in projectStore + TopBar project switcher dropdown + no-project EmptyState guards on all flow pages | F-027, US-014 | T-104 | done |

---

## Phase breakdown

### Phase 0 — Setup
Goal: create the technical and informational foundation.
Tasks: T-001, T-002, T-003, T-004
Deliverables:
- app shell, routing, layout, theme
- state store and typed domain models
- mock services
- placeholder screens

### Phase 1 — Core workflow shell
Goal: establish the visible end-to-end product flow.
Tasks: T-005, T-006
Deliverables:
- Idea screen with validation and stage gate
- Research screen with provider selection and import flow
- Editable Research Brief with source attribution

### Phase 2 — Research domain
Goal: support research orchestration without real provider integration.
Tasks: T-006, T-012
Deliverables:
- deterministic import normalizer
- normalized research brief structure
- mock research job runner
- imported and generated research using the same downstream structure

Rules:
- research can be produced inside the application for both applications and websites
- research can also be imported from previously completed work
- all incoming research must be normalized into one internal ResearchBrief before downstream use

### Phase 3 — Spec and architecture generation
Goal: turn research output into build-ready planning artifacts for an application or website.
Tasks: T-007, T-013, T-016
Deliverables:
- generated + editable SpecPack
- generated + editable ArchitectureDraft
- stage gates for both stages
- store persistence for edits

### Phase 4 — Prompt loop engine
Goal: support iterative development with Claude Code.
Tasks: T-008, T-014
Deliverables:
- first prompt generator
- Claude response input UI
- parser for structured answer blocks
- next prompt generator
- prompt history

### Phase 5 — Hardening
Goal: prepare for future real integrations and make the build loop reliable.
Tasks: T-009, T-010, T-015, T-017
Deliverables:
- local persistence verified and stable
- error states and empty states complete
- export capability
- validation and accessibility polish
