// Tests for computeCycleProgress pure function.
// Implements T-204t / F-024.
//
// Locks in the mapping: ProjectData artifact presence → 6 Superpowers cycle
// phase statuses (not_started | in_progress | done).

import { describe, it, expect } from 'vitest'
import { computeCycleProgress } from './cycleProgress'
import type { ProjectData } from '../../../app/store/projectStore'
import type { IdeaDraft, ResearchBrief, SpecPack, ArchitectureDraft, PromptIteration, ParsedClaudeResponse } from '../../types'

// ─── Minimal fixtures ─────────────────────────────────────────────────────────

const ideaDraft: IdeaDraft = {
  title: 'Test idea',
  rawIdea: 'A tool that does something useful',
  targetUser: 'Developers',
  problem: 'Too much manual work',
  constraints: 'Must be fast',
  notes: '',
}

const researchBrief: ResearchBrief = {
  problemSummary: 'Developers need help',
  targetUsers: ['Solo devs'],
  valueHypothesis: 'Saves time',
  competitorNotes: 'None',
  risks: [],
  opportunities: [],
  recommendedMVP: 'Simple CLI',
  openQuestions: [],
  sourcesNote: '',
  sourceIds: [],
  briefSource: 'generated',
}

const specPack: SpecPack = {
  projectType: 'application',
  productSummary: 'A dev tool',
  MVPScope: 'Minimal',
  featureList: [],
  assumptions: [],
  constraints: [],
  acceptanceNotes: '',
}

const architectureDraftWithPhases: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [],
  moduleArchitecture: '',
  dataFlow: '',
  roadmapPhases: [
    { phase: 0, title: 'Foundation', goals: ['Setup'], estimatedComplexity: 'low' },
  ],
  technicalRisks: [],
}

const architectureDraftEmpty: ArchitectureDraft = {
  ...architectureDraftWithPhases,
  roadmapPhases: [],
}

const parsedSummary: ParsedClaudeResponse = {
  analysis: 'Done',
  plan: '',
  changedFiles: ['src/App.tsx'],
  implementationSummary: '',
  nextStep: '',
  warnings: [],
  hasTests: false,
  implementedTaskIds: [],
  nextTaskId: null,
  inferredNextPhase: null,
}

const parsedSummaryWithTests: ParsedClaudeResponse = {
  ...parsedSummary,
  changedFiles: ['src/App.tsx', 'src/App.test.ts'],
  hasTests: true,
}

function makeIteration(overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id: 'iter-1',
    projectId: 'proj-1',
    iterationNumber: 1,
    promptText: 'Do something',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-09T00:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: null,
    roadmapPhaseNumber: null,
    ...overrides,
  }
}

const emptyData: ProjectData = {
  ideaDraft: null,
  researchRuns: [],
  importedArtifacts: [],
  researchBrief: null,
  specPack: null,
  architectureDraft: null,
  promptIterations: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeCycleProgress', () => {
  // ── Scenario 1: empty data ─────────────────────────────────────────────────

  describe('empty data', () => {
    it('returns all 6 phases', () => {
      const phases = computeCycleProgress(emptyData)
      expect(phases).toHaveLength(6)
    })

    it('all phases are not_started', () => {
      const phases = computeCycleProgress(emptyData)
      for (const phase of phases) {
        expect(phase.status).toBe('not_started')
      }
    })

    it('phase IDs are in Superpowers cycle order', () => {
      const phases = computeCycleProgress(emptyData)
      expect(phases.map((p) => p.id)).toEqual([
        'brainstorm',
        'spec',
        'plan',
        'tasks',
        'code_and_tests',
        'review',
      ])
    })
  })

  // ── Scenario 2: brainstorm only ───────────────────────────────────────────

  describe('ideaDraft present, nothing else', () => {
    const data: ProjectData = { ...emptyData, ideaDraft }

    it('brainstorm is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'brainstorm')?.status).toBe('done')
    })

    it('spec is in_progress (idea exists, no brief yet)', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'spec')?.status).toBe('in_progress')
    })

    it('plan, tasks, code_and_tests, review are not_started', () => {
      const phases = computeCycleProgress(data)
      for (const id of ['plan', 'tasks', 'code_and_tests', 'review'] as const) {
        expect(phases.find((p) => p.id === id)?.status).toBe('not_started')
      }
    })
  })

  // ── Scenario 3: brainstorm + spec done ────────────────────────────────────

  describe('ideaDraft + researchBrief present', () => {
    const data: ProjectData = { ...emptyData, ideaDraft, researchBrief }

    it('brainstorm is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'brainstorm')?.status).toBe('done')
    })

    it('spec is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'spec')?.status).toBe('done')
    })

    it('plan is in_progress (brief exists, no specPack yet)', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'plan')?.status).toBe('in_progress')
    })

    it('tasks, code_and_tests, review are not_started', () => {
      const phases = computeCycleProgress(data)
      for (const id of ['tasks', 'code_and_tests', 'review'] as const) {
        expect(phases.find((p) => p.id === id)?.status).toBe('not_started')
      }
    })
  })

  // ── Scenario 4: plan done — specPack + architectureDraft present ──────────

  describe('full plan data (specPack + architectureDraft with roadmap phases)', () => {
    const data: ProjectData = {
      ...emptyData,
      ideaDraft,
      researchBrief,
      specPack,
      architectureDraft: architectureDraftWithPhases,
    }

    it('plan is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'plan')?.status).toBe('done')
    })

    it('tasks is done when roadmapPhases is non-empty', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'tasks')?.status).toBe('done')
    })
  })

  // ── Scenario 5: architectureDraft exists but roadmapPhases is empty ───────

  describe('architectureDraft with empty roadmapPhases', () => {
    const data: ProjectData = {
      ...emptyData,
      ideaDraft,
      researchBrief,
      specPack,
      architectureDraft: architectureDraftEmpty,
    }

    it('tasks is in_progress', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'tasks')?.status).toBe('in_progress')
    })
  })

  // ── Scenario 6: prompt iteration exists, no parsed summary ────────────────

  describe('one prompt iteration without parsed summary', () => {
    const data: ProjectData = {
      ...emptyData,
      promptIterations: [makeIteration({ parsedSummary: null })],
    }

    it('code_and_tests is in_progress', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'code_and_tests')?.status).toBe('in_progress')
    })

    it('review is not_started (no parsed summary)', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'review')?.status).toBe('not_started')
    })
  })

  // ── Scenario 7: prompt iteration with parsed summary but no tests ─────────

  describe('prompt iteration with parsedSummary, no tests', () => {
    const data: ProjectData = {
      ...emptyData,
      promptIterations: [makeIteration({ parsedSummary })],
    }

    it('code_and_tests is in_progress (no hasTests)', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'code_and_tests')?.status).toBe('in_progress')
    })

    it('review is in_progress (parsedSummary present)', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'review')?.status).toBe('in_progress')
    })
  })

  // ── Scenario 8: prompt iteration with hasTests=true ───────────────────────

  describe('prompt iteration with hasTests=true', () => {
    const data: ProjectData = {
      ...emptyData,
      promptIterations: [makeIteration({ parsedSummary: parsedSummaryWithTests })],
    }

    it('code_and_tests is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'code_and_tests')?.status).toBe('done')
    })
  })

  // ── Scenario 9: review-phase iteration ───────────────────────────────────

  describe('prompt iteration with cyclePhase=review', () => {
    const data: ProjectData = {
      ...emptyData,
      promptIterations: [
        makeIteration({ cyclePhase: 'review', parsedSummary }),
      ],
    }

    it('review is done', () => {
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'review')?.status).toBe('done')
    })
  })

  // ── Scenario 10: each phase has a navigation path ─────────────────────────

  describe('phase paths', () => {
    it('each phase has a non-empty path', () => {
      const phases = computeCycleProgress(emptyData)
      for (const phase of phases) {
        expect(phase.path).toBeTruthy()
        expect(phase.path.startsWith('/')).toBe(true)
      }
    })
  })

  // ── Scenario 11: brainstorm with empty rawIdea stays not_started ──────────

  describe('ideaDraft with blank rawIdea', () => {
    it('brainstorm is not_started when rawIdea is whitespace-only', () => {
      const data: ProjectData = {
        ...emptyData,
        ideaDraft: { ...ideaDraft, rawIdea: '   ' },
      }
      const phases = computeCycleProgress(data)
      expect(phases.find((p) => p.id === 'brainstorm')?.status).toBe('not_started')
    })
  })
})
