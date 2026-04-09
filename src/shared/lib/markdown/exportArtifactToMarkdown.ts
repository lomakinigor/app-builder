// ─── Per-artifact markdown formatters ─────────────────────────────────────────
// Pure functions. No side effects. No imports from React or store.
// Implements F-012 / F-026 / T-111.
//
// D-006 (Option A): these functions produce on-demand markdown strings for
// clipboard/download export. They do NOT create a per-project docs/ folder
// or maintain a second source of truth. In-app entities remain canonical.

import type {
  ResearchBrief,
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
} from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function projectTypeLabel(type: 'application' | 'website'): string {
  return type === 'website' ? '🌐 Website' : '📱 Application'
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function header(projectName: string | null, artifactType: string, projectType: 'application' | 'website' | null): string {
  const lines: string[] = []
  lines.push(`# ${artifactType}`)
  lines.push('')
  if (projectName) lines.push(`**Project:** ${projectName}`)
  if (projectType) lines.push(`**Type:** ${projectTypeLabel(projectType)}`)
  lines.push(`**Exported:** ${new Date().toISOString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  return lines.join('\n')
}

// ─── ResearchBrief ─────────────────────────────────────────────────────────────

export function researchBriefToMarkdown(
  brief: ResearchBrief,
  projectName: string | null = null,
): string {
  const sections: string[] = []

  sections.push(header(projectName, 'Research Brief', null))

  sections.push(`## Problem summary\n\n${brief.problemSummary}`)

  if (brief.targetUsers.length > 0) {
    sections.push(`## Target users\n\n${bulletList(brief.targetUsers)}`)
  }

  sections.push(`## Value hypothesis\n\n${brief.valueHypothesis}`)

  if (brief.competitorNotes) {
    sections.push(`## Competitor notes\n\n${brief.competitorNotes}`)
  }

  if (brief.risks.length > 0) {
    sections.push(`## Risks\n\n${bulletList(brief.risks)}`)
  }

  if (brief.opportunities.length > 0) {
    sections.push(`## Opportunities\n\n${bulletList(brief.opportunities)}`)
  }

  if (brief.recommendedMVP) {
    sections.push(`## Recommended MVP\n\n${brief.recommendedMVP}`)
  }

  if (brief.openQuestions.length > 0) {
    sections.push(`## Open questions\n\n${bulletList(brief.openQuestions)}`)
  }

  if (brief.sourcesNote) {
    sections.push(`## Sources note\n\n${brief.sourcesNote}`)
  }

  if (brief.briefSource) {
    sections.push(`_Brief source: ${brief.briefSource}_`)
  }

  return sections.join('\n\n')
}

// ─── SpecPack ──────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, string> = {
  must: 'Must have',
  should: 'Should have',
  could: 'Could have',
  wont: "Won't have",
}

export function specPackToMarkdown(
  spec: SpecPack,
  projectName: string | null = null,
): string {
  const sections: string[] = []

  sections.push(header(projectName, 'Specification', spec.projectType))

  sections.push(`## Product summary\n\n${spec.productSummary}`)

  sections.push(`## MVP scope\n\n${spec.MVPScope}`)

  // Feature list grouped by priority
  const priorities: Array<'must' | 'should' | 'could' | 'wont'> = ['must', 'should', 'could', 'wont']
  for (const priority of priorities) {
    const features = spec.featureList.filter((f) => f.priority === priority)
    if (features.length === 0) continue
    const featureLines = features
      .map((f) => `- **${f.id} — ${f.name}**: ${f.description}`)
      .join('\n')
    sections.push(`## Features — ${PRIORITY_LABELS[priority]}\n\n${featureLines}`)
  }

  if (spec.assumptions.length > 0) {
    sections.push(`## Assumptions\n\n${bulletList(spec.assumptions)}`)
  }

  if (spec.constraints.length > 0) {
    sections.push(`## Constraints\n\n${bulletList(spec.constraints)}`)
  }

  if (spec.acceptanceNotes) {
    sections.push(`## Acceptance notes\n\n${spec.acceptanceNotes}`)
  }

  return sections.join('\n\n')
}

// ─── ArchitectureDraft ────────────────────────────────────────────────────────

export function architectureDraftToMarkdown(
  arch: ArchitectureDraft,
  projectName: string | null = null,
): string {
  const sections: string[] = []

  sections.push(header(projectName, 'Architecture Draft', arch.projectType))

  // Stack table
  const stackRows = arch.recommendedStack
    .map((s) => `| ${s.name} | ${s.role} | ${s.rationale} |`)
    .join('\n')
  sections.push(
    `## Recommended stack\n\n| Technology | Role | Rationale |\n|---|---|---|\n${stackRows}`
  )

  sections.push(`## Module architecture\n\n${arch.moduleArchitecture}`)

  sections.push(`## Data flow\n\n${arch.dataFlow}`)

  // Roadmap phases
  const phaseLines = arch.roadmapPhases
    .map((phase) => {
      const goals = phase.goals.map((g) => `  - ${g}`).join('\n')
      return `### Phase ${phase.phase} — ${phase.title}\n\nComplexity: ${phase.estimatedComplexity}\n\nGoals:\n\n${goals}`
    })
    .join('\n\n')
  sections.push(`## Roadmap phases\n\n${phaseLines}`)

  if (arch.technicalRisks.length > 0) {
    sections.push(`## Technical risks\n\n${bulletList(arch.technicalRisks)}`)
  }

  return sections.join('\n\n')
}

// ─── PromptIteration ──────────────────────────────────────────────────────────

export function promptIterationToMarkdown(
  iteration: PromptIteration,
  projectName: string | null = null,
): string {
  const sections: string[] = []

  const artifactLabel = `Prompt Iteration #${iteration.iterationNumber}`
  sections.push(header(projectName, artifactLabel, iteration.projectType))

  // Cycle context
  const cycleLines: string[] = []
  cycleLines.push(`**Cycle phase:** ${iteration.cyclePhase === 'review' ? 'Review' : 'Code + Tests'}`)
  if (iteration.targetTaskId) cycleLines.push(`**Target task:** ${iteration.targetTaskId}`)
  if (iteration.roadmapPhaseNumber !== null) {
    cycleLines.push(`**Roadmap phase:** ${iteration.roadmapPhaseNumber}`)
  }
  cycleLines.push(`**Status:** ${iteration.status}`)
  cycleLines.push(`**Created:** ${iteration.createdAt}`)
  sections.push(`## Cycle context\n\n${cycleLines.join('\n')}`)

  sections.push(`## Prompt\n\n\`\`\`\n${iteration.promptText}\n\`\`\``)

  if (iteration.claudeResponseRaw) {
    sections.push(`## Claude response\n\n\`\`\`\n${iteration.claudeResponseRaw}\n\`\`\``)
  }

  const parsed = iteration.parsedSummary
  if (parsed) {
    if (parsed.analysis) {
      sections.push(`## Brief analysis\n\n${parsed.analysis}`)
    }
    if (parsed.plan) {
      sections.push(`## Implementation plan\n\n${parsed.plan}`)
    }
    if (parsed.changedFiles.length > 0) {
      sections.push(`## Files changed\n\n${bulletList(parsed.changedFiles)}`)
    }
    if (parsed.implementedTaskIds.length > 0) {
      sections.push(
        `## Task IDs referenced\n\n${parsed.implementedTaskIds.map((id) => `- ${id}`).join('\n')}`
      )
    }
    if (parsed.nextStep) {
      const nextTaskNote = parsed.nextTaskId ? ` (${parsed.nextTaskId})` : ''
      sections.push(`## Recommended next step${nextTaskNote}\n\n${parsed.nextStep}`)
    }
    sections.push(`## Test coverage\n\n${parsed.hasTests ? '✓ Test files detected in this iteration.' : '⚠ No test files detected in this iteration.'}`)
    if (parsed.warnings.length > 0) {
      sections.push(`## Warnings\n\n${bulletList(parsed.warnings)}`)
    }
  }

  return sections.join('\n\n')
}
