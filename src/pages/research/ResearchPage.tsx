import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startAttentionSignal, stopAttentionSignal } from '../../shared/lib/attentionSignal'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { EmptyState } from '../../shared/ui/EmptyState'
import { EditableResearchBrief } from '../../features/research-brief/EditableResearchBrief'
import { mockResearchService, mockResearchProviders } from '../../mocks/services/researchService'
import { canAdvanceFromIdea, canAdvanceFromResearch } from '../../shared/lib/stageGates'
import { generateId } from '../../shared/lib/id'
import { researchBriefToMarkdown } from '../../shared/lib/markdown/exportArtifactToMarkdown'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'
import type { ResearchMode, ImportedResearchArtifact, ResearchBrief } from '../../shared/types'

type ResearchTab = 'run' | 'import'

const MODE_LABELS: Record<ResearchMode, { short: string; desc: string }> = {
  quick: { short: 'Быстрый', desc: 'Краткое резюме, широкий охват' },
  pro: { short: 'Про', desc: 'Глубокий поиск, больше источников' },
  deep: { short: 'Глубокий', desc: 'Полноценный отчёт' },
  manual: { short: 'Вручную', desc: 'Напишите бриф самостоятельно' },
  imported: { short: 'Импорт', desc: 'Использовать готовое исследование' },
}

// ─── Blocked progression banner ───────────────────────────────────────────────

function GateBanner({ reason, action, actionLabel }: { reason: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
      <span className="mt-0.5 text-base">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{reason}</p>
        {action && actionLabel && (
          <button
            onClick={action}
            className="mt-0.5 text-sm text-amber-700 underline dark:text-amber-400"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResearchPage() {
  const navigate = useNavigate()
  const {
    activeProject,
    ideaDraft,
    researchRuns,
    importedArtifacts,
    researchBrief,
    addResearchRun,
    updateResearchRun,
    addImportedArtifact,
    setResearchBrief,
    setCurrentStage,
  } = useProjectStore()

  const [activeTab, setActiveTab] = useState<ResearchTab>('run')
  const [selectedProvider, setSelectedProvider] = useState('mock-provider')
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('quick')
  const [running, setRunning] = useState(false)

  // Import form state
  const [importTitle, setImportTitle] = useState('')
  const [importContent, setImportContent] = useState('')
  const [importLabel, setImportLabel] = useState('')
  const [normalizing, setNormalizing] = useState(false)
  const [normalizationWarnings, setNormalizationWarnings] = useState<string[]>([])

  // Track which artifact produced the current brief (for source attribution)
  const [briefArtifactId, setBriefArtifactId] = useState<string | null>(null)

  // Stop any active signal when leaving this page
  useEffect(() => () => stopAttentionSignal(), [])

  // Stage gates
  const ideaGate = canAdvanceFromIdea(ideaDraft, activeProject?.projectType ?? null)
  const researchGate = canAdvanceFromResearch(researchBrief)

  // Find the artifact that produced the current brief
  const briefArtifact = briefArtifactId
    ? importedArtifacts.find((a) => a.id === briefArtifactId)
    : null

  // ─── Run new research ─────────────────────────────────────────────────────

  async function handleRunResearch() {
    if (!activeProject || !ideaDraft) return
    setRunning(true)
    setNormalizationWarnings([])

    const runId = generateId('run')
    addResearchRun({
      id: runId,
      projectId: activeProject.id,
      providerId: selectedProvider,
      mode: selectedMode,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      inputSummary: ideaDraft.rawIdea,
    })

    try {
      const brief = await mockResearchService.runResearch({
        projectId: activeProject.id,
        mode: selectedMode,
        inputSummary: ideaDraft.rawIdea,
      })
      updateResearchRun(runId, { status: 'completed', finishedAt: new Date().toISOString() })
      setResearchBrief(brief)
      setBriefArtifactId(null)
      setCurrentStage('research')
      startAttentionSignal('task_completed')
    } catch {
      updateResearchRun(runId, { status: 'failed' })
    } finally {
      setRunning(false)
    }
  }

  // ─── Import and normalize ─────────────────────────────────────────────────

  async function handleImportResearch() {
    if (!activeProject || !importContent.trim()) return
    setNormalizing(true)
    setNormalizationWarnings([])

    const artifact: ImportedResearchArtifact = {
      id: generateId('artifact'),
      projectId: activeProject.id,
      title: importTitle.trim() || 'Imported Research',
      sourceType: 'pasted_summary',
      sourceLabel: importLabel.trim() || 'External source',
      rawContent: importContent,
      importedAt: new Date().toISOString(),
      notes: '',
    }

    addImportedArtifact(artifact)

    try {
      const { brief, warnings } = await mockResearchService.normalizeImportedArtifact(
        artifact,
        ideaDraft
      )
      setResearchBrief(brief)
      setBriefArtifactId(artifact.id)
      setNormalizationWarnings(warnings)
      setCurrentStage('research')
      // Clear form after successful import
      setImportTitle('')
      setImportContent('')
      setImportLabel('')
    } finally {
      setNormalizing(false)
    }
  }

  // ─── Handle brief edits ───────────────────────────────────────────────────

  function handleBriefSave(updated: ResearchBrief) {
    setResearchBrief(updated)
  }

  // ─── Copy brief as markdown ───────────────────────────────────────────────

  const [briefCopied, setBriefCopied] = useState(false)

  async function handleCopyBriefMarkdown() {
    if (!researchBrief) return
    const md = researchBriefToMarkdown(researchBrief, activeProject?.name ?? null)
    const result = await copyMarkdown(md, 'research-brief.md')
    if (result.method !== 'failed') {
      setBriefCopied(true)
      setTimeout(() => setBriefCopied(false), 2000)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Исследование" icon="🔍" description="Запустите или импортируйте исследование." />
        <EmptyState
          icon="📂"
          title="Проект не выбран"
          description="Сначала создайте проект, чтобы начать этап исследования."
          action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Исследование"
        icon="🔍"
        description="Запустите исследование через провайдера или импортируйте готовое. Все источники нормализуются в единый исследовательский бриф."
        badge={
          researchBrief ? (
            <Badge variant="success">Бриф готов</Badge>
          ) : (
            <Badge variant="muted">Бриф отсутствует</Badge>
          )
        }
        action={
          researchGate.canAdvance ? (
            <Button size="sm" onClick={() => navigate('/spec')}>
              Перейти к спецификации →
            </Button>
          ) : undefined
        }
      />

      {/* Stage gate: need idea first */}
      {!ideaGate.canAdvance && (
        <GateBanner
          reason={ideaGate.reason ?? 'Сначала заполните этап Идеи.'}
          action={() => navigate('/idea')}
          actionLabel="Перейти к идее →"
        />
      )}

      {/* Two-path tab switcher */}
      <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700/60 dark:bg-zinc-900">
        <button
          onClick={() => setActiveTab('run')}
          className={tabCls(activeTab === 'run')}
        >
          🔬 Новое исследование
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={tabCls(activeTab === 'import')}
        >
          📥 Импорт исследования
        </button>
      </div>

      {/* ── Run new research tab ──────────────────────────────────────────── */}
      {activeTab === 'run' && (
        <Card>
          <CardHeader
            title="Провайдер исследования"
            description="Выберите провайдера и режим. В MVP все провайдеры работают через mock-адаптер."
            icon="🔬"
          />
          <div className="space-y-4">
            {/* Provider selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Провайдер
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {mockResearchProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() =>
                      provider.status === 'available' && setSelectedProvider(provider.id)
                    }
                    disabled={provider.status !== 'available'}
                    className={providerBtnCls(selectedProvider === provider.id, provider.status === 'available')}
                  >
                    <span className="font-medium">{provider.name}</span>
                    {provider.status === 'coming_soon' && <Badge variant="muted">Скоро</Badge>}
                    {provider.status === 'available' && selectedProvider === provider.id && (
                      <span className="text-violet-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Режим
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['quick', 'pro', 'deep', 'manual'] as ResearchMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={modeBtnCls(selectedMode === mode)}
                  >
                    <span className="font-medium">{MODE_LABELS[mode].short}</span>
                    <span className="ml-1 text-xs text-zinc-400">— {MODE_LABELS[mode].desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRunResearch}
              disabled={!ideaGate.canAdvance || !activeProject}
              loading={running}
              fullWidth
              title={!ideaGate.canAdvance ? (ideaGate.reason ?? undefined) : undefined}
            >
              {running ? 'Выполняется исследование…' : 'Запустить исследование'}
            </Button>

            {/* Run history */}
            {researchRuns.length > 0 && (
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="mb-2 text-xs font-medium text-zinc-500">Запуски исследований</p>
                <div className="space-y-1">
                  {researchRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {run.mode} · {run.providerId}
                      </span>
                      <Badge
                        variant={
                          run.status === 'completed' ? 'success'
                          : run.status === 'failed' ? 'error'
                          : run.status === 'running' ? 'info'
                          : 'muted'
                        }
                      >
                        {run.status === 'completed' ? 'Завершено'
                          : run.status === 'failed' ? 'Ошибка'
                          : run.status === 'running' ? 'Выполняется'
                          : 'Ожидание'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Import existing research tab ──────────────────────────────────── */}
      {activeTab === 'import' && (
        <Card>
          <CardHeader
            title="Импорт готового исследования"
            description="Вставьте готовое исследование — заметки, отчёты, экспорт AI-чатов или структурированные резюме. Нормализатор извлечёт ключевые разделы в формат Research Brief."
            icon="📥"
          />

          {/* What the normalizer looks for */}
          <div className="mb-4 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Что извлекается
            </p>
            <div className="grid gap-x-6 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
              {[
                'Проблема / вызов',
                'Целевая аудитория',
                'Ценностное предложение',
                'Заметки о конкурентах',
                'Риски и сложности',
                'Возможности',
                'Рекомендованный MVP / скоуп',
                'Открытые вопросы',
              ].map((item) => (
                <span key={item}>• {item}</span>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Заголовки с метками предпочтительны. Текст без меток сопоставляется по ключевым словам. Результат всегда можно отредактировать.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Название
              </label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="напр. Анализ конкурентов, Экспорт Perplexity deep research"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Источник
              </label>
              <input
                type="text"
                value={importLabel}
                onChange={(e) => setImportLabel(e.target.value)}
                placeholder="напр. Внутренние заметки, Экспорт Perplexity, Разговор ChatGPT"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Содержимое исследования <span className="text-red-400">*</span>
              </label>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={`Вставьте исследование сюда — markdown, обычный текст, списки, любой формат.

Совет: разделы с заголовками типа "## Проблема" или "## Целевая аудитория" улучшают точность извлечения.`}
                rows={10}
                className={`${inputCls()} resize-none font-mono text-xs`}
              />
              <p className="mt-1 text-xs text-zinc-400">
                {importContent.length} символов вставлено
              </p>
            </div>

            <Button
              onClick={handleImportResearch}
              disabled={!importContent.trim() || !activeProject}
              loading={normalizing}
              fullWidth
            >
              {normalizing ? 'Нормализация…' : 'Импортировать и нормализовать в Research Brief'}
            </Button>
          </div>

          {/* Imported artifacts log */}
          {importedArtifacts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500">Ранее импортировано</p>
              {importedArtifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{artifact.title}</span>
                    <span className="ml-2 text-zinc-400">{artifact.sourceLabel}</span>
                  </div>
                  <Badge variant="info">импорт</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Normalization explanation callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 dark:border-violet-800/40 dark:bg-violet-950/20">
        <span className="mt-0.5 text-xl">🔀</span>
        <div>
          <p className="font-semibold text-violet-800 dark:text-violet-300">
            Всё исследование → единый Research Brief
          </p>
          <p className="mt-0.5 text-sm text-violet-700/80 dark:text-violet-400">
            Независимо от источника — встроенное исследование или импорт — результат всегда одинаковый:
            структура Research Brief. Спецификация, архитектура и промпты потребляют бриф, а не сырой источник.
          </p>
        </div>
      </div>

      {/* Research brief — editable */}
      {researchBrief ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Исследовательский бриф</span>
            <Button size="sm" variant="ghost" onClick={handleCopyBriefMarkdown}>
              {briefCopied ? '✓ Скопировано' : '↓ Скопировать как markdown'}
            </Button>
          </div>
          <EditableResearchBrief
            brief={researchBrief}
            artifactTitle={briefArtifact?.title}
            normalizationWarnings={normalizationWarnings}
            onSave={handleBriefSave}
          />

          {/* Stage gate: advance to spec */}
          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {researchGate.canAdvance ? (
              <Button onClick={() => navigate('/spec')}>
                Перейти к спецификации →
              </Button>
            ) : (
              <div className="space-y-2">
                <Button disabled title={researchGate.reason ?? undefined}>
                  Перейти к спецификации →
                </Button>
                {researchGate.reason && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">⚠ {researchGate.reason}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="📄"
          title="Бриф ещё не создан"
          description="Запустите новое исследование или импортируйте готовое выше. Результат появится здесь для просмотра и редактирования."
        />
      )}
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function tabCls(active: boolean) {
  return [
    'flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
  ].join(' ')
}

function inputCls() {
  return 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900'
}

function providerBtnCls(selected: boolean, available: boolean) {
  return [
    'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors',
    selected
      ? 'border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-300'
      : available
      ? 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600'
      : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600',
  ].join(' ')
}

function modeBtnCls(selected: boolean) {
  return [
    'rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
    selected
      ? 'border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-300'
      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800',
  ].join(' ')
}
