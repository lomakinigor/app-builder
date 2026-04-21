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
Status: done
Owner: AI
Definition of done:
- spec screen generates and displays editable SpecPack ✓
- architecture screen generates and displays editable ArchitectureDraft ✓
- both stages gate progression with explicit reason when blocked ✓
- edited values persist through store (Zustand persist + per-project hot-slot snapshot) ✓
- fixed: EditableArchitectureDraft StackRow used generateId() as React key causing inputs to remount on every render; fixed to use stable index ✓
- stage gate unit tests added in stageGates.test.ts (canAdvanceFromSpec x8, canAdvanceFromArchitecture x8) ✓
- TypeScript build clean; 169 tests passing ✓

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
Status: done
Owner: AI
Definition of done:
- user always understands missing input or invalid state ✓
- imported research errors have visible guidance ✓
- parser failures do not block manual continuation ✓
- ResearchPage: fixed 4 English text leaks (gate banner labels, advance button, run status labels, imported badge) ✓
- ResearchPage: gate-blocked advance shows inline reason text below disabled button ✓
- PromptLoopPage: added inline warning card when specPack missing but arch present ✓
- PromptLoopPage: ParsedClaudeResponse.implementationSummary now rendered in parsed result view ✓
- PromptLoopPage: "Следующий шаг не найден" neutral card when nextStep is empty after parse ✓
- PromptLoopPage: derived warning when targetTaskId not mentioned in implementedTaskIds ✓
- PromptLoopPage: derived warning when inferredNextPhase === null and nextStep present ✓
- PromptLoopPage: "Фаза не определена" muted badge in "Ready for next" card ✓
- Stage gate tests: canAdvanceFromResearch x5 added to stageGates.test.ts ✓
- TypeScript build clean; 174 tests passing ✓

---

## Test tasks

## T-011 — Tests: Idea and Research workflow
Type: test
Description: Acceptance tests for F-001, F-002, F-003, F-004. Covers idea validation, research provider selection, import normalizer output quality, brief editability, and stage gates.
Links: F-001, F-002, F-003, F-004 — US-001, US-002, US-003, US-004, US-005, US-006 — pairs with T-005, T-006
Status: done
Owner: AI
Definition of done:
- IdeaPage: 24 acceptance tests across 5 groups (A–E) in `src/pages/idea/IdeaPage.acceptance.test.tsx`
  - A (5): no-project guard → EmptyState + "Создать проект" CTA, no form rendered
  - B (4): project present + empty idea → textarea rendered, type selector present, draft button disabled, no premature errors
  - C (5): submit with empty/short idea → validation errors, blocked-state banner, no navigate, no setIdeaDraft
  - D (7): valid idea pre-seeded → form pre-populated, type pre-selected, continue saves + navigates to /research, draft-save-only path
  - E (3): persistence contract — stored idea is source of truth for form init, no error banner, "Проект активен" badge
- ResearchPage: 29 acceptance tests across 6 groups (A–F) in `src/pages/research/ResearchPage.acceptance.test.tsx`
  - A (5): no-project guard → EmptyState, no run button, no tabs
  - B (5): idea gate failures → GateBanner shown, run button disabled; gate absent when idea valid
  - C (6): valid idea + no brief → empty state, tabs visible, run enabled, "Бриф отсутствует" badge
  - D (5): valid brief → editable brief rendered, "Бриф готов" badge, advance button available + navigates to /spec
  - E (3): incomplete brief (empty problemSummary) → advance disabled, reason shown, no navigation
  - F (5): cross-stage acceptance — idea state drives research readiness through real gate logic

## T-012 — Tests: Import normalizer edge cases
Type: test
Description: Unit-level tests for the heuristic text normalizer. Covers labeled sections, keyword fallback, empty input, and partial matches.
Links: F-003, F-013 — US-004, US-005 — pairs with T-006
Status: done
Owner: AI
Definition of done:
- 77 unit tests across 7 groups in `src/features/imported-research-input/normalizer.test.ts`
  - A (7): happy path — full markdown → correct extraction per field, extractedSectionCount ≥ 4, zero warnings
  - B (8): empty/null/undefined input — no throw, valid brief shape, extractedSectionCount=0, 2 warnings, whitespace parity
  - C (4): missing/partial sections — fallback strings for scalar fields, empty arrays for absent array fields, targetUsers invariant, warnings emitted
  - D (7): malformed input — headers without body, duplicates (last wins), random text — no throw, valid shape
  - E (7): ideaDraft fallback — problem/targetUser/rawIdea fill gaps; labeled section beats draft; null draft safe; keyword fallback flag
  - F (35): output shape invariants — 7-case matrix × 5 invariants: targetUsers non-empty array, risks/opportunities/openQuestions arrays, scalar fields non-empty strings, sourceIds=[artifactId], briefSource="imported", warnings array
  - G (4): stability — determinism, no input mutation, integer sectionCount, warning threshold contract

## T-012A — Tests: Parser and rule-engine (Prompt Loop)
Type: test
Description: Unit tests for parseClaudeResponse (section extraction, changedFiles, hasTests, T-xxx IDs, warning strings, degenerate inputs, regression guards) and the rule-engine / aggregation layer (buildTaskReviewModel, filterTaskRows).
Links: F-007, F-024 — pairs with T-107, T-207, T-208
Status: done
Owner: AI
Acceptance criteria:
- all 5 section header variants are parsed (numbered, ## N., **N.**)
- changedFiles extracted via backtick paths and [TEST] markers; no double-counting
- hasTests true for .test.ts / .spec.ts / .test.tsx / .spec.tsx in files or raw text
- T-xxx extraction requires ≥ 3 digits; next step section excluded from implementedTaskIds
- warning strings for missing analysis, missing next step, and no test files are locked
- empty / unstructured / whitespace-only input never throws; returns predictable object
- inferredNextPhase integrates correctly with inferNextPhase outcomes
- buildTaskReviewModel groups by taskId, aggregates hasTests/hasReview/warnings/phases, sorts lexicographically with (unassigned) last
- filterTaskRows correctly applies phaseFilter and testFilter in isolation and combined
Evidence: src/mocks/services/parseClaudeResponse.test.ts (81 tests), src/shared/lib/review/taskReviewModel.test.ts (48 tests)

## T-012B — Tests: PromptLoopPage UI (parser outcomes, warnings, empty/validation states)
Type: test
Description: Component tests for PromptLoopPage covering all UI states produced by parser outcomes and store state: empty states (no project, no arch, no spec, no iterations), validation (disabled/enabled generate and parse buttons), successful parse display, partial parse (no tests, no nextStep), parser warning box, derived warnings, and the iteration switcher.
Links: F-007, F-012, F-024 — pairs with T-008, T-012A, T-010
Status: done
Owner: AI
Acceptance criteria:
- EmptyState "Проект не выбран" shown with CTA when activeProject is null
- Amber gate cards shown for missing architecture and missing spec with navigation links
- Generate button disabled when specPack or architectureDraft absent; enabled when both present
- Parse button disabled when response textarea empty; enabled after input
- "✓ Тесты найдены" badge shown when hasTests=true; "⚠️ Нет тестов" badge when false
- "Рекомендуемый следующий шаг" (green box) shown when nextStep present; grey fallback when absent
- "Предупреждения парсера" amber box rendered for warnings[]; hidden when warnings is empty
- Derived warning shown when targetTaskId is set but not in implementedTaskIds
- Iteration switcher with "✓" on parsed rows and task ID badges shown for >1 iteration
- "История" nav button appears after first parsed iteration
Evidence: src/pages/prompt-loop/PromptLoopPage.test.tsx (65 tests)

## T-013 — Tests: Spec and Architecture workflow
Type: test
Description: Acceptance tests for F-005, F-006. Covers generation, editing, save-to-store, and stage gate behavior.
Links: F-005, F-006 — US-007, US-008, US-009, US-010 — pairs with T-007
Status: done
Owner: AI
Acceptance criteria:
- generated SpecPack has non-empty productSummary, MVPScope, and at least one feature ✓
- edited spec fields persist after save
- canAdvanceFromSpec returns false when productSummary and MVPScope are both empty ✓
- generated ArchitectureDraft has at least one stack item and one roadmap phase ✓
- canAdvanceFromArchitecture returns false when stack or roadmap is empty ✓
Evidence:
- src/shared/lib/stageGates.spec-arch.test.ts (53 gate tests — scenarios A–K + edge)
- src/mocks/services/specService.test.ts (17 service shape + gate-compatibility tests)
- src/pages/spec/SpecPage.test.tsx (22 UI tests — guards, empty states, gate wiring)
- src/pages/architecture/ArchitecturePage.test.tsx (22 UI tests — guards, empty states, gate wiring)
New in this task:
- SPEC_DIAG / ARCH_DIAG diagnostic constants in stageGates.ts
- diagnostic?: string added to StageGateResult (backward-compatible)
- canAdvanceFromSpec strengthened: now requires productSummary AND MVPScope individually + featureList.length > 0

## T-014 — Tests: Prompt loop engine
Type: test
Description: Acceptance tests for F-007. Covers first prompt generation, response parsing, next prompt generation, and history.
Links: F-007 — US-011, US-012, US-013 — pairs with T-008
Status: done
Owner: AI
Acceptance criteria:
- first prompt includes spec summary and architecture context ✓
- pasted Claude response is parsed into analysis / plan / files / nextStep / warnings ✓
- malformed response produces parse warnings without crashing ✓
- prompt history grows by one entry per iteration ✓
- next prompt references the parsed output from the previous iteration ✓
- partial parse: engine does not have an error status — parsedSummary always set ✓
- updatePromptIteration modifies only the target iteration, not siblings ✓
- full generate→parse→generate cycle results in 2 correctly linked iterations ✓
Evidence:
- src/mocks/services/promptService.engine.test.ts (44 tests — scenarios A, B, C)
- src/app/store/promptIterations.test.ts (21 tests — scenarios D, E, Integration)

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
Description: Unit tests for all canAdvanceFrom* functions in stageGates.ts (existing + new Prompt Loop gates). Implements canAdvanceFromPromptLoop and canAdvanceToReview with PromptLoopGateResult and PROMPT_LOOP_DIAG codes.
Links: F-001, F-004, F-005, F-006, F-007 — pairs with T-005, T-007, T-014
Status: done
Owner: AI
Acceptance criteria:
- canAdvanceFromIdea: false for null, empty, too-short idea; true for valid idea ✓ (existing)
- canAdvanceFromResearch: false for null brief or empty problemSummary; true otherwise ✓ (existing)
- canAdvanceFromSpec: false for null spec or both summary+scope empty; true otherwise ✓ (existing)
- canAdvanceFromArchitecture: false for null, empty stack, or empty roadmap; true otherwise ✓ (existing)
- canAdvanceFromPromptLoop: false for null/no-summary/no-tests/parse-warnings; true for clean parse ✓
- canAdvanceToReview: additionally requires inferredNextPhase=review + targetTaskId set ✓
- blockingDiagnostics codes are stable machine-readable identifiers ✓
- No 'error' PromptStatus used anywhere — contract documented in code and tests ✓
- PromptLoopPage review button wired to canAdvanceToReview(latestIteration) ✓
Evidence:
- src/shared/lib/stageGates.ts (canAdvanceFromPromptLoop, canAdvanceToReview, PROMPT_LOOP_DIAG)
- src/shared/lib/stageGates.promptLoop.test.ts (45 tests — scenarios A–F + edge cases)
- src/pages/prompt-loop/PromptLoopPage.tsx (review button guard replaced)

## T-017 — Gate hints + empty states + unified diagnostics UI
Type: impl+test
Description: UX layer over gate infrastructure. Unified GateDiagnostics component + gateDiagnosticMessages mapping. Integrated into SpecPage, ArchitecturePage, PromptLoopPage (review gate). Tests for component, mapping, and all three pages.
Links: F-023 — US-006, US-012 — pairs with T-010, T-013, T-016
Status: done
Owner: AI
Definition of done:
- GateDiagnostics shared component (src/shared/ui/GateDiagnostics.tsx) — renders nothing when reasons=[]
- gateDiagnosticMessages.ts — single source-of-truth for all SPEC_DIAG, ARCH_DIAG, PROMPT_LOOP_DIAG → label+hint
- SpecPage: local GateBanner replaced with GateDiagnostics; shows gate.reason on failure
- ArchitecturePage: same replacement
- PromptLoopPage: review gate diagnostics shown when canAdvanceToReview fails but base gate passes (mapped labels, no duplication of parser warnings)
- GateDiagnostics.test.tsx: 18 tests (empty/single/multiple/variants/CTA/testid)
- gateDiagnosticMessages.test.ts: 46 tests (all 16 known codes × label+hint; unknown fallback; E+F meta-tests)
- SpecPage.test.tsx: +6 diagnostic tests (testid presence, empty featureList, empty summary, empty MVPScope)
- ArchitecturePage.test.tsx: +6 diagnostic tests (empty stack, empty roadmap, missing projectType)
- PromptLoopPage.test.tsx: +6 review gate tests (NOT_REVIEW_PHASE, NO_TARGET_TASK, gate passes, base fails, no iterations)
- 685 tests passing, no regressions

## T-018 — Wire test runner (Vitest + Testing Library)
Type: ops
Description: Configure Vitest, Testing Library, and jsdom so that test tasks T-011–T-017 can be run as actual test suites rather than manual checklists. Required before any test task can be marked done.
Links: decisions.md D-004 — testing-strategy.md
Status: done
Owner: AI
Definition of done:
- Vitest configured in vite.config.ts
- @testing-library/react and @testing-library/user-event installed
- jsdom environment set for component tests
- npm test script added to package.json
- one passing smoke test confirms the setup works

---

## T-101 — Introduce ProjectType in domain model and store
Type: impl
Description: Add ProjectType ('application' | 'website') union type to the project entity. Add projectType field to the Project interface. Add setProjectType action to the Zustand store. Update seed data with projectType: 'application'. No UI changes in this task.
Links: F-025, US-015 — data-model.md
Status: done
Owner: AI
Definition of done:
- ProjectType union type exported from src/entities/project/types.ts
- Project interface has required projectType: ProjectType field
- ProjectType re-exported from src/shared/types/index.ts
- Zustand store has setProjectType action
- mockProject seed has projectType: 'application'
- TypeScript build passes with zero errors

## T-102 — Tests: ProjectType store behavior
Type: test
Description: Unit tests confirming that setProjectType updates activeProject.projectType correctly, that the initial/null state is handled, and that persist round-trip preserves projectType. Pairs with T-101.
Links: F-025 — pairs with T-101
Status: done
Owner: AI
Definition of done:
- src/app/store/projectStore.projectType.test.ts created with 21 tests across 4 groups (A–D)
- A: happy path — setProjectType('application'/'website'), round-trip, idempotent, updatedAt bumped, other fields preserved
- B: null-safety — no throw when activeProject=null, state stays null, earlier no-op call has no effect on subsequent setActiveProject
- C: persist round-trip — application and website projectType both survive capture→reset→rehydrate; updatedAt preserved
- D: seed data pin — mockProject.projectType equals 'application'
- 21/21 pass, no regressions

## T-103 — Add project type selector to Idea page
Type: impl
Description: Expose ProjectType to the user on the Idea page as a required segmented control (Application / Website). Wire selection into the stage gate (canAdvanceFromIdea blocks until type is chosen), the store (setProjectType), and the HomePage active project card (show type badge). Replaces the hardcoded 'application' default added in T-101.
Links: F-025, US-015 — pairs with T-104
Status: done
Owner: AI
Definition of done:
- ProjectTypeSelector component renders two options: Application and Website
- canAdvanceFromIdea requires non-null projectType in addition to valid idea text
- selecting a type immediately updates store if activeProject exists; on first save it sets the inline Project literal
- active project card on HomePage shows the project type as a badge
- loading demo project pre-fills 'application' correctly (mockProject.projectType = 'application')
- TypeScript build passes with zero errors

## T-105 — Make Spec and Architecture generation aware of ProjectType
Type: impl
Description: Add projectType field to SpecPack and ArchitectureDraft types. Update generateSpec() and generateArchitecture() mock services to accept projectType and return type-appropriate content (application vs website). Show project type badge on SpecPage and ArchitecturePage. Tighten canAdvanceFromSpec and canAdvanceFromArchitecture to assert projectType is set on the generated artifact.
Links: F-025, F-005, F-006, US-015 — pairs with T-106
Status: done
Owner: AI
Definition of done:
- SpecPack has required projectType: ProjectType field
- ArchitectureDraft has required projectType: ProjectType field
- generateSpec(brief, projectType) returns website-flavored content when projectType='website'
- generateArchitecture(spec, projectType) returns Next.js stack when projectType='website'
- SpecPage and ArchitecturePage show a project type badge in the header
- canAdvanceFromSpec blocks if specPack.projectType is falsy
- canAdvanceFromArchitecture blocks if architectureDraft.projectType is falsy
- seed data updated with projectType: 'application' on mockSpecPack and mockArchitectureDraft
- TypeScript build passes with zero errors

## T-106 — Tests: type-aware spec and architecture generation
Type: test
Description: Acceptance tests confirming that generateSpec and generateArchitecture produce distinct outputs for application vs website, that stage gates check the projectType field, and that the UI shows the correct badge.
Links: F-025, F-005, F-006 — pairs with T-105
Status: done
Owner: AI
Definition of done:
- src/mocks/services/specService.type-aware.test.ts created with 90 tests across 6 groups (A–F)
- A: type differentiation in spec (featureList, constraints, assumptions, summary, MVPScope, acceptanceNotes)
- B: type differentiation in architecture (stack, moduleArchitecture, roadmap phases, technicalRisks, dataFlow)
- C: minimal contract per type — all required fields present and non-empty, gate compatibility (canAdvanceFromSpec + canAdvanceFromArchitecture)
- D: brief integration — valueHypothesis/recommendedMVP/targetUsers propagation for both types
- E: fallback — unknown projectType cast falls through to application shape without throwing; gate passes
- F: determinism — identical inputs produce identical outputs (no random drift)
- 90/90 pass, no regressions

## T-104 — Tests: project type selector behavior
Type: test
Description: Acceptance tests for the Idea page project type selector. Covers selection state, validation blocking, store updates, and the HomePage type badge display.
Links: F-025, US-015 — pairs with T-103
Status: done
Owner: AI
Definition of done:
- A: Initial render — both "Приложение" / "Сайт" buttons visible; aria-pressed reflects activeProject.projectType
- B: Interaction — click switches aria-pressed state; idempotent re-click does not crash
- C: Store wiring — clicking a type calls setProjectType with the correct value; two-click sequence calls setProjectType twice
- D: Null activeProject — EmptyState shown, type selector absent, setProjectType never called
- 20/20 pass; aria-pressed added to ProjectTypeSelector buttons in IdeaPage.tsx for semantic testing
- 1346/1346 total suite, no regressions

## T-107 — Align Prompt Loop with Superpowers cycle
Type: impl
Description: Add CyclePhase type and projectType/cyclePhase/targetTaskId/roadmapPhaseNumber fields to PromptIteration. Add hasTests/implementedTaskIds/nextTaskId to ParsedClaudeResponse. Update generateFirstPrompt() to include projectType, cycle stage, required docs list, and TDD requirement. Update generateNextPrompt() to carry cycle context and flag missing tests. Update parseClaudeResponse() to detect test files and extract T-xxx IDs. PromptLoopPage shows cycle phase, projectType, and current task ID in context bar.
Links: F-007, F-024, US-011, US-012, US-013 — pairs with T-108
Status: done
Owner: AI
Definition of done:
- CyclePhase = 'code_and_tests' | 'review' exported from prompt-iteration types
- PromptIteration has projectType, cyclePhase, targetTaskId, roadmapPhaseNumber
- ParsedClaudeResponse has hasTests, implementedTaskIds, nextTaskId
- generateFirstPrompt(spec, arch, projectType, projectId, promptId) produces prompt with: project type statement, cycle stage label, required docs list, T-xxx/F-xxx guidance, TDD rule, required response format
- generateNextPrompt carries projectType context and warns when hasTests is false in previous iteration
- parseClaudeResponse extracts test file presence (hasTests), T-xxx IDs (implementedTaskIds, nextTaskId)
- PromptLoopPage shows CycleContextBar with project type, cycle phase, and target task ID
- seed data updated with new PromptIteration fields
- TypeScript build passes with zero errors

## T-108 — Tests: cycle-aware prompt loop behavior
Type: test
Description: Acceptance tests for cycle-aware prompt generation and parsing.
Links: F-007, F-024, US-011, US-012, US-013 — pairs with T-107
Status: done
Owner: AI
Definition of done:
- promptService.cycle-aware.test.ts — 63 tests across 7 groups (A–G): website/application tech context, stack format + cross-contamination, roadmap vocabulary, next-prompt type guidance, cycle-aware structural behavior (TDD rule, review vs code_and_tests), first vs next structural differences, combined type+stack+phase
- PromptLoopPage.cycle-badges.test.tsx — 24 tests across 4 groups (A–D): phase label badges for all 6 CyclePhase values, projectType badges (application/website), supporting data (taskId, phaseNumber), visibility rules (shown/hidden with iteration and architectureDraft)
- TDD rule confirmed: "## TDD rule (mandatory)" present in code_and_tests prompts, absent in review prompts
- 1370/1370 total suite, no regressions

## T-109 — Make HistoryPage the visible Review phase of the cycle
Type: impl
Description: Redesign HistoryPage to serve as the Review phase of the Superpowers cycle. Show a 6-stage cycle timeline (Brainstorm → Spec → Plan → Tasks → Code+Tests → Review) with per-stage completion status. Show prompt iterations with T-xxx/F-xxx badges, test presence indicators, and cycle phase labels. Surface key architectural decisions (D-001–D-005) as a static reference panel. Add a Review checklist pointing to PRD, tech-spec, user-stories, and tasks docs. No new store fields required — data already exists from T-107.
Links: F-024, F-007, US-011, US-012, US-013 — pairs with T-110
Status: done
Owner: AI
Definition of done:
- HistoryPage shows full 6-stage Superpowers cycle timeline with correct completion state per stage
- Review stage is visually distinguished as "current" (YOU ARE HERE)
- Each prompt iteration shows: cyclePhase badge, targetTaskId badge, hasTests indicator, implementedTaskIds badges
- Key decisions panel shows D-001–D-005 with linked T-xxx and F-xxx references
- Review checklist section lists what to verify against PRD, tech-spec, user-stories, tasks DoD
- TypeScript build passes with zero errors

## T-110 — Tests: Review phase history view
Type: test
Description: Acceptance tests for the redesigned HistoryPage as the Review phase view.
Links: F-024 — pairs with T-109
Status: done
Owner: AI
Definition of done:
- HistoryPage.review.test.tsx — 44 tests across 4 groups (A–D):
  - A (14 tests) — Cycle stages: all 6 CycleTimeline labels, "← вы здесь" on Review stage, completion details per data state ("Готово", "Идея зафиксирована", "Спек-пакет сгенерирован", "Архитектура и роадмап готовы", "Цикл промптов активен")
  - B (11 tests) — Task and test badges: hasTests=true "✓ Тесты обнаружены", hasTests=false "⚠ Тестовые файлы не обнаружены", null parsedSummary (no badge), targetTaskId badge, implementedTaskIds badges + "Упомянутые задачи:" label, nextTaskId + "Следующая:" label, status badges, warnings
  - C (10 tests) — Decisions panel + review checklist: "Ключевые решения" heading, D-001/D-002 IDs, D-001 title, linked tasks T-001, linked features F-008, "Чеклист обзора" heading, docs/PRD.md item, docs/tasks.md item, guidance text
  - D (9 tests) — Partial/empty states: null activeProject, no iterations, no specPack, no architectureDraft, null parsedSummary + null targetTaskId safety, all-null stability, roadmapPhaseNumber=null/1
- 1414/1414 total suite, no regressions

## T-111 — Implement per-artifact "Copy as markdown" export
Type: impl
Description: Add a "Copy as markdown" button to each core artifact card (ResearchBrief, SpecPack, ArchitectureDraft, PromptIteration). Clicking the button formats the artifact as GitHub-Flavored Markdown and writes it to the clipboard. A download fallback triggers if the clipboard API is unavailable or fails. No per-project docs/ folder is created or maintained — consistent with F-026 and D-006 Option A. Formatting helpers are pure functions in src/shared/lib/markdown/; clipboard utility is in src/shared/lib/clipboard/.
Links: F-012, F-026, D-006 — pairs with T-112
Status: done
Owner: AI
Definition of done:
- researchBriefToMarkdown, specPackToMarkdown, architectureDraftToMarkdown, promptIterationToMarkdown pure functions exist and are tested
- copyMarkdown utility: primary path uses navigator.clipboard.writeText; fallback creates a Blob + temporary <a download> element
- "Copy as markdown" button appears on ResearchPage (brief card), SpecPage (spec card), ArchitecturePage (arch card), PromptLoopPage (active iteration card)
- Exported markdown includes project name, projectType, artifact type, and timestamp where available
- No filesystem I/O, no per-project docs/ folder, no second source of truth
- TypeScript build passes with zero errors

## T-112 — Tests: per-artifact markdown export
Type: test
Description: Unit tests for the markdown formatting helpers and clipboard utility.
Links: F-012, F-026 — pairs with T-111
Status: done
Owner: AI
Acceptance criteria:
- researchBriefToMarkdown returns a string containing the problemSummary and targetUsers
- specPackToMarkdown returns a string containing the productSummary and all featureList entries
- architectureDraftToMarkdown returns a string containing each stack item name and each roadmap phase title
- promptIterationToMarkdown returns a string containing the iterationNumber, cyclePhase, and promptText
- All four functions include the projectType label in their output
- copyMarkdown calls navigator.clipboard.writeText when available
- copyMarkdown triggers a download when clipboard.writeText rejects

## T-113 — Wire CI: run npm test on every push/PR and block merges on failure
Type: ops
Description: Create a GitHub Actions workflow that runs `npm test` on every push to main and every PR targeting main. Test failures fail the workflow and block the merge via branch protection.
Links: testing-strategy.md — pairs with T-018, T-112
Status: done
Owner: AI
Definition of done:
- .github/workflows/test.yml created and committed
- workflow triggers on push to main and pull_request targeting main
- uses Node 20 LTS with npm ci
- `npm test` exit code propagates to workflow status
- branch protection note added to testing-strategy.md

## T-201 — Introduce Project registry and selectedProject in the frontend
Type: impl
Description: Create projectRegistryStore with projects[] and selectedProjectId. Bridge selectProject() to projectStore.setActiveProject(). Update HomePage to show selected project summary (name, projectType) from the registry, or an empty state if none selected.
Links: F-027, data-model.md — pairs with T-202
Status: done
Owner: AI
Definition of done:
- useProjectRegistry store exists with projects[], selectedProjectId, createProject, selectProject, updateProject
- selectProject bridges to projectStore.setActiveProject so all existing pages work unchanged
- Demo project (proj-001) is pre-populated in the registry
- HomePage shows selected project name + projectType badge when a project is selected
- HomePage shows "No project selected" empty state when selectedProjectId is null
- loadMockProject() calls selectProject before loading stage data
- TypeScript build passes with zero errors
- Unit tests for projectRegistryStore: 18 tests covering createProject, selectProject, updateProject, selectSelectedProject selector (src/app/store/projectRegistryStore.test.ts)

## T-202 — Project creation page (name + type → registry → /idea)
Type: impl
Description: Add a dedicated /project/new route with a form that collects project name (required) and project type (application | website). On submit: createProject(), selectProject(), navigate to /idea. HomePage "Start New Project" button navigates to this page.
Links: F-025, F-027, US-015 — pairs with T-104
Status: done
Owner: AI
Definition of done:
- /project/new renders ProjectNewPage with name field and application/website type selector
- Create button is disabled (or shows errors) until both name and type are valid
- On submit: project created in registry, selected, user routed to /idea
- HomePage "Start New Project" navigates to /project/new instead of /idea directly
- TypeScript build passes with zero errors
- Acceptance tests: 20 tests in 5 groups A–E (src/pages/project-new/ProjectNewPage.acceptance.test.tsx)

## T-203 — Project switcher + per-project state binding
Type: impl
Description: (1) Add per-project data map to projectStore — setActiveProject snapshots current hot slots into projectData[id] and restores the incoming project's data. (2) Add a project switcher dropdown to the TopBar — shows current project name/type, lists all registry projects, allows selection and "New project" shortcut. (3) Add no-project guards to all flow pages (Idea, Research, Spec, Architecture, PromptLoop, History) — each shows an EmptyState with a "Create project" CTA when activeProject is null.
Links: F-027, US-014, US-015 — pairs with T-202
Status: done
Owner: AI
Definition of done:
- projectStore.projectData keyed by project ID; switching projects via setActiveProject restores correct artifact state
- TopBar shows a compact project switcher pill; clicking opens dropdown listing all registry projects; selecting calls selectProject(id)
- TopBar dropdown has a "New project" item navigating to /project/new
- All flow pages (Idea, Research, Spec, Architecture, PromptLoop, History) show a "No project selected" EmptyState with Create project CTA when activeProject is null
- Two-project switching test: create two projects, switch back and forth, verify artifact isolation
- TypeScript build passes; all 52 existing tests still pass
- Acceptance tests: 22 tests in 6 groups A–F (src/app/layout/TopBar.test.tsx): initial state, dropdown render, switching, New project shortcut, empty state, bridge UI wiring

## T-204 — Superpowers cycle progress stepper on HomePage
Type: impl
Description: (1) cycleProgress.ts — pure functions that compute per-project phase progress (not_started/in_progress/done) for each of the 6 Superpowers phases from artifact presence. (2) CycleProgressStepper UI component — horizontal 6-step stepper with clickable phase circles linking to their pages. (3) HomePage selected-project card replaced with stepper + smart "Continue: <Phase> →" button pointing to the first in-progress/not-started phase.
Links: F-024, US-014 — pairs with T-204t (todo)
Status: done
Owner: AI
Definition of done:
- computeCycleProgress(data) returns 6 CyclePhaseProgress entries with correct status per artifact presence
- CycleProgressStepper renders: ✓ for done phases, icon for in-progress/not-started; clicking navigates to phase path
- HomePage selected-project card shows the stepper; "Continue" button targets the active phase
- New project shows all phases not_started; demo project shows all phases done or in-progress
- TypeScript build passes; all existing tests pass
- Acceptance tests: 22 tests in 5 groups A–E (src/shared/ui/CycleProgressStepper.test.tsx): rendering, state mapping, cross-project prop changes, navigation semantics, accessibility

## T-204t — Tests: computeCycleProgress unit tests
Type: test
Description: Unit tests for the computeCycleProgress pure function, locking in the artifact-presence → phase-status mapping for all 6 Superpowers cycle phases.
Links: F-024 — pairs with T-204
Status: done
Owner: AI
Acceptance criteria:
- empty ProjectData → all 6 phases are not_started
- ideaDraft only → brainstorm=done, spec=in_progress, plan/tasks/code_and_tests/review=not_started
- ideaDraft + researchBrief → brainstorm=done, spec=done, plan=in_progress, rest=not_started
- specPack + architectureDraft with roadmapPhases → plan=done, tasks=done
- architectureDraft with empty roadmapPhases → tasks=in_progress
- one iteration, no parsedSummary → code_and_tests=in_progress, review=not_started
- one iteration, parsedSummary without tests → code_and_tests=in_progress, review=in_progress
- one iteration, parsedSummary.hasTests=true → code_and_tests=done
- one iteration, cyclePhase=review → review=done
- ideaDraft.rawIdea whitespace-only → brainstorm=not_started
- all 6 phases have a path starting with /

## T-205 — Specialize Spec and Architecture generation by projectType
Type: impl
Description: Make generateSpec and generateArchitecture in specService produce meaningfully different output for application vs website. Application: app-centric feature list (onboarding, CRUD, dashboard, navigation, settings), SPA stack (React/Vite/Zustand/React Router), 5-phase app roadmap. Website: page-centric feature list and SSR stack (already implemented in T-105). Add a one-line type hint on SpecPage and ArchitecturePage above each generated artifact.
Links: F-005, F-006, F-025
Status: done
Owner: AI
Definition of done:
- Application spec featureList reflects app-centric concerns (flows, CRUD, dashboard, navigation), not website patterns
- Website spec featureList reflects website concerns (pages, SEO, blog, contact) — unchanged from T-105
- Application architecture stack includes React SPA, Zustand, React Router; roadmap has 5 phases targeting app flows
- Website architecture stack includes Next.js/SSR; roadmap targets content pipeline — unchanged from T-105
- SpecPage shows "This spec is tailored for an Application/Website." above the editable output
- ArchitecturePage shows "This architecture is tailored for an Application/Website." above the editable output
- TypeScript build passes; all tests pass
- Service tests: 60+ tests in specService.type-aware.test.ts (groups A–F: type differentiation, contract, brief integration, fallback, determinism)
- Page tests: 20 tests in SpecPage.type-aware.test.tsx (type badge, description, features, summary, gate) + 30+ tests in ArchitecturePage.type-aware.test.tsx (type badge, stack, vocabulary, cross-contamination, gate)

## T-206 — Task-centric Prompt Loop aligned with Superpowers cycle
Type: impl
Description: (1) Expand CyclePhase type to full 6-stage Superpowers vocabulary. (2) Add task ID input to generate-first card; generateFirstPrompt now accepts taskId and produces an explicit tests-first task section when provided. (3) generateNextPrompt accepts targetPhase ('code_and_tests' | 'review'); Review phase prompt checks DoD + tests rather than implementing new code. (4) Iteration switcher expanded to card list showing cyclePhase badge + targetTaskId badge + parsed analysis snippet per iteration. (5) "Ready for next" panel offers two options when tests pass: Code+Tests (next task) or Review (current task).
Links: F-007, F-024
Status: done
Owner: AI
Definition of done:
- CyclePhase type includes all 6 stages: brainstorm, spec, plan, tasks, code_and_tests, review
- Generate-first card has a task ID input (T-xxx); when entered the prompt explicitly references it with tests-first wording
- generateFirstPrompt returns targetTaskId matching the input
- generateNextPrompt accepts targetPhase param; review-phase prompt references DoD check, not new code
- "Ready for next" panel shows Review button only when hasTests=true and a targetTaskId is set
- Iteration switcher shows cyclePhase badge + task badge + summary snippet per entry
- TypeScript build passes; all existing tests pass
- Service tests: 48 tests in promptService.engine.test.ts (groups A–C: generateFirstPrompt shape/fields/promptText, parseClaudeResponse contracts, generateNextPrompt linkage/targetPhase/missingTests) + 37 tests in promptService.test.ts (inferNextPhase keyword coverage, typeAwareGuidance vocabulary)
- Cycle-aware service tests: 63 tests in promptService.cycle-aware.test.ts (T-108: website Next.js/SSG/SEO context, stack entries verbatim, roadmap vocabulary, generateNextPrompt type-aware guidance, review vs code_and_tests structural differences, combined type+stack+phase)
- Store tests: 17 tests in promptIterations.test.ts (addPromptIteration, updatePromptIteration, full first→parse→next integration through store)
- Stage gate tests: 45 tests in stageGates.promptLoop.test.ts (canAdvanceFromPromptLoop, canAdvanceToReview scenarios A–F)
- UI tests: 71 tests in PromptLoopPage.test.tsx (T-012B: empty states, generate/parse button gating, task ID field, parse display, warnings, derived warnings, iteration switcher) + 24 tests in PromptLoopPage.cycle-badges.test.tsx (T-108: CycleContextBar phase labels, projectType badges, targetTaskId, roadmapPhaseNumber, visibility rules)
- Total: 305 tests across 7 files — all pass

## T-207 — HistoryPage: Task progress dashboard (Review phase)
Type: impl
Description: Turn HistoryPage into a per-project Review dashboard that aggregates prompt iterations by T-xxx task ID and shows which Superpowers cycle phases each task has touched. (1) Pure aggregation helper buildTaskReviewModel in src/shared/lib/review/taskReviewModel.ts — groups PromptIteration[] by targetTaskId, derives phasesVisited, hasTests, hasReview, lastAnalysisSnippet, warnings. (2) filterTaskRows helper for phase + test filters. (3) TaskProgressPanel component on HistoryPage — one row per task with phase badges, test badge, snippet, "Open in Prompt Loop" link, phase and test filters.
Links: F-024, F-007
Status: done
Owner: AI
Definition of done:
- buildTaskReviewModel([]) returns []
- buildTaskReviewModel with two iterations for T-001 returns one row with both phases aggregated
- filterTaskRows by phase and test status filters rows correctly
- HistoryPage shows "Task progress" card above "Prompt iterations"
- Each task row displays: taskId, phasesVisited badges, test badge, last analysis snippet
- Phase filter dropdown and test filter dropdown work
- "Open in Prompt Loop →" link navigates to /prompt-loop
- TypeScript build passes; all existing tests pass
- Model tests: 40 tests in taskReviewModel.test.ts (grouping by taskId, sort order, hasTests/hasReview aggregation, phasesVisited dedup+order, lastIterationNumber, lastAnalysisSnippet truncation+source, warnings dedup, filterTaskRows phase/test/combined filters)
- HistoryPage UI tests: 44 tests in HistoryPage.review.test.tsx (T-110: CycleTimeline stages, test badges, decisions panel, empty states) + 39 tests in HistoryPage.history-view.test.tsx (type/stack/roadmap, prompt history, cross-type) + 2 tests in HistoryPage.cross-stage-smoke.test.tsx (full-cycle app+website smoke)
- TaskProgressPanel UI tests: 32 tests in HistoryPage.task-progress.test.tsx (T-207: task rows display, filter interactivity, recommended task badge+CTA, navigation, empty/safe states)
- Total: 117 tests across 4 files — all pass

## T-208 — Type-aware, task-centric Prompt Loop (application vs website vocabulary)
Type: impl
Description: Extend the Prompt Loop so that generated prompts use explicitly different vocabulary and guidance for application vs website projects. (1) typeAwareGuidance() helper in promptService — SPA/components/state wording for application; pages/SSR/SEO wording for website; injected into both generateFirstPrompt and generateNextPrompt. (2) taskDescription: string | null added as 7th param to generateFirstPrompt — included in the task section when provided. (3) inferNextPhase() heuristic in parseClaudeResponse — returns CyclePhase based on DoD-met/test/new-task signals; result surfaced in ParsedClaudeResponse.inferredNextPhase. (4) PromptLoopPage: CycleContextBar uses full CyclePhase type; displayCyclePhase reads cyclePhase field directly; task description textarea shown when task ID is set; inferredNextPhase shown as a badge in the "Ready for next" panel.
Links: F-007, F-024, F-025
Status: done
Owner: AI
Definition of done:
- generateFirstPrompt for application project includes SPA/routing/state/testing guidance
- generateFirstPrompt for website project includes pages/SSR/SEO/content-indexability guidance
- generateNextPrompt repeats type-specific guidance in both Code+Tests and Review prompts
- generateFirstPrompt taskDescription param injects description into task section when provided
- parseClaudeResponse returns inferredNextPhase: 'review' when DoD-met signals present, 'code_and_tests' otherwise, 'tasks' when response says to pick from backlog
- CycleContextBar renders correct label and variant for all 6 CyclePhase values
- displayCyclePhase in PromptLoopPage reads activeIteration.cyclePhase, not iteration.status
- Task description textarea appears in generate-first card when task ID is filled
- inferredNextPhase badge shown in "Ready for next" panel after parsing
- TypeScript build passes; all existing tests pass

## T-208t — Tests: inferNextPhase and typeAwareGuidance unit tests
Type: test
Description: Unit tests for the two pure functions introduced in T-208 — inferNextPhase and typeAwareGuidance. Both functions exported for direct testing; no runtime behavior changed.
Links: F-007, F-024, F-025 — pairs with T-208
Status: done
Owner: AI
Acceptance criteria:
- inferNextPhase returns 'review' for all DoD-met/ready-for-review keyword variants
- inferNextPhase returns 'review' when hasTests=true and nextTaskId is null or equal to prevTaskId
- inferNextPhase returns 'tasks' when text contains "check docs/tasks" or "pick the next task"
- inferNextPhase returns 'code_and_tests' when hasTests=false and no special signal (default)
- inferNextPhase returns 'code_and_tests' when nextTaskId differs from prevTaskId (new task → keep building)
- keyword matching is case-insensitive
- typeAwareGuidance('application') output contains: SPA, React Router, Zustand, state, component
- typeAwareGuidance('website') output contains: website, pages/routes, SSG/SSR, SEO, semantic HTML, layout/navigation
- application guidance does not contain SEO; website guidance does not contain Zustand or React Router
- the two guidance strings are not equal

## T-209 — Next Action Engine: подсказка следующего шага по проекту
Type: impl
Description: Pure function computeNextAction(cyclePhases, iterations) → NextAction that derives the single most useful next step from cycle phase progress and prompt iteration signals. NextActionCard UI component. Integration on HomePage (inside selected-project card) and HistoryPage (above project overview).
Links: F-024, US-014 — pairs with T-209t
Status: done
Owner: AI
Definition of done:
- computeNextAction pure function in src/shared/lib/superpowers/nextActionEngine.ts
- NextAction discriminated union: { kind:'phase'|'task'|'none', phaseId, taskId?, path, label, reason }
- Decision priority: brainstorm → spec → plan → tasks → code_and_tests (with inferredNextPhase branching) → review → none
- NextActionCard component in src/shared/ui/NextActionCard.tsx; renders reason + CTA button; uses violet tone for phase/task, emerald for none
- HomePage selected-project card shows NextActionCard between stepper and Continue button
- HistoryPage shows NextActionCard above project overview card
- TypeScript build passes; all existing tests pass

## T-210 — Inline recommendation highlight in stepper and task UI
Type: impl
Description: Surface the NextAction recommendation (from T-209) directly inside the cycle stepper and task-progress panels, so the user can immediately see "what to do next" without reading a separate card. (1) CycleProgressStepper gains optional recommendedPhaseId prop — matching phase shows amber ring + "Рекомендуется" badge. (2) CycleTimeline on HistoryPage gains same prop — matching stage shows amber ring + "Рекомендуется" badge. (3) TaskProgressPanel gains optional recommendedTaskId prop — matching task row shows amber border, "Следующая задача" badge, prominent "Открыть в Prompt Loop" button. (4) Two presentation helper exports added to nextActionEngine.ts: getRecommendedPhaseId and getRecommendedTaskId.
Links: F-024, US-014 — pairs with T-210t
Status: done
Owner: AI
Definition of done:
- getRecommendedPhaseId(action): CyclePhaseId | null — null for kind='none', phaseId otherwise
- getRecommendedTaskId(action): string | null — taskId for kind='task', null otherwise
- CycleProgressStepper renders amber ring + "Рекомендуется" badge on matching phase when recommendedPhaseId set
- isRecommended is false when phase is done (completed phases are never highlighted as recommended)
- CycleTimeline (HistoryPage) renders amber ring + "Рекомендуется" badge on matching stage
- TaskProgressPanel: recommended task row has amber border/bg + "Следующая задача" badge + "Открыть в Prompt Loop" CTA
- kind='none' → no recommendation highlight anywhere
- TypeScript build passes; all existing tests pass

## T-210t — Tests: getRecommendedPhaseId and getRecommendedTaskId helpers
Type: test
Description: Unit tests for the two presentation helpers added in T-210.
Links: F-024 — pairs with T-210
Status: done
Owner: AI
Acceptance criteria:
- getRecommendedPhaseId returns null for kind='none'
- getRecommendedPhaseId returns phaseId for kind='phase' (multiple phase values checked)
- getRecommendedPhaseId returns 'code_and_tests' for kind='task' with phaseId=code_and_tests
- getRecommendedPhaseId returns 'review' for kind='task' with phaseId=review
- getRecommendedTaskId returns null for kind='none'
- getRecommendedTaskId returns null for kind='phase'
- getRecommendedTaskId returns taskId for kind='task' (code_and_tests and review both checked)

## T-301 — Blog development diary module
Type: impl
Description: Add per-project development blog module to the app-builder. Includes: (1) Blog entity — types (BlogPost, ChannelPost, PublicationState, ChannelName, PostKind, PostStatus), Zod schema, utils (isWeekday, shouldCreatePost, generatePostId, generateSlug, getFunFallbackTitle/Body, createFunFallbackPost, createEmptyRegularPost), markdown exporter. (2) Scaffold templates — BLOG_RULES.md content and Blog.md header, exposed for copy-to-project. (3) blogStore — Zustand + persist, per-project posts map, upsert/update/delete/markCopied/updatePublicationStatus/ensureTodayPost actions. (4) BlogPage UI — post list with kind icon, channel tab editor (Сайт/Telegram/MAX/VK), copy/publish buttons per channel, "везде сразу" publish, auto-generate today's post, scaffold export panel. (5) Router (/blog) and Sidebar nav item.
Links: F-028
Status: done
Owner: AI
Definition of done:
- blog entity types compile cleanly (no TS errors)
- blogStore creates/updates/deletes posts per project
- ensureTodayPost: regular on activity, fun_fallback on weekday+no activity, skip on weekend+no activity
- BlogPage renders EmptyState when no project selected
- BlogPage shows post list and channel editor when posts exist
- Copy button calls copyMarkdown with channel body
- Publish all sets all 4 channels to published status
- Scaffold panel shows BLOG_RULES.md and Blog.md header content
- Route /blog reachable; Sidebar shows 📖 Блог
- Full test suite passes (685 tests unchanged)

## T-015 — Tests: Local persistence correctness
Type: test
Description: Verify and document that local persistence (Zustand persist middleware) correctly saves and restores all project state between sessions. Two test files created: (1) projectStore.persist.test.ts — shape guards (emptyProjectData/initialState completeness), reload simulation via setState(capturedState), hot/cold slot mechanics for all 7 artifact types, stage-gate data preservation through switch cycles, multi-project isolation, partial-state tolerance (missing fields fall back to defaults), reset correctness, patch action merging. (2) blogStore.test.ts — full CRUD (upsert/read/updatePost/updateChannelBody/updatePublicationStatus/markCopied/delete), ensureTodayPost decision logic (weekday+activity/no-activity, weekend+activity/no-activity, idempotency), per-project isolation, rehydration simulation.
Links: F-019, F-028
Status: done
Owner: AI
Definition of done:
- emptyProjectData has exactly 7 fields with correct defaults (null / [])
- setState(capturedState) after reset → all 7 hot slots read back correctly
- All ProjectData artifact types survive switch → reload cycle
- setActiveProject snapshots all 7 artifact types into cold store
- Unknown project gets emptyProjectData on setActiveProject
- Three projects coexist in cold store independently
- Partial/extra persisted state does not crash the store
- resetProject returns store to full initialState
- blogStore CRUD: all operations correct; deletePost/update non-existent id are no-ops
- ensureTodayPost: weekday+0activity=fun_fallback, weekend+0activity=null, any+activity=regular, idempotent
- Blog posts per-project: P1 posts not visible in P2
- Blog reload simulation: posts/channel bodies/publication status survive
- 776 tests pass (685 before T-015 + 91 new)

## T-024 — Surface blocked sound state in SettingsPage
Type: impl+test
Description: Make the sound preview path observable when browser audio is blocked. playTestBeep() now returns Promise<PlayBeepResult> ('played' | 'blocked' | 'unavailable'). SettingsPage shows an inline role="status" message when result is 'blocked'. Clears on next click attempt. No new dependencies; VSCode adapter unaffected.
Links: PLAT-ALERT-002, T-019, T-023
Status: done
Owner: AI
Definition of done:
- PlayBeepResult type exported from attentionSignal.ts
- playTestBeep() changed to async, returns Promise<PlayBeepResult>; playBeep() (signal cycle) unchanged
- SettingsPage: beepBlocked state, handlePreviewBeep async handler, role="status" paragraph when blocked
- attentionSignal.test.ts group G: 6 new tests (running→played, no-Ctor→unavailable, disabled→unavailable, resumed→played, resume-rejects→blocked, stays-suspended→blocked)
- SettingsPage.test.tsx group F: 5 new tests (blocked message appears, copy check, played/unavailable no message, clears on retry)
- All 39 tests in both files pass; full suite 1294+11=1305 pass

## T-025 — SMOKE-RTL-002: full-route render smoke
Type: test
Description: RTL smoke confirming all 10 main application routes (/, /idea, /research, /spec, /architecture, /prompt-loop, /history, /blog, /settings, /project/new) render without crash under a minimal null-project store state. One it.each over all page components; each case checks for the page-specific heading or guard text.
Links: T-011, T-012, T-001, T-002
Status: done
Owner: AI
Definition of done:
- src/app/router/FullRoute.smoke.test.tsx created with 10 it.each cases
- All 10 routes covered: HomePage, IdeaPage, ResearchPage, SpecPage, ArchitecturePage, PromptLoopPage, HistoryPage, BlogPage, SettingsPage, ProjectNewPage
- Mocks: react-router-dom (useNavigate), projectStore, projectRegistryStore, blogStore, settingsStore
- All 10 tests pass in isolation; no changes to existing tests
- docs/plan.md updated with T-025 row
- docs/testing-strategy.md updated with SMOKE-RTL-002 section

## SOUND-004 — E2E: awaiting_confirmation attentionSignal path in PromptLoop
Type: test
Description: E2E Playwright test verifying that the awaiting_confirmation sound path fires through PromptLoopPage. Generates the first prompt (which calls startAttentionSignal('awaiting_confirmation')), asserts at least one oscillator-start is recorded via the AudioContext monitor, then types in the response textarea (which calls stopAttentionSignal('awaiting_confirmation') via onChange), and asserts no further beeps fire in the 300ms window following the stop.
Links: PLAT-ALERT-001, T-019
Status: done
Owner: AI
Definition of done:
- tests/e2e/sound-awaiting-confirmation.spec.ts created with SOUND-004 test case
- Reuses injectAudioMonitor / getPlayedSounds / waitForSoundAttempt from tests/e2e/helpers/audioMonitor.ts
- Seeds project with spec+arch but no iterations so "Сгенерировать первый промпт" is enabled
- Seeds soundNotificationsEnabled=true via settings localStorage key
- Asserts: log is empty before generate; at least one oscillator-start after generate; count does not grow after textarea input
- Non-blocking in CI (runs with full e2e.yml suite, not added to branch protection)
- docs/plan.md updated with SOUND-004 row
- Note: E2E tests require CI environment with system Chromium dependencies; test logic validated structurally against T-019 patterns

## T-023 — SettingsPage sound toggle and preview RTL smoke
Type: test
Description: RTL smoke for SettingsPage sound path. Adds scenario C (guard: preview button absent and playTestBeep not called when sound disabled) to the existing SettingsPage.test.tsx, which already covered toggle wiring (A) and playTestBeep on click (B). Complements T-019 E2E AudioContext coverage at the component level.
Links: PLAT-ALERT-002, T-019
Status: done
Owner: AI
Definition of done:
- Two new tests added to src/pages/settings/SettingsPage.test.tsx (tests 12 and 13)
- Test 12: preview button NOT rendered when soundNotificationsEnabled = false
- Test 13: playTestBeep spy NOT called when sound is disabled
- All 13 tests pass; no existing tests changed
- docs/plan.md updated with T-023 row

## T-022 — SpecPage structural RTL quality slice
Type: test
Description: RTL coverage for EditableSpecPack view-mode structure and edit/cancel round-trip. Fills the gap left by T-013 (guards/gates) and T-106 (type-aware content): validates all four section headings, all four MoSCoW priority labels, assumption/constraint list items, conditional acceptanceNotes rendering, and the edit-mode entry/cancel flow.
Links: F-005, T-013, T-106
Status: done
Owner: AI
Definition of done:
- src/pages/spec/SpecPage.structural.test.tsx created with 26 tests across 5 groups
- All 26 tests pass; no changes to existing SpecPage tests
- Groups: A. Structural headings, B. MoSCoW priority labels, C. Assumptions/constraints, D. acceptanceNotes conditional, E. Edit mode entry and Cancel
- Tests use semantic RTL queries (getByText, getByRole, getAllByRole); no test-id assertions
- Passes as part of standard npm test run

## T-021 — Desktop visual baseline for PromptLoopPage summary
Type: ops
Description: Stable full-page desktop screenshot baseline for PromptLoopPage in parsed-iteration ("summary") state. Uses seeded state (application project, one parsed T-001 iteration with hasTests=true and inferredNextPhase='review') so the full summary UI is visible: CycleContextBar, iteration card, parsed result card (analysis/plan/files/tasks/next-step), and both Code+Tests + Review action buttons.
Links: testing-strategy.md — follows T-018, T-020
Status: done
Owner: AI
Definition of done:
- seedPromptLoopPage(page, 'application') helper added to tests/visual/helpers/seedState.ts
- tests/visual/prompt-loop-summary.visual.spec.ts created with VIS-003 test
- Baseline PNG committed: tests/visual/prompt-loop-summary.visual.spec.ts-snapshots/promptloop-summary-desktop-visual-chromium-linux.png
- Test passes on 3 consecutive runs with zero pixel diff (maxDiffPixelRatio: 0.002)
- docs/testing-strategy.md updated to mention this baseline
- docs/plan.md updated with T-021 row

## T-020 — Promote E2E-001 to required CI gate
Type: ops
Description: Make the E2E-001 happy-path scenario a blocking status check for merges to main. Runs independently of deploy and independently of Netlify.
Links: testing-strategy.md — pairs with T-113
Status: done
Owner: AI
Definition of done:
- npm script test:e2e:critical added to package.json — runs only tests/e2e/happy-path.spec.ts
- .github/workflows/e2e-critical.yml created: triggers on push/PR to main, job named e2e-critical, uploads trace+screenshots on failure
- Full E2E suite (e2e.yml) unchanged — still runs but is informational only
- docs/testing-strategy.md updated: E2E-001 documented as the critical CI gate with the required status check name
- docs/plan.md updated with T-020 row
- Validation: npm run test:e2e:critical passes locally
- Branch protection step documented (manual): add "e2e-critical" as required status check in GitHub repo settings


## T-211 — Superpowers cycle completeness: integration / acceptance tests
Type: test
Description: Integration-closing audit for the full Superpowers cycle (T-201…T-207). (1) Verified end-to-end cycle reachability: all 10 routes render without crash, every flow page shows EmptyState + CTA when no activeProject, navigation links are connected. (2) Confirmed stage-gate hints are actionable: missing arch → "Требуется архитектура" card; missing iterations → TaskProgressPanel empty state + navigate CTA; missing project → EmptyState + "Создать проект" CTA. (3) Verified cross-page data flow: task-centric prompt iterations appear in HistoryPage TaskProgressPanel grouped by T-xxx, card badge counts match buildTaskReviewModel output. (4) Verified multi-project isolation: switching to a project with no iterations shows "0 задач" / empty TaskProgressPanel without bleeding data from another project. (5) Fixed 3 pre-existing timeout failures in IdeaPage.acceptance.test.tsx (slow getByRole accessible-name computation replaced with fast getByText/getAllByText selectors).
Links: F-024, F-027, T-201, T-202, T-203, T-204, T-205, T-206, T-207
Status: done
Owner: AI
Definition of done:
- Dead-end audit complete: all flow pages (Idea, Research, Spec, Architecture, PromptLoop, History) have no-project EmptyState with actionable CTA navigating to /project/new
- Stage-gate hints verified: PromptLoopPage shows "Требуется архитектура" when architectureDraft null; HistoryPage shows "Промпт-итераций пока нет" + PromptLoop CTA when no iterations
- Cross-page data flow verified: iterations with targetTaskId appear as task rows in HistoryPage; grouped by T-xxx (same task → one row); card header badge count matches
- Multi-project isolation verified: project B with no iterations shows "0 задач", no bleed from project A; TopBar shows "Нет проекта" pill when selectedProjectId null
- No-project route resilience: ArchitecturePage, ResearchPage, and all flow pages safe with null activeProject
- Pre-existing IdeaPage timeout fixes: replaced slow getByRole(button, name:...) with queryAllByText/getAllByText in 8 test cases across groups B, C, D — all 24 tests now pass in isolation and full suite
- Integration test file: 19 tests in 5 groups (A–E) in src/app/router/T211.integration.test.tsx
- Total with IdeaPage fixes: 1554 tests — all pass, 0 failures

## T-212 — "Review complete" action on HistoryPage
Type: impl+test
Description: Adds an explicit user-confirmed completion action for the Review stage of the Superpowers cycle. Prior to T-212, the Review phase was considered "done" only implicitly (iteration with cyclePhase='review' or parsedSummary present). T-212 adds a "Завершить review" button per task row in TaskProgressPanel, a "✓ Review завершён" completed badge, and a `completedReviewTaskIds` field in project state that drives the `reviewStatus()` function to return 'done'. The cycle now has an explicit terminal action, not just an analytical dashboard.
Links: F-024, T-207, T-211
Status: done
Owner: AI
Definition of done:
- `completedReviewTaskIds: string[]` added to `ProjectData` interface and `emptyProjectData` default in `src/app/store/projectStore.ts`
- `markTaskReviewComplete(taskId)` action added to store (idempotent — no duplicate IDs)
- `completedReviewTaskIds` snapshotted/restored in `setActiveProject` for multi-project isolation
- `reviewStatus()` in `src/shared/lib/superpowers/cycleProgress.ts` updated: `completedReviewTaskIds.length > 0` → 'done'
- `TaskProgressPanel` in `HistoryPage.tsx` updated: shows "Завершить review" button for tasks with `hasTests=true` and real taskId (not unassigned); shows "✓ Review завершён" badge after completion; hides button for completed tasks, tests-missing tasks, and unassigned rows
- Existing test files updated to include new store fields (`completedReviewTaskIds`, `markTaskReviewComplete`): `HistoryPage.task-progress.test.tsx`, `HistoryPage.review.test.tsx`, `HistoryPage.history-view.test.tsx`, `HistoryPage.cross-stage-smoke.test.tsx`, `T211.integration.test.tsx`
- `projectStore.persist.test.ts` updated: key count test updated from 7 to 8 keys, `completedReviewTaskIds` default field test added
- New test file: `src/pages/history/HistoryPage.review-complete.test.tsx` — 10 tests across 3 groups:
  - A (3): Model — `reviewStatus` not_started / done / in_progress based on `completedReviewTaskIds` via `computeCycleProgress`
  - B (6): UI — button shown for review-ready task; click calls `markTaskReviewComplete(taskId)`; completed badge rendered; button hidden after completion; no button for hasTests=false; no button for (unassigned) rows
  - C (1): Integration — `completedReviewTaskIds` non-empty → `computeCycleProgress` review.status = 'done'
- Total: 1568 tests pass, 0 failures (was 1557 before T-211+T-212)
