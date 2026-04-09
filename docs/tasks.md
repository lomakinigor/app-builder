# Tasks

Tasks are the atomic units of work in the **Tasks → Code (+Tests) → Review** portion of the cycle.

Rules:
1. Every code change must reference a specific T-xxx task ID in its explanation or commit message.
2. For every `impl` task there must be at least one paired `test` task (type=test) that defines acceptance criteria.
3. No `impl` task is started until a plan exists in `plan.md` and its parent feature (F-xxx) is defined in `features.md`.
4. Owner `AI` means Claude executes it; owner `human` means the developer confirms or approves it.

Task types: `spec` | `plan` | `impl` | `test` | `refactor` | `ops`
Statuses: `todo` | `in-progress` | `in-review` | `done`

---

## T-001 — Initialize foundation
Type: impl
Description: Create the project shell, routing, layout, theme, and state foundation.
Links: F-019, F-020, F-021, F-022
Status: done
Owner: AI
Definition of done:
- app starts
- base routes exist
- placeholder screens render
- theme works
- state store exists

## T-002 — Create core screens
Type: impl
Description: Create screens for Home, Idea, Research, Spec, Architecture, Prompt Loop, History/Project.
Links: F-001, F-002, F-005, F-006, F-007
Status: done
Owner: AI
Definition of done:
- all screens accessible from navigation
- each has placeholder content aligned with domain purpose

## T-003 — Add domain models
Type: impl
Description: Implement typed models for Project, IdeaDraft, ResearchProvider, ResearchRun, ImportedResearchArtifact, ResearchSource, ResearchBrief, SpecPack, ArchitectureDraft, PromptIteration, ParsedClaudeResponse.
Links: F-019, F-022 — data-model.md
Status: done
Owner: AI
Definition of done:
- types centralized
- mock data compiles cleanly
- modules consume typed models

## T-004 — Add mock services
Type: impl
Description: Create mock services/adapters for research provider execution, research import and normalization, spec generation, architecture generation, prompt generation, Claude response parsing.
Links: F-002, F-003, F-005, F-006, F-007 — tech-spec.md
Status: done
Owner: AI
Definition of done:
- services return predictable mock data
- UI can demonstrate full flow without backend

## T-005 — Build Idea and Research workflow
Type: impl
Description: Implement idea capture with validation and research brief generation flow. Includes stage gate logic and editable brief output.
Links: F-001, F-002, F-004, F-009 — US-001, US-002, US-003, US-006
Status: done
Owner: AI
Definition of done:
- user can input idea with validation and progress feedback
- user can choose provider/mode and trigger mock research
- normalized brief is shown, attributed, and editable
- stage gate blocks progression with clear reason if requirements not met

## T-006 — Build imported research workflow
Type: impl
Description: Implement import flow for previously completed external research. Normalizer uses deterministic heuristics to extract ResearchBrief fields from pasted text.
Links: F-003, F-004, F-009, F-013 — US-004, US-005, US-006
Status: done
Owner: AI
Definition of done:
- user can paste or import prior research
- app stores imported research metadata
- app produces normalized ResearchBrief from imported material
- imported and generated research use the same downstream structure

## T-007 — Build Spec and Architecture workflow
Type: impl
Description: Implement spec and architecture draft generation, display, and editing. Both stages gate progression via canAdvanceFromSpec / canAdvanceFromArchitecture. Store actions updateSpecPack and updateArchitectureDraft persist edits.
Links: F-005, F-006, F-009, F-010 — US-007, US-008, US-009, US-010
Status: in-progress
Owner: AI
Definition of done:
- spec screen generates and displays editable SpecPack
- architecture screen generates and displays editable ArchitectureDraft
- both stages gate progression with explicit reason when blocked
- edited values persist through store

## T-008 — Build Prompt Loop MVP
Type: impl
Description: Implement first prompt generation, Claude response paste area, parser result view, and next prompt generation.
Links: F-007 — US-011, US-012, US-013
Status: todo
Owner: AI
Definition of done:
- user can generate first prompt
- paste response
- parser returns structured output (analysis / plan / files / next step / warnings)
- next step or prompt is visible

## T-009 — Add local persistence
Type: impl
Description: Persist project data locally via Zustand persist middleware. Refresh must not destroy active project state.
Links: F-008, F-011 — US-013
Status: done
Owner: AI
Definition of done:
- refresh does not destroy active mock project
- project state restores correctly
- imported research metadata persists correctly

## T-010 — Polish errors and empty states
Type: impl
Description: Add clear empty states, validation feedback, and parser warnings across all stages.
Links: F-012, F-023 — US-006, US-012
Status: todo
Owner: AI
Definition of done:
- user always understands missing input or invalid state
- imported research errors have visible guidance
- parser failures do not block manual continuation

---

## Test tasks

## T-011 — Tests: Idea and Research workflow
Type: test
Description: Acceptance tests for F-001, F-002, F-003, F-004. Covers idea validation, research provider selection, import normalizer output quality, brief editability, and stage gates.
Links: F-001, F-002, F-003, F-004 — US-001, US-002, US-003, US-004, US-005, US-006 — pairs with T-005, T-006
Status: todo
Owner: human
Acceptance criteria:
- idea under 50 chars is rejected with message
- research brief from mock run has all required fields non-empty
- pasted freeform text produces at least 3 non-empty ResearchBrief fields
- stage gate returns canAdvance=false with reason when brief is missing
- edits to research brief persist through store

## T-012 — Tests: Import normalizer edge cases
Type: test
Description: Unit-level tests for the heuristic text normalizer. Covers labeled sections, keyword fallback, empty input, and partial matches.
Links: F-003, F-013 — US-004, US-005 — pairs with T-006
Status: todo
Owner: AI
Acceptance criteria:
- labeled headings map to correct ResearchBrief fields
- missing sections produce empty strings, not undefined
- keyword fallback fires when no headings found
- warnings are returned when fewer than 3 sections are extracted

## T-013 — Tests: Spec and Architecture workflow
Type: test
Description: Acceptance tests for F-005, F-006. Covers generation, editing, save-to-store, and stage gate behavior.
Links: F-005, F-006 — US-007, US-008, US-009, US-010 — pairs with T-007
Status: todo
Owner: human
Acceptance criteria:
- generated SpecPack has non-empty productSummary, MVPScope, and at least one feature
- edited spec fields persist after save
- canAdvanceFromSpec returns false when productSummary and MVPScope are both empty
- generated ArchitectureDraft has at least one stack item and one roadmap phase
- canAdvanceFromArchitecture returns false when stack or roadmap is empty

## T-014 — Tests: Prompt loop engine
Type: test
Description: Acceptance tests for F-007. Covers first prompt generation, response parsing, next prompt generation, and history.
Links: F-007 — US-011, US-012, US-013 — pairs with T-008
Status: todo
Owner: human
Acceptance criteria:
- first prompt includes spec summary and architecture context
- pasted Claude response is parsed into analysis / plan / files / nextStep / warnings
- malformed response produces parse warnings without crashing
- prompt history grows by one entry per iteration
- next prompt references the parsed output from the previous iteration

## T-015 — Tests: Local persistence
Type: test
Description: Tests for F-008. Confirms state survives reload and imported artifacts are restored.
Links: F-008 — US-013 — pairs with T-009
Status: todo
Owner: human
Acceptance criteria:
- project store serializes to localStorage under correct key
- after simulated reload, ideaDraft, researchBrief, specPack, and promptIterations are restored
- imported artifact rawContent is preserved in restored state

## T-016 — Tests: Stage gate integration
Type: test
Description: Unit tests for all canAdvanceFrom* functions in stageGates.ts. Covers all null, empty, and valid cases.
Links: F-001, F-004, F-005, F-006 — pairs with T-005, T-007
Status: todo
Owner: AI
Acceptance criteria:
- canAdvanceFromIdea: false for null, empty, too-short idea; true for valid idea
- canAdvanceFromResearch: false for null brief or empty problemSummary; true otherwise
- canAdvanceFromSpec: false for null spec or both summary+scope empty; true otherwise
- canAdvanceFromArchitecture: false for null, empty stack, or empty roadmap; true otherwise

## T-017 — Tests: Empty states and error display
Type: test
Description: Acceptance tests for F-023 empty states, blocked stage banners, and validation error display.
Links: F-023 — US-006, US-012 — pairs with T-010
Status: todo
Owner: human
Acceptance criteria:
- blocked stage shows banner with human-readable reason
- empty research page shows correct call-to-action
- missing spec shows link back to Research stage
- parser failure shows warning without blocking next action

## T-018 — Wire test runner (Vitest + Testing Library)
Type: ops
Description: Configure Vitest, Testing Library, and jsdom so that test tasks T-011–T-017 can be run as actual test suites rather than manual checklists. Required before any test task can be marked done.
Links: decisions.md D-004 — testing-strategy.md
Status: todo
Owner: AI
Definition of done:
- Vitest configured in vite.config.ts
- @testing-library/react and @testing-library/user-event installed
- jsdom environment set for component tests
- npm test script added to package.json
- one passing smoke test confirms the setup works
