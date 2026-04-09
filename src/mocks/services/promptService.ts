import type {
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
  ProjectType,
} from '../../shared/types'

// ─── Mock prompt generation and response parsing service ──────────────────────
// Generates Claude Code prompts and parses structured responses.
// Aligned with the Superpowers cycle: Brainstorm → Spec → Plan → Tasks → Code+Tests → Review
// implements F-007, F-024 / T-107

// ─── Internal helpers ─────────────────────────────────────────────────────────

const TDD_RULE = `## TDD rule (mandatory)
You must write tests as part of this task — not after.
Include at least one unit or integration test per non-trivial function or component.
Mark test files in your files list with the prefix: [TEST]
Example: [TEST] src/features/auth/__tests__/validateToken.test.ts
A response that implements code with no [TEST] files will be flagged during Review.`

const RESPONSE_FORMAT = `## Required response format
1. Brief analysis — what you are implementing and why (reference T-xxx, F-xxx)
2. Implementation plan — list every change; include test approach
3. Files created/changed — list all files; prefix test files with [TEST]
4. Implementation — the actual code
5. Recommended next step — the next T-xxx task and why`

const DOCS_SECTION = `## Documents to read before writing any code
1. docs/PRD.md — goals, success criteria, non-goals
2. docs/features.md — feature definitions (F-xxx) and status
3. docs/tech-spec.md — architecture decisions and module structure
4. docs/data-model.md — typed entity definitions
5. docs/tasks.md — task list (T-xxx) — this defines your exact scope
6. docs/user-stories.md — acceptance direction for Review`

function projectTypeLabel(projectType: ProjectType): string {
  return projectType === 'website' ? 'website' : 'application'
}

function extractTaskIds(text: string): string[] {
  const matches = text.match(/T-\d{3,}/g) ?? []
  return [...new Set(matches)]
}

function extractFirstTaskId(text: string): string | null {
  return text.match(/T-\d{3,}/)?.[0] ?? null
}

function detectTestFiles(changedFiles: string[], rawText: string): boolean {
  const testExtPattern = /\.(test|spec)\.(ts|tsx|js|jsx)$/
  if (changedFiles.some((f) => testExtPattern.test(f))) return true
  // also check for [TEST] markers or .test. / .spec. mentions in the raw section text
  return rawText.toLowerCase().includes('.test.') || rawText.toLowerCase().includes('.spec.')
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockPromptService = {
  async generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const kind = projectTypeLabel(projectType)
    const stack = arch.recommendedStack.map((s) => `${s.name} — ${s.role}`).join('\n')
    const phase = arch.roadmapPhases[0]

    const mustHaveFeatures = spec.featureList
      .filter((f) => f.priority === 'must')
      .map((f) => `- **${f.name}** (${f.id}): ${f.description}`)
      .join('\n')

    const constraints = spec.constraints.map((c) => `- ${c}`).join('\n')
    const phaseGoals = phase.goals.map((g) => `- ${g}`).join('\n')

    const promptText = `You are a senior full-stack engineer building a ${kind}.

## Build context
Project: ${spec.productSummary}
Type: ${kind}
Stage: Code + Tests (Superpowers cycle — Stage 5 of 6)

${DOCS_SECTION}

## Stack
${stack}

## Phase ${phase.phase}: ${phase.title}
Goals:
${phaseGoals}
Estimated complexity: ${phase.estimatedComplexity}

## Target task
You are implementing Phase ${phase.phase}. Find the relevant T-xxx entries for this phase in docs/tasks.md.
Read each task's Definition of Done before writing any code.
Reference T-xxx and F-xxx IDs in your response wherever applicable.

## MVP scope
${spec.MVPScope}

## Must-have features (this phase)
${mustHaveFeatures}

## Constraints
${constraints}

${TDD_RULE}

${RESPONSE_FORMAT}`

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
      projectType,
      cyclePhase: 'code_and_tests',
      targetTaskId: null,
      roadmapPhaseNumber: phase.phase,
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
      { key: 'next', patterns: ['5. Recommended next', '5. What is recommended next', '## 5.', '**5.'] },
    ]

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
    if (!sections.analysis) warnings.push('Could not parse "Brief analysis" section.')
    if (!sections.next) warnings.push('Could not parse "Recommended next step" section.')

    // Extract file names from files section
    const changedFiles: string[] = []
    if (sections.files) {
      // Match backtick-quoted paths
      const backtickFiles = sections.files.match(/`([^`]+\.[a-z]{2,4})`/g)
      if (backtickFiles) changedFiles.push(...backtickFiles.map((f) => f.replace(/`/g, '')))
      // Also match [TEST] prefixed entries
      const testMarked = sections.files.match(/\[TEST\]\s+(\S+)/g)
      if (testMarked) {
        testMarked.forEach((m) => {
          const path = m.replace(/\[TEST\]\s+/, '')
          if (!changedFiles.includes(path)) changedFiles.push(path)
        })
      }
    }

    // Cycle-awareness: detect test files
    const hasTests = detectTestFiles(changedFiles, sections.files ?? '')

    if (!hasTests) {
      warnings.push(
        'No test files detected in this response. The next prompt will request missing tests before continuing.'
      )
    }

    // Extract T-xxx task IDs from the full response
    const implementedTaskIds = extractTaskIds(
      (sections.analysis ?? '') + (sections.plan ?? '') + (sections.implementation ?? '')
    )

    // Extract the first T-xxx mentioned in the "next step" section
    const nextTaskId = extractFirstTaskId(sections.next ?? '')

    return {
      analysis: sections.analysis?.trim() || raw.slice(0, 500),
      plan: sections.plan?.trim() || '',
      changedFiles,
      implementationSummary: sections.implementation?.trim() || '',
      nextStep: sections.next?.trim() || '',
      warnings,
      hasTests,
      implementedTaskIds,
      nextTaskId,
    }
  },

  async generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    nextIterationNumber: number,
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const kind = projectTypeLabel(projectType)

    const missingTestsWarning = !parsedResponse.hasTests
      ? `\n## ⚠️ Missing tests from iteration #${previousIteration.iterationNumber}
The previous iteration did not include test files. Before continuing to new features:
1. Review what was implemented in iteration #${previousIteration.iterationNumber}.
2. Write the missing tests first.
3. Only then proceed to the next task.
This is the Code (+Tests) rule — tests are not optional.\n`
      : ''

    const taskRef = parsedResponse.nextTaskId
      ? `## Next target task\nContinue with **${parsedResponse.nextTaskId}** as defined in docs/tasks.md.\nRead its Definition of Done before writing any code.`
      : `## Next target task\nCheck docs/tasks.md for the next incomplete T-xxx task.\nRead its Definition of Done before writing any code.`

    const implementedIds = parsedResponse.implementedTaskIds.length > 0
      ? `Tasks referenced in iteration #${previousIteration.iterationNumber}: ${parsedResponse.implementedTaskIds.join(', ')}`
      : ''

    const changedFilesList = parsedResponse.changedFiles.length > 0
      ? parsedResponse.changedFiles.map((f) => `- ${f}`).join('\n')
      : 'Not specified'

    const promptText = `You are a senior full-stack engineer continuing the implementation of a ${kind}.

## Build context
Stage: Code + Tests (Superpowers cycle — Stage 5 of 6)
Type: ${kind}
${implementedIds}
${missingTestsWarning}
## What was implemented — iteration #${previousIteration.iterationNumber}
${parsedResponse.implementationSummary || 'See previous response.'}

## Files changed in iteration #${previousIteration.iterationNumber}
${changedFilesList}
${parsedResponse.hasTests ? '✓ Tests were included in the previous iteration.' : '⚠️ No test files were detected in the previous iteration (see above).'}

## Recommended next step (from iteration #${previousIteration.iterationNumber})
${parsedResponse.nextStep || previousIteration.recommendedNextStep || 'Continue implementation — check docs/tasks.md.'}

${taskRef}

## Rule
One prompt = one task. Do not refactor what already works. Do not build ahead of the current task.

${TDD_RULE}

${RESPONSE_FORMAT}`

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
      projectType,
      cyclePhase: 'code_and_tests',
      targetTaskId: parsedResponse.nextTaskId,
      roadmapPhaseNumber: previousIteration.roadmapPhaseNumber,
    }
  },
}
