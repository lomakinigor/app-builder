# User Stories

User stories connect **Brainstorm → Spec → Plan** in the development cycle.
They capture what a user needs and why, and each story is the anchor that justifies a feature and drives task creation.

  Brainstorm (raw need) → User Story (US-xxx) → Feature (F-xxx) → Task (T-xxx)

Every user story uses the format:
  "As [role], I want [goal] so that [value]."

Each story references the features and tasks that implement it.

---

## Idea stage

### US-001 — Describe the idea
As a founder, I want to describe my product idea in plain language so that I can start building without writing a formal specification upfront.
Features: F-001, F-008
Tasks: T-005

### US-002 — Add idea context
As a founder, I want to add optional context about my target users, problem, and constraints so that the generated outputs are relevant to my specific situation.
Features: F-001
Tasks: T-005

---

## Research stage

### US-003 — Choose research approach
As a user, I want to choose how research is performed (provider, mode, depth) so that I can balance speed, quality, and control for each project.
Features: F-002, F-014, F-016
Tasks: T-005

### US-004 — Import prior research
As a user, I want to import previously completed research from outside the app so that I do not repeat work I or my team already did.
Features: F-003, F-013
Tasks: T-006

### US-005 — Normalized research format
As a user, I want all research results — whether generated in-app or imported — normalized into one consistent brief format so that later stages do not depend on a specific provider or source format.
Features: F-003, F-004, F-018
Tasks: T-006

### US-006 — Edit research brief
As a user, I want to edit the research brief before moving to the next stage so that I can correct weak assumptions or fill in gaps the AI missed.
Features: F-004, F-009
Tasks: T-005, T-006

---

## Specification stage

### US-007 — Generate spec from research
As a user, I want the app to transform my research brief into a draft specification so that I do not have to structure everything manually from scratch.
Features: F-005, F-009, F-010, F-017
Tasks: T-007

### US-008 — Clear MVP boundaries
As a user, I want the spec to define clear MVP scope boundaries so that I do not overbuild the first version of my application or website.
Features: F-005
Tasks: T-007

---

## Architecture stage

### US-009 — Proposed stack and modules
As a user, I want the app to propose a technology stack and module architecture so that my application or website implementation starts from a coherent, reasoned foundation.
Features: F-006, F-009, F-010
Tasks: T-007

### US-010 — Phased roadmap
As a user, I want a phased implementation roadmap so that I can proceed in small, auditable steps and generate one focused prompt per phase.
Features: F-006
Tasks: T-007

---

## Prompt loop stage

### US-011 — Generate first prompt
As a user, I want the app to generate the first Claude Code prompt from my architecture and spec so that I can start implementation without inventing prompt structure myself.
Features: F-007
Tasks: T-008

### US-012 — Paste and parse Claude response
As a user, I want to paste Claude's response and have the app extract what was analyzed, what was implemented, and what should happen next so that I can continue building iteratively without losing context.
Features: F-007, F-015
Tasks: T-008

### US-013 — Prompt history and project memory
As a user, I want the full prompt history and project state preserved locally so that I can track how my application or website was built and resume at any point.
Features: F-007, F-008, F-011, F-012
Tasks: T-008, T-009

---

## Project lifecycle

### US-014 — End-to-end guided cycle
As a founder, I want AI Product Studio to guide me through the full Brainstorm → Spec → Plan → Tasks → Code+Tests → Review cycle for my application or website so that I never skip a stage, lose context, or have to invent structure myself.
Features: F-024
Tasks: T-001, T-002, T-005, T-007, T-008

### US-015 — Project type context
As a user, I want to specify whether I am building an application or a website at the start of my project so that generated specs, architecture, and prompts use the right framing and language for my type of product.
Features: F-025
Tasks: (planned)

---

## Acceptance direction

These criteria apply across all stages and are the basis for Review in the development cycle:
- Each stage must have visible inputs, visible outputs, and a clear next action.
- User must be able to move through the workflow step by step, with blocked progression explained.
- All generated content must be editable before advancing.
- Imported research must be accepted as a first-class input equivalent to generated research.
- Prompt loop must work entirely with pasted Claude responses — no live API required in MVP.
