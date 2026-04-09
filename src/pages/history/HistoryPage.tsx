import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { STAGES } from '../../shared/constants/stages'

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
        <PageHeader title="Project History" icon="📜" description="Overview of your project progress and build history." />
        <EmptyState
          icon="📂"
          title="No active project"
          description="Start a new project or load the demo to see history."
          action={{ label: 'Go to Home', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

  const stageStatuses = [
    { stage: 'idea', complete: !!ideaDraft?.rawIdea, label: 'Idea captured', detail: ideaDraft?.title },
    { stage: 'research', complete: !!researchBrief, label: 'Research brief', detail: researchBrief ? 'Normalized brief ready' : null },
    { stage: 'specification', complete: !!specPack, label: 'Specification', detail: specPack ? `${specPack.featureList.length} features` : null },
    { stage: 'architecture', complete: !!architectureDraft, label: 'Architecture', detail: architectureDraft ? `${architectureDraft.roadmapPhases.length} phases` : null },
    { stage: 'first_prompt', complete: promptIterations.length > 0, label: 'Prompt loop', detail: promptIterations.length > 0 ? `${promptIterations.length} iteration(s)` : null },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project History"
        icon="📜"
        description="Full overview of your project pipeline progress, research runs, and prompt iterations."
      />

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
            <p className="text-xs font-medium text-zinc-500">Current stage</p>
            <p className="text-zinc-800 dark:text-zinc-200 capitalize">
              {activeProject.currentStage.replace('_', ' ')}
            </p>
          </div>
        </div>
      </Card>

      {/* Pipeline progress */}
      <Card>
        <CardHeader title="Build pipeline" icon="🗺️" />
        <div className="space-y-3">
          {stageStatuses.map((s, index) => {
            const stageConfig = STAGES.find((st) => st.id === s.stage)
            return (
              <div key={s.stage} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm',
                      s.complete
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
                    ].join(' ')}
                  >
                    {s.complete ? '✓' : index + 1}
                  </div>
                  {index < stageStatuses.length - 1 && (
                    <div className={`mt-1 w-px flex-1 pb-1 ${s.complete ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-zinc-200 dark:bg-zinc-700'}`} style={{ minHeight: 16 }} />
                  )}
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <span>{stageConfig?.icon}</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.label}</span>
                    {s.complete && <Badge variant="success">Done</Badge>}
                  </div>
                  {s.detail && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{s.detail}</p>
                  )}
                  {!s.complete && (
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Not completed</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Research runs */}
      {(researchRuns.length > 0 || importedArtifacts.length > 0) && (
        <Card>
          <CardHeader title="Research inputs" icon="🔍" />
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

      {/* Prompt iterations */}
      {promptIterations.length > 0 && (
        <Card>
          <CardHeader title="Prompt iterations" icon="⚡" action={<Badge variant="info">{promptIterations.length} total</Badge>} />
          <div className="space-y-3">
            {promptIterations.map((iter) => (
              <div key={iter.id} className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    Iteration #{iter.iterationNumber}
                  </p>
                  <Badge
                    variant={
                      iter.status === 'parsed' ? 'success'
                      : iter.status === 'sent' ? 'info'
                      : 'muted'
                    }
                  >
                    {iter.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(iter.createdAt).toLocaleString()}
                </p>
                {iter.parsedSummary?.nextStep && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Next: {iter.parsedSummary.nextStep.slice(0, 120)}…
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

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
