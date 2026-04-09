import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import type { PromptIteration } from '../../shared/types'

// ─── Static review data ───────────────────────────────────────────────────────
// implements F-024 / T-109

interface Decision {
  id: string
  title: string
  summary: string
  linkedTasks: string[]
  linkedFeatures: string[]
}

const KEY_DECISIONS: Decision[] = [
  {
    id: 'D-001',
    title: 'Frontend-first architecture for MVP',
    summary: 'Zustand + localStorage with mock services. No backend until Phase 5. Real adapters replace mock files without changing UI.',
    linkedTasks: ['T-001', 'T-009'],
    linkedFeatures: ['F-008'],
  },
  {
    id: 'D-002',
    title: 'Zustand over Redux or Context',
    summary: 'Single store with persist middleware. Simple actions, low ceremony, easy localStorage persistence.',
    linkedTasks: ['T-001', 'T-009'],
    linkedFeatures: [],
  },
  {
    id: 'D-003',
    title: 'Deterministic heuristic normalizer for research import',
    summary: 'No LLM for import — heading-alias matching + paragraph scoring. Works offline, fully testable, degrades gracefully.',
    linkedTasks: ['T-006', 'T-012'],
    linkedFeatures: ['F-003'],
  },
  {
    id: 'D-004',
    title: 'Test runner deferred to T-018',
    summary: 'Vitest + Testing Library wired as a dedicated ops task before any test task can be marked done.',
    linkedTasks: ['T-018'],
    linkedFeatures: [],
  },
  {
    id: 'D-005',
    title: 'Provider-agnostic ResearchBrief as normalization target',
    summary: 'All research sources normalize to ResearchBrief. Downstream modules (spec, arch, prompts) are provider-independent.',
    linkedTasks: ['T-004', 'T-005', 'T-006'],
    linkedFeatures: ['F-003', 'F-004', 'F-005'],
  },
]

const REVIEW_CHECKLIST = [
  { doc: 'docs/PRD.md', criteria: 'Does the current build satisfy the stated goals and success criteria?' },
  { doc: 'docs/features.md', criteria: 'Are all must-have F-xxx features implemented or explicitly deferred with a reason?' },
  { doc: 'docs/tech-spec.md', criteria: 'Does the implementation follow the module architecture and data-flow rules?' },
  { doc: 'docs/data-model.md', criteria: 'Do all entity shapes in the codebase match the typed definitions?' },
  { doc: 'docs/tasks.md', criteria: 'Is the Definition of Done met for every T-xxx task marked done?' },
  { doc: 'docs/user-stories.md', criteria: 'Can a user complete each US-xxx acceptance scenario end-to-end?' },
  { doc: 'docs/decisions.md', criteria: 'Does no impl task accidentally work around a recorded decision constraint?' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cyclePhaseLabel(iter: PromptIteration): string {
  if (iter.status === 'parsed') return 'Review'
  return 'Code + Tests'
}

function cyclePhaseVariant(iter: PromptIteration): 'success' | 'info' {
  return iter.status === 'parsed' ? 'success' : 'info'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CycleTimeline({
  hasIdea,
  hasSpec,
  hasArch,
  hasIterations,
  hasParsedIteration,
}: {
  hasIdea: boolean
  hasSpec: boolean
  hasArch: boolean
  hasIterations: boolean
  hasParsedIteration: boolean
}) {
  const stages = [
    {
      key: 'brainstorm',
      label: 'Brainstorm',
      icon: '💡',
      complete: hasIdea,
      detail: hasIdea ? 'Idea captured' : 'No idea yet',
    },
    {
      key: 'spec',
      label: 'Spec',
      icon: '📋',
      complete: hasSpec,
      detail: hasSpec ? 'Spec pack generated' : 'No spec yet',
    },
    {
      key: 'plan',
      label: 'Plan',
      icon: '🗺️',
      complete: hasArch,
      detail: hasArch ? 'Architecture and roadmap ready' : 'No plan yet',
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: '✅',
      complete: hasArch,
      detail: hasArch ? 'Roadmap phases define task scope' : 'No tasks yet',
    },
    {
      key: 'code',
      label: 'Code + Tests',
      icon: '⚡',
      complete: hasIterations,
      detail: hasIterations ? 'Prompt loop active' : 'Not started',
    },
    {
      key: 'review',
      label: 'Review',
      icon: '🔍',
      complete: hasParsedIteration,
      isCurrentStage: true,
      detail: 'Compare build reality vs PRD, spec, decisions',
    },
  ]

  return (
    <div className="space-y-0">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex items-start gap-3">
          {/* Spine */}
          <div className="flex flex-col items-center">
            <div
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                stage.isCurrentStage
                  ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-600'
                  : stage.complete
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
              ].join(' ')}
            >
              {stage.complete && !stage.isCurrentStage ? '✓' : stage.icon}
            </div>
            {index < stages.length - 1 && (
              <div
                className={`mt-1 w-px pb-1 ${
                  stage.complete && !stage.isCurrentStage
                    ? 'bg-emerald-200 dark:bg-emerald-800'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
                style={{ minHeight: 16 }}
              />
            )}
          </div>

          {/* Content */}
          <div className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{stage.label}</span>
              {stage.isCurrentStage && (
                <Badge variant="warning">← you are here</Badge>
              )}
              {stage.complete && !stage.isCurrentStage && (
                <Badge variant="success">Done</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{stage.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function IterationReviewCard({ iter }: { iter: PromptIteration }) {
  const parsed = iter.parsedSummary
  return (
    <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Iteration #{iter.iterationNumber}
        </span>
        <Badge variant={cyclePhaseVariant(iter)}>{cyclePhaseLabel(iter)}</Badge>
        {iter.targetTaskId && (
          <Badge variant="warning">{iter.targetTaskId}</Badge>
        )}
        {iter.roadmapPhaseNumber !== null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Phase {iter.roadmapPhaseNumber}
          </span>
        )}
        <Badge variant={iter.status === 'parsed' ? 'success' : iter.status === 'sent' ? 'info' : 'muted'}>
          {iter.status}
        </Badge>
      </div>

      <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
        {new Date(iter.createdAt).toLocaleString()}
      </p>

      {/* Test presence */}
      {parsed && (
        <div className="mb-2">
          {parsed.hasTests ? (
            <Badge variant="success">✓ Tests detected</Badge>
          ) : (
            <Badge variant="error">⚠ No test files detected</Badge>
          )}
        </div>
      )}

      {/* Implemented task IDs */}
      {parsed && parsed.implementedTaskIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Tasks referenced:</span>
          {parsed.implementedTaskIds.map((id) => (
            <Badge key={id} variant="info">{id}</Badge>
          ))}
        </div>
      )}

      {/* Next task */}
      {parsed?.nextTaskId && (
        <div className="mb-2 flex items-center gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Next:</span>
          <Badge variant="warning">{parsed.nextTaskId}</Badge>
        </div>
      )}

      {/* Next step summary */}
      {parsed?.nextStep && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          {parsed.nextStep.slice(0, 160)}
          {parsed.nextStep.length > 160 ? '…' : ''}
        </div>
      )}

      {/* Warnings */}
      {parsed && parsed.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {parsed.warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionsPanel() {
  return (
    <div className="space-y-3">
      {KEY_DECISIONS.map((d) => (
        <div key={d.id} className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{d.id}</span>
            <span className="text-sm text-zinc-800 dark:text-zinc-200">{d.title}</span>
          </div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{d.summary}</p>
          <div className="flex flex-wrap gap-1">
            {d.linkedTasks.map((t) => (
              <Badge key={t} variant="muted">{t}</Badge>
            ))}
            {d.linkedFeatures.map((f) => (
              <Badge key={f} variant="info">{f}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReviewChecklist() {
  return (
    <div className="space-y-2">
      {REVIEW_CHECKLIST.map((item, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800">
            <span className="text-xs text-zinc-300 dark:text-zinc-600">✓</span>
          </div>
          <div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{item.criteria}</p>
            <p className="mt-0.5 text-xs font-mono text-violet-600 dark:text-violet-400">{item.doc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const navigate = useNavigate()
  const {
    activeProject,
    ideaDraft,
    researchRuns,
    importedArtifacts,
    researchBrief,
    specPack,
    architectureDraft,
    promptIterations,
  } = useProjectStore()

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review" icon="🔍" description="Compare build reality against PRD, tech-spec, and decisions." />
        <EmptyState
          icon="📂"
          title="No project selected"
          description="Create a project and complete the build cycle to see the Review view."
          action={{ label: 'Create project', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  const hasIdea = !!(ideaDraft?.rawIdea)
  const hasSpec = !!specPack
  const hasArch = !!architectureDraft
  const hasIterations = promptIterations.length > 0
  const hasParsedIteration = promptIterations.some((i) => i.status === 'parsed')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review"
        icon="🔍"
        description="Superpowers cycle — Stage 6 of 6. Compare build reality against PRD, tech-spec, user stories, and decisions."
      />

      {/* Review label bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
        <Badge variant="default">Review phase</Badge>
        <span className="text-sm text-violet-700 dark:text-violet-300">
          You are at the end of the cycle. Check the criteria below, then decide: iterate or ship.
        </span>
      </div>

      {/* Project overview */}
      <Card>
        <CardHeader title={activeProject.name} icon="📂" action={<Badge variant="success">{activeProject.status}</Badge>} />
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">Started</p>
            <p className="text-zinc-800 dark:text-zinc-200">
              {new Date(activeProject.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Last updated</p>
            <p className="text-zinc-800 dark:text-zinc-200">
              {new Date(activeProject.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Type</p>
            <p className="text-zinc-800 dark:text-zinc-200 capitalize">
              {activeProject.projectType === 'website' ? '🌐 Website' : '📱 Application'}
            </p>
          </div>
        </div>
      </Card>

      {/* Superpowers cycle timeline */}
      <Card>
        <CardHeader title="Superpowers cycle" icon="🔄" />
        <CycleTimeline
          hasIdea={hasIdea}
          hasSpec={hasSpec}
          hasArch={hasArch}
          hasIterations={hasIterations}
          hasParsedIteration={hasParsedIteration}
        />
      </Card>

      {/* Prompt iterations — Review lens */}
      {promptIterations.length > 0 ? (
        <Card>
          <CardHeader
            title="Prompt iterations"
            icon="⚡"
            action={<Badge variant="info">{promptIterations.length} total</Badge>}
          />
          <div className="space-y-3">
            {promptIterations.map((iter) => (
              <IterationReviewCard key={iter.id} iter={iter} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Prompt iterations" icon="⚡" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No prompt iterations yet. Go to the Prompt Loop to start building.
          </p>
        </Card>
      )}

      {/* Research inputs */}
      {(researchRuns.length > 0 || importedArtifacts.length > 0) && (
        <Card>
          <CardHeader title="Research inputs" icon="🔬" />
          <div className="space-y-2">
            {researchRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Research run — {run.mode} mode
                  </p>
                  <p className="text-xs text-zinc-400">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Not started'}
                  </p>
                </div>
                <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'info'}>
                  {run.status}
                </Badge>
              </div>
            ))}
            {importedArtifacts.map((artifact) => (
              <div key={artifact.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{artifact.title}</p>
                  <p className="text-xs text-zinc-400">
                    Imported {new Date(artifact.importedAt).toLocaleString()} · {artifact.sourceLabel}
                  </p>
                </div>
                <Badge variant="info">imported</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Spec summary */}
      {specPack && (
        <Card>
          <CardHeader
            title="Spec summary"
            icon="📋"
            action={<Badge variant={specPack.projectType === 'website' ? 'info' : 'default'}>{specPack.projectType === 'website' ? '🌐 Website' : '📱 Application'}</Badge>}
          />
          <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p>{specPack.productSummary}</p>
            <div className="flex flex-wrap gap-1">
              {specPack.featureList
                .filter((f) => f.priority === 'must')
                .map((f) => (
                  <Badge key={f.id} variant="muted">{f.id}</Badge>
                ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {specPack.featureList.filter((f) => f.priority === 'must').length} must-have ·{' '}
              {specPack.featureList.filter((f) => f.priority === 'should').length} should-have ·{' '}
              {researchBrief ? 'Research brief available' : 'No research brief'}
            </p>
          </div>
        </Card>
      )}

      {/* Review checklist */}
      <Card>
        <CardHeader
          title="Review checklist"
          icon="✅"
          action={<Badge variant="warning">manual review</Badge>}
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Work through each criterion against the linked doc before closing this cycle.
        </p>
        <ReviewChecklist />
      </Card>

      {/* Key decisions */}
      <Card>
        <CardHeader
          title="Key decisions"
          icon="📐"
          action={<Badge variant="muted">{KEY_DECISIONS.length} recorded</Badge>}
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Constraints every reviewer must not unknowingly work around. See{' '}
          <span className="font-mono text-violet-600 dark:text-violet-400">docs/decisions.md</span> for full context.
        </p>
        <DecisionsPanel />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate('/prompt-loop')}>
          Go to Prompt Loop
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← Home
        </Button>
      </div>
    </div>
  )
}
