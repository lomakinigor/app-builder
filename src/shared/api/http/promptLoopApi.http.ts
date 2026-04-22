// T-304 — HTTP adapter for PromptLoopApi
// Wired to VITE_API_BASE_URL. Activated when VITE_API_MODE=real.
//
// Contract:
//   POST /api/prompt-loop/first → PromptIteration
//   POST /api/prompt-loop/next  → PromptIteration
//
// parseClaudeResponse is pure client-side logic — it always runs in the mock
// adapter regardless of VITE_API_MODE. The HTTP adapter throws if called.

import type { PromptLoopApi } from '../types'
import type {
  SpecPack,
  ArchitectureDraft,
  ProjectType,
  PromptIteration,
  ParsedClaudeResponse,
} from '../../types'
import { postJson } from './client'

// ─── Request body shapes ──────────────────────────────────────────────────────
// Compact context extracted from SpecPack / ArchitectureDraft / ParsedClaudeResponse.
// Only fields that the backend needs to build the prompt are sent.

interface FirstPromptBody {
  projectId: string
  projectType: ProjectType
  taskId: string | null
  taskDescription: string | null
  spec: {
    productSummary: string
    MVPScope: string
    featureList: SpecPack['featureList']
    constraints: SpecPack['constraints']
  }
  arch: {
    roadmapPhases: ArchitectureDraft['roadmapPhases']
    recommendedStack: ArchitectureDraft['recommendedStack']
  }
}

interface NextPromptBody {
  projectId: string
  projectType: ProjectType
  nextIterationNumber: number
  targetPhase: 'code_and_tests' | 'review'
  prevIteration: {
    id: string
    iterationNumber: number
    targetTaskId: string | null
    roadmapPhaseNumber: number | null
  }
  parsedSummary: {
    implementationSummary: string
    changedFiles: string[]
    nextStep: string
    hasTests: boolean
    nextTaskId: string | null
    implementedTaskIds: string[]
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const promptLoopApiHttp: PromptLoopApi = {
  generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectType: ProjectType,
    projectId: string,
    _promptId: string,
    taskId: string | null,
    taskDescription: string | null,
  ): Promise<PromptIteration> {
    const body: FirstPromptBody = {
      projectId,
      projectType,
      taskId,
      taskDescription,
      spec: {
        productSummary: spec.productSummary,
        MVPScope: spec.MVPScope,
        featureList: spec.featureList,
        constraints: spec.constraints,
      },
      arch: {
        roadmapPhases: arch.roadmapPhases,
        recommendedStack: arch.recommendedStack,
      },
    }
    return postJson<PromptIteration>('/api/prompt-loop/first', body)
  },

  parseClaudeResponse(_raw: string): ParsedClaudeResponse {
    // Parser is pure client-side logic — no HTTP call needed.
    // The factory always routes parseClaudeResponse through the mock adapter.
    throw new Error('PromptLoopApi.parseClaudeResponse: use mock adapter — parsing is client-side only')
  },

  generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    _promptId: string,
    nextIterationNumber: number,
    targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
  ): Promise<PromptIteration> {
    const body: NextPromptBody = {
      projectId,
      projectType,
      nextIterationNumber,
      targetPhase,
      prevIteration: {
        id: previousIteration.id,
        iterationNumber: previousIteration.iterationNumber,
        targetTaskId: previousIteration.targetTaskId,
        roadmapPhaseNumber: previousIteration.roadmapPhaseNumber,
      },
      parsedSummary: {
        implementationSummary: parsedResponse.implementationSummary,
        changedFiles: parsedResponse.changedFiles,
        nextStep: parsedResponse.nextStep,
        hasTests: parsedResponse.hasTests,
        nextTaskId: parsedResponse.nextTaskId,
        implementedTaskIds: parsedResponse.implementedTaskIds,
      },
    }
    return postJson<PromptIteration>('/api/prompt-loop/next', body)
  },
}
