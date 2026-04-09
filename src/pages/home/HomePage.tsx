import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { Badge } from '../../shared/ui/Badge'
import { StageIndicator } from '../../shared/ui/StageIndicator'
import {
  mockProject,
  mockIdeaDraft,
  mockResearchBrief,
  mockSpecPack,
  mockArchitectureDraft,
  mockPromptIterations,
  mockImportedArtifact,
  mockResearchRun,
} from '../../mocks/project/seedData'

const WORKFLOW_STEPS = [
  { icon: '💡', label: 'Idea', description: 'Capture your raw product idea with context' },
  { icon: '🔍', label: 'Research', description: 'Run or import research, build a brief' },
  { icon: '📋', label: 'Spec', description: 'Generate structured spec and feature list' },
  { icon: '🏗️', label: 'Architecture', description: 'Define stack, modules, and roadmap' },
  { icon: '⚡', label: 'First Prompt', description: 'Generate your first Claude Code prompt' },
  { icon: '🔄', label: 'Build Loop', description: 'Iterate with Claude Code responses' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { activeProject, setActiveProject, setIdeaDraft, setResearchBrief, setSpecPack, setArchitectureDraft, addPromptIteration, addImportedArtifact, addResearchRun } = useProjectStore()

  function loadMockProject() {
    setActiveProject(mockProject)
    setIdeaDraft(mockIdeaDraft)
    addResearchRun(mockResearchRun)
    addImportedArtifact(mockImportedArtifact)
    setResearchBrief(mockResearchBrief)
    setSpecPack(mockSpecPack)
    setArchitectureDraft(mockArchitectureDraft)
    mockPromptIterations.forEach(addPromptIteration)
    navigate('/idea')
  }

  function startNew() {
    navigate('/idea')
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 p-6 sm:p-8 dark:from-violet-950/30 dark:to-indigo-950/20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-5xl">🧠</div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-100">
            AI Product Studio
          </h1>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            Go from raw idea to a structured build pipeline with Claude Code.
            <br className="hidden sm:block" />
            Research → Spec → Architecture → Iterative prompts.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={startNew}>
              Start New Project
            </Button>
            <Button size="lg" variant="secondary" onClick={loadMockProject}>
              Load Demo Project
            </Button>
          </div>
        </div>
      </div>

      {/* Active project card */}
      {activeProject && (
        <Card>
          <CardHeader
            title="Active Project"
            icon="📂"
            action={
              <Badge variant="success">
                {activeProject.status}
              </Badge>
            }
          />
          <div className="mb-4">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {activeProject.name}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Created {new Date(activeProject.createdAt).toLocaleDateString()}
            </p>
          </div>
          <StageIndicator currentStage={activeProject.currentStage} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/idea')}>
              Continue →
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/history')}>
              View History
            </Button>
          </div>
        </Card>
      )}

      {/* How it works */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          How it works
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => (
            <div
              key={step.label}
              className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-900"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-sm dark:bg-violet-900/30">
                <span>{index + 1}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{step.icon}</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{step.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key principle callout */}
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-950/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-semibold text-violet-800 dark:text-violet-300">
              One prompt = one task
            </p>
            <p className="mt-1 text-sm text-violet-700/80 dark:text-violet-400">
              AI Product Studio orchestrates the loop: each Claude Code response becomes the input for the next precise prompt.
              Never write from scratch, never lose context.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
