// ─── Prompt loop ──────────────────────────────────────────────────────────────

export type PromptStatus = 'draft' | 'sent' | 'responded' | 'parsed'

export interface PromptIteration {
  id: string
  projectId: string
  iterationNumber: number
  promptText: string
  claudeResponseRaw: string | null
  parsedSummary: ParsedClaudeResponse | null
  recommendedNextStep: string | null
  status: PromptStatus
  createdAt: string
}

export interface ParsedClaudeResponse {
  analysis: string
  plan: string
  changedFiles: string[]
  implementationSummary: string
  nextStep: string
  warnings: string[]
}
