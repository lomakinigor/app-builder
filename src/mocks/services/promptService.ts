import type {
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
} from '../../shared/types'

// ─── Mock prompt generation and response parsing service ──────────────────────
// Generates Claude Code prompts and parses structured responses.
// Replace with real prompt engine in Phase 4.

export const mockPromptService = {
  async generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectId: string,
    promptId: string
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const stack = arch.recommendedStack.map((s) => s.name).join(' + ')
    const phase = arch.roadmapPhases[0]

    const promptText = `You are a senior full-stack engineer implementing: ${spec.productSummary}

## Stack
${stack}

## Phase ${phase.phase}: ${phase.title}
Goals:
${phase.goals.map((g) => `- ${g}`).join('\n')}

## MVP Scope
${spec.MVPScope}

## Must-Have Features
${spec.featureList
  .filter((f) => f.priority === 'must')
  .map((f) => `- ${f.name}: ${f.description}`)
  .join('\n')}

## Constraints
${spec.constraints.map((c) => `- ${c}`).join('\n')}

## Task
Implement only Phase ${phase.phase}. Do not build the full product.
Use mock data. No real API calls.
TypeScript strict mode. Mobile-first layout.

## Required response format
1. Brief analysis
2. Implementation plan
3. Files created/changed
4. Implementation
5. What is recommended next`

    return {
      id: promptId,
      projectId,
      iterationNumber: 1,
      promptText,
      claudeResponseRaw: null,
      parsedSummary: null,
      recommendedNextStep: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
  },

  parseClaudeResponse(raw: string): ParsedClaudeResponse {
    // Structured response parser — looks for numbered section headers
    const sections: Record<string, string> = {}
    const sectionPatterns = [
      { key: 'analysis', patterns: ['1. Brief analysis', '## 1.', '**1.'] },
      { key: 'plan', patterns: ['2. Implementation plan', '## 2.', '**2.'] },
      { key: 'files', patterns: ['3. Files created', '## 3.', '**3.'] },
      { key: 'implementation', patterns: ['4. Implementation', '## 4.', '**4.'] },
      { key: 'next', patterns: ['5. What is recommended next', '5. Recommended next', '## 5.', '**5.'] },
    ]

    // Simple line-by-line section splitter
    const lines = raw.split('\n')
    let currentKey: string | null = null

    for (const line of lines) {
      const match = sectionPatterns.find((s) => s.patterns.some((p) => line.includes(p)))
      if (match) {
        currentKey = match.key
        sections[currentKey] = ''
      } else if (currentKey) {
        sections[currentKey] = (sections[currentKey] || '') + line + '\n'
      }
    }

    const warnings: string[] = []
    if (!sections.analysis) warnings.push('Could not parse "Brief analysis" section')
    if (!sections.next) warnings.push('Could not parse "Recommended next" section')

    // Extract file names from files section using common patterns
    const changedFiles: string[] = []
    if (sections.files) {
      const fileMatches = sections.files.match(/`([^`]+\.[a-z]+)`/g)
      if (fileMatches) {
        changedFiles.push(...fileMatches.map((f) => f.replace(/`/g, '')))
      }
    }

    return {
      analysis: sections.analysis?.trim() || raw.slice(0, 500),
      plan: sections.plan?.trim() || '',
      changedFiles,
      implementationSummary: sections.implementation?.trim() || '',
      nextStep: sections.next?.trim() || '',
      warnings,
    }
  },

  async generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectId: string,
    promptId: string,
    nextIterationNumber: number
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const promptText = `You are a senior full-stack engineer continuing the implementation.

## Previous iteration summary
${parsedResponse.implementationSummary || 'See prior response'}

## Files changed in last iteration
${parsedResponse.changedFiles.length > 0 ? parsedResponse.changedFiles.map((f) => `- ${f}`).join('\n') : 'Not specified'}

## Recommended next step (from prior response)
${parsedResponse.nextStep || previousIteration.recommendedNextStep || 'Continue implementation'}

## Task
Continue from where you left off. Implement only the next logical step.
Do not refactor what already works.
One prompt = one task.

## Required response format
1. Brief analysis
2. Implementation plan
3. Files created/changed
4. Implementation
5. What is recommended next`

    return {
      id: promptId,
      projectId,
      iterationNumber: nextIterationNumber,
      promptText,
      claudeResponseRaw: null,
      parsedSummary: null,
      recommendedNextStep: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
  },
}
