# Decision Log

This document records significant architecture, scope, and technology decisions made during the development of AI Product Studio.

## When to add an entry

Add a D-xxx entry whenever:
- a non-obvious architecture choice is made (e.g. picking a state manager, choosing a file layout)
- a significant trade-off is accepted (e.g. no backend in MVP, heuristic over AI for parsing)
- a previously made decision is reversed or amended
- a constraint is imposed that future contributors must not unknowingly work around

Do **not** add entries for: routine implementation choices, styling decisions, or things already covered by `tech-spec.md` without controversy.

## Format

```
### D-xxx — Short title
Date: YYYY-MM-DD
Context: why this decision was needed
Options considered: what alternatives were evaluated
Decision: what was chosen and why
Consequences: what this enables and what it forecloses
Links: relevant docs (PRD §x, tech-spec §x, plan phase, F-xxx, T-xxx)
```

---

## D-001 — Frontend-first architecture for MVP

Date: 2026-04-07
Context: AI Product Studio needed to be demonstrable end-to-end without a backend. The core value (guided workflow from idea to prompt) is UI-level behavior that does not require server-side persistence or real provider APIs to validate.
Options considered:
- Full-stack from day one (Next.js + API routes + database)
- Frontend-only with localStorage
- Frontend + lightweight BFF (Express, Hono)
Decision: Frontend-only with Zustand + localStorage. Mocked services implement the same TypeScript interfaces that real adapters will later implement. No server-side code in Phase 0–4.
Consequences:
- Enables: fast iteration, runs anywhere (GitHub Pages, Vercel, local), no auth/CORS complexity
- Forecloses: multi-device sync, server-side research calls, shared team projects — all require a migration when real backend is added
- Migration path: replace mock service files with real adapter files; UI and orchestration logic are unchanged
Links: PRD §7 constraints, tech-spec §2 (future backend migration path), plan Phase 5

---

## D-002 — Zustand over Redux or Context for state management

Date: 2026-04-07
Context: The app has one central project store with multiple slices (idea, research, spec, architecture, prompt history). State needs to persist to localStorage and be accessible from any component.
Options considered:
- Redux Toolkit: mature, but significant boilerplate for a single-user MVP store
- React Context + useReducer: no dependency, but poor devtools and verbose for nested state
- Zustand: minimal boilerplate, built-in persist middleware, selector-based re-renders
Decision: Zustand v5 with persist middleware. Single store with typed state + action interfaces.
Consequences:
- Enables: simple actions, easy persistence, low ceremony
- Forecloses: out-of-the-box time-travel debugging (Redux DevTools); acceptable for MVP
- If multi-user is ever needed: store will need to be split or replaced with a server-synced solution
Links: tech-spec §1 stack table, T-001, T-009

---

## D-003 — Deterministic heuristic normalizer instead of AI for research import

Date: 2026-04-07
Context: Imported research arrives as freeform text (pasted notes, exported chats, markdown docs). It needs to be mapped to ResearchBrief fields. Two approaches were viable: call an LLM to extract fields, or use a deterministic rule-based extractor.
Options considered:
- LLM extraction (Anthropic API): high quality, but adds a live API dependency, cost, latency, and a network call to what should be a local-first MVP flow
- Deterministic heuristic: heading alias matching + keyword paragraph scoring; no API call; fully testable; degrades gracefully
Decision: Deterministic heuristic normalizer (`src/features/imported-research-input/normalizer.ts`). User sees normalization warnings and can edit the brief manually.
Consequences:
- Enables: works offline, fully deterministic, easily unit-tested, no cost per import
- Forecloses: high-quality extraction of implicit or unstructured content; the normalizer degrades on very freeform text
- Mitigation: brief is fully editable; warnings surface when fewer than 3 sections are extracted
Links: F-003, T-006, T-012, tech-spec §3 (heuristic normalizer constraint)

---

## D-004 — No test runner wired in Phase 0–3

Date: 2026-04-07
Context: Test tasks T-011 through T-017 are defined but no Vitest or Testing Library setup exists yet. Adding a test runner in Phase 0 was considered but would have slowed down the foundation work without providing immediate benefit since all services are mocked.
Options considered:
- Wire Vitest in T-001 (foundation): clean from the start, but adds setup overhead before any meaningful tests exist
- Wire Vitest at the start of Phase 5 (hardening): deferred, but risks test tasks accumulating without being run
- Wire Vitest as a dedicated T-xxx before T-011 begins: explicit gate, no silent accumulation
Decision: Vitest + Testing Library will be added as a dedicated `ops` task (T-018, not yet written) that must be completed before any test task (T-011–T-017) can be marked done.
Consequences:
- Enables: Phase 0–3 moves faster; test definitions exist as specs even before the runner is wired
- Forecloses: no CI-enforced tests until T-018 is done; test tasks are currently acceptance checklists, not runnable suites
- Risk: if T-018 is deferred too long, test drift becomes expensive to fix
Links: tasks.md (T-011–T-017), testing-strategy.md, tech-spec §4 risks

---

## D-005 — Provider-agnostic ResearchBrief as the normalization target

Date: 2026-04-07
Context: Research can come from Perplexity Deep Research, Perplexity Pro Search, manual entry, imported text, or future providers. Downstream modules (spec generation, prompt generation) must not depend on which provider produced the research.
Options considered:
- Pass raw provider output directly to spec generation: simpler, but tightly couples every downstream module to provider-specific formats
- Normalize to a shared ResearchBrief type: all downstream modules work with one structure regardless of source
Decision: All research inputs — generated or imported — are normalized to `ResearchBrief` before any downstream use. The brief includes a `briefSource` field for attribution without affecting downstream logic.
Consequences:
- Enables: any provider can be added without touching spec/architecture/prompt modules
- Forecloses: upstream fidelity — detail present in a Perplexity Deep Research report but not captured in ResearchBrief fields is lost after normalization
- Mitigation: brief is fully editable; user can manually add nuance before moving to Spec
Links: PRD §1 (solution), F-003, F-004, F-005, data-model.md (ResearchBrief), tech-spec §2 (research flow)
