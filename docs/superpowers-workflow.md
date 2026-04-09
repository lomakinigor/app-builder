# Superpowers Workflow

This document describes the development cycle used by AI Product Studio.

It applies at two levels:
- **Internal:** how AI Product Studio itself is designed, built, and iterated.
- **External:** how users of AI Product Studio build their own applications and websites.

The cycle is the same in both cases. The tooling differs; the discipline does not.

---

## The cycle

```
Brainstorm → Spec → Plan → Tasks → Code (+Tests) → Review
```

Each stage has a clear entry condition, a set of documents it touches, and a clear exit condition.
No stage is skipped. No code is written before a plan exists and at least one test task is defined.

---

## Stage 1 — Brainstorm

**What we do:**
Capture the raw idea, the users it serves, the problem it solves, and the rough scope.
No structure required yet. The goal is to get the right questions on the table, not to answer them.

**Entry condition:** a raw idea exists (a sentence, a paragraph, a conversation).

**Exit condition:** user stories written; PRD problem statement drafted.

**Docs touched:**
- `docs/user-stories.md` — write US-xxx entries from the raw idea
- `docs/PRD.md` — draft or update the Problem and Goals sections

**Bad step:**
> "Let's start coding the auth screen, we know we need it."

**Correct step:**
> "US-001 says founders want to describe their idea in plain language. Let's write that user story properly before touching any feature definition."

---

## Stage 2 — Spec

**What we do:**
Translate brainstorm output into a structured, traceable specification.
Define what the product does (features), what it does not do (non-goals), and what "done" looks like for each feature.

**Entry condition:** user stories exist (US-xxx); PRD problem statement is stable.

**Exit condition:** features defined (F-xxx) with descriptions, related user stories, and status; PRD non-goals and success criteria confirmed.

**Docs touched:**
- `docs/features.md` — define F-xxx entries with US-xxx links and status
- `docs/PRD.md` — confirm or refine success criteria and non-goals
- `docs/data-model.md` — identify any new entities this spec requires

**Bad step:**
> "I'll add editable spec packs — it's obvious we need it, no need to write it up."

**Correct step:**
> "Adding F-009 (Editable generated sections) to features.md with status=planned, linked to US-006 and US-007, before any task is written for it."

---

## Stage 3 — Plan

**What we do:**
Decide the order and shape of implementation.
Which features ship in which phase? What is the architecture? What are the trade-offs and risks?
Any architecture decision that is not obvious goes into `decisions.md`.

**Entry condition:** features defined; PRD stable.

**Exit condition:** phases documented in `plan.md`; architecture described in `tech-spec.md`; any significant trade-off recorded in `decisions.md`.

**Docs touched:**
- `docs/plan.md` — write or update phase breakdown and implementation plan table
- `docs/tech-spec.md` — confirm stack, module structure, core flows, constraints
- `docs/decisions.md` — record any non-obvious architecture or scope decision (D-xxx)

**Bad step:**
> "We'll figure out the state management later."

**Correct step:**
> "Recording D-001 in decisions.md: chose Zustand over Redux because of lower boilerplate for a single-user MVP; consequence is that multi-user state requires rearchitecting the store."

---

## Stage 4 — Tasks

**What we do:**
Break the plan into atomic, typed, owned units of work (T-xxx).
Every impl task must have at least one paired test task before work begins.
Tasks are the contract between the plan and the code.

**Entry condition:** plan and architecture are documented.

**Exit condition:** all planned work has a T-xxx entry in `tasks.md` with type, links, status, owner, and DoD; every impl task has a paired test task.

**Docs touched:**
- `docs/tasks.md` — write T-xxx entries; assign type, status, owner, DoD
- `docs/testing-strategy.md` — confirm which testing level applies to each task
- `docs/features.md` — update T-xxx references on parent F-xxx features

**Bad step:**
> "I'll write the tests after, once I know what the code actually does."

**Correct step:**
> "T-013 (impl: Spec+Architecture workflow) is added to tasks.md. T-013 cannot start until T-013's paired test task T-013t (acceptance: generated SpecPack has non-empty fields; stage gate returns correct results) is also written."

---

## Stage 5 — Code (+Tests)

**What we do:**
Implement the work described in tasks.md, in the order defined by plan.md.
Every code change references a T-xxx.
Tests are written as part of the same task cycle, not after.

**Entry condition:** a T-xxx impl task exists; its paired T-xxx test task is defined; plan.md is current.

**Exit condition:** impl task's DoD is met; paired test task's acceptance criteria pass; no regressions.

**Docs touched:**
- Source code — every change references T-xxx and F-xxx in explanation or commit message
- `docs/tasks.md` — update status (in-progress → in-review → done)
- `docs/testing-strategy.md` — confirm which test level was used

**Bad step:**
> "Just pushing this fix, I'll add the task entry later."

**Correct step:**
> "Implementing EditableSpecPack (T-007 / F-005). Stage gate logic covered by T-016. Updating T-007 status to in-progress."

---

## Stage 6 — Review

**What we do:**
Check the output against the original spec and test criteria.
Review is not "does it run" — it is "does it satisfy the user story and the feature definition".
Any gap found goes back to Spec or Plan as a new or updated entry, not a silent hotfix.

**Entry condition:** impl task's DoD is met; tests pass.

**Exit condition:** feature status updated in features.md (in-dev → done); any follow-on issues recorded as new T-xxx or F-xxx entries.

**Docs touched:**
- `docs/features.md` — update status of reviewed F-xxx
- `docs/user-stories.md` — confirm acceptance direction is met
- `docs/tasks.md` — mark task done; add follow-on tasks if gaps found
- `docs/decisions.md` — add D-xxx if the review surfaced a significant trade-off or reversal

**Bad step:**
> "Looks good to me, shipping."

**Correct step:**
> "Reviewing T-007 against T-013 acceptance criteria: generated SpecPack has non-empty productSummary ✓, at least one feature ✓, stage gate returns false for empty spec ✓. F-005 updated to done."

---

## Quick reference

| Stage | Primary doc | Entry condition | Exit condition |
|-------|-------------|----------------|---------------|
| Brainstorm | user-stories.md | raw idea | US-xxx written |
| Spec | features.md, PRD.md | US-xxx exist | F-xxx defined |
| Plan | plan.md, tech-spec.md | F-xxx defined | phases + arch documented |
| Tasks | tasks.md | plan documented | T-xxx with test pairs |
| Code+Tests | source code | T-xxx with test task | DoD + tests pass |
| Review | features.md, tasks.md | DoD met | F-xxx marked done |

---

## Dual application

When AI Product Studio is used to build a target application or website, it mirrors this same cycle:

| Superpowers stage | AI Product Studio screen |
|------------------|--------------------------|
| Brainstorm | Idea page |
| Spec | Research Brief + Spec page |
| Plan | Architecture + Roadmap page |
| Tasks | Prompt Loop (each prompt = one task) |
| Code+Tests | Claude Code (user runs the prompt) |
| Review | Response parser + next prompt generation |

The app does not skip stages for the user any more than a developer should skip them for themselves.
