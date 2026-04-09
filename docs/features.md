# Features

Features are the primary **Spec** artifacts in the development cycle.
They connect PRD goals → user stories → implementation tasks:

  PRD (what/why) → Features (F-xxx) → User Stories (US-xxx) → Tasks (T-xxx) → Code + Tests

Every feature has an ID, status, and explicit links to the user stories and tasks that implement it.
No task is written and no code is committed without a parent feature.

---

## Must Have

### F-001 — Idea intake
Description: User can describe a raw product idea in plain language with optional context fields (target user, problem, constraints, notes). App validates the idea before allowing progression.
User stories: US-001, US-002
Tasks: T-001, T-002, T-005, T-011
Status: done

### F-002 — Research provider and mode selection
Description: User can choose a research provider (Perplexity Deep, Perplexity Pro, Manual) and a research mode. App triggers a mock research run and returns results.
User stories: US-003
Tasks: T-002, T-004, T-005, T-011
Status: done

### F-003 — Import existing research
Description: User can paste or import previously completed research from any external source. App stores the raw artifact and normalizes it into the internal ResearchBrief format using deterministic heuristics.
User stories: US-004, US-005
Tasks: T-004, T-006, T-012
Status: done

### F-004 — Research brief workspace
Description: App displays a normalized ResearchBrief regardless of source. User can read, edit, and save the brief. Source is attributed (generated / imported / manual). Brief must exist before moving to spec.
User stories: US-005, US-006
Tasks: T-005, T-006, T-011, T-012
Status: done

### F-005 — Specification generation
Description: App generates a structured SpecPack from the ResearchBrief. User can edit all fields (product summary, MVP scope, feature list with priorities, assumptions, constraints, acceptance notes) before advancing.
User stories: US-007, US-008
Tasks: T-007, T-013
Status: in-dev

### F-006 — Architecture generation
Description: App generates an ArchitectureDraft from the SpecPack. User can edit the stack, module architecture, data flow, roadmap phases, and technical risks before advancing.
User stories: US-009, US-010
Tasks: T-007, T-013
Status: in-dev

### F-007 — Prompt loop engine
Description: App generates the first Claude Code prompt from the architecture draft. User pastes Claude's response; app parses it into structured sections and generates the next prompt. Prompt history is preserved.
User stories: US-011, US-012, US-013
Tasks: T-008, T-014
Status: planned

### F-008 — Project state persistence
Description: Active project state (idea, research, spec, architecture, prompt history) is persisted locally so a page refresh does not destroy work. Imported research metadata is included.
User stories: US-001, US-013
Tasks: T-009, T-015
Status: done

### F-024 — Guided project lifecycle
Description: The app makes the Brainstorm → Spec → Plan → Tasks → Code+Tests → Review cycle explicit and visible throughout the UI. Each screen corresponds to a cycle stage; stage gates enforce the correct order. The user always knows which stage they are on and what is required to advance. This applies to every project (app or website) created in AI Product Studio.
User stories: US-014
Tasks: T-001, T-002, T-005, T-007, T-008
Status: in-dev

### F-025 — Project type selection
Description: At project creation, the user selects whether they are building an application or a website. This type is stored on the Project entity and used to tailor generated spec language, architecture suggestions, and prompt context throughout the cycle.
User stories: US-015
Tasks: (planned)
Status: planned

---

## Should Have

### F-009 — Editable generated sections
Description: Every AI-generated output block (research brief, spec, architecture) is editable by the user before they advance to the next stage.
User stories: US-006, US-007, US-009
Tasks: T-005, T-006, T-007
Status: in-dev

### F-010 — Regenerate one section
Description: User can regenerate a single section of the spec or architecture without resetting the whole stage.
User stories: US-007, US-009
Tasks: T-007
Status: planned

### F-011 — Project snapshots
Description: User can save a named snapshot of the current project state and restore it later.
User stories: US-013
Tasks: T-009
Status: planned

### F-012 — Copy / export markdown
Description: User can copy or export any generated artifact (brief, spec, architecture, prompt) as markdown.
User stories: US-013
Tasks: T-010
Status: planned

### F-013 — Import from multiple text formats
Description: Import normalizer accepts plain text, markdown, exported chat logs, and structured notes in addition to freeform paste.
User stories: US-004, US-005
Tasks: T-006
Status: planned

---

## Could Have

### F-014 — Side-by-side provider comparison
Description: User can run two research providers in parallel and see results compared before choosing which to use.
User stories: US-003
Tasks: (none yet)
Status: draft

### F-015 — Advanced parser rules
Description: User can define custom section headings and extraction rules for the Claude response parser.
User stories: US-012
Tasks: (none yet)
Status: draft

### F-016 — Provider scorecard
Description: App tracks and displays a quality rating for each research provider run over time.
User stories: US-003
Tasks: (none yet)
Status: draft

### F-017 — Reusable project templates
Description: User can save a project's spec and architecture as a template to reuse for similar ideas.
User stories: US-007
Tasks: (none yet)
Status: draft

### F-018 — Compare imported vs generated research
Description: Side-by-side view of a newly generated brief and an imported brief for the same idea.
User stories: US-004, US-005
Tasks: (none yet)
Status: draft

---

## Non-functional

### F-019 — Strict TypeScript
Description: All modules use strict TypeScript types. No `any` in production paths.
Tasks: T-003
Status: done

### F-020 — Responsive layout
Description: App is usable on mobile and optimized for desktop.
Tasks: T-001
Status: done

### F-021 — Dark mode
Description: Full dark mode support via Tailwind CSS.
Tasks: T-001
Status: done

### F-022 — Modular architecture
Description: Clear boundaries between entities, features, pages, and shared modules. No cross-layer leakage.
Tasks: T-001, T-003
Status: done

### F-023 — Accessible forms and navigation
Description: All interactive elements have proper labels, keyboard navigation, and focus management.
Tasks: T-010
Status: planned
