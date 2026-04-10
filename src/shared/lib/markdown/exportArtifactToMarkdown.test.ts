// Tests for per-artifact markdown formatters.
// Implements T-112 / F-012 / F-026 / D-006.
//
// D-006 (Option A): these tests assert on-demand string output only.
// They do NOT test any filesystem I/O or per-project docs/ folder creation.

import { describe, it, expect } from 'vitest'
import {
  researchBriefToMarkdown,
  specPackToMarkdown,
  architectureDraftToMarkdown,
  promptIterationToMarkdown,
} from './exportArtifactToMarkdown'
import type { ResearchBrief, SpecPack, ArchitectureDraft, PromptIteration } from '../../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const brief: ResearchBrief = {
  problemSummary: 'Developers spend too long on boilerplate setup',
  targetUsers: ['Solo developers', 'Small startup teams'],
  valueHypothesis: 'Faster time-to-first-line',
  competitorNotes: 'Competitor A lacks spec phase',
  risks: ['Market saturation', 'API rate limits'],
  opportunities: ['Growing no-code trend'],
  recommendedMVP: 'CLI that scaffolds a typed project',
  openQuestions: ['How to price?'],
  sourcesNote: 'Based on 5 interviews',
  sourceIds: [],
  briefSource: 'generated',
}

const spec: SpecPack = {
  projectType: 'application',
  productSummary: 'AI-assisted app scaffolding tool',
  MVPScope: 'Scaffold, spec, and prompt loop only',
  featureList: [
    { id: 'f-001', name: 'Idea intake', description: 'Accept raw idea text', priority: 'must' },
    { id: 'f-002', name: 'Research brief', description: 'Normalize research', priority: 'should' },
    { id: 'f-003', name: 'Dark mode', description: 'Theme toggle', priority: 'could' },
    { id: 'f-004', name: 'Billing', description: 'Payment processing', priority: 'wont' },
  ],
  assumptions: ['Users have Claude Code installed'],
  constraints: ['No backend for MVP'],
  acceptanceNotes: 'Must pass WCAG AA',
}

const arch: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [
    { name: 'React', role: 'Frontend UI', rationale: 'Component ecosystem' },
    { name: 'Vite', role: 'Build tool', rationale: 'Fast HMR' },
    { name: 'Zustand', role: 'State', rationale: 'Minimal boilerplate' },
  ],
  moduleArchitecture: 'Feature-based folder structure under src/features/',
  dataFlow: 'Unidirectional: user action → store action → derived state → render',
  roadmapPhases: [
    { phase: 1, title: 'App shell', goals: ['Create routing', 'Add layout'], estimatedComplexity: 'low' },
    { phase: 2, title: 'Core pages', goals: ['Build spec page', 'Build prompt loop'], estimatedComplexity: 'medium' },
  ],
  technicalRisks: ['Bundle size creep', 'Browser clipboard API restrictions'],
}

const iteration: PromptIteration = {
  id: 'iter-1',
  projectId: 'proj-1',
  iterationNumber: 3,
  promptText: 'Implement the research brief editor component',
  claudeResponseRaw: 'Created EditableResearchBrief component...',
  parsedSummary: {
    analysis: 'The brief editor needs controlled inputs',
    plan: 'Create component, wire store, add save handler',
    changedFiles: ['src/features/research-brief/EditableResearchBrief.tsx'],
    implementationSummary: 'Implemented form with save button',
    nextStep: 'Add spec generation',
    warnings: ['No tests written yet'],
    hasTests: false,
    implementedTaskIds: ['T-005', 'T-006'],
    nextTaskId: 'T-007',
    inferredNextPhase: null,
  },
  recommendedNextStep: 'Add spec generation',
  status: 'parsed',
  createdAt: '2026-04-09T10:00:00.000Z',
  projectType: 'application',
  cyclePhase: 'code_and_tests',
  targetTaskId: 'T-005',
  roadmapPhaseNumber: 1,
}

// ─── researchBriefToMarkdown ───────────────────────────────────────────────────

describe('researchBriefToMarkdown', () => {
  it('has "# Research Brief" heading', () => {
    expect(researchBriefToMarkdown(brief)).toContain('# Research Brief')
  })

  it('includes project name in header when provided', () => {
    const md = researchBriefToMarkdown(brief, 'My App')
    expect(md).toContain('**Project:** My App')
  })

  it('does not include a Project line when name is null', () => {
    const md = researchBriefToMarkdown(brief, null)
    expect(md).not.toContain('**Project:**')
  })

  it('includes problemSummary text', () => {
    expect(researchBriefToMarkdown(brief)).toContain('Developers spend too long on boilerplate setup')
  })

  it('includes target users section with all users', () => {
    const md = researchBriefToMarkdown(brief)
    expect(md).toContain('## Target users')
    expect(md).toContain('Solo developers')
    expect(md).toContain('Small startup teams')
  })

  it('includes risks section', () => {
    const md = researchBriefToMarkdown(brief)
    expect(md).toContain('## Risks')
    expect(md).toContain('Market saturation')
    expect(md).toContain('API rate limits')
  })

  it('includes value hypothesis', () => {
    expect(researchBriefToMarkdown(brief)).toContain('Faster time-to-first-line')
  })

  it('omits open questions section when array is empty', () => {
    const b: ResearchBrief = { ...brief, openQuestions: [] }
    expect(researchBriefToMarkdown(b)).not.toContain('## Open questions')
  })

  it('omits competitor notes when empty string', () => {
    const b: ResearchBrief = { ...brief, competitorNotes: '' }
    expect(researchBriefToMarkdown(b)).not.toContain('## Competitor notes')
  })

  it('returns a multi-line string with a separator', () => {
    const md = researchBriefToMarkdown(brief)
    expect(md).toContain('---')
    expect(md.split('\n').length).toBeGreaterThan(10)
  })

  it('includes Exported timestamp line', () => {
    expect(researchBriefToMarkdown(brief)).toMatch(/\*\*Exported:\*\* \d{4}-/)
  })
})

// ─── specPackToMarkdown ───────────────────────────────────────────────────────

describe('specPackToMarkdown', () => {
  it('includes "📱 Application" for projectType application', () => {
    expect(specPackToMarkdown(spec)).toContain('📱 Application')
  })

  it('includes "🌐 Website" for projectType website', () => {
    const s: SpecPack = { ...spec, projectType: 'website' }
    expect(specPackToMarkdown(s)).toContain('🌐 Website')
  })

  it('includes productSummary', () => {
    expect(specPackToMarkdown(spec)).toContain('AI-assisted app scaffolding tool')
  })

  it('includes MVPScope', () => {
    expect(specPackToMarkdown(spec)).toContain('Scaffold, spec, and prompt loop only')
  })

  it('includes all four priority group headings', () => {
    const md = specPackToMarkdown(spec)
    expect(md).toContain('Must have')
    expect(md).toContain('Should have')
    expect(md).toContain('Could have')
    expect(md).toContain("Won't have")
  })

  it('includes all feature IDs', () => {
    const md = specPackToMarkdown(spec)
    expect(md).toContain('f-001')
    expect(md).toContain('f-002')
    expect(md).toContain('f-003')
    expect(md).toContain('f-004')
  })

  it('skips priority groups with no features', () => {
    const s: SpecPack = {
      ...spec,
      featureList: [{ id: 'f-001', name: 'Login', description: 'Auth', priority: 'must' }],
    }
    const md = specPackToMarkdown(s)
    expect(md).not.toContain("Won't have")
    expect(md).not.toContain('Should have')
    expect(md).not.toContain('Could have')
  })

  it('includes project name when provided', () => {
    expect(specPackToMarkdown(spec, 'AI Studio')).toContain('**Project:** AI Studio')
  })

  it('includes assumptions and constraints', () => {
    const md = specPackToMarkdown(spec)
    expect(md).toContain('Claude Code installed')
    expect(md).toContain('No backend for MVP')
  })
})

// ─── architectureDraftToMarkdown ──────────────────────────────────────────────

describe('architectureDraftToMarkdown', () => {
  it('includes markdown table header for the stack', () => {
    const md = architectureDraftToMarkdown(arch)
    expect(md).toContain('| Technology | Role | Rationale |')
    expect(md).toContain('|---|---|---|')
  })

  it('includes all stack item names in the table', () => {
    const md = architectureDraftToMarkdown(arch)
    expect(md).toContain('React')
    expect(md).toContain('Vite')
    expect(md).toContain('Zustand')
  })

  it('includes roadmap phase headings with phase number and title', () => {
    const md = architectureDraftToMarkdown(arch)
    expect(md).toContain('Phase 1')
    expect(md).toContain('App shell')
    expect(md).toContain('Phase 2')
    expect(md).toContain('Core pages')
  })

  it('includes technical risks section', () => {
    const md = architectureDraftToMarkdown(arch)
    expect(md).toContain('## Technical risks')
    expect(md).toContain('Bundle size creep')
    expect(md).toContain('Browser clipboard API restrictions')
  })

  it('includes "📱 Application" for application projectType', () => {
    expect(architectureDraftToMarkdown(arch)).toContain('📱 Application')
  })

  it('includes "🌐 Website" for website projectType', () => {
    const a: ArchitectureDraft = { ...arch, projectType: 'website' }
    expect(architectureDraftToMarkdown(a)).toContain('🌐 Website')
  })

  it('omits technical risks section when array is empty', () => {
    const a: ArchitectureDraft = { ...arch, technicalRisks: [] }
    expect(architectureDraftToMarkdown(a)).not.toContain('## Technical risks')
  })

  it('includes module architecture and data flow text', () => {
    const md = architectureDraftToMarkdown(arch)
    expect(md).toContain('Feature-based folder structure')
    expect(md).toContain('Unidirectional')
  })
})

// ─── promptIterationToMarkdown ────────────────────────────────────────────────

describe('promptIterationToMarkdown', () => {
  it('includes the iteration number in the heading', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('Prompt Iteration #3')
  })

  it('includes "Cycle phase: Code + Tests" for code_and_tests', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('**Cycle phase:** Code + Tests')
  })

  it('includes "Cycle phase: Review" for review phase', () => {
    const iter: PromptIteration = { ...iteration, cyclePhase: 'review' }
    expect(promptIterationToMarkdown(iter)).toContain('**Cycle phase:** Review')
  })

  it('includes target task ID when present', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('**Target task:** T-005')
  })

  it('does not include Target task line when targetTaskId is null', () => {
    const iter: PromptIteration = { ...iteration, targetTaskId: null }
    expect(promptIterationToMarkdown(iter)).not.toContain('Target task:')
  })

  it('wraps prompt text in a fenced code block', () => {
    const md = promptIterationToMarkdown(iteration)
    expect(md).toContain('```\nImplement the research brief editor component\n```')
  })

  it('includes parsed analysis heading', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('## Brief analysis')
  })

  it('includes implementation plan heading', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('## Implementation plan')
  })

  it('includes files changed section', () => {
    const md = promptIterationToMarkdown(iteration)
    expect(md).toContain('## Files changed')
    expect(md).toContain('EditableResearchBrief.tsx')
  })

  it('includes test coverage with ⚠ when hasTests is false', () => {
    const md = promptIterationToMarkdown(iteration)
    expect(md).toContain('## Test coverage')
    expect(md).toContain('⚠ No test files detected')
  })

  it('includes test coverage with ✓ when hasTests is true', () => {
    const iter: PromptIteration = {
      ...iteration,
      parsedSummary: { ...iteration.parsedSummary!, hasTests: true },
    }
    expect(promptIterationToMarkdown(iter)).toContain('✓ Test files detected')
  })

  it('includes warnings section when warnings are present', () => {
    const md = promptIterationToMarkdown(iteration)
    expect(md).toContain('## Warnings')
    expect(md).toContain('No tests written yet')
  })

  it('includes "📱 Application" projectType label', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('📱 Application')
  })

  it('includes roadmap phase number', () => {
    expect(promptIterationToMarkdown(iteration)).toContain('**Roadmap phase:** 1')
  })

  it('skips all parsed sections when parsedSummary is null', () => {
    const iter: PromptIteration = { ...iteration, parsedSummary: null, claudeResponseRaw: null }
    const md = promptIterationToMarkdown(iter)
    expect(md).not.toContain('## Brief analysis')
    expect(md).not.toContain('## Test coverage')
    expect(md).not.toContain('## Warnings')
  })
})
