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

// ─── Type-specific implementation guidance ────────────────────────────────────
// Injected into every prompt so Claude uses the correct vocabulary and patterns
// for the project type. Application = SPA/components/state; Website = pages/SEO/SSR.

export function typeAwareGuidance(projectType: ProjectType): string {
  if (projectType === 'website') {
    return `## Website implementation guidance
You are building a website (multi-page, content-first). Apply these patterns throughout:
- Think in **pages and routes** — each route is a discrete, independently renderable content surface.
- Apply **SSG or SSR** patterns where content is largely static or SEO-critical; prefer static generation unless personalisation requires runtime data.
- Keep **layout, navigation, and semantic HTML** consistent across all pages; heading hierarchy matters for accessibility and SEO.
- **SEO**: every page must have a descriptive title, a meta description, and correct Open Graph tags. Content must be indexable (no JS-only render for primary text).
- **Testing**: assert that pages render key content, navigation links resolve, and that no critical text is gated behind client-only state.`
  }
  return `## Application implementation guidance
You are building a SPA (Single Page Application). Apply these patterns throughout:
- All routing is **client-side** (React Router); there is no server-side rendering — plan for a fallback route in production.
- State changes must go through the **Zustand store** — no prop-drilling for cross-component shared data.
- Keep each **component focused**; extract shared logic into custom hooks or store actions, not into component bodies.
- **Testing (TDD order)**: write tests for components (props → render), store actions (state transitions), and user flows (simulate interaction → assert outcome) before implementing them.
- **No premature optimisation**: implement the feature to the Definition of Done, then let review decide if caching or memoisation is needed.`
}

// ─── Phase inference keywords ─────────────────────────────────────────────────

export function inferNextPhase(
  analysis: string,
  nextStep: string,
  hasTests: boolean,
  nextTaskId: string | null,
  prevTaskId: string | null,
): import('../../entities/prompt-iteration/types').CyclePhase {
  const combined = (analysis + '\n' + nextStep).toLowerCase()

  // Explicit "done" / "review-ready" signals
  const reviewKeywords = [
    'definition of done.*met',
    'dod.*met',
    'all.*tests.*pass',
    'ready.*for.*review',
    'ready to review',
    'task.*complete',
    'mark.*done',
    'can be marked done',
  ]
  if (reviewKeywords.some((kw) => new RegExp(kw).test(combined))) return 'review'

  // If tests are present and there is no new T-xxx to jump to → suggest review
  if (hasTests && prevTaskId && (!nextTaskId || nextTaskId === prevTaskId)) return 'review'

  // Response suggests picking from the task backlog (no concrete next task)
  if (combined.includes('check docs/tasks') || combined.includes('pick the next task')) return 'tasks'

  // Default: continue Code+Tests (new task or missing tests)
  return 'code_and_tests'
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
    taskId: string | null,
    taskDescription: string | null,
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

    const taskDescLine = taskDescription ? `\nTask description: ${taskDescription}` : ''
    const taskSection = taskId
      ? `## Target task: ${taskId}${taskDescLine}
Read the Definition of Done for **${taskId}** in docs/tasks.md.
This is your exact scope for this iteration — do not implement other tasks.
Reference **${taskId}** and its parent F-xxx feature ID in every section of your response.

Approach (in this order):
1. Outline the tests for ${taskId} first — what will you assert?
2. Implement ${taskId} to make those tests pass.
3. Write a brief self-review — does the implementation satisfy the Definition of Done?`
      : `## Target task
Find the first incomplete T-xxx entry in docs/tasks.md for Phase ${phase.phase}.
Read its Definition of Done before writing any code.
Reference T-xxx and F-xxx IDs in your response wherever applicable.`

    const promptText = `You are a senior full-stack engineer building a ${kind}.

## Build context
Project: ${spec.productSummary}
Type: ${kind}
Stage: Code + Tests (Superpowers cycle — Stage 5 of 6)

${DOCS_SECTION}

${typeAwareGuidance(projectType)}

## Stack
${stack}

## Phase ${phase.phase}: ${phase.title}
Goals:
${phaseGoals}
Estimated complexity: ${phase.estimatedComplexity}

${taskSection}

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
      targetTaskId: taskId,
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

    // Infer which cycle phase the project should move to next.
    // prevTaskId is not available here (parser is pure); the caller may refine
    // this further, but the text-based signal is sufficient for the UI hint.
    const prevTaskId = extractFirstTaskId(
      (sections.analysis ?? '') + (sections.plan ?? '')
    )
    const inferredNextPhase = inferNextPhase(
      sections.analysis ?? '',
      sections.next ?? '',
      hasTests,
      nextTaskId,
      prevTaskId,
    )

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
      inferredNextPhase,
    }
  },

  async generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    nextIterationNumber: number,
    targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const kind = projectTypeLabel(projectType)
    const isReviewPhase = targetPhase === 'review'
    const prevTaskId = previousIteration.targetTaskId

    const missingTestsWarning = !parsedResponse.hasTests && !isReviewPhase
      ? `\n## ⚠️ Missing tests from iteration #${previousIteration.iterationNumber}
The previous iteration did not include test files. Before continuing to new features:
1. Review what was implemented in iteration #${previousIteration.iterationNumber}.
2. Write the missing tests first.
3. Only then proceed to the next task.
This is the Code (+Tests) rule — tests are not optional.\n`
      : ''

    const nextTaskId = parsedResponse.nextTaskId ?? prevTaskId
    const taskRef = isReviewPhase
      ? `## Review task: ${prevTaskId ?? 'previous task'}
Check the implementation of **${prevTaskId ?? 'the previous task'}** against:
- Its Definition of Done in docs/tasks.md
- The acceptance criteria in docs/user-stories.md
- The TDD rule — confirm test files exist and cover the non-trivial paths

Report: what passes, what gaps remain, and whether the task can be marked done.`
      : nextTaskId
        ? `## Next target task: ${nextTaskId}
Read the Definition of Done for **${nextTaskId}** in docs/tasks.md.
This is your exact scope — do not implement other tasks in this prompt.
Reference **${nextTaskId}** and its parent F-xxx feature ID throughout your response.

Approach (in this order):
1. Outline the tests for ${nextTaskId} first.
2. Implement ${nextTaskId} to make those tests pass.
3. Write a brief self-review — does the implementation satisfy the Definition of Done?`
        : `## Next target task
Check docs/tasks.md for the next incomplete T-xxx task.
Read its Definition of Done before writing any code.`

    const implementedIds = parsedResponse.implementedTaskIds.length > 0
      ? `Tasks referenced in iteration #${previousIteration.iterationNumber}: ${parsedResponse.implementedTaskIds.join(', ')}`
      : ''

    const changedFilesList = parsedResponse.changedFiles.length > 0
      ? parsedResponse.changedFiles.map((f) => `- ${f}`).join('\n')
      : 'Not specified'

    const stageLabel = isReviewPhase
      ? 'Review (Superpowers cycle — Stage 6 of 6)'
      : 'Code + Tests (Superpowers cycle — Stage 5 of 6)'

    const promptText = `You are a senior full-stack engineer continuing the implementation of a ${kind}.

## Build context
Stage: ${stageLabel}
Type: ${kind}
${implementedIds}
${missingTestsWarning}
${typeAwareGuidance(projectType)}

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

${isReviewPhase ? '' : TDD_RULE + '\n\n'}${RESPONSE_FORMAT}`

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
      cyclePhase: targetPhase,
      targetTaskId: isReviewPhase ? prevTaskId : nextTaskId,
      roadmapPhaseNumber: previousIteration.roadmapPhaseNumber,
    }
  },
}
