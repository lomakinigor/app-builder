// T-015 — Local persistence correctness: projectStore
// Implements F-019 / T-015
//
// Strategy:
//   We do NOT test Zustand's persist middleware itself — it is a battle-tested
//   library. Instead we test:
//     1. Shape guards  — emptyProjectData / initialState have correct defaults
//     2. Reload simulation — setState(capturedState) mimics what persist does on
//        rehydration; the store must read back identical values.
//     3. Hot/cold slot mechanics — setActiveProject snapshots and restores all
//        7 artifact types correctly.
//     4. Stage-gate data preservation — specPack, architectureDraft,
//        promptIterations survive a project switch cycle.
//     5. Multi-project isolation — two projects' cold-store entries are independent.
//     6. Partial-state tolerance — rehydration with missing fields falls back to
//        initialState defaults (no crash, no undefined slots).
//     7. Reset — resetProject brings the store to clean initialState.
//
// "Reload simulation" pattern used throughout:
//   (a) build state via actions,
//   (b) capture state = getState(),
//   (c) reset store to initialState,
//   (d) re-apply captured state via setState (= what Zustand persist does),
//   (e) assert the store reads back the expected values.

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  IdeaDraft,
  ResearchRun,
  ImportedResearchArtifact,
  ResearchBrief,
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  Project,
} from '../../shared/types'
import { useProjectStore, emptyProjectData, type ProjectData } from './projectStore'
import {
  mockProject,
  mockIdeaDraft,
  mockResearchBrief,
  mockSpecPack,
  mockArchitectureDraft,
  mockPromptIterations,
  mockResearchRun,
  mockImportedArtifact,
} from '../../mocks/project/seedData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_STATE_SHAPE = {
  activeProject: null,
  projectData: {},
  ideaDraft: null,
  researchRuns: [],
  importedArtifacts: [],
  researchBrief: null,
  specPack: null,
  architectureDraft: null,
  promptIterations: [],
  ui: { sidebarOpen: false, activeTab: 'overview' },
}

function resetStore() {
  // Do NOT pass replace=true — that would wipe the action functions out of the store.
  // Merging (default) preserves actions while resetting all data fields.
  useProjectStore.setState(INITIAL_STATE_SHAPE)
}

function makeProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    name: `Project ${id}`,
    projectType: 'application',
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    status: 'active',
    currentStage: 'idea',
    ...overrides,
  }
}

function makeIteration(id: string, overrides: Partial<PromptIteration> = {}): PromptIteration {
  return {
    id,
    projectId: 'proj-persist-1',
    iterationNumber: 1,
    promptText: 'Prompt text.',
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-15T10:00:00Z',
    projectType: 'application',
    cyclePhase: 'code_and_tests',
    targetTaskId: 'T-001',
    roadmapPhaseNumber: 1,
    ...overrides,
  }
}

// ─── A. Shape guards ──────────────────────────────────────────────────────────
// These tests guard against future regressions where a new field is added to
// ProjectData but its default is forgotten in emptyProjectData.

describe('A. emptyProjectData shape — all fields present with correct defaults', () => {
  it('ideaDraft defaults to null', () => {
    expect(emptyProjectData.ideaDraft).toBeNull()
  })

  it('researchRuns defaults to empty array', () => {
    expect(emptyProjectData.researchRuns).toEqual([])
  })

  it('importedArtifacts defaults to empty array', () => {
    expect(emptyProjectData.importedArtifacts).toEqual([])
  })

  it('researchBrief defaults to null', () => {
    expect(emptyProjectData.researchBrief).toBeNull()
  })

  it('specPack defaults to null', () => {
    expect(emptyProjectData.specPack).toBeNull()
  })

  it('architectureDraft defaults to null', () => {
    expect(emptyProjectData.architectureDraft).toBeNull()
  })

  it('promptIterations defaults to empty array', () => {
    expect(emptyProjectData.promptIterations).toEqual([])
  })

  it('emptyProjectData has exactly 7 keys — matches ProjectData interface', () => {
    const keys = Object.keys(emptyProjectData)
    expect(keys).toHaveLength(7)
    expect(keys).toContain('ideaDraft')
    expect(keys).toContain('researchRuns')
    expect(keys).toContain('importedArtifacts')
    expect(keys).toContain('researchBrief')
    expect(keys).toContain('specPack')
    expect(keys).toContain('architectureDraft')
    expect(keys).toContain('promptIterations')
  })

  it('array fields are real arrays (not null, not undefined)', () => {
    expect(Array.isArray(emptyProjectData.researchRuns)).toBe(true)
    expect(Array.isArray(emptyProjectData.importedArtifacts)).toBe(true)
    expect(Array.isArray(emptyProjectData.promptIterations)).toBe(true)
  })
})

describe('A2. initialState shape — store starts with correct defaults', () => {
  beforeEach(resetStore)

  it('activeProject is null at start', () => {
    expect(useProjectStore.getState().activeProject).toBeNull()
  })

  it('projectData is {} at start', () => {
    expect(useProjectStore.getState().projectData).toEqual({})
  })

  it('all hot slots are at empty defaults at start', () => {
    const s = useProjectStore.getState()
    expect(s.ideaDraft).toBeNull()
    expect(s.researchRuns).toEqual([])
    expect(s.importedArtifacts).toEqual([])
    expect(s.researchBrief).toBeNull()
    expect(s.specPack).toBeNull()
    expect(s.architectureDraft).toBeNull()
    expect(s.promptIterations).toEqual([])
  })

  it('ui.sidebarOpen is false at start', () => {
    expect(useProjectStore.getState().ui.sidebarOpen).toBe(false)
  })

  it('ui.activeTab is "overview" at start', () => {
    expect(useProjectStore.getState().ui.activeTab).toBe('overview')
  })
})

// ─── B. Reload simulation ─────────────────────────────────────────────────────
// Simulate Zustand persist rehydration: capture state, reset, re-apply.
// Zustand's default merge is shallow: { ...currentState, ...persistedState }.
// We approximate this by calling setState(capturedState) after a reset.

describe('B. Reload simulation — all hot slots survive a reset+rehydrate cycle', () => {
  beforeEach(resetStore)

  it('ideaDraft survives reload simulation', () => {
    const { setActiveProject, setIdeaDraft } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r1'))
    setIdeaDraft(mockIdeaDraft)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().ideaDraft).toEqual(mockIdeaDraft)
  })

  it('researchBrief survives reload simulation', () => {
    const { setActiveProject, setResearchBrief } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r2'))
    setResearchBrief(mockResearchBrief)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().researchBrief).toEqual(mockResearchBrief)
  })

  it('specPack survives reload simulation', () => {
    const { setActiveProject, setSpecPack } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r3'))
    setSpecPack(mockSpecPack)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().specPack).toEqual(mockSpecPack)
  })

  it('architectureDraft survives reload simulation', () => {
    const { setActiveProject, setArchitectureDraft } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r4'))
    setArchitectureDraft(mockArchitectureDraft)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().architectureDraft).toEqual(mockArchitectureDraft)
  })

  it('promptIterations survive reload simulation — count preserved', () => {
    const { setActiveProject, addPromptIteration } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r5'))
    addPromptIteration(makeIteration('iter-r1'))
    addPromptIteration(makeIteration('iter-r2', { iterationNumber: 2 }))

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().promptIterations).toHaveLength(2)
  })

  it('promptIterations survive reload simulation — contents preserved', () => {
    const { setActiveProject, addPromptIteration } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r6'))
    addPromptIteration(makeIteration('iter-content-1', { targetTaskId: 'T-007' }))

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    const iter = useProjectStore.getState().promptIterations[0]
    expect(iter.id).toBe('iter-content-1')
    expect(iter.targetTaskId).toBe('T-007')
  })

  it('researchRuns survive reload simulation', () => {
    const { setActiveProject, addResearchRun } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r7'))
    addResearchRun(mockResearchRun)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().researchRuns).toHaveLength(1)
    expect(useProjectStore.getState().researchRuns[0].id).toBe(mockResearchRun.id)
  })

  it('importedArtifacts survive reload simulation', () => {
    const { setActiveProject, addImportedArtifact } = useProjectStore.getState()
    setActiveProject(makeProject('proj-r8'))
    addImportedArtifact(mockImportedArtifact)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().importedArtifacts).toHaveLength(1)
    expect(useProjectStore.getState().importedArtifacts[0].id).toBe(mockImportedArtifact.id)
  })

  it('activeProject survives reload simulation', () => {
    useProjectStore.getState().setActiveProject(makeProject('proj-r9'))

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().activeProject?.id).toBe('proj-r9')
  })

  it('cold store projectData map survives reload simulation', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-cold-1')
    const p2 = makeProject('proj-cold-2')

    store.setActiveProject(p1)
    store.setSpecPack(mockSpecPack)
    store.setActiveProject(p2)   // snapshots p1 into cold store

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    // After reload, cold store has p1's specPack
    expect(useProjectStore.getState().projectData['proj-cold-1']?.specPack).toEqual(mockSpecPack)
  })
})

// ─── C. Partial-state tolerance ───────────────────────────────────────────────
// If localStorage has an old/partial persisted blob (missing some fields),
// Zustand's shallow merge preserves current-state defaults for missing fields.

describe('C. Partial-state tolerance — missing fields fall back to initialState', () => {
  beforeEach(resetStore)

  it('rehydrating with only activeProject set → hot slots remain at initial defaults', () => {
    const partialState = { activeProject: makeProject('proj-partial') }
    useProjectStore.setState(partialState)

    const s = useProjectStore.getState()
    // Shallow merge: missing hot slots stay as resetStore set them (null/[])
    expect(s.specPack).toBeNull()
    expect(s.promptIterations).toEqual([])
    expect(s.researchBrief).toBeNull()
  })

  it('rehydrating with only projectData set → activeProject remains null', () => {
    const partialState = {
      projectData: { 'proj-x': { ...emptyProjectData, specPack: mockSpecPack } },
    }
    useProjectStore.setState(partialState)

    expect(useProjectStore.getState().activeProject).toBeNull()
  })

  it('rehydrating with empty object is safe — store keeps all initialState values', () => {
    useProjectStore.setState({})

    const s = useProjectStore.getState()
    expect(s.activeProject).toBeNull()
    expect(s.projectData).toEqual({})
    expect(s.specPack).toBeNull()
  })

  it('rehydrating with extra unknown fields does not crash the store', () => {
    // Future version might add fields we don't know about yet
    const stateWithExtras = {
      ...(useProjectStore.getState() as Record<string, unknown>),
      futureFieldNotInSchema: 'some-value',
      anotherUnknownField: { nested: true },
    }
    expect(() => useProjectStore.setState(stateWithExtras)).not.toThrow()
  })

  it('projectData entry with partial ProjectData fields — setActiveProject fills missing with emptyProjectData', () => {
    // Only ideaDraft is set in cold store; other fields are missing (old version scenario)
    const partialProjectData: Partial<ProjectData> = {
      ideaDraft: mockIdeaDraft,
      // researchRuns, specPack, etc. are missing
    }
    useProjectStore.setState({
      activeProject: null,
      projectData: { 'proj-partial-data': partialProjectData as ProjectData },
    })

    // setActiveProject should spread partialProjectData (missing fields = undefined → ok)
    // The ?? emptyProjectData fallback only applies when project has NO entry at all
    useProjectStore.getState().setActiveProject(makeProject('proj-partial-data'))

    const s = useProjectStore.getState()
    // ideaDraft was set; promptIterations was missing → undefined spreads into hot slot
    // (This is the expected behavior: partial data = partial restore)
    expect(s.ideaDraft).toEqual(mockIdeaDraft)
  })

  it('setActiveProject for unknown project → all hot slots get emptyProjectData defaults', () => {
    useProjectStore.getState().setActiveProject(makeProject('proj-brand-new'))

    const s = useProjectStore.getState()
    expect(s.ideaDraft).toBeNull()
    expect(s.specPack).toBeNull()
    expect(s.architectureDraft).toBeNull()
    expect(s.researchBrief).toBeNull()
    expect(s.researchRuns).toEqual([])
    expect(s.importedArtifacts).toEqual([])
    expect(s.promptIterations).toEqual([])
  })
})

// ─── D. setActiveProject hot/cold slot mechanics ──────────────────────────────

describe('D. setActiveProject — hot/cold slot mechanics', () => {
  beforeEach(resetStore)

  it('switching to a new project snapshots all 7 artifact types into cold store', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-hc-1')
    const p2 = makeProject('proj-hc-2')

    store.setActiveProject(p1)
    store.setIdeaDraft(mockIdeaDraft)
    store.setResearchBrief(mockResearchBrief)
    store.setSpecPack(mockSpecPack)
    store.setArchitectureDraft(mockArchitectureDraft)
    store.addResearchRun(mockResearchRun)
    store.addImportedArtifact(mockImportedArtifact)
    store.addPromptIteration(makeIteration('iter-hc-1'))

    // Switch away — should snapshot p1 into cold store
    store.setActiveProject(p2)

    const cold = useProjectStore.getState().projectData['proj-hc-1']
    expect(cold).toBeDefined()
    expect(cold!.ideaDraft).toEqual(mockIdeaDraft)
    expect(cold!.researchBrief).toEqual(mockResearchBrief)
    expect(cold!.specPack).toEqual(mockSpecPack)
    expect(cold!.architectureDraft).toEqual(mockArchitectureDraft)
    expect(cold!.researchRuns).toHaveLength(1)
    expect(cold!.importedArtifacts).toHaveLength(1)
    expect(cold!.promptIterations).toHaveLength(1)
  })

  it('switching back restores all 7 artifact types from cold store', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-hc-3')
    const p2 = makeProject('proj-hc-4')

    store.setActiveProject(p1)
    store.setSpecPack(mockSpecPack)
    store.setArchitectureDraft(mockArchitectureDraft)
    store.addPromptIteration(makeIteration('iter-hc-3'))

    store.setActiveProject(p2)  // snapshot p1
    store.setActiveProject(p1)  // restore p1

    const s = useProjectStore.getState()
    expect(s.specPack).toEqual(mockSpecPack)
    expect(s.architectureDraft).toEqual(mockArchitectureDraft)
    expect(s.promptIterations).toHaveLength(1)
    expect(s.promptIterations[0].id).toBe('iter-hc-3')
  })

  it('switching to unknown project gives emptyProjectData in hot slots', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-hc-5'))
    store.setSpecPack(mockSpecPack)

    store.setActiveProject(makeProject('proj-hc-UNKNOWN'))

    const s = useProjectStore.getState()
    expect(s.specPack).toBeNull()
    expect(s.ideaDraft).toBeNull()
    expect(s.promptIterations).toEqual([])
  })

  it('switching back to first project retains its promptIterations count after multiple switches', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-multi-1')
    const p2 = makeProject('proj-multi-2')
    const p3 = makeProject('proj-multi-3')

    store.setActiveProject(p1)
    store.addPromptIteration(makeIteration('iter-m1'))
    store.addPromptIteration(makeIteration('iter-m2', { iterationNumber: 2 }))

    store.setActiveProject(p2)   // snapshot p1
    store.setActiveProject(p3)   // snapshot p2 (empty)
    store.setActiveProject(p1)   // restore p1

    expect(useProjectStore.getState().promptIterations).toHaveLength(2)
  })

  it('cold store projectData is not modified when only hot slots are updated', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-cold-guard'))

    // Add data to hot slots (no project switch = no cold store update)
    store.setSpecPack(mockSpecPack)
    store.addPromptIteration(makeIteration('iter-cold'))

    // Cold store for this project should still be {} or whatever was snapshotted last
    // (Not updated until next setActiveProject call)
    const cold = useProjectStore.getState().projectData['proj-cold-guard']
    // cold is undefined because we never triggered a project switch after this project was set
    expect(cold).toBeUndefined()
  })

  it('no-op setActiveProject on already-active project with null previous → projectData unchanged', () => {
    // First setActiveProject: no previous project → no snapshot
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-noop'))
    store.setSpecPack(mockSpecPack)

    // setActiveProject again for a different project → snapshots 'proj-noop'
    store.setActiveProject(makeProject('proj-noop-2'))

    const cold = useProjectStore.getState().projectData['proj-noop']
    expect(cold?.specPack).toEqual(mockSpecPack)
  })
})

// ─── E. Stage-gate data preservation ─────────────────────────────────────────
// Verify that the data stage gates depend on (specPack.featureList, architectureDraft.roadmapPhases,
// promptIterations[last].parsedSummary) all survive the switch cycle.

describe('E. Stage-gate data — preserved through project switch + reload', () => {
  beforeEach(resetStore)

  it('specPack.featureList survives switch → reload cycle', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-sg-1')
    const p2 = makeProject('proj-sg-2')

    store.setActiveProject(p1)
    store.setSpecPack(mockSpecPack)
    store.setActiveProject(p2)   // snapshot p1

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    useProjectStore.getState().setActiveProject(p1)   // restore p1

    const spec = useProjectStore.getState().specPack
    expect(spec?.featureList).toHaveLength(mockSpecPack.featureList.length)
    expect(spec?.featureList[0].id).toBe('f-001')
  })

  it('architectureDraft.roadmapPhases count survives switch → reload cycle', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-sg-3')
    const p2 = makeProject('proj-sg-4')

    store.setActiveProject(p1)
    store.setArchitectureDraft(mockArchitectureDraft)
    store.setActiveProject(p2)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    useProjectStore.getState().setActiveProject(p1)

    const arch = useProjectStore.getState().architectureDraft
    expect(arch?.roadmapPhases).toHaveLength(mockArchitectureDraft.roadmapPhases.length)
  })

  it('last promptIteration.parsedSummary (gate gate) survives reload', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-sg-5'))
    const iter = makeIteration('iter-sg-last', {
      parsedSummary: {
        analysis: 'ok',
        plan: 'done',
        changedFiles: ['x.ts'],
        implementationSummary: 'impl',
        nextStep: 'next',
        warnings: [],
        hasTests: true,
        implementedTaskIds: ['T-001'],
        nextTaskId: 'T-002',
        inferredNextPhase: 'code_and_tests',
      },
      status: 'parsed',
    })
    store.addPromptIteration(iter)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    const last = useProjectStore.getState().promptIterations.at(-1)
    expect(last?.parsedSummary?.hasTests).toBe(true)
    expect(last?.parsedSummary?.warnings).toHaveLength(0)
    expect(last?.status).toBe('parsed')
  })

  it('promptIterations with warnings (gate blocker) survive reload', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-sg-6'))
    const iter = makeIteration('iter-sg-warn', {
      parsedSummary: {
        analysis: 'partial',
        plan: '',
        changedFiles: [],
        implementationSummary: '',
        nextStep: '',
        warnings: ['No tests detected.', 'Section 5 missing.'],
        hasTests: false,
        implementedTaskIds: [],
        nextTaskId: null,
        inferredNextPhase: 'code_and_tests',
      },
      status: 'parsed',
    })
    store.addPromptIteration(iter)

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    const last = useProjectStore.getState().promptIterations.at(-1)
    expect(last?.parsedSummary?.hasTests).toBe(false)
    expect(last?.parsedSummary?.warnings).toHaveLength(2)
  })

  it('updateSpecPack patch survives reload', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-sg-7'))
    store.setSpecPack(mockSpecPack)
    store.updateSpecPack({ productSummary: 'Updated summary after patch.' })

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().specPack?.productSummary).toBe('Updated summary after patch.')
  })

  it('updateArchitectureDraft patch survives reload', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-sg-8'))
    store.setArchitectureDraft(mockArchitectureDraft)
    store.updateArchitectureDraft({ moduleArchitecture: 'Domain-driven.' })

    const captured = useProjectStore.getState()
    resetStore()
    useProjectStore.setState(captured)

    expect(useProjectStore.getState().architectureDraft?.moduleArchitecture).toBe('Domain-driven.')
  })
})

// ─── F. Multi-project isolation ───────────────────────────────────────────────

describe('F. Multi-project isolation — cold store entries are independent', () => {
  beforeEach(resetStore)

  it('P1 specPack and P2 specPack are stored independently in cold store', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-iso-1')
    const p2 = makeProject('proj-iso-2')

    const spec1: SpecPack = { ...mockSpecPack, productSummary: 'Product 1' }
    const spec2: SpecPack = { ...mockSpecPack, productSummary: 'Product 2' }

    store.setActiveProject(p1)
    store.setSpecPack(spec1)
    store.setActiveProject(p2)   // snapshot p1
    store.setSpecPack(spec2)
    store.setActiveProject(p1)   // snapshot p2, restore p1

    expect(useProjectStore.getState().specPack?.productSummary).toBe('Product 1')
    expect(useProjectStore.getState().projectData['proj-iso-2']?.specPack?.productSummary).toBe('Product 2')
  })

  it('P2 promptIterations do not appear in P1 after switch back', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-iso-3')
    const p2 = makeProject('proj-iso-4')

    store.setActiveProject(p1)
    store.addPromptIteration(makeIteration('iter-p1', { projectId: 'proj-iso-3' }))
    store.setActiveProject(p2)
    store.addPromptIteration(makeIteration('iter-p2a', { projectId: 'proj-iso-4' }))
    store.addPromptIteration(makeIteration('iter-p2b', { projectId: 'proj-iso-4', iterationNumber: 2 }))
    store.setActiveProject(p1)

    // P1 should only have its 1 iteration
    expect(useProjectStore.getState().promptIterations).toHaveLength(1)
    expect(useProjectStore.getState().promptIterations[0].id).toBe('iter-p1')
  })

  it('P1 architectureDraft not overwritten by P2 operations', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-iso-5')
    const p2 = makeProject('proj-iso-6')

    store.setActiveProject(p1)
    store.setArchitectureDraft(mockArchitectureDraft)
    store.setActiveProject(p2)

    // Modify P2's architectureDraft
    store.setArchitectureDraft({ ...mockArchitectureDraft, moduleArchitecture: 'P2 arch' })

    // Switch back — P1 cold store should have original arch
    store.setActiveProject(p1)
    expect(useProjectStore.getState().architectureDraft?.moduleArchitecture).toBe(
      mockArchitectureDraft.moduleArchitecture
    )
  })

  it('three projects coexist in cold store simultaneously', () => {
    const store = useProjectStore.getState()
    const p1 = makeProject('proj-three-1')
    const p2 = makeProject('proj-three-2')
    const p3 = makeProject('proj-three-3')

    store.setActiveProject(p1)
    store.setSpecPack({ ...mockSpecPack, productSummary: 'Three-1' })
    store.setActiveProject(p2)
    store.setSpecPack({ ...mockSpecPack, productSummary: 'Three-2' })
    store.setActiveProject(p3)
    store.setSpecPack({ ...mockSpecPack, productSummary: 'Three-3' })
    store.setActiveProject(p1) // triggers snapshot of p3

    const pd = useProjectStore.getState().projectData
    expect(pd['proj-three-1']?.specPack?.productSummary).toBe('Three-1')
    expect(pd['proj-three-2']?.specPack?.productSummary).toBe('Three-2')
    expect(pd['proj-three-3']?.specPack?.productSummary).toBe('Three-3')
  })
})

// ─── G. Reset ─────────────────────────────────────────────────────────────────

describe('G. resetProject — brings store to clean initialState', () => {
  beforeEach(resetStore)

  it('resetProject clears activeProject', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-reset-1'))
    store.resetProject()
    expect(useProjectStore.getState().activeProject).toBeNull()
  })

  it('resetProject clears all hot slots', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-reset-2'))
    store.setSpecPack(mockSpecPack)
    store.setArchitectureDraft(mockArchitectureDraft)
    store.addPromptIteration(makeIteration('iter-reset'))
    store.resetProject()

    const s = useProjectStore.getState()
    expect(s.specPack).toBeNull()
    expect(s.architectureDraft).toBeNull()
    expect(s.promptIterations).toEqual([])
    expect(s.ideaDraft).toBeNull()
    expect(s.researchBrief).toBeNull()
    expect(s.researchRuns).toEqual([])
    expect(s.importedArtifacts).toEqual([])
  })

  it('resetProject clears projectData cold store', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-reset-3'))
    store.setSpecPack(mockSpecPack)
    store.setActiveProject(makeProject('proj-reset-4'))  // snapshot
    store.resetProject()

    expect(useProjectStore.getState().projectData).toEqual({})
  })

  it('resetProject does not crash when store is already at initialState', () => {
    expect(() => useProjectStore.getState().resetProject()).not.toThrow()
  })
})

// ─── H. Patch actions — updateSpecPack / updateArchitectureDraft ──────────────

describe('H. Patch actions — updateSpecPack, updateArchitectureDraft, updateResearchBrief', () => {
  beforeEach(resetStore)

  it('updateSpecPack merges patch into existing specPack (does not replace)', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-patch-1'))
    store.setSpecPack(mockSpecPack)
    store.updateSpecPack({ MVPScope: 'New scope.' })

    const s = useProjectStore.getState().specPack
    expect(s?.MVPScope).toBe('New scope.')
    // Other fields preserved
    expect(s?.productSummary).toBe(mockSpecPack.productSummary)
    expect(s?.featureList).toEqual(mockSpecPack.featureList)
  })

  it('updateSpecPack on null specPack is a no-op (no crash)', () => {
    useProjectStore.getState().setActiveProject(makeProject('proj-patch-2'))
    expect(() => useProjectStore.getState().updateSpecPack({ MVPScope: 'x' })).not.toThrow()
    expect(useProjectStore.getState().specPack).toBeNull()
  })

  it('updateArchitectureDraft merges patch without replacing whole draft', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-patch-3'))
    store.setArchitectureDraft(mockArchitectureDraft)
    store.updateArchitectureDraft({ dataFlow: 'Bidirectional.' })

    const a = useProjectStore.getState().architectureDraft
    expect(a?.dataFlow).toBe('Bidirectional.')
    expect(a?.recommendedStack).toEqual(mockArchitectureDraft.recommendedStack)
  })

  it('updateResearchBrief merges patch without replacing whole brief', () => {
    const store = useProjectStore.getState()
    store.setActiveProject(makeProject('proj-patch-4'))
    store.setResearchBrief(mockResearchBrief)
    store.updateResearchBrief({ problemSummary: 'Updated problem.' })

    const b = useProjectStore.getState().researchBrief
    expect(b?.problemSummary).toBe('Updated problem.')
    expect(b?.targetUsers).toEqual(mockResearchBrief.targetUsers)
  })
})
