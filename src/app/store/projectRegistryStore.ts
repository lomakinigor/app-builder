// ─── Project Registry Store ───────────────────────────────────────────────────
// Implements T-201 / F-027.
//
// Owns the canonical list of projects and the selected project ID.
// This is the entry point for multi-project support; individual project stage
// data (ideaDraft, researchBrief, etc.) continues to live in projectStore for now.
//
// Bridge: selectProject() keeps projectStore.activeProject in sync so all
// downstream pages work without modification.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectType } from '../../shared/types'
import { mockProject } from '../../mocks/project/seedData'
import { useProjectStore } from './projectStore'

// ─── State shape ──────────────────────────────────────────────────────────────

interface RegistryState {
  projects: Project[]
  selectedProjectId: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface RegistryActions {
  /** Add a new project to the registry and return it. Does not auto-select. */
  createProject: (input: { name: string; projectType: ProjectType }) => Project
  /**
   * Set the active project by ID.
   * Bridges to projectStore.setActiveProject so the rest of the app
   * continues to read from useProjectStore().activeProject unchanged.
   */
  selectProject: (id: string) => void
  /** Patch name and/or projectType on an existing project. */
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'projectType'>>) => void
  /** Mark a project as completed (project-level lifecycle completion — T-213). Idempotent. */
  markProjectCompleted: (id: string) => void
}

// ─── Initial state ────────────────────────────────────────────────────────────
// Pre-populated with the demo project so new users see something meaningful.
// selectedProjectId starts null — the user must explicitly select or load a project.

const initialState: RegistryState = {
  projects: [mockProject],
  selectedProjectId: null,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectRegistry = create<RegistryState & RegistryActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      createProject: (input) => {
        const now = new Date().toISOString()
        const project: Project = {
          id: `proj-${Date.now()}`,
          name: input.name,
          projectType: input.projectType,
          createdAt: now,
          updatedAt: now,
          status: 'active',
          currentStage: 'idea',
        }
        set((state) => ({ projects: [...state.projects, project] }))
        return project
      },

      selectProject: (id) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return
        set({ selectedProjectId: id })
        // Bridge: keep projectStore in sync so all existing pages work unchanged.
        useProjectStore.getState().setActiveProject(project)
      },

      updateProject: (id, patch) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...patch, updatedAt: new Date().toISOString() }
              : p
          ),
        }))
      },

      markProjectCompleted: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id && p.status !== 'completed'
              ? { ...p, status: 'completed', updatedAt: new Date().toISOString() }
              : p
          ),
        }))
      },
    }),
    {
      name: 'ai-product-studio-registry',
    }
  )
)

// ─── Selector helpers ─────────────────────────────────────────────────────────

/** Returns the currently selected Project object, or null. */
export function selectSelectedProject(state: RegistryState): Project | null {
  return state.projects.find((p) => p.id === state.selectedProjectId) ?? null
}
