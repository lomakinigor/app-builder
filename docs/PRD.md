# PRD — AI Product Studio

## 1. Product overview

### Problem
People can generate code with AI, but the process is fragmented:
- idea exploration is separate from specification,
- specification is separate from implementation,
- implementation prompts are often inconsistent,
- research may already exist in external materials but usually cannot be reused in a structured way,
- there is no structured loop that converts one Claude Code result into the next precise prompt.

As a result, users lose context, repeat themselves, skip planning, and get unstable outcomes when building applications or websites.

### Goals
- Provide a single guided environment for turning a raw idea into a built application or website.
- Enforce a repeatable development cycle: Brainstorm → Spec → Plan → Tasks → Code (+Tests) → Review.
- Normalize all research inputs — whether generated or imported — into one consistent brief format.
- Make every AI step auditable: visible input, visible output, visible next action.
- Keep the build pipeline working even without live provider integrations.

### Solution
AI Product Studio is a tool that guides users through the full **Brainstorm → Spec → Plan → Tasks → Code (+Tests) → Review** cycle for any application or website they want to build.

For each user project, the app:
1. captures the raw idea (Brainstorm),
2. produces a normalized Research Brief from in-app or imported research (Spec),
3. generates a structured SpecPack defining MVP scope and feature list (Spec),
4. generates an ArchitectureDraft with phased roadmap (Plan),
5. generates the first Claude Code prompt from the architecture (Tasks),
6. accepts Claude’s pasted response and parses it into structured sections (Code+Tests),
7. generates the next focused prompt based on parsed output (Code+Tests),
8. continues iteratively until the application or website is complete (Review).

Every project — application or website — created in AI Product Studio follows the same cycle from start to finish. The stage gates enforce this; no stage can be skipped.

As a project moves through the cycle it accumulates a per-project documentation set equivalent to: a PRD and goals (Research Brief + SpecPack), a technical plan and architecture (ArchitectureDraft + roadmap), a task list (roadmap phases mapped to prompts), and a code-and-test history (prompt iteration log with parsed responses). These artifacts are the natural output of completing the guided flow — they are not separate documents the user has to write in advance.

Each stage has a gate. The user cannot skip stages. The app always shows what was input, what was generated, and what comes next.

### Value proposition
Instead of chatting randomly with AI, the user gets a disciplined build pipeline: one cycle, one project, one stage at a time — for any application or website, regardless of technical background.

## 2. Target users

### Primary users
- solo founders
- non-technical product creators
- technical founders who want structured AI execution
- PMs/prototypers building with Claude Code
- AI-assisted developers working in VS Code

### Secondary users
- agencies building products faster with AI
- internal product teams exploring new ideas
- consultants creating MVPs for clients

## 3. Success criteria

| Metric | Target |
|---------|--------|
| User can go from idea to first implementation prompt | under 20 minutes |
| User can generate a complete normalized spec pack | in one guided flow |
| User can use either in-app research or imported research without breaking the workflow | yes |
| User understands next action at each step | high subjective clarity |
| First foundation prompt output is usable | yes |
| Iterative prompt loop works without manual rewriting every step | yes |

## 4. MVP scope

### Must have
1. Project type selection (application or website) at project start
2. Guided stage progression through Brainstorm → Spec → Plan → Tasks → Code+Tests → Review
3. Idea input
4. Research provider selection
5. Research mode selection
6. Import previously completed research
7. Research brief workspace
8. Spec generation workspace
9. Architecture and roadmap workspace
10. Prompt generator
11. Claude response input
12. Claude response parser
13. Next prompt generator
14. Prompt history
15. Project state persistence locally
16. Normalization of all research inputs into one Research Brief format

### Should have
- editable generated sections
- regenerate one section without resetting all
- project snapshots
- copy/export markdown

### Could have
- side-by-side compare of research providers
- team collaboration
- live provider integrations
- document templates marketplace

### Won’t have in MVP
- real billing
- production auth
- real-time collaboration
- advanced analytics
- automated code execution
- direct IDE plugin integration

## 5. Non-goals
The following are explicitly out of scope for the product vision (not just deferred for MVP):
- AI Product Studio is not a code editor or IDE replacement.
- It does not execute code or run tests on the user's behalf.
- It does not manage source control, branches, or deployments.
- It is not a research tool on its own — it orchestrates and normalizes research, not performs it.
- It does not replace Claude Code; it prepares structured inputs for Claude Code to act on.
- Multi-user real-time collaboration is not a core use case.

## 6. UX requirements
- mobile-first but optimized for desktop work
- simple linear flow
- visible progress by stages
- each stage shows inputs, outputs, assumptions, and next step
- responses from Claude must be easy to paste and parse
- generated text should be editable before moving forward
- imported research should be clearly attributed but normalized into the same workflow as internally generated research

## 7. Constraints
- start with mocked provider adapters
- no dependency on one research vendor
- architecture must support future backend migration
- prompt loop must work even if provider integrations are manual
- imported research must be normalized before downstream processing

## 8. References
| Document | Purpose |
|----------|---------|
| [docs/features.md](features.md) | Full feature list with F-xxx IDs and MoSCoW priorities |
| [docs/plan.md](plan.md) | Phased delivery plan (Phase 0–5) |
| [docs/tech-spec.md](tech-spec.md) | Stack, architecture style, module breakdown |
| [docs/data-model.md](data-model.md) | Typed domain model definitions |
| [docs/user-stories.md](user-stories.md) | User story coverage per feature area |
| [docs/tasks.md](tasks.md) | Concrete implementation tasks with T-xxx IDs |
| [docs/directory-structure.md](directory-structure.md) | Source layout and module conventions |
