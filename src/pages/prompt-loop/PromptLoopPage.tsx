import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startAttentionSignal, stopAttentionSignal } from '../../shared/lib/attentionSignal'
import type { CyclePhase } from '../../entities/prompt-iteration/types'
import { useProjectStore } from '../../app/store/projectStore'
import { useCanEditProject } from '../../app/store/viewingModeStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { EmptyState } from '../../shared/ui/EmptyState'
import { getPromptLoopApi } from '../../shared/api'
import { CommentsPanel } from '../../shared/ui/CommentsPanel'
import { generateId } from '../../shared/lib/id'
import { promptIterationToMarkdown } from '../../shared/lib/markdown/exportArtifactToMarkdown'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'
import { canAdvanceFromPromptLoop, canAdvanceToReview } from '../../shared/lib/stageGates'
import { GateDiagnostics } from '../../shared/ui/GateDiagnostics'
import { resolveGateDiagnostic } from '../../shared/lib/gateDiagnosticMessages'

// ─── Cycle context bar ────────────────────────────────────────────────────────
// Shows project type, cycle phase, and current target task in a subtle strip.

const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  brainstorm: '💡 Идея',
  spec: '📋 Спец',
  plan: '🗺️ План',
  tasks: '✅ Задачи',
  code_and_tests: '🔄 Код + Тесты',
  review: '✅ Обзор',
}

const CYCLE_PHASE_VARIANT: Record<CyclePhase, 'muted' | 'info' | 'warning' | 'success'> = {
  brainstorm: 'muted',
  spec: 'muted',
  plan: 'muted',
  tasks: 'warning',
  code_and_tests: 'info',
  review: 'success',
}

function CycleContextBar({
  projectType,
  cyclePhase,
  targetTaskId,
  phaseNumber,
}: {
  projectType: 'application' | 'website' | null
  cyclePhase: CyclePhase | null
  targetTaskId: string | null
  phaseNumber: number | null
}) {
  if (!projectType && !cyclePhase) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
      <span className="font-medium text-zinc-400 dark:text-zinc-500">Контекст цикла</span>
      <span className="text-zinc-300 dark:text-zinc-600">·</span>
      {projectType && (
        <Badge variant="default">
          {projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
        </Badge>
      )}
      {cyclePhase && (
        <Badge variant={CYCLE_PHASE_VARIANT[cyclePhase]}>
          {CYCLE_PHASE_LABEL[cyclePhase]}
        </Badge>
      )}
      {targetTaskId && (
        <Badge variant="warning">{targetTaskId}</Badge>
      )}
      {phaseNumber !== null && phaseNumber !== undefined && (
        <span className="text-zinc-400 dark:text-zinc-500">Фаза {phaseNumber}</span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PromptLoopPage() {
  const navigate = useNavigate()
  const canEdit = useCanEditProject()
  const {
    activeProject,
    specPack,
    architectureDraft,
    promptIterations,
    addPromptIteration,
    updatePromptIteration,
    setCurrentStage,
  } = useProjectStore()

  const [generating, setGenerating] = useState(false)
  const [activeIterationId, setActiveIterationId] = useState<string | null>(
    promptIterations.length > 0 ? promptIterations[promptIterations.length - 1].id : null
  )
  const [responseInput, setResponseInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [iterCopied, setIterCopied] = useState(false)
  const [taskIdInput, setTaskIdInput] = useState('')
  const [taskDescriptionInput, setTaskDescriptionInput] = useState('')

  // Stop any active signal when leaving this page
  useEffect(() => () => stopAttentionSignal(), [])

  const activeIteration = promptIterations.find((p) => p.id === activeIterationId) ?? null
  const latestIteration = promptIterations.length > 0
    ? promptIterations[promptIterations.length - 1]
    : null

  const projectType = activeProject?.projectType ?? specPack?.projectType ?? null

  // Use the cyclePhase field from the active iteration directly.
  // Falls back to null (no bar) when there is no active iteration.
  const displayCyclePhase: CyclePhase | null = activeIteration?.cyclePhase ?? null

  async function handleGenerateFirst() {
    if (!specPack || !architectureDraft || !activeProject || !projectType) return
    setGenerating(true)
    try {
      const iteration = await getPromptLoopApi().generateFirstPrompt(
        specPack,
        architectureDraft,
        projectType,
        activeProject.id,
        generateId('prompt'),
        taskIdInput.trim() || null,
        taskDescriptionInput.trim() || null,
      )
      addPromptIteration(iteration)
      setActiveIterationId(iteration.id)
      setCurrentStage('first_prompt')
      // Prompt is ready — app is now waiting for user to paste Claude's response
      startAttentionSignal('awaiting_confirmation')
    } finally {
      setGenerating(false)
    }
  }

  async function handleParseResponse() {
    if (!activeIteration || !responseInput.trim()) return
    setParsing(true)
    try {
      const parsed = getPromptLoopApi().parseClaudeResponse(responseInput)
      stopAttentionSignal('awaiting_confirmation')
      updatePromptIteration(activeIteration.id, {
        claudeResponseRaw: responseInput,
        parsedSummary: parsed,
        recommendedNextStep: parsed.nextStep,
        status: 'parsed',
      })
      setResponseInput('')
      // Parsed result is ready — user picks next action (may have tabbed away)
      startAttentionSignal('task_completed')
    } finally {
      setParsing(false)
    }
  }

  async function handleGenerateNext(targetPhase: 'code_and_tests' | 'review' = 'code_and_tests') {
    if (!activeProject || !latestIteration?.parsedSummary || !projectType) return
    setGenerating(true)
    try {
      const next = await getPromptLoopApi().generateNextPrompt(
        latestIteration,
        latestIteration.parsedSummary,
        projectType,
        activeProject.id,
        generateId('prompt'),
        promptIterations.length + 1,
        targetPhase,
      )
      addPromptIteration(next)
      setActiveIterationId(next.id)
      setCurrentStage('iterative_loop')
      // Next prompt ready — waiting for user to paste response again
      startAttentionSignal('awaiting_confirmation')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleCopyIterationMarkdown() {
    if (!activeIteration) return
    const md = promptIterationToMarkdown(activeIteration, activeProject?.name ?? null)
    const result = await copyMarkdown(md, `prompt-iteration-${activeIteration.iterationNumber}.md`)
    if (result.method !== 'failed') {
      setIterCopied(true)
      setTimeout(() => setIterCopied(false), 2000)
    }
  }

  const hasReadyIteration = !!latestIteration?.parsedSummary

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Цикл промптов" icon="⚡" description="Итерируйте с Claude Code." />
        <EmptyState
          icon="📂"
          title="Проект не выбран"
          description="Сначала создайте проект, чтобы запустить цикл промптов."
          action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Цикл промптов"
        icon="⚡"
        description="Генерируйте промпты для Claude Code, вставляйте ответы, парсите результаты, генерируйте следующий промпт. Одна задача за раз."
        badge={
          <div className="flex items-center gap-2">
            {projectType && (
              <Badge variant="default">
                {projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
              </Badge>
            )}
            {promptIterations.length > 0
              ? <Badge variant="info">Итерация {promptIterations.length}</Badge>
              : <Badge variant="muted">Не начато</Badge>}
          </div>
        }
        action={
          hasReadyIteration ? (
            <Button size="sm" variant="secondary" onClick={() => navigate('/history')}>
              История
            </Button>
          ) : undefined
        }
      />

      {/* Cycle context bar — visible as soon as there is an active iteration */}
      {(activeIteration || architectureDraft) && (
        <CycleContextBar
          projectType={projectType}
          cyclePhase={displayCyclePhase}
          targetTaskId={activeIteration?.targetTaskId ?? null}
          phaseNumber={activeIteration?.roadmapPhaseNumber ?? null}
        />
      )}

      {!architectureDraft && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Требуется архитектура</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Сначала завершите этап архитектуры.{' '}
                <button onClick={() => navigate('/architecture')} className="underline">
                  Перейти к архитектуре →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {architectureDraft && !specPack && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Требуется спецификация</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Для генерации промпта нужна спецификация.{' '}
                <button onClick={() => navigate('/spec')} className="underline">
                  Перейти к спецификации →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate first prompt — hidden for viewers */}
      {promptIterations.length === 0 && canEdit && (
        <Card>
          <CardHeader
            title="Сгенерировать первый промпт для Claude Code"
            description="Создаёт структурированный промпт из вашей спецификации и архитектуры."
            icon="⚡"
          />
          <div className="space-y-3">
            {/* Task ID input */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                ID стартовой задачи <span className="normal-case font-normal text-zinc-400">(напр. T-001 — необязательно)</span>
              </label>
              <input
                type="text"
                value={taskIdInput}
                onChange={(e) => setTaskIdInput(e.target.value)}
                placeholder="T-001"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Если указан, промпт явно сошлётся на эту задачу и потребует подход tests-first.
              </p>
            </div>
            {/* Task description — optional, injected into the task section */}
            {taskIdInput.trim() && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Описание задачи <span className="normal-case font-normal text-zinc-400">(необязательно — из docs/tasks.md)</span>
                </label>
                <textarea
                  value={taskDescriptionInput}
                  onChange={(e) => setTaskDescriptionInput(e.target.value)}
                  placeholder="Вставьте или введите Definition of Done или описание задачи…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
                />
              </div>
            )}
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Что будет в промпте
              </p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Тип проекта ({projectType === 'website' ? 'Сайт' : projectType === 'application' ? 'Приложение' : 'не задан'}) и этап цикла (Код + Тесты)</li>
                <li>• Документы для прочтения (PRD, features, tech-spec, data-model, tasks)</li>
                <li>• Стек, цели Phase 0, обязательные фичи, ограничения</li>
                {taskIdInput.trim()
                  ? <li className="font-medium text-violet-600 dark:text-violet-400">• Задача {taskIdInput.trim()}: подход tests-first с Definition of Done</li>
                  : <li>• Правило TDD — тесты обязательны в том же ответе</li>}
                <li>• Структурированный формат ответа из 5 разделов</li>
              </ul>
            </div>
            <Button
              onClick={handleGenerateFirst}
              loading={generating}
              disabled={!specPack || !architectureDraft}
              fullWidth
            >
              {generating ? 'Генерация…' : 'Сгенерировать первый промпт'}
            </Button>
          </div>
        </Card>
      )}

      {/* Active prompt */}
      {activeIteration && (
        <Card>
          <CardHeader
            title={`Итерация ${activeIteration.iterationNumber}`}
            icon="📝"
            action={
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activeIteration.status === 'parsed' ? 'success'
                    : activeIteration.status === 'sent' ? 'info'
                    : 'muted'
                  }
                >
                  {activeIteration.status === 'parsed' ? 'Распарсено' : activeIteration.status === 'sent' ? 'Отправлено' : 'Ожидание'}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(activeIteration.promptText)}
                >
                  {copied ? '✓ Скопировано' : 'Скопировать промпт'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyIterationMarkdown}
                >
                  {iterCopied ? '✓ Скопировано' : '↓ Скопировать как markdown'}
                </Button>
              </div>
            }
          />

          {/* Prompt text */}
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <pre className="max-h-80 overflow-y-auto p-4 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
              {activeIteration.promptText}
            </pre>
          </div>

          <div className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
            <span className="font-medium">Далее:</span> Скопируйте промпт выше и вставьте его в Claude Code.
            Затем вставьте ответ Claude ниже для парсинга.
          </div>
        </Card>
      )}

      {/* Paste Claude response — hidden for viewers */}
      {activeIteration && activeIteration.status !== 'parsed' && canEdit && (
        <Card>
          <CardHeader
            title="Вставьте ответ Claude"
            description="Вставьте полный ответ из Claude Code. Парсер извлечёт анализ, план, файлы, резюме реализации, следующий шаг и проверит наличие тестов."
            icon="📋"
          />
          <div className="space-y-3">
            <textarea
              value={responseInput}
              onChange={(e) => { stopAttentionSignal('awaiting_confirmation'); setResponseInput(e.target.value) }}
              onFocus={() => stopAttentionSignal('awaiting_confirmation')}
              placeholder="Вставьте полный ответ Claude здесь…"
              rows={8}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900 font-mono"
            />
            <Button
              onClick={handleParseResponse}
              loading={parsing}
              disabled={!responseInput.trim()}
              fullWidth
            >
              {parsing ? 'Парсинг…' : 'Распарсить ответ'}
            </Button>
          </div>
        </Card>
      )}

      {/* Parsed result */}
      {activeIteration?.parsedSummary && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Распарсенный ответ"
              icon="🔍"
              action={
                <div className="flex items-center gap-2">
                  <Badge variant="success">Распарсено</Badge>
                  {activeIteration.parsedSummary.hasTests
                    ? <Badge variant="success">✓ Тесты найдены</Badge>
                    : <Badge variant="warning">⚠️ Нет тестов</Badge>}
                </div>
              }
            />
            <div className="space-y-4">
              {activeIteration.parsedSummary.analysis && (
                <ParsedSection label="Краткий анализ" content={activeIteration.parsedSummary.analysis} />
              )}
              {activeIteration.parsedSummary.plan && (
                <ParsedSection label="План реализации" content={activeIteration.parsedSummary.plan} />
              )}
              {activeIteration.parsedSummary.implementationSummary && (
                <ParsedSection label="Резюме реализации" content={activeIteration.parsedSummary.implementationSummary} />
              )}
              {activeIteration.parsedSummary.changedFiles.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Изменённые файлы</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeIteration.parsedSummary.changedFiles.map((f) => (
                      <span
                        key={f}
                        className={`rounded-md px-2 py-0.5 text-xs font-mono ${
                          /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f) || f.startsWith('[TEST]')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeIteration.parsedSummary.implementedTaskIds.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Упомянутые задачи</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeIteration.parsedSummary.implementedTaskIds.map((id) => (
                      <Badge key={id} variant="warning">{id}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {activeIteration.parsedSummary.nextStep ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Рекомендуемый следующий шаг
                    </p>
                    {activeIteration.parsedSummary.nextTaskId && (
                      <Badge variant="warning">{activeIteration.parsedSummary.nextTaskId}</Badge>
                    )}
                    {activeIteration.parsedSummary.inferredNextPhase && (
                      <Badge variant={activeIteration.parsedSummary.inferredNextPhase === 'review' ? 'success' : 'info'}>
                        {CYCLE_PHASE_LABEL[activeIteration.parsedSummary.inferredNextPhase]}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                    {activeIteration.parsedSummary.nextStep}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Следующий шаг</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Следующий шаг не найден в ответе. Убедитесь, что Claude завершил ответ разделом «Следующий шаг».
                  </p>
                </div>
              )}
              {/* Derived parse warnings — computed from parsed data quality */}
              {(() => {
                const derived: string[] = []
                const ps = activeIteration.parsedSummary
                if (activeIteration.targetTaskId && !ps.implementedTaskIds.includes(activeIteration.targetTaskId)) {
                  derived.push(`Задача ${activeIteration.targetTaskId} не упомянута в ответе — проверьте, что Claude работал над нужной задачей.`)
                }
                if (ps.inferredNextPhase === null && ps.nextStep) {
                  derived.push('Фаза не определена автоматически — следующий шаг не содержит явных сигналов о статусе задачи.')
                }
                const allWarnings = [...ps.warnings, ...derived]
                if (allWarnings.length === 0) return null
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Предупреждения парсера
                    </p>
                    {allWarnings.map((w, i) => (
                      <p key={i} className="mt-1 text-sm text-amber-700 dark:text-amber-400">⚠ {w}</p>
                    ))}
                  </div>
                )
              })()}
            </div>
          </Card>

          {/* Generate next — hidden for viewers */}
          {canEdit && (() => {
            const advanceGate = canAdvanceFromPromptLoop(latestIteration)
            const reviewGate = canAdvanceToReview(latestIteration)
            const reviewBlockedReasons = reviewGate.canAdvance
              ? []
              : reviewGate.blockingDiagnostics.map((d) => resolveGateDiagnostic(d).label)

            return (
              <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-950/20">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-violet-800 dark:text-violet-300">
                    Готово к итерации {promptIterations.length + 1}
                  </p>
                  {activeIteration.parsedSummary.inferredNextPhase ? (
                    <Badge variant={activeIteration.parsedSummary.inferredNextPhase === 'review' ? 'success' : activeIteration.parsedSummary.inferredNextPhase === 'tasks' ? 'warning' : 'info'}>
                      Предложено: {CYCLE_PHASE_LABEL[activeIteration.parsedSummary.inferredNextPhase]}
                    </Badge>
                  ) : (
                    <Badge variant="muted">Фаза не определена</Badge>
                  )}
                </div>
                {!activeIteration.parsedSummary.hasTests && (
                  <p className="mb-3 text-sm font-medium text-amber-600 dark:text-amber-400">
                    ⚠️ Тесты отсутствуют — следующий промпт Код+Тесты запросит их перед продолжением.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleGenerateNext('code_and_tests')}
                    loading={generating}
                    disabled={!advanceGate.canAdvance}
                  >
                    {activeIteration.parsedSummary.nextTaskId
                      ? `Код+Тесты: ${activeIteration.parsedSummary.nextTaskId} →`
                      : 'Следующий промпт Код+Тесты →'}
                  </Button>
                  {reviewGate.canAdvance && (
                    <Button
                      variant="secondary"
                      onClick={() => handleGenerateNext('review')}
                      loading={generating}
                    >
                      Ревью: {latestIteration!.targetTaskId} →
                    </Button>
                  )}
                </div>
                {/* Review gate diagnostics — shown when review is blocked but base advance is ok */}
                {!reviewGate.canAdvance && advanceGate.canAdvance && reviewBlockedReasons.length > 0 && (
                  <div className="mt-3" data-testid="review-gate-diagnostics">
                    <GateDiagnostics reasons={reviewBlockedReasons} />
                  </div>
                )}
                <p className="mt-2 text-xs text-violet-600/70 dark:text-violet-400/70">
                  Код+Тесты переходит к следующей задаче. Ревью проверяет текущую задачу по её Definition of Done.
                </p>
              </Card>
            )
          })()}
        </div>
      )}

      {/* Comments — visible to all roles when an iteration is active */}
      {activeIteration && activeProject && (
        <CommentsPanel
          projectId={activeProject.id}
          artifactType="prompt_iteration"
          artifactId={activeIteration.id}
          canPost={canEdit}
        />
      )}

      {/* Iteration switcher */}
      {promptIterations.length > 1 && (
        <Card>
          <CardHeader title="Все итерации" icon="🔄" />
          <div className="space-y-2">
            {promptIterations.map((iter) => {
              const isActive = activeIterationId === iter.id
              const summary = iter.parsedSummary?.analysis
                ? iter.parsedSummary.analysis.replace(/\n/g, ' ').slice(0, 100) + (iter.parsedSummary.analysis.length > 100 ? '…' : '')
                : null
              return (
                <button
                  key={iter.id}
                  onClick={() => setActiveIterationId(iter.id)}
                  className={[
                    'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-violet-100 dark:bg-violet-900/40'
                      : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      #{iter.iterationNumber}
                      {iter.status === 'parsed' && ' ✓'}
                    </span>
                    <Badge variant={iter.cyclePhase === 'review' ? 'success' : 'info'}>
                      {iter.cyclePhase === 'review' ? '✅ Ревью' : '🔄 Код+Тесты'}
                    </Badge>
                    {iter.targetTaskId && (
                      <Badge variant="warning">{iter.targetTaskId}</Badge>
                    )}
                  </div>
                  {summary && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{summary}</p>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {promptIterations.length === 0 && !architectureDraft && (
        <EmptyState
          icon="⚡"
          title="Сначала завершите архитектуру"
          description="Для цикла промптов требуется готовая спецификация и черновик архитектуры."
          action={{ label: 'Перейти к архитектуре', onClick: () => navigate('/architecture') }}
        />
      )}
    </div>
  )
}

function ParsedSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{content}</p>
    </div>
  )
}
