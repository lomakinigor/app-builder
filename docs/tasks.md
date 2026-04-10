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
Status: todo
Owner: AI
Acceptance criteria:
- setProjectType('application') sets activeProject.projectType to 'application'
- setProjectType('website') sets activeProject.projectType to 'website'
- calling setProjectType when activeProject is null does not throw
- after simulated persist round-trip, projectType value is restored correctly
- mockProject.projectType equals 'application'

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
Status: todo
Owner: AI
Acceptance criteria:
- generateSpec(brief, 'application') returns SpecPack with projectType='application' and productSummary mentioning 'application'
- generateSpec(brief, 'website') returns SpecPack with projectType='website' and stack without Vite
- generateArchitecture(spec, 'application') returns ArchitectureDraft with projectType='application' and Vite in stack
- generateArchitecture(spec, 'website') returns ArchitectureDraft with projectType='website' and Next.js in stack
- canAdvanceFromSpec returns false with reason when specPack.projectType is null/undefined
- canAdvanceFromArchitecture returns false with reason when architectureDraft.projectType is null/undefined
- SpecPage renders '📱 Application' or '🌐 Website' badge based on activeProject.projectType

## T-104 — Tests: project type selector behavior
Type: test
Description: Acceptance tests for the Idea page project type selector. Covers selection state, validation blocking, store updates, and the HomePage type badge display.
Links: F-025, US-015 — pairs with T-103
Status: todo
Owner: AI
Acceptance criteria:
- no project type selected + submitted: blocked state banner shows, "Continue" is disabled
- selecting 'application': selector shows 'Application' as active
- selecting 'website': selector shows 'Website' as active
- canAdvanceFromIdea returns false with reason when projectType is null (and idea text is valid)
- canAdvanceFromIdea returns true when both idea text is valid and projectType is non-null
- after save with projectType='website', activeProject.projectType === 'website' in store
- HomePage active project card renders 'Application' or 'Website' badge matching stored type

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
Status: todo
Owner: AI
Acceptance criteria:
- generateFirstPrompt with projectType='application' produces promptText containing 'application' and the TDD rule about tests
- generateFirstPrompt with projectType='website' produces promptText containing 'website'
- parseClaudeResponse on text mentioning 'src/foo.test.ts' sets hasTests=true
- parseClaudeResponse on text with no .test. or .spec. files sets hasTests=false
- parseClaudeResponse extracts ['T-001', 'T-002'] from a response mentioning 'T-001' and 'T-002'
- parseClaudeResponse sets nextTaskId='T-002' when 'T-002' appears first in the next-step section
- generateNextPrompt with hasTests=false in parsedResponse includes a warning about missing tests
- PromptLoopPage renders 'Code + Tests' badge when activeIteration.status !== 'parsed'
- PromptLoopPage renders 'Review' badge when activeIteration.status === 'parsed'

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
Status: todo
Owner: AI
Acceptance criteria:
- HistoryPage renders all 6 cycle stage names (Brainstorm, Spec, Plan, Tasks, Code + Tests, Review)
- Review stage is labeled "You are here" or equivalent when no further stage has been completed
- A prompt iteration with hasTests=true shows a tests-present badge
- A prompt iteration with hasTests=false shows a missing-tests warning badge
- A prompt iteration with implementedTaskIds=['T-001'] renders a 'T-001' badge
- Key decisions panel renders at least D-001 entry
- Review checklist section renders at least one review criterion

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
