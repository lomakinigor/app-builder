// T-301 — Mock adapter for PromptLoopApi
// Delegates to the existing mockPromptService; no business logic changes.

import { mockPromptService } from '../../../mocks/services/promptService'
import type { PromptLoopApi } from '../types'
import type { SpecPack, ArchitectureDraft, ProjectType, PromptIteration, ParsedClaudeResponse } from '../../types'

export const promptLoopApiMock: PromptLoopApi = {
  generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    taskId: string | null,
    taskDescription: string | null,
  ) {
    return mockPromptService.generateFirstPrompt(
      spec, arch, projectType, projectId, promptId, taskId, taskDescription,
    )
  },

  parseClaudeResponse(raw: string): ParsedClaudeResponse {
    return mockPromptService.parseClaudeResponse(raw)
  },

  generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    nextIterationNumber: number,
    targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
  ) {
    return mockPromptService.generateNextPrompt(
      previousIteration, parsedResponse, projectType, projectId,
      promptId, nextIterationNumber, targetPhase,
    )
  },
}
