// T-201 — Project registry store unit tests
// Covers: createProject, selectProject, updateProject, selectSelectedProject selector

import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectRegistry, selectSelectedProject } from './projectRegistryStore'
import { useProjectStore } from './projectStore'
import { mockProject } from '../../mocks/project/seedData'

// ─── Reset helpers ────────────────────────────────────────────────────────────

const REGISTRY_INITIAL: Parameters<typeof useProjectRegistry.setState>[0] = {
  projects: [mockProject],
  selectedProjectId: null,
}

const PROJECT_STORE_INITIAL = {
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

function resetStores() {
  useProjectRegistry.setState(REGISTRY_INITIAL)
  useProjectStore.setState(PROJECT_STORE_INITIAL)
}

// ─── A. createProject ─────────────────────────────────────────────────────────

describe('A. createProject — adds project to registry', () => {
  beforeEach(resetStores)

  it('returns a Project with the given name and projectType', () => {
    const p = useProjectRegistry.getState().createProject({ name: 'My App', projectType: 'application' })
    expect(p.name).toBe('My App')
    expect(p.projectType).toBe('application')
  })

  it('generated project has a non-empty id', () => {
    const p = useProjectRegistry.getState().createProject({ name: 'Site', projectType: 'website' })
    expect(p.id).toBeTruthy()
    expect(typeof p.id).toBe('string')
  })

  it('generated project has ISO createdAt and updatedAt', () => {
    const p = useProjectRegistry.getState().createProject({ name: 'X', projectType: 'application' })
    expect(() => new Date(p.createdAt)).not.toThrow()
    expect(() => new Date(p.updatedAt)).not.toThrow()
    expect(p.createdAt).toBe(p.updatedAt)
  })

  it('appends project to projects list (does not replace demo)', () => {
    useProjectRegistry.getState().createProject({ name: 'Second', projectType: 'website' })
    const { projects } = useProjectRegistry.getState()
    expect(projects).toHaveLength(2)
    expect(projects[0].id).toBe(mockProject.id)
  })

  it('created project id starts with "proj-"', () => {
    const p = useProjectRegistry.getState().createProject({ name: 'A', projectType: 'application' })
    expect(p.id.startsWith('proj-')).toBe(true)
  })
})

// ─── B. selectProject ─────────────────────────────────────────────────────────

describe('B. selectProject — sets selectedProjectId and bridges to projectStore', () => {
  beforeEach(resetStores)

  it('sets selectedProjectId to the given project id', () => {
    useProjectRegistry.getState().selectProject(mockProject.id)
    expect(useProjectRegistry.getState().selectedProjectId).toBe(mockProject.id)
  })

  it('bridges to projectStore.activeProject', () => {
    useProjectRegistry.getState().selectProject(mockProject.id)
    expect(useProjectStore.getState().activeProject?.id).toBe(mockProject.id)
  })

  it('bridges full project object — name and projectType match', () => {
    useProjectRegistry.getState().selectProject(mockProject.id)
    const active = useProjectStore.getState().activeProject
    expect(active?.name).toBe(mockProject.name)
    expect(active?.projectType).toBe(mockProject.projectType)
  })

  it('unknown id is a no-op — selectedProjectId stays null', () => {
    useProjectRegistry.getState().selectProject('does-not-exist')
    expect(useProjectRegistry.getState().selectedProjectId).toBeNull()
  })

  it('selecting newly created project sets selectedProjectId', () => {
    const p = useProjectRegistry.getState().createProject({ name: 'New', projectType: 'website' })
    useProjectRegistry.getState().selectProject(p.id)
    expect(useProjectRegistry.getState().selectedProjectId).toBe(p.id)
  })
})

// ─── C. updateProject ─────────────────────────────────────────────────────────

describe('C. updateProject — patches name / projectType and updates updatedAt', () => {
  beforeEach(resetStores)

  it('updates name on an existing project', () => {
    useProjectRegistry.getState().updateProject(mockProject.id, { name: 'Renamed App' })
    const found = useProjectRegistry.getState().projects.find((p) => p.id === mockProject.id)
    expect(found?.name).toBe('Renamed App')
  })

  it('updates projectType on an existing project', () => {
    useProjectRegistry.getState().updateProject(mockProject.id, { projectType: 'website' })
    const found = useProjectRegistry.getState().projects.find((p) => p.id === mockProject.id)
    expect(found?.projectType).toBe('website')
  })

  it('bumps updatedAt after patch', () => {
    const before = mockProject.updatedAt
    useProjectRegistry.getState().updateProject(mockProject.id, { name: 'Updated' })
    const found = useProjectRegistry.getState().projects.find((p) => p.id === mockProject.id)
    expect(found?.updatedAt).not.toBe(before)
  })

  it('unknown id is a no-op — projects list unchanged', () => {
    const before = useProjectRegistry.getState().projects.length
    useProjectRegistry.getState().updateProject('no-such-id', { name: 'Ghost' })
    expect(useProjectRegistry.getState().projects).toHaveLength(before)
  })

  it('other projects are not affected by a patch', () => {
    const p2 = useProjectRegistry.getState().createProject({ name: 'Other', projectType: 'website' })
    useProjectRegistry.getState().updateProject(mockProject.id, { name: 'Changed' })
    const other = useProjectRegistry.getState().projects.find((p) => p.id === p2.id)
    expect(other?.name).toBe('Other')
  })
})

// ─── D. selectSelectedProject selector ───────────────────────────────────────

describe('D. selectSelectedProject selector', () => {
  beforeEach(resetStores)

  it('returns null when selectedProjectId is null', () => {
    const state = useProjectRegistry.getState()
    expect(selectSelectedProject(state)).toBeNull()
  })

  it('returns the matching Project after selectProject', () => {
    useProjectRegistry.getState().selectProject(mockProject.id)
    const state = useProjectRegistry.getState()
    const result = selectSelectedProject(state)
    expect(result).not.toBeNull()
    expect(result?.id).toBe(mockProject.id)
  })

  it('returns null when selectedProjectId points to a removed/unknown id', () => {
    // Manually set a dangling selectedProjectId (no matching project)
    useProjectRegistry.setState({ selectedProjectId: 'phantom-id' })
    const state = useProjectRegistry.getState()
    expect(selectSelectedProject(state)).toBeNull()
  })
})
