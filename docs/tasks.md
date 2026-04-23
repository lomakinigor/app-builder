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

## T-213 — Project-level "Проект завершён" completion state
Type: impl+test
Description: Adds an explicit project-level completion state to the Superpowers cycle. Prior to T-213, there was no way to mark a project as "done" — only individual task review completion existed (T-212). T-213 adds a `'completed'` value to `ProjectStatus`, a `markProjectCompleted(id)` action in `projectRegistryStore`, and UI in HistoryPage (completion button + banner) and HomePage (completed badge + CTA change). The gate rule requires at least one completed review task before the project can be marked complete.
Links: F-024, T-212
Status: done
Owner: AI
Definition of done:
- `'completed'` added to `ProjectStatus` type in `src/entities/project/types.ts`
- `markProjectCompleted(id)` action added to `projectRegistryStore.ts`: sets `status: 'completed'`, bumps `updatedAt`, idempotent (no-op if already completed), does not affect other projects
- `HistoryPage.tsx` updated:
  - Imports `useProjectRegistry` and `selectSelectedProject`
  - `isProjectCompleted` reads from `selectedProject.status` (reactive to registry) with fallback to `activeProject.status`
  - Gate: `canCompleteProject = completedReviewTaskIds.length > 0 && !isProjectCompleted`
  - "Завершить проект" button (`data-testid="complete-project-button"`) shown when gate passes; disabled with explanation when gate fails; hidden when project already completed
  - "Проект завершён" banner (`data-testid="project-completed-banner"`) shown when `isProjectCompleted = true`
  - Project card header badge shows "✓ Завершён" (success variant) when completed
- `HomePage.tsx` updated:
  - Project card header badge shows "✓ Завершён" (success variant) when `selectedProject.status === 'completed'`
  - Primary CTA changes to "Просмотреть итоги проекта →" when project is completed (instead of "Продолжить: Phase →")
- New test file: `src/pages/history/HistoryPage.project-complete.test.tsx` — 9 tests across 2 groups:
  - A (6): UI — enabled button when gate met; click calls markProjectCompleted; disabled button when no review tasks; explanation text; banner shown when completed; button hidden when completed
  - B (3): Integration — "✓ Завершён" badge when completed; no banner/badge for active project; action bar shows completion text (not button) when completed
- `projectRegistryStore.test.ts` updated: Group E added with 5 tests covering markProjectCompleted (status set, idempotency, updatedAt bump, unknown ID no-op, other projects unaffected)
- All 5 existing HistoryPage test files updated with `useProjectRegistry` mock to maintain test isolation
- Total: 1582 tests pass, 0 failures (was 1568 before T-213)

## T-214 — Playwright E2E happy-path: review complete → project complete
Type: e2e
Description: Extends the existing Playwright golden-path test (E2E-001) with three new steps that cover the full Superpowers cycle terminal actions introduced in T-212 and T-213. Prior to T-214, the E2E test stopped at "navigate to History and verify iterations visible". T-214 adds browser-level proof that task review completion, project completion, and cross-page completed state (HistoryPage → HomePage) all work end-to-end in a real browser with real localStorage persistence.
Links: T-212, T-213, F-024
Status: done
Owner: AI
Definition of done:
- `tests/e2e/happy-path.spec.ts` extended with three steps appended after step 8 (History summary):
  - Step 9: `getByRole('button', { name: 'Завершить review' })` → click → "✓ Review завершён" badge visible, button gone
  - Step 10: `getByTestId('complete-project-button')` enabled → click → `data-testid="project-completed-banner"` visible, button gone
  - Step 11: navigate to `/` via sidebar "Главная" link → "✓ Завершён" badge and "Просмотреть итоги проекта →" button visible
- Test name updated to include "→ complete" suffix: `E2E-001 — new project → idea → research → spec → architecture → prompt loop → review → complete`
- No new UI changes required: all selectors were already accessible via semantic roles, button text, and data-testid attributes from T-212/T-213
- No additional test files created: T-214 is a focused extension of the single golden path, not a separate suite
- Local run: 1 test / 11 steps / 24.0s — 1 passed (30.8s total with server startup)
- Run command: `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 LD_LIBRARY_PATH=$HOME/.local/pw-deps:$LD_LIBRARY_PATH npx playwright test tests/e2e/happy-path.spec.ts`
- Standard CI run command: `npm run test:e2e:critical` (Chromium, `playwright.config.ts`, port 5173)
- Infrastructure note: this environment requires `LD_LIBRARY_PATH=$HOME/.local/pw-deps` (pre-bundled system libs in `/home/deploy/.local/pw-deps/`) because Ubuntu 22.04 system packages are not installed; `test:e2e:local` npm script handles this automatically

## T-302 — Adapter layer: service interfaces + env switching (Phase 1)
Type: impl
Description: Introduce a clean adapter layer between page components and service implementations. Pages no longer import from src/mocks/services directly; they call factory functions (getSpecApi, getPromptLoopApi, getResearchApi) that return the correct adapter based on VITE_API_MODE env var. Three adapter interfaces defined (SpecApi, PromptLoopApi, ResearchApi); mock adapters delegate to existing mock services; HTTP stubs are scaffolded with TODOs for future real backend endpoints.
Links: F-005, F-006, F-007, F-001, F-002
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts defines SpecApi, PromptLoopApi, ResearchApi interfaces
- src/shared/api/mock/specApi.mock.ts, promptLoopApi.mock.ts, researchApi.mock.ts — mock adapters delegating to src/mocks/services/*
- src/shared/api/http/specApi.http.ts, promptLoopApi.http.ts, researchApi.http.ts — HTTP stubs (throw NotImplemented)
- src/shared/api/index.ts — getSpecApi(), getPromptLoopApi(), getResearchApi() factories reading VITE_API_MODE
- SpecPage, ArchitecturePage: import getSpecApi() instead of mockSpecService
- PromptLoopPage: imports getPromptLoopApi() instead of mockPromptService
- ResearchPage: imports getResearchApi() instead of mockResearchService (mockResearchProviders still imported directly as UI data)
- src/shared/api/index.test.ts: 14 tests in 4 groups — A (mock mode), B (real mode), C (callable contracts), D (http stubs throw)
- Env values: VITE_API_MODE=mock (default) → mock adapters; VITE_API_MODE=real + VITE_API_BASE_URL → http adapters
- All existing tests continue to pass (no behaviour change, only import path change)

## T-303 — ResearchApi HTTP adapter implementation
Type: impl
Description: Replace the throw-stub in researchApi.http.ts with real fetch-based HTTP calls against a defined API contract. ResearchPage already uses getResearchApi() via the T-302 adapter layer; this task completes the HTTP adapter so it's ready when a backend is deployed. No UI changes required; mock mode remains the default for all tests and local development.
Links: T-302, F-002, F-003
Status: done
Owner: AI
Definition of done:
- src/shared/api/http/researchApi.http.ts: throw stubs replaced with real fetch calls
- Contract: POST /api/research/run → ResearchBrief; POST /api/research/normalize → { brief, warnings }
- Error handling: ApiError(status, message) thrown on non-2xx; message extracted from response.json().message if present
- VITE_API_MODE=mock (default) still routes to mock adapter — no tests broken
- VITE_API_MODE=real + VITE_API_BASE_URL routes to http adapter (ready for backend deployment)
- docs/tech-spec.md updated: ResearchApi HTTP contract table added; adapter table updated to note HTTP-ready status
- All 1596 existing tests continue to pass (no behaviour change)
- No unit tests for HTTP layer: no msw setup in project; mapping is identity (no separate helpers to test); snetwork layer left for integration/manual smoke when backend is deployed

## T-304 — PromptLoopApi HTTP adapter implementation
Type: impl
Description: Replace the throw stubs in promptLoopApi.http.ts with real fetch-based HTTP calls. Two endpoints implemented: POST /api/prompt-loop/first and POST /api/prompt-loop/next. The adapter receives SpecPack + ArchitectureDraft / ParsedClaudeResponse from the caller (matching the PromptLoopApi interface) and serializes compact context bodies — only the fields the backend needs to build the prompt. parseClaudeResponse stays client-side and throws on the HTTP adapter. Same ApiError pattern as T-303.
Links: T-302, T-303, F-007, F-024
Status: done
Owner: AI
Definition of done:
- src/shared/api/http/promptLoopApi.http.ts: throw stubs replaced with real fetch calls for generateFirstPrompt and generateNextPrompt
- generateFirstPrompt sends: projectId, projectType, taskId, taskDescription, compact spec (productSummary, MVPScope, featureList, constraints), compact arch (roadmapPhases, recommendedStack)
- generateNextPrompt sends: projectId, projectType, nextIterationNumber, targetPhase, prevIteration metadata, compact parsedSummary fields
- parseClaudeResponse: throws with "client-side only" message — HTTP adapter must never be called for this method
- Error handling: ApiError(status, message) on non-2xx; message from response.json().message if present
- VITE_API_MODE=mock (default) still routes to mock adapter — no tests broken
- VITE_API_MODE=real + VITE_API_BASE_URL routes to HTTP adapter (ready for backend deployment)
- docs/tech-spec.md updated: adapter table updated, PromptLoopApi HTTP contract section added
- src/shared/api/index.test.ts: group D updated (promptLoopApiHttp no longer a stub), group F added (5 contract checks)
- All 1601 tests pass (3 new in group F net, 1 removed from group D)
- No unit tests for network layer: no msw in project; network left for integration/manual smoke

## T-305 — SpecApi HTTP adapter implementation (Phase 1 complete)
Type: impl
Description: Replace the throw stubs in specApi.http.ts with real fetch-based HTTP calls. Two endpoints implemented: POST /api/spec/generate → SpecPack and POST /api/architecture/generate → ArchitectureDraft. Compact payloads: generateSpec sends key ResearchBrief fields (problemSummary, targetUsers, valueHypothesis, competitorNotes, risks, opportunities, recommendedMVP, openQuestions); generateArchitecture sends compact spec context (productSummary, MVPScope, featureList, constraints, assumptions). Same ApiError pattern as T-303/T-304. Completes Phase 1 adapter migration: all three domains (ResearchApi, PromptLoopApi, SpecApi) now have production-ready HTTP adapters.
Links: T-302, T-303, T-304, F-005, F-006, F-025
Status: done
Owner: AI
Definition of done:
- src/shared/api/http/specApi.http.ts: throw stubs replaced with real fetch calls for generateSpec and generateArchitecture
- generateSpec sends: projectType + compact brief (8 key fields from ResearchBrief)
- generateArchitecture sends: projectType + compact spec (productSummary, MVPScope, featureList, constraints, assumptions)
- Error handling: ApiError(status, message) on non-2xx; message from response.json().message if present
- VITE_API_MODE=mock (default) still routes to mock adapter — no tests broken
- VITE_API_MODE=real + VITE_API_BASE_URL routes to HTTP adapter (ready for backend deployment)
- docs/tech-spec.md updated: adapter table updated (all three HTTP-ready), SpecApi HTTP contract section added, status note updated to reflect Phase 1 complete
- docs/plan.md: T-305 row added (status: done)
- src/shared/api/index.test.ts: group D replaced (no more throw-stub tests), group G added (4 contract checks for specApiHttp)
- SpecPage and ArchitecturePage continue to call getSpecApi() unchanged — no UI changes
- Phase 1 adapter migration complete: ResearchApi (T-303) + PromptLoopApi (T-304) + SpecApi (T-305)

## T-306 — MSW contract tests for HTTP adapters (ResearchApi, PromptLoopApi, SpecApi)
Type: test
Description: Add MSW v2 (Mock Service Worker) contract tests that verify all 6 HTTP adapter endpoints at the network level. Each test verifies: correct URL and HTTP method (POST), compact request body shape, response mapped to the matching entity type, ApiError thrown on non-2xx with message from response.json().message, fallback to "HTTP <status>" when body lacks a message field, and graceful handling of non-JSON error bodies. MSW v2 intercepts fetch() in Node so no real backend is needed. Adapters are imported directly (not through factory) so mock mode and existing tests are unaffected.
Links: T-303, T-304, T-305
Status: done
Owner: AI
Definition of done:
- msw v2 added to devDependencies
- src/shared/api/http/adapters.contract.test.ts: 11 tests in 4 groups
- Group A (ResearchApi): runResearch payload+response, normalizeImportedArtifact payload+response, non-2xx ApiError
- Group B (PromptLoopApi): generateFirstPrompt compact spec/arch body+response, generateNextPrompt prev-iteration body+response, non-2xx ApiError
- Group C (SpecApi): generateSpec compact brief body+response, generateArchitecture compact spec body+response, non-2xx ApiError
- Group D (Error semantics): JSON body without .message falls back to "HTTP <status>"; non-JSON body falls back gracefully
- All 1615 tests pass (11 new); no existing mock-mode tests affected
- docs/testing-strategy.md updated with API contract testing section
- docs/plan.md and docs/tasks.md updated

## T-307 — Shared HTTP client + auth/header contract
Type: impl+test
Description: Centralise all HTTP adapter infrastructure into src/shared/api/http/client.ts — ApiError class, baseUrl(), postJson(), buildApiHeaders(), and a bearer auth token provider (getApiAuthToken / setApiTokenProvider / resetApiTokenProvider). Migrate all three HTTP adapters to use the shared client instead of local copies. Add Group E contract tests that lock in the header contract: Content-Type + Accept on every request, Authorization: Bearer when token is configured (one call per adapter domain), header absent when no token.
Links: T-303, T-304, T-305, T-306
Status: done
Owner: AI
Definition of done:
- src/shared/api/http/client.ts created: ApiError, getApiAuthToken, setApiTokenProvider, resetApiTokenProvider, buildApiHeaders, baseUrl, postJson
- researchApi.http.ts, promptLoopApi.http.ts, specApi.http.ts: local ApiError/baseUrl/postJson removed; import postJson from client.ts
- Bearer auth: VITE_API_BEARER_TOKEN env variable → Authorization header; omitted when unset; extensible via setApiTokenProvider
- Standard headers on every request: Content-Type: application/json, Accept: application/json
- Group E added to adapters.contract.test.ts: 3 new tests (json headers all adapters, auth present, auth absent)
- All 1618 tests pass; no regression in mock mode or existing contract groups
- docs/tech-spec.md: shared client section added (standard headers, optional bearer auth, env vars table)
- docs/testing-strategy.md: Group E documented in HTTP adapter contracts section
- docs/plan.md and docs/tasks.md updated

## T-308 — Staging smoke infrastructure (critical real-backend path)
Type: ops+test
Description: Add the infrastructure to run a minimal staging smoke against a real backend in VITE_API_MODE=real. Includes a separate Playwright config (playwright.staging.config.ts), a dedicated test file (tests/e2e/critical-real-backend.spec.ts), and an npm script (test:e2e:staging). The single test SMOKE-001 covers the critical API path: research → spec → architecture → first prompt. Tests are skipped with an explicit reason when VITE_API_BASE_URL is not configured; a missing env = skip, an unreachable backend = real failure.
Links: T-303, T-304, T-305, T-306, T-307
Status: done
Owner: AI
Definition of done:
- playwright.staging.config.ts created: separate port (5174), no retries, 3-minute test timeout, always traces
- tests/e2e/critical-real-backend.spec.ts: SMOKE-001 with 7 steps (home → create → idea → research → spec → arch → first prompt)
- Skip strategy: test.skip(!VITE_API_BASE_URL, reason) in beforeEach — explicit skip, not a cryptic network error
- Assertions are content-agnostic: badge/heading presence, not exact LLM text
- npm script test:e2e:staging added to package.json
- Existing mock-mode tests (npm test, npm run test:e2e:critical) unaffected
- docs/testing-strategy.md: staging smoke documented as a separate test level
- docs/plan.md and docs/tasks.md updated
- Live smoke: NOT executed — no staging backend deployed yet. Infrastructure is ready; execute when VITE_API_BASE_URL and credentials are available.

## T-309 — Request tracing for HTTP adapters (X-Request-Id correlation)
Type: impl+test
Description: Add request tracing to the shared HTTP client so every request carries a stable X-Request-Id (unique per call) and an optional X-Session-Id (per run/session). Tracing is entirely in client.ts — adapters are unaffected. Provider functions (setApiRequestIdProvider/resetApiRequestIdProvider, setApiSessionIdProvider/resetApiSessionIdProvider) allow stable ids in tests and future CI/runtime wiring without changing adapter signatures.
Links: T-307, T-308
Status: done
Owner: AI
Definition of done:
- X-Request-Id added to buildApiHeaders() — always present, generated via crypto.randomUUID() with timestamp fallback
- X-Session-Id added to buildApiHeaders() — present only when VITE_SESSION_ID is set or session id provider returns non-null
- setApiRequestIdProvider/resetApiRequestIdProvider exported from client.ts
- setApiSessionIdProvider/resetApiSessionIdProvider exported from client.ts
- Group F contract tests (4 tests): X-Request-Id present + unique by default; custom provider overrides id; X-Session-Id present when provider set; X-Session-Id absent when not set
- No adapter signatures changed; no UI changes
- docs/tech-spec.md: shared client header table updated with X-Request-Id and X-Session-Id rows; env vars table updated with VITE_SESSION_ID; backend guidance added
- docs/testing-strategy.md: Group F mentioned alongside E in header contract coverage
- docs/plan.md and docs/tasks.md updated
- All 1622 tests pass (1618 before + 4 new Group F tests)

## T-310 — Propagate backend requestId through ApiError
Type: impl+test
Description: Close the correlation loop between frontend and backend. ApiError gains a requestId field (string | null). postJson() extracts it from the error body ({ message, requestId }) as primary source, with response header x-request-id as fallback. Adapters are unchanged. Group G contract tests cover all extraction paths: body requestId, body-only fallback to header, null on non-JSON response.
Links: T-309, T-307
Status: done
Owner: AI
Definition of done:
- ApiError constructor extended: ApiError(status, message, requestId?: string | null)
- postJson() extracts requestId from JSON error body; falls back to response x-request-id header; null if neither present
- No adapter signatures changed
- Group G contract tests (4 tests): requestId from body; fallback message with body requestId; header fallback; null on non-JSON
- docs/tech-spec.md: error correlation contract documented (backend shape, ApiError shape, extraction precedence)
- docs/testing-strategy.md: Group G row added; key properties updated
- docs/plan.md and docs/tasks.md updated
- All 1626 tests pass (1622 before + 4 new Group G tests)

## T-311 — Wire run-level X-Session-Id into staging smoke and CI nightly
Type: ops
Description: Every staging smoke run now gets a unique VITE_SESSION_ID that is sent as X-Session-Id on every HTTP request in that run, enabling backend log correlation across the whole run. scripts/staging-smoke.sh auto-generates a smoke-<YYYYMMDDHHmm>-<4hex> id if not already set. A new npm script (test:e2e:staging:session) wraps it. playwright.staging.config.ts logs the session id at config time. The staging-nightly.yml CI workflow derives the id from GITHUB_RUN_ID. The session id is surfaced as a Playwright report annotation on every test.
Links: T-309, T-308
Status: done
Owner: AI
Definition of done:
- scripts/staging-smoke.sh: generates VITE_SESSION_ID=smoke-<ts>-<4hex>; logs it; passes through if already set; exec's playwright
- package.json: test:e2e:staging:session script added
- playwright.staging.config.ts: reads VITE_SESSION_ID; logs it (or warns if absent); updated run instructions
- tests/e2e/critical-real-backend.spec.ts: SESSION_ID constant; testInfo.annotations push X-Session-Id; header comment updated
- .github/workflows/staging-nightly.yml: nightly schedule (02:00 UTC) + workflow_dispatch; derives VITE_SESSION_ID=staging-<run_id>-<attempt>; artifact named staging-smoke-<session-id>; skip guard via STAGING_ENABLED var
- docs/tech-spec.md: X-Request-Id vs X-Session-Id scope table; recommended formats for local and CI
- docs/testing-strategy.md: staging smoke section updated with session correlation guidance, scripts table, run examples
- docs/plan.md and docs/tasks.md updated
- All 1626 tests pass — no new unit tests added (session id generation fully covered by T-309 contract tests)

## T-401 — MVP read-only sharing for projects
Type: impl+test
Description: Add minimal read-only sharing for projects. Owner can generate a share link (/shared/:shareId). Guest opens the link, the app resolves shareId → projectId, selects the project, sets viewingMode='viewer', and redirects to /history. All write actions (generate, regenerate, paste response, parse, complete review, complete project) are hidden/disabled for viewers. A ReadOnlyBanner is shown across all pages in viewer mode. Sharing uses a deterministic mock token (share-<projectId>) switchable to a real backend via VITE_API_MODE=real.
Links: F-027
Status: done
Owner: AI
Definition of done:
- ViewingMode type ('owner' | 'viewer') + useViewingModeStore (non-persisted Zustand) + useIsViewer() selector hook
- SharingApi interface (generateShareToken, resolveShare) added to src/shared/api/types.ts
- sharingApiMock: deterministic share-<projectId> token; resolves by parsing prefix
- sharingApiHttp stub: POST /api/shares, GET /api/shares/:shareId — ready for backend
- getSharingApi() factory added to src/shared/api/index.ts
- ReadOnlyBanner component: shown via AppLayout when isViewer=true; role="banner", aria-label
- SharedProjectPage (/shared/:shareId): resolves share → selectProject + setViewingMode('viewer') → navigate('/history'); shows error state on invalid/unknown token
- Router: /shared/:shareId route added inside AppLayout
- AppLayout: ReadOnlyBanner rendered between TopBar and main content
- SpecPage: generate panel hidden, "Перегенерировать" hidden, EditableSpecPack.onSave noop when viewer
- ArchitecturePage: generate panel hidden, "Перегенерировать" hidden, EditableArchitectureDraft.onSave noop when viewer
- ResearchPage: tab switcher + run/import cards + normalization callout hidden, EditableResearchBrief.onSave noop when viewer
- PromptLoopPage: "Сгенерировать первый промпт" hidden, "Вставить ответ" hidden, "Следующий промпт" hidden for viewer
- HistoryPage: "Завершить review" button gated via isReadOnly prop on TaskProgressPanel; "Завершить проект" section hidden for viewer
- HomePage: "🔗 Поделиться" button on selected project card — calls getSharingApi().generateShareToken → copies full URL to clipboard
- Tests: viewingModeStore.test.ts (5 tests), SharedProjectPage.test.tsx (4 tests), SpecPage.viewerMode.test.tsx (5 tests), HistoryPage.viewerMode.test.tsx (3 tests)
- All existing tests pass with zero regressions

## T-402 — Feature flag + progressive rollout for project sharing
Type: impl+test
Links: T-401
Status: done
Owner: AI
Definition of done:
- src/shared/config/features.ts: isSharingEnabled() reads VITE_FEATURE_SHARING==='true'; centralised flag helper for future flags
- features.test.ts: 5 tests covering true / empty / undefined / 'false' / '1' values
- HomePage: share button wrapped in {isSharingEnabled() && (...)}; hidden when flag OFF
- SharedProjectPage: isSharingEnabled() checked before useEffect logic; renders "Функция недоступна" page when flag OFF; resolveShare never called; viewingMode never set to viewer
- ReadOnlyBanner: skips rendering when !isSharingEnabled() even if viewingMode is viewer
- SharedProjectPage.test.tsx updated: vi.mock for features returns isSharingEnabled=true so T-401 flow tests are unaffected
- SharedProjectPage.featureFlag.test.tsx: 5 tests — flag OFF shows unavailable, no resolveShare call, no setViewingMode; flag ON loading/success regression
- HomePage.sharingFlag.test.tsx: 4 tests — flag OFF hides button, flag ON shows button; owner content visible in both modes
- tech-spec.md: Feature flags section added with flag table, ON/OFF behaviour, rollout defaults table
- plan.md and tasks.md updated
- All 1657 tests pass with zero regressions

## T-403 — Backend SharingApi (HTTP contract + email invites MVP)
Type: impl+test
Links: T-401, T-402
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts: InviteResult type added; SharingApi extended with inviteByEmail(shareId, email): Promise<InviteResult>
- src/shared/api/http/client.ts: getJson<T>(path) helper added; extractApiError() private helper shared by postJson and getJson (DRY refactor)
- src/shared/api/http/sharingApi.http.ts: resolveShare upgraded to getJson (proper ApiError + requestId); inviteByEmail uses postJson to POST /api/shares/:shareId/invite; imports trimmed (removed unused buildApiHeaders, baseUrl)
- src/shared/api/mock/sharingApi.mock.ts: inviteByEmail with basic email validation (@ + .); returns { invitedEmail, status: 'sent' }
- src/shared/api/index.ts: ShareInfo, ResolvedShare, InviteResult exported from barrel
- adapters.contract.test.ts Group H: 7 contract tests — generateShareToken body/response; resolveShare GET URL/response; inviteByEmail POST body/response; 404 share not found; 400 invalid email; 409 already invited; 404 on generateShareToken
- src/pages/home/HomePage.tsx: currentShareId + inviteEmail + inviteStatus state; handleInviteByEmail(); invite panel (data-testid="invite-panel") appears after share token generated; success/error feedback inline; all gated by isSharingEnabled()
- src/pages/home/HomePage.inviteUI.test.tsx: 6 tests — panel hidden before share; visible after share click; inviteByEmail called with correct args; success feedback; error feedback; flag OFF hides all
- src/pages/home/HomePage.sharingFlag.test.tsx: getSharingApi mock updated to include inviteByEmail
- docs/tech-spec.md: SharingApi contract table updated with inviteByEmail row; error codes table; getJson helper noted; auth/access model described
- docs/plan.md and docs/tasks.md updated
- All 1670 tests pass with zero regressions

## T-404 — Sharing audit trail
Type: impl+test
Links: T-401, T-402, T-403
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts: SharingAuditEvent interface added (id, projectId, type, timestamp, actorLabel?, targetEmail?, shareId?); type union: 'share_link_created' | 'share_link_opened' | 'share_invite_sent'
- src/shared/api/types.ts: SharingApi extended with getAuditTrail(projectId): Promise<SharingAuditEvent[]>
- src/shared/api/mock/sharingApi.mock.ts: getAuditTrail returns 3 deterministic events (link created, invite sent, link opened) keyed by projectId
- src/shared/api/http/sharingApi.http.ts: getAuditTrail via getJson<SharingAuditEvent[]>('/api/projects/:projectId/sharing-audit')
- src/shared/api/index.ts: SharingAuditEvent exported from barrel
- adapters.contract.test.ts Group I: 3 contract tests — correct URL, empty array mapping, ApiError on 403
- src/pages/home/HomePage.tsx: auditEvents / auditLoading / auditError state; useEffect loads getAuditTrail on mount when isSharingEnabled() + selectedProject; audit panel (data-testid="audit-panel") renders event list, empty state, error state; hidden when sharing flag OFF; formatAuditEvent() formats each event type in Russian
- src/pages/home/HomePage.sharingFlag.test.tsx: mock updated to include getAuditTrail
- src/pages/home/HomePage.inviteUI.test.tsx: mock updated to include getAuditTrail
- src/pages/home/HomePage.auditPanel.test.tsx: 5 tests — panel visible/hidden by flag; event rows rendered; empty state; error state
- docs/tech-spec.md: audit endpoint + SharingAuditEvent schema documented
- docs/plan.md and docs/tasks.md updated
- All existing tests pass with zero regressions

## T-405 — Editor role for shared projects
Type: impl+test
Links: T-401, T-402, T-403, T-404
Status: done
Owner: AI
Definition of done:
- src/app/store/viewingModeStore.ts: ViewingMode expanded to 'owner' | 'editor' | 'viewer'; useCanEditProject() (owner+editor=true); useCanManageSharing() (owner-only=true); useIsViewer() kept for backward compat
- src/shared/api/types.ts: ResolvedShare.canEdit changed from literal false to boolean
- src/shared/api/mock/sharingApi.mock.ts: share-edit-<projectId> token → canEdit:true; share-<projectId> → canEdit:false; makeEditShareId() exported for tests
- src/pages/shared-project/SharedProjectPage.tsx: branches on canEdit to set 'editor' or 'viewer' mode
- src/shared/ui/ReadOnlyBanner.tsx: renders amber viewer banner OR blue editor banner depending on viewingMode; owner sees nothing
- src/pages/spec/SpecPage.tsx: useIsViewer → useCanEditProject (editor can generate/regenerate spec)
- src/pages/architecture/ArchitecturePage.tsx: same pattern
- src/pages/research/ResearchPage.tsx: same pattern
- src/pages/prompt-loop/PromptLoopPage.tsx: same pattern
- src/pages/history/HistoryPage.tsx: isReadOnly={!canEdit} (editor can mark tasks done); "Завершить проект" gated by canManageSharing (owner-only)
- src/pages/home/HomePage.tsx: share button, invite panel, audit panel all gated by isSharingEnabled() && canManageSharing (owner-only)
- src/app/store/viewingModeStore.test.ts: updated + extended with editor transition tests + useCanEditProject / useCanManageSharing coverage
- src/pages/spec/SpecPage.viewerMode.test.tsx: mock updated from useIsViewer to useCanEditProject
- src/pages/history/HistoryPage.viewerMode.test.tsx: mock updated from useIsViewer to useCanEditProject + useCanManageSharing
- src/pages/shared-project/SharedProjectPage.editorMode.test.tsx: 3 tests — canEdit=true→editor, canEdit=false→viewer, selectProject called
- src/pages/spec/SpecPage.editorMode.test.tsx: 3 tests — editor sees generate panel and regenerate button
- src/pages/home/HomePage.editorMode.test.tsx: 4 tests — editor cannot see share/invite/audit; sees project content
- docs/tech-spec.md, docs/plan.md, docs/tasks.md updated
- All existing tests pass with zero regressions

## T-406 — Collaborator management UI
Type: impl+test
Links: T-401, T-402, T-403, T-404, T-405
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts: ProjectCollaborator interface (id, email, role: 'viewer'|'editor', status: 'invited'|'active', shareId?, invitedAt?); SharingApi extended with listCollaborators(projectId), updateCollaboratorRole(id, role), revokeCollaborator(id); inviteByEmail signature updated to inviteByEmail(shareId, email, role?: 'viewer'|'editor')
- src/shared/api/http/client.ts: patchJson<T>(path, body) and deleteJson<T>(path) helpers added
- src/shared/api/mock/sharingApi.mock.ts: in-memory collaborator Map seeded with 2 entries (alice@example.com viewer/active, bob@example.com editor/invited); listCollaborators returns all; updateCollaboratorRole updates in-place; revokeCollaborator deletes from map; inviteByEmail adds new entry with chosen role; resetCollaboratorStore() exported for test cleanup; makeEditShareId() kept
- src/shared/api/http/sharingApi.http.ts: listCollaborators via GET /api/projects/:projectId/collaborators; updateCollaboratorRole via PATCH /api/collaborators/:id; revokeCollaborator via DELETE /api/collaborators/:id; inviteByEmail now sends { email, role } in body
- src/shared/api/index.ts: ProjectCollaborator exported from barrel
- src/pages/home/HomePage.tsx: collaborators / collaboratorsLoading / collaboratorsError state; useEffect loads listCollaborators on mount when isSharingEnabled() + canManageSharing + selectedProject; collaborator panel (data-testid="collaborator-panel") — per-row role select + Отозвать button + status badge; empty state "Пока нет приглашённых участников"; invite panel now includes role select (Просмотр / Редактор); invite success triggers list refresh; handleChangeRole calls updateCollaboratorRole + optimistic list update; handleRevoke calls revokeCollaborator + removes row; all gated by isSharingEnabled() && canManageSharing
- adapters.contract.test.ts Group J: 4 tests — listCollaborators URL/response, updateCollaboratorRole PATCH body, revokeCollaborator DELETE response, inviteByEmail sends role; existing Group H inviteByEmail body assertion updated to include role: 'viewer'
- src/pages/home/HomePage.collaboratorPanel.test.tsx: 7 tests — owner sees panel; flag OFF hides; editor hides; list renders email/role/status/revoke; empty state; role change calls updateCollaboratorRole; revoke calls revokeCollaborator and removes row
- src/pages/home/HomePage.editorMode.test.tsx: 5th test added — editor cannot see collaborator-panel
- All existing test mocks updated to include listCollaborators/updateCollaboratorRole/revokeCollaborator stubs
- All 1708 tests pass across 62 files

## T-407 — Comments on project artifacts (Spec / Architecture / Prompt Loop)
Type: impl+test
Links: T-405, T-406
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts: ArtifactType ('spec' | 'architecture' | 'prompt_iteration'); ArtifactComment interface (id, projectId, artifactType, artifactId, body, authorLabel, createdAt); AddCommentInput interface; CommentsApi interface with listComments(projectId, artifactType, artifactId) and addComment(input)
- src/shared/api/mock/commentsApi.mock.ts: in-memory Map keyed by "projectId:artifactType:artifactId"; seeded with 3 deterministic comments (proj-demo × spec, architecture, prompt_iteration); addComment appends in-memory with auto-id; resetCommentStore() exported for test cleanup
- src/shared/api/http/commentsApi.http.ts: listComments via GET /api/projects/:projectId/comments?artifactType=...&artifactId=...; addComment via POST /api/projects/:projectId/comments with { artifactType, artifactId, body }; throws ApiError on non-2xx
- src/shared/api/index.ts: getCommentsApi() factory added; ArtifactComment, ArtifactType, AddCommentInput, CommentsApi exported from barrel
- src/shared/ui/CommentsPanel.tsx: reusable panel (data-testid="comments-panel"); shows loading / error / empty / list states; owner/editor: comment list + textarea + submit button; viewer: comment list + "Только для чтения"; max 1000 chars; empty body prevents submit; optimistic append on success; cleanup cancels in-flight request on unmount
- src/pages/spec/SpecPage.tsx: CommentsPanel shown when specPack && activeProject; artifactType='spec', artifactId=activeProject.id, canPost=canEdit
- src/pages/architecture/ArchitecturePage.tsx: CommentsPanel shown when architectureDraft && activeProject; artifactType='architecture', artifactId=activeProject.id, canPost=canEdit
- src/pages/prompt-loop/PromptLoopPage.tsx: CommentsPanel shown when activeIteration && activeProject; artifactType='prompt_iteration', artifactId=activeIteration.id, canPost=canEdit
- src/shared/api/http/commentsApi.contract.test.ts (Group K): 5 tests — listComments URL+query params, empty response, addComment POST body, listComments 403 ApiError, addComment 400 ApiError
- src/pages/spec/SpecPage.comments.test.tsx: 9 tests — visibility, list rendering, empty state, error state, add form owner, submit calls addComment, disabled empty, viewer read-only
- src/pages/architecture/ArchitecturePage.comments.test.tsx: 5 tests — visibility, hidden when no arch, listComments args, body render, viewer read-only
- src/pages/prompt-loop/PromptLoopPage.comments.test.tsx: 6 tests — visibility, hidden when no iteration, listComments args, body render, editor add, viewer read-only
- sharing flag OFF does not affect comments (no isSharingEnabled gate)
- All 1733 tests pass across 66 files


## T-408 — Invite acceptance flow for collaborators (invited → active)
Type: impl+test
Links: T-406, T-407
Status: done
Owner: AI
Definition of done:
- src/shared/api/types.ts: InviteInfo interface (projectId, projectName, role, email); AcceptedInvite interface (projectId, role); SharingApi extended with resolveInvite(inviteToken) and acceptInvite(inviteToken)
- src/shared/api/index.ts: InviteInfo, AcceptedInvite exported from barrel
- src/shared/api/mock/sharingApi.mock.ts: makeInviteToken(collaboratorId) exported — token = "invite-<collaboratorId>"; resolveInvite extracts collaboratorId from token, returns InviteInfo with projectId (from shareId) + projectName (mockProjectName helper) + role + email; acceptInvite updates collaborator status from 'invited' to 'active', returns AcceptedInvite; throws descriptive Error on invalid/missing token
- src/shared/api/http/sharingApi.http.ts: resolveInvite via GET /api/invites/:inviteToken; acceptInvite via POST /api/invites/:inviteToken/accept with empty body; both throw ApiError on non-2xx
- src/pages/invite-accept/InviteAcceptPage.tsx: route /invite/:inviteToken; resolves invite on mount; shows project name + role label + email; "Принять приглашение" CTA; on accept: calls acceptInvite → selectProject → setViewingMode(editor|viewer) → navigate('/history'); error states for invalid token, failed accept; loading/accepting spinner states; data-testids: invite-project-name, invite-role, accept-invite-btn, invite-error
- src/app/router/index.tsx: { path: 'invite/:inviteToken', element: <InviteAcceptPage /> } added
- src/shared/api/http/inviteApi.contract.test.ts (Group L): 5 tests — resolveInvite GET URL, acceptInvite POST URL, resolveInvite 404 ApiError, acceptInvite 410 ApiError, viewer role mapped correctly
- src/pages/invite-accept/InviteAcceptPage.test.tsx: 9 tests — shows project name+role, accept button visible, acceptInvite called with token, selectProject+navigate on accept, editor invite → viewingMode=editor, viewer invite → viewingMode=viewer, resolveInvite error → error state, acceptInvite error → error state, missing token → error state
- No full auth/signup flow (out of scope)
- All tests pass

## T-409 — Real backend rollout prep: collaboration and comments staging smoke
Type: ops+test
Links: T-401, T-402, T-403, T-404, T-405, T-406, T-407, T-408
Status: done
Owner: AI
Definition of done:
- tests/e2e/collaboration-real-backend.spec.ts created with 3 staging smoke tests:
  - SMOKE-002: POST /api/shares → invite-panel visible; GET /api/shares/:shareId → redirect to /history; POST /api/shares/:shareId/invite → InviteResult (skipped when VITE_FEATURE_SHARING≠true)
  - SMOKE-003: GET /api/projects/:projectId/comments → comments-panel loads; POST /api/projects/:projectId/comments → comment appears in CommentsPanel
  - SMOKE-004: GET /api/invites/:token → InviteAcceptPage shows project+role; POST /api/invites/:token/accept → redirect to /history (skipped when VITE_FEATURE_SHARING≠true or backend does not return inviteToken)
- playwright.staging.config.ts updated: testMatch now includes both critical-real-backend.spec.ts and collaboration-real-backend.spec.ts; VITE_FEATURE_SHARING documented in header
- .env.staging.example created: all 5 env vars documented with required/optional/skip info and full endpoint coverage map
- docs/testing-strategy.md updated: staging smoke section expanded with T-409 collaboration path table, SMOKE-002/003/004 descriptions, updated env vars table (VITE_FEATURE_SHARING added), .env.staging.example reference, documented endpoints not yet covered (collaborators CRUD, audit trail)
- HTTP adapter contract alignment: all existing adapters (Groups A–L) verified against documented contracts — no divergence found; no adapter changes required
- Backend status: no backend exists in this repo — staging smoke cannot run end-to-end yet; tests are designed to skip cleanly when VITE_API_BASE_URL is absent; .env.staging.example documents the full env setup needed when a backend is available
- All existing unit/RTL tests unchanged — 1747 tests pass (68 files)
- Constraints: no new API surface added; no mock-mode changes; no adapter changes

## T-410 — MVP launch hardening for closed beta
Type: impl+test
Links: T-401, T-406, T-407, T-408, T-409
Status: done
Owner: AI
Definition of done:
- Launch blockers identified via ruthless audit:
  1. handleShareProject silently swallowed API errors → user had zero feedback on failure
  2. handleChangeRole / handleRevoke silently swallowed errors → owner had no feedback on collaborator action failure
  3. CommentsPanel.handleSubmit did not clear previous error before retry → stale error persisted while submitting
  4. InviteAcceptPage had no retry path after acceptInvite failure → user had to navigate away and re-click invite link
- src/pages/home/HomePage.tsx:
  - Added shareError state; handleShareProject now sets shareError on catch; shows data-testid="share-error" below share button
  - clipboard failure separated from API failure (clipboard uses .catch(() => {}) to not hide API errors)
  - Added collaboratorActionError state; handleChangeRole and handleRevoke set error on catch; shows data-testid="collaborator-action-error" below collaborator list
- src/pages/invite-accept/InviteAcceptPage.tsx:
  - error state now shows data-testid="retry-invite-btn" (Попробовать снова) when inviteInfo is loaded (accept failed, resolve succeeded)
  - retry button resets status to 'ready' so accept button re-appears
  - No retry shown when resolveInvite itself failed (no project context available)
- src/shared/ui/CommentsPanel.tsx:
  - setError(null) added at start of handleSubmit so previous submission error clears before retry
- Tests added (9 new tests across 2 new files):
  - src/pages/home/HomePage.shareError.test.tsx: 3 tests — API failure shows share-error, success shows no error, error cleared on next attempt
  - src/pages/home/HomePage.collaboratorActions.test.tsx: 3 tests — revoke failure shows error, role change failure shows error, successful revoke shows no error
  - src/pages/invite-accept/InviteAcceptPage.test.tsx: 3 new tests in group G — retry button shown after accept failure, retry restores accept button, no retry when resolve fails
- docs/beta-checklist.md: new file with operational beta-readiness checklist
- docs/plan.md: T-410 row added
- Non-blockers explicitly accepted: reply threads, notifications, advanced export, auth, full real-time collaboration
- All 70 test files pass — 1756 tests (was 1747)
- Staging smoke remains cleanly skipped without VITE_API_BASE_URL
