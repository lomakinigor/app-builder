import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { useProjectRegistry, selectSelectedProject } from '../../app/store/projectRegistryStore'
import { useCanEditProject, useCanManageSharing } from '../../app/store/viewingModeStore'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import type { PromptIteration } from '../../shared/types'
import {
  buildTaskReviewModel,
  filterTaskRows,
  type PhaseFilter,
  type TestFilter,
} from '../../shared/lib/review/taskReviewModel'
import type { CyclePhase } from '../../entities/prompt-iteration/types'
import { computeCycleProgress } from '../../shared/lib/superpowers/cycleProgress'
import { computeNextAction, getRecommendedPhaseId, getRecommendedTaskId } from '../../shared/lib/superpowers/nextActionEngine'
import { NextActionCard } from '../../shared/ui/NextActionCard'
import type { CyclePhaseId } from '../../shared/lib/superpowers/cycleProgress'

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
    title: 'Архитектура «frontend-first» для MVP',
    summary: 'Zustand + localStorage с mock-сервисами. Без бэкенда до Phase 5. Реальные адаптеры заменят mock-файлы без изменения UI.',
    linkedTasks: ['T-001', 'T-009'],
    linkedFeatures: ['F-008'],
  },
  {
    id: 'D-002',
    title: 'Zustand вместо Redux или Context',
    summary: 'Единый стор с persist middleware. Простые действия, минимум шаблонного кода, удобное сохранение в localStorage.',
    linkedTasks: ['T-001', 'T-009'],
    linkedFeatures: [],
  },
  {
    id: 'D-003',
    title: 'Детерминированный эвристический нормализатор для импорта исследований',
    summary: 'Без LLM для импорта — сопоставление заголовков-псевдонимов и оценка абзацев. Работает офлайн, полностью тестируемо, деградирует корректно.',
    linkedTasks: ['T-006', 'T-012'],
    linkedFeatures: ['F-003'],
  },
  {
    id: 'D-004',
    title: 'Запуск тестов отложен до T-018',
    summary: 'Vitest + Testing Library подключены как отдельная ops-задача, которую нужно выполнить до пометки любой тестовой задачи как выполненной.',
    linkedTasks: ['T-018'],
    linkedFeatures: [],
  },
  {
    id: 'D-005',
    title: 'Provider-agnostic ResearchBrief как цель нормализации',
    summary: 'Все источники исследований нормализуются к ResearchBrief. Нижележащие модули (spec, arch, prompts) не зависят от конкретного провайдера.',
    linkedTasks: ['T-004', 'T-005', 'T-006'],
    linkedFeatures: ['F-003', 'F-004', 'F-005'],
  },
]

const REVIEW_CHECKLIST = [
  { doc: 'docs/PRD.md', criteria: 'Удовлетворяет ли текущая сборка заявленным целям и критериям успеха?' },
  { doc: 'docs/features.md', criteria: 'Все ли обязательные фичи F-xxx реализованы или явно отложены с указанием причины?' },
  { doc: 'docs/tech-spec.md', criteria: 'Следует ли реализация модульной архитектуре и правилам потока данных?' },
  { doc: 'docs/data-model.md', criteria: 'Совпадают ли все формы сущностей в кодовой базе с типизированными определениями?' },
  { doc: 'docs/tasks.md', criteria: 'Выполнено ли Definition of Done для каждой задачи T-xxx, помеченной как выполненная?' },
  { doc: 'docs/user-stories.md', criteria: 'Может ли пользователь пройти каждый сценарий приёмки US-xxx от начала до конца?' },
  { doc: 'docs/decisions.md', criteria: 'Нет ли задачи реализации, которая случайно обходит ограничение зафиксированного решения?' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cyclePhaseLabel(iter: PromptIteration): string {
  if (iter.status === 'parsed') return 'Ревью'
  return 'Код + Тесты'
}

function cyclePhaseVariant(iter: PromptIteration): 'success' | 'info' {
  return iter.status === 'parsed' ? 'success' : 'info'
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  brainstorm: 'Идея',
  spec: 'Спец',
  plan: 'План',
  tasks: 'Задачи',
  code_and_tests: 'Код+Тесты',
  review: 'Ревью',
}

const PHASE_VARIANTS: Record<CyclePhase, 'muted' | 'info' | 'warning' | 'success'> = {
  brainstorm: 'muted',
  spec: 'muted',
  plan: 'muted',
  tasks: 'warning',
  code_and_tests: 'info',
  review: 'success',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// implements F-024 / T-207, T-210, T-212
function TaskProgressPanel({
  iterations,
  onOpenPromptLoop,
  onMarkReviewComplete,
  recommendedTaskId,
  completedReviewTaskIds,
  isReadOnly,
}: {
  iterations: PromptIteration[]
  onOpenPromptLoop: () => void
  onMarkReviewComplete: (taskId: string) => void
  recommendedTaskId?: string | null
  completedReviewTaskIds: string[]
  isReadOnly?: boolean
}) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [testFilter, setTestFilter] = useState<TestFilter>('all')

  const allRows = useMemo(() => buildTaskReviewModel(iterations), [iterations])
  const rows = useMemo(
    () => filterTaskRows(allRows, phaseFilter, testFilter),
    [allRows, phaseFilter, testFilter],
  )

  if (iterations.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Промпт-итераций пока нет.{' '}
        <button
          onClick={onOpenPromptLoop}
          className="text-violet-600 underline dark:text-violet-400"
        >
          Перейти к Циклу промптов
        </button>{' '}
        чтобы начать этап Код+Тесты.
      </p>
    )
  }

  const cyclePhaseOptions: CyclePhase[] = [
    'brainstorm', 'spec', 'plan', 'tasks', 'code_and_tests', 'review',
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Фаза</span>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">Все</option>
            {cyclePhaseOptions.map((p) => (
              <option key={p} value={p}>{PHASE_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Тесты</span>
          <select
            value={testFilter}
            onChange={(e) => setTestFilter(e.target.value as TestFilter)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">Все</option>
            <option value="has_tests">Есть тесты</option>
            <option value="missing_tests">Нет тестов</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-zinc-400">
          {rows.length} / {allRows.length} задач
        </span>
      </div>

      {/* Task rows */}
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Нет задач, соответствующих текущим фильтрам.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isRecommended = row.taskId === recommendedTaskId
            return (
              <div
                key={row.taskId}
                className={[
                  'rounded-xl border p-3 transition-colors',
                  isRecommended
                    ? 'border-amber-300 bg-amber-50/30 dark:border-amber-700/60 dark:bg-amber-950/10'
                    : 'border-zinc-100 dark:border-zinc-800',
                ].join(' ')}
              >
                {/* Row header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {row.taskId}
                  </span>

                  {/* Recommended badge */}
                  {isRecommended && (
                    <Badge variant="warning">Следующая задача</Badge>
                  )}

                  {/* Phase badges */}
                  {row.phasesVisited.map((phase) => (
                    <Badge key={phase} variant={PHASE_VARIANTS[phase]}>
                      {PHASE_LABELS[phase]}
                    </Badge>
                  ))}

                  {/* Test presence */}
                  {row.hasTests ? (
                    <Badge variant="success">✓ тесты</Badge>
                  ) : (
                    <Badge variant="error">⚠ нет тестов</Badge>
                  )}

                  {/* Iteration count */}
                  <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                    {row.iterationCount} итер. · последняя #{row.lastIterationNumber}
                  </span>
                </div>

                {/* Analysis snippet */}
                {row.lastAnalysisSnippet && (
                  <p className="mt-1.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    {row.lastAnalysisSnippet}
                  </p>
                )}

                {/* Warnings */}
                {row.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {row.warnings.slice(0, 2).map((w, i) => (
                      <p
                        key={i}
                        className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      >
                        ⚠ {w}
                      </p>
                    ))}
                    {row.warnings.length > 2 && (
                      <p className="text-xs text-zinc-400">+{row.warnings.length - 2} ещё предупреждений</p>
                    )}
                  </div>
                )}

                {/* Action */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {completedReviewTaskIds.includes(row.taskId) ? (
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      ✓ Review завершён
                    </span>
                  ) : (
                    <>
                      {isRecommended ? (
                        <button
                          onClick={onOpenPromptLoop}
                          className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                        >
                          Открыть в Prompt Loop →
                        </button>
                      ) : (
                        <button
                          onClick={onOpenPromptLoop}
                          className="text-xs text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Открыть в Цикле промптов →
                        </button>
                      )}
                      {row.hasTests && row.taskId !== '(unassigned)' && !isReadOnly && (
                        <button
                          onClick={() => onMarkReviewComplete(row.taskId)}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        >
                          Завершить review
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Maps CyclePhaseId to the local stage key used in CycleTimeline
const PHASE_ID_TO_STAGE_KEY: Record<CyclePhaseId, string> = {
  brainstorm: 'brainstorm',
  spec: 'spec',
  plan: 'plan',
  tasks: 'tasks',
  code_and_tests: 'code',
  review: 'review',
}

function CycleTimeline({
  hasIdea,
  hasSpec,
  hasArch,
  hasIterations,
  hasParsedIteration,
  recommendedPhaseId,
}: {
  hasIdea: boolean
  hasSpec: boolean
  hasArch: boolean
  hasIterations: boolean
  hasParsedIteration: boolean
  recommendedPhaseId?: CyclePhaseId | null
}) {
  const recommendedStageKey = recommendedPhaseId ? PHASE_ID_TO_STAGE_KEY[recommendedPhaseId] : null

  const stages = [
    {
      key: 'brainstorm',
      label: 'Идея',
      icon: '💡',
      complete: hasIdea,
      detail: hasIdea ? 'Идея зафиксирована' : 'Идеи пока нет',
    },
    {
      key: 'spec',
      label: 'Спецификация',
      icon: '📋',
      complete: hasSpec,
      detail: hasSpec ? 'Спек-пакет сгенерирован' : 'Спецификации пока нет',
    },
    {
      key: 'plan',
      label: 'План',
      icon: '🗺️',
      complete: hasArch,
      detail: hasArch ? 'Архитектура и роадмап готовы' : 'Плана пока нет',
    },
    {
      key: 'tasks',
      label: 'Задачи',
      icon: '✅',
      complete: hasArch,
      detail: hasArch ? 'Фазы роадмапа определяют объём задач' : 'Задач пока нет',
    },
    {
      key: 'code',
      label: 'Код + Тесты',
      icon: '⚡',
      complete: hasIterations,
      detail: hasIterations ? 'Цикл промптов активен' : 'Не начато',
    },
    {
      key: 'review',
      label: 'Обзор',
      icon: '🔍',
      complete: hasParsedIteration,
      isCurrentStage: true,
      detail: 'Сравните реальность сборки с PRD, спецификацией, решениями',
    },
  ]

  return (
    <div className="space-y-0">
      {stages.map((stage, index) => {
        const isRecommended = !stage.complete && stage.key === recommendedStageKey
        return (
          <div key={stage.key} className="flex items-start gap-3">
            {/* Spine */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                  isRecommended
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-600'
                    : stage.isCurrentStage
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
                {isRecommended && (
                  <Badge variant="warning">Рекомендуется</Badge>
                )}
                {stage.isCurrentStage && (
                  <Badge variant="warning">← вы здесь</Badge>
                )}
                {stage.complete && !stage.isCurrentStage && (
                  <Badge variant="success">Готово</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{stage.detail}</p>
            </div>
          </div>
        )
      })}
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
          Итерация #{iter.iterationNumber}
        </span>
        <Badge variant={cyclePhaseVariant(iter)}>{cyclePhaseLabel(iter)}</Badge>
        {iter.targetTaskId && (
          <Badge variant="warning">{iter.targetTaskId}</Badge>
        )}
        {iter.roadmapPhaseNumber !== null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Фаза {iter.roadmapPhaseNumber}
          </span>
        )}
        <Badge variant={iter.status === 'parsed' ? 'success' : iter.status === 'sent' ? 'info' : 'muted'}>
          {iter.status === 'parsed' ? 'Распарсено' : iter.status === 'sent' ? 'Отправлено' : 'Ожидание'}
        </Badge>
      </div>

      <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
        {new Date(iter.createdAt).toLocaleString()}
      </p>

      {/* Prompt text snippet */}
      {iter.promptText && (
        <div
          data-testid="prompt-text-snippet"
          className="mb-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-mono leading-relaxed text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400"
        >
          {iter.promptText.slice(0, 500)}
          {iter.promptText.length > 500 ? '…' : ''}
        </div>
      )}

      {/* Test presence */}
      {parsed && (
        <div className="mb-2">
          {parsed.hasTests ? (
            <Badge variant="success">✓ Тесты обнаружены</Badge>
          ) : (
            <Badge variant="error">⚠ Тестовые файлы не обнаружены</Badge>
          )}
        </div>
      )}

      {/* Implemented task IDs */}
      {parsed && parsed.implementedTaskIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Упомянутые задачи:</span>
          {parsed.implementedTaskIds.map((id) => (
            <Badge key={id} variant="info">{id}</Badge>
          ))}
        </div>
      )}

      {/* Next task */}
      {parsed?.nextTaskId && (
        <div className="mb-2 flex items-center gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Следующая:</span>
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
  const canEdit = useCanEditProject()
  const canManageSharing = useCanManageSharing()
  const {
    activeProject,
    ideaDraft,
    researchRuns,
    importedArtifacts,
    researchBrief,
    specPack,
    architectureDraft,
    promptIterations,
    completedReviewTaskIds,
    markTaskReviewComplete,
  } = useProjectStore()
  const { markProjectCompleted } = useProjectRegistry()
  const selectedProject = useProjectRegistry(selectSelectedProject)

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Обзор" icon="🔍" description="Сравните реальность сборки с PRD, tech-spec и решениями." />
        <EmptyState
          icon="📂"
          title="Проект не выбран"
          description="Создайте проект и завершите цикл сборки, чтобы увидеть страницу Обзора."
          action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  const hasIdea = !!(ideaDraft?.rawIdea)
  const hasSpec = !!specPack
  const hasArch = !!architectureDraft
  const hasIterations = promptIterations.length > 0
  const hasParsedIteration = promptIterations.some((i) => i.status === 'parsed')
  const taskRows = buildTaskReviewModel(promptIterations)

  const cyclePhases = computeCycleProgress({
    ideaDraft,
    researchRuns,
    importedArtifacts,
    researchBrief,
    specPack,
    architectureDraft,
    promptIterations,
    completedReviewTaskIds,
  })
  const nextAction = computeNextAction(cyclePhases, promptIterations)
  const recommendedPhaseId = getRecommendedPhaseId(nextAction)
  const recommendedTaskId = getRecommendedTaskId(nextAction)

  // isProjectCompleted reads from selectedProject (reactive to registry) with fallback to
  // activeProject.status for projects loaded directly (e.g. persisted state already completed).
  const isProjectCompleted =
    (selectedProject?.id === activeProject.id && selectedProject?.status === 'completed') ||
    activeProject.status === 'completed'
  const canCompleteProject = completedReviewTaskIds.length > 0 && !isProjectCompleted

  function handleCompleteProject() {
    if (!canCompleteProject || !activeProject) return
    markProjectCompleted(activeProject.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Обзор"
        icon="🔍"
        description="Цикл Superpowers — Этап 6 из 6. Сравните реальность сборки с PRD, tech-spec, пользовательскими историями и решениями."
      />

      {/* Review label bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
        <Badge variant="default">Фаза обзора</Badge>
        <span className="text-sm text-violet-700 dark:text-violet-300">
          Вы в конце цикла. Проверьте критерии ниже, затем решите: итерировать или выпустить.
        </span>
      </div>

      {/* Project completed banner — T-213 */}
      {isProjectCompleted && (
        <div
          data-testid="project-completed-banner"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-700/50 dark:bg-emerald-950/20"
        >
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Проект завершён</p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
              Все ключевые задачи прошли review. Проект зафиксирован как завершённый.
            </p>
          </div>
        </div>
      )}

      {/* Next action recommendation — T-209 */}
      <NextActionCard action={nextAction} />

      {/* Project overview */}
      <Card>
        <CardHeader
          title={activeProject.name}
          icon="📂"
          action={
            isProjectCompleted ? (
              <Badge variant="success">✓ Завершён</Badge>
            ) : (
              <Badge variant="success">{activeProject.status}</Badge>
            )
          }
        />
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">Начат</p>
            <p className="text-zinc-800 dark:text-zinc-200">
              {new Date(activeProject.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Обновлён</p>
            <p className="text-zinc-800 dark:text-zinc-200">
              {new Date(activeProject.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Тип</p>
            <p className="text-zinc-800 dark:text-zinc-200 capitalize">
              {activeProject.projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
            </p>
          </div>
        </div>
      </Card>

      {/* Superpowers cycle timeline */}
      <Card>
        <CardHeader title="Цикл Superpowers" icon="🔄" />
        <CycleTimeline
          hasIdea={hasIdea}
          hasSpec={hasSpec}
          hasArch={hasArch}
          hasIterations={hasIterations}
          hasParsedIteration={hasParsedIteration}
          recommendedPhaseId={recommendedPhaseId}
        />
      </Card>

      {/* Task progress dashboard */}
      <Card>
        <CardHeader
          title="Прогресс задач"
          icon="📊"
          action={<Badge variant="info">{taskRows.length} задач</Badge>}
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Каждая строка — одна задача T-xxx. Бейджи показывают, каких фаз цикла она касалась.
        </p>
        <TaskProgressPanel
          iterations={promptIterations}
          onOpenPromptLoop={() => navigate('/prompt-loop')}
          onMarkReviewComplete={markTaskReviewComplete}
          recommendedTaskId={recommendedTaskId}
          completedReviewTaskIds={completedReviewTaskIds}
          isReadOnly={!canEdit}
        />
      </Card>

      {/* Architecture summary — stack + roadmap */}
      {architectureDraft && (
        <Card>
          <CardHeader
            title="Архитектура и роадмап"
            icon="🏗️"
            action={
              <Badge variant={architectureDraft.projectType === 'website' ? 'info' : 'default'}>
                {architectureDraft.projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
              </Badge>
            }
          />
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Стек
              </p>
              <div className="flex flex-wrap gap-1.5">
                {architectureDraft.recommendedStack.map((item) => (
                  <Badge key={item.name} variant="muted">
                    {item.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Роадмап
              </p>
              <div className="space-y-1">
                {architectureDraft.roadmapPhases.map((phase) => (
                  <div key={phase.phase} className="flex items-center gap-2 text-sm">
                    <Badge variant="muted">Ф{phase.phase}</Badge>
                    <span className="text-zinc-700 dark:text-zinc-300">{phase.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Prompt iterations — Review lens */}
      {promptIterations.length > 0 ? (
        <Card>
          <CardHeader
            title="Промпт-итерации"
            icon="⚡"
            action={<Badge variant="info">{promptIterations.length} всего</Badge>}
          />
          <div className="space-y-3">
            {promptIterations.map((iter) => (
              <IterationReviewCard key={iter.id} iter={iter} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Промпт-итерации" icon="⚡" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Промпт-итераций пока нет. Перейдите в Цикл промптов, чтобы начать сборку.
          </p>
        </Card>
      )}

      {/* Research inputs */}
      {(researchRuns.length > 0 || importedArtifacts.length > 0) && (
        <Card>
          <CardHeader title="Источники исследований" icon="🔬" />
          <div className="space-y-2">
            {researchRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Исследование — режим {run.mode}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString('ru-RU') : 'Не начато'}
                  </p>
                </div>
                <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'info'}>
                  {run.status === 'completed' ? 'Завершено' : run.status === 'failed' ? 'Ошибка' : 'В процессе'}
                </Badge>
              </div>
            ))}
            {importedArtifacts.map((artifact) => (
              <div key={artifact.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{artifact.title}</p>
                  <p className="text-xs text-zinc-400">
                    Импортировано {new Date(artifact.importedAt).toLocaleString('ru-RU')} · {artifact.sourceLabel}
                  </p>
                </div>
                <Badge variant="info">импорт</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Spec summary */}
      {specPack && (
        <Card>
          <CardHeader
            title="Краткое резюме спека"
            icon="📋"
            action={<Badge variant={specPack.projectType === 'website' ? 'info' : 'default'}>{specPack.projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}</Badge>}
          />
          <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p>{specPack.productSummary}</p>
            <div className="flex flex-wrap gap-1">
              {specPack.featureList
                .filter((f) => f.priority === 'must')
                .map((f) => (
                  <Badge key={f.id} variant="muted">{f.name}</Badge>
                ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {specPack.featureList.filter((f) => f.priority === 'must').length} обязательных ·{' '}
              {specPack.featureList.filter((f) => f.priority === 'should').length} желательных ·{' '}
              {researchBrief ? 'Бриф исследования доступен' : 'Нет брифа исследования'}
            </p>
          </div>
        </Card>
      )}

      {/* Review checklist */}
      <Card>
        <CardHeader
          title="Чеклист обзора"
          icon="✅"
          action={<Badge variant="warning">ручной обзор</Badge>}
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Проверьте каждый критерий по связанному документу перед закрытием этого цикла.
        </p>
        <ReviewChecklist />
      </Card>

      {/* Key decisions */}
      <Card>
        <CardHeader
          title="Ключевые решения"
          icon="📐"
          action={<Badge variant="muted">{KEY_DECISIONS.length} зафиксировано</Badge>}
        />
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Ограничения, которые ни один ревьюер не должен случайно обойти. Полный контекст — в{' '}
          <span className="font-mono text-violet-600 dark:text-violet-400">docs/decisions.md</span>.
        </p>
        <DecisionsPanel />
      </Card>

      {/* Project completion action — T-213; owner-only (T-405) */}
      {canManageSharing && (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
        {isProjectCompleted ? (
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Проект завершён</span>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Завершить проект</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {canCompleteProject
                  ? 'Все необходимые задачи прошли review. Можно зафиксировать проект как завершённый.'
                  : 'Завершите review хотя бы одной задачи, чтобы отметить проект завершённым.'}
              </p>
            </div>
            <button
              data-testid="complete-project-button"
              onClick={handleCompleteProject}
              disabled={!canCompleteProject}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                canCompleteProject
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600'
                  : 'cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600',
              ].join(' ')}
            >
              Завершить проект
            </button>
          </>
        )}
      </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate('/prompt-loop')}>
          Перейти к Циклу промптов
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← Главная
        </Button>
      </div>
    </div>
  )
}
