import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { useProjectRegistry, selectSelectedProject } from '../../app/store/projectRegistryStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { Badge } from '../../shared/ui/Badge'
import { CycleProgressStepper } from '../../shared/ui/CycleProgressStepper'
import { computeCycleProgress } from '../../shared/lib/superpowers/cycleProgress'
import { computeNextAction, getRecommendedPhaseId } from '../../shared/lib/superpowers/nextActionEngine'
import { NextActionCard } from '../../shared/ui/NextActionCard'
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
  { icon: '💡', label: 'Идея', description: 'Опишите идею продукта с контекстом' },
  { icon: '🔍', label: 'Исследование', description: 'Запустите или импортируйте исследование' },
  { icon: '📋', label: 'Спецификация', description: 'Сгенерируйте структурированную спецификацию' },
  { icon: '🏗️', label: 'Архитектура', description: 'Определите стек, модули и дорожную карту' },
  { icon: '⚡', label: 'Первый промпт', description: 'Сгенерируйте первый промпт для Claude Code' },
  { icon: '🔄', label: 'Цикл сборки', description: 'Итерируйте с ответами Claude Code' },
]

export function HomePage() {
  const navigate = useNavigate()

  // Registry: canonical list + selected project identity
  const { selectProject } = useProjectRegistry()
  const selectedProject = useProjectRegistry(selectSelectedProject)

  // Project store: stage-level data (ideaDraft, brief, spec, etc.)
  const { activeProject, ideaDraft, researchBrief, specPack, architectureDraft, promptIterations, setIdeaDraft, setResearchBrief, setSpecPack, setArchitectureDraft, addPromptIteration, addImportedArtifact, addResearchRun } = useProjectStore()

  // Cycle progress for the selected project (uses live hot-slot data when selected === active)
  const cyclePhases = computeCycleProgress({
    ideaDraft: activeProject?.id === selectedProject?.id ? ideaDraft : null,
    researchRuns: [],
    importedArtifacts: [],
    researchBrief: activeProject?.id === selectedProject?.id ? researchBrief : null,
    specPack: activeProject?.id === selectedProject?.id ? specPack : null,
    architectureDraft: activeProject?.id === selectedProject?.id ? architectureDraft : null,
    promptIterations: activeProject?.id === selectedProject?.id ? promptIterations : [],
  })
  const activePhase = cyclePhases.find((p) => p.status === 'in_progress') ?? cyclePhases.find((p) => p.status === 'not_started')
  const nextAction = computeNextAction(
    cyclePhases,
    activeProject?.id === selectedProject?.id ? promptIterations : [],
  )
  const recommendedPhaseId = getRecommendedPhaseId(nextAction)

  function loadMockProject() {
    // 1. Select the demo project in the registry (bridges to projectStore.setActiveProject)
    selectProject(mockProject.id)
    // 2. Load stage data into the project store
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
    navigate('/project/new')
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
            От сырой идеи до структурированного конвейера сборки с Claude Code.
            <br className="hidden sm:block" />
            Исследование → Спецификация → Архитектура → Итеративные промпты.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={startNew}>
              Новый проект
            </Button>
            <Button size="lg" variant="secondary" onClick={loadMockProject}>
              Загрузить демо
            </Button>
          </div>
        </div>
      </div>

      {/* Selected project card — driven by registry (T-201 / F-027) */}
      {/* Cycle progress stepper — T-204 / F-024 */}
      {selectedProject ? (
        <Card>
          <CardHeader
            title="Выбранный проект"
            icon="📂"
            action={
              selectedProject.status === 'completed' ? (
                <Badge variant="success">✓ Завершён</Badge>
              ) : (
                <Badge variant="muted">
                  {selectedProject.projectType === 'application' ? '📱 Приложение' : '🌐 Сайт'}
                </Badge>
              )
            }
          />
          <div className="mb-5">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedProject.name}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Создан {new Date(selectedProject.createdAt).toLocaleDateString('ru-RU')}
            </p>
          </div>

          {/* Superpowers cycle stepper */}
          <CycleProgressStepper phases={cyclePhases} recommendedPhaseId={recommendedPhaseId} />

          {/* Next action recommendation — T-209 */}
          <div className="mt-4">
            <NextActionCard action={nextAction} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProject.status === 'completed' ? (
              <Button size="sm" onClick={() => navigate('/history')}>
                Просмотреть итоги проекта →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate(activePhase?.path ?? '/idea')}
              >
                {activePhase ? `Продолжить: ${activePhase.label} →` : 'Открыть проект →'}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => navigate('/history')}>
              Обзор
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-600">
          <div className="flex items-center gap-3 py-1 text-zinc-500 dark:text-zinc-400">
            <span className="text-xl">📂</span>
            <p className="text-sm">Проект не выбран. Создайте новый проект или загрузите демо.</p>
          </div>
        </Card>
      )}

      {/* How it works */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Как это работает
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
              Один промпт = одна задача
            </p>
            <p className="mt-1 text-sm text-violet-700/80 dark:text-violet-400">
              AI Product Studio управляет циклом: каждый ответ Claude Code становится входом для следующего точного промпта.
              Никогда не начинай с нуля, никогда не теряй контекст.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
