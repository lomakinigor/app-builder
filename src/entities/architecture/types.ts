// ─── Architecture ─────────────────────────────────────────────────────────────

export interface ArchitectureDraft {
  recommendedStack: StackItem[]
  moduleArchitecture: string
  dataFlow: string
  roadmapPhases: RoadmapPhase[]
  technicalRisks: string[]
}

export interface StackItem {
  name: string
  role: string
  rationale: string
}

export interface RoadmapPhase {
  phase: number
  title: string
  goals: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
}
