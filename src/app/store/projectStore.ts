import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Project,
  IdeaDraft,
  ProjectStage,
  ResearchRun,
  ImportedResearchArtifact,
  ResearchBrief,
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
} from '../../shared/types'

// ─── State shape ──────────────────────────────────────────────────────────────

interface ProjectState {
  // Active project
  activeProject: Project | null

  // Stage data
  ideaDraft: IdeaDraft | null
  researchRuns: ResearchRun[]
  importedArtifacts: ImportedResearchArtifact[]
  researchBrief: ResearchBrief | null
  specPack: SpecPack | null
  architectureDraft: ArchitectureDraft | null
  promptIterations: PromptIteration[]

  // UI state
  ui: {
    sidebarOpen: boolean
    activeTab: string
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface ProjectActions {
  setActiveProject: (project: Project) => void
  setCurrentStage: (stage: ProjectStage) => void
  setIdeaDraft: (draft: IdeaDraft) => void
  addResearchRun: (run: ResearchRun) => void
  updateResearchRun: (id: string, patch: Partial<ResearchRun>) => void
  addImportedArtifact: (artifact: ImportedResearchArtifact) => void
  setResearchBrief: (brief: ResearchBrief) => void
  updateResearchBrief: (patch: Partial<ResearchBrief>) => void
  setSpecPack: (spec: SpecPack) => void
  updateSpecPack: (patch: Partial<SpecPack>) => void
  setArchitectureDraft: (arch: ArchitectureDraft) => void
  updateArchitectureDraft: (patch: Partial<ArchitectureDraft>) => void
  addPromptIteration: (iteration: PromptIteration) => void
  updatePromptIteration: (id: string, patch: Partial<PromptIteration>) => void
  toggleSidebar: () => void
  resetProject: () => void
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: ProjectState = {
  activeProject: null,
  ideaDraft: null,
  researchRuns: [],
  importedArtifacts: [],
  researchBrief: null,
  specPack: null,
  architectureDraft: null,
  promptIterations: [],
  ui: {
    sidebarOpen: false,
    activeTab: 'overview',
  },
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveProject: (project) =>
        set({ activeProject: project }),

      setCurrentStage: (stage) =>
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, currentStage: stage, updatedAt: new Date().toISOString() }
            : null,
        })),

      setIdeaDraft: (draft) => set({ ideaDraft: draft }),

      addResearchRun: (run) =>
        set((state) => ({ researchRuns: [...state.researchRuns, run] })),

      updateResearchRun: (id, patch) =>
        set((state) => ({
          researchRuns: state.researchRuns.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      addImportedArtifact: (artifact) =>
        set((state) => ({ importedArtifacts: [...state.importedArtifacts, artifact] })),

      setResearchBrief: (brief) => set({ researchBrief: brief }),

      updateResearchBrief: (patch) =>
        set((state) => ({
          researchBrief: state.researchBrief ? { ...state.researchBrief, ...patch } : null,
        })),

      setSpecPack: (spec) => set({ specPack: spec }),

      updateSpecPack: (patch) =>
        set((state) => ({
          specPack: state.specPack ? { ...state.specPack, ...patch } : null,
        })),

      setArchitectureDraft: (arch) => set({ architectureDraft: arch }),

      updateArchitectureDraft: (patch) =>
        set((state) => ({
          architectureDraft: state.architectureDraft ? { ...state.architectureDraft, ...patch } : null,
        })),

      addPromptIteration: (iteration) =>
        set((state) => ({ promptIterations: [...state.promptIterations, iteration] })),

      updatePromptIteration: (id, patch) =>
        set((state) => ({
          promptIterations: state.promptIterations.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),

      toggleSidebar: () =>
        set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } })),

      resetProject: () => set(initialState),
    }),
    {
      name: 'ai-product-studio-project',
    }
  )
)
