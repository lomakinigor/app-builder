// ─── Specification ────────────────────────────────────────────────────────────

export interface SpecPack {
  productSummary: string
  MVPScope: string
  featureList: SpecFeature[]
  assumptions: string[]
  constraints: string[]
  acceptanceNotes: string
}

export interface SpecFeature {
  id: string
  name: string
  description: string
  priority: 'must' | 'should' | 'could' | 'wont'
}
