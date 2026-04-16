import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startAttentionSignal, stopAttentionSignal } from '../../shared/lib/attentionSignal'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { EmptyState } from '../../shared/ui/EmptyState'
import { mockSpecService } from '../../mocks/services/specService'
import { canAdvanceFromArchitecture } from '../../shared/lib/stageGates'
import { GateDiagnostics } from '../../shared/ui/GateDiagnostics'
import { EditableArchitectureDraft } from '../../features/architecture-output/EditableArchitectureDraft'
import { architectureDraftToMarkdown } from '../../shared/lib/markdown/exportArtifactToMarkdown'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'
import type { ArchitectureDraft } from '../../shared/types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ArchitecturePage() {
  const navigate = useNavigate()
  const { activeProject, specPack, architectureDraft, setArchitectureDraft, updateArchitectureDraft, setCurrentStage } =
    useProjectStore()
  const [generating, setGenerating] = useState(false)
  const [archCopied, setArchCopied] = useState(false)

  // Stop any active signal when leaving this page
  useEffect(() => () => stopAttentionSignal(), [])

  const archGate = canAdvanceFromArchitecture(architectureDraft)
  const projectType = activeProject?.projectType ?? specPack?.projectType ?? 'application'

  async function handleCopyArchMarkdown() {
    if (!architectureDraft) return
    const md = architectureDraftToMarkdown(architectureDraft, activeProject?.name ?? null)
    const result = await copyMarkdown(md, 'architecture.md')
    if (result.method !== 'failed') {
      setArchCopied(true)
      setTimeout(() => setArchCopied(false), 2000)
    }
  }

  async function handleGenerate() {
    if (!specPack) return
    setGenerating(true)
    try {
      const arch = await mockSpecService.generateArchitecture(specPack, projectType)
      setArchitectureDraft(arch)
      setCurrentStage('architecture')
      startAttentionSignal('task_completed')
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveArch(updated: ArchitectureDraft) {
    updateArchitectureDraft(updated)
  }

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Архитектура" icon="🏗️" description="Определите технологический стек и дорожную карту." />
        <EmptyState
          icon="📂"
          title="Проект не выбран"
          description="Сначала создайте проект, чтобы перейти к этапу архитектуры."
          action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Архитектура"
        icon="🏗️"
        description="Определите рекомендуемый стек технологий, модульную архитектуру, поток данных и поэтапную дорожную карту."
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
            </Badge>
            {architectureDraft
              ? <Badge variant="success">Сгенерировано</Badge>
              : <Badge variant="muted">Не сгенерировано</Badge>}
          </div>
        }
      />

      {/* Blocked: no spec */}
      {!specPack && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Требуется спецификация</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Сначала завершите этап спецификации.{' '}
                <button onClick={() => navigate('/spec')} className="underline">
                  Перейти к спецификации →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate panel — shown when spec exists but no arch yet */}
      {specPack && !architectureDraft && (
        <Card>
          <CardHeader
            title="Генерация архитектуры"
            description="Создаёт рекомендацию стека, структуру модулей, поток данных и поэтапную дорожную карту."
            icon="⚙️"
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Что будет сгенерировано</p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Рекомендуемый стек с обоснованием</li>
                <li>• Обзор модульной архитектуры</li>
                <li>• Описание потока данных</li>
                <li>• Поэтапная дорожная карта</li>
                <li>• Технические риски</li>
              </ul>
            </div>
            <Button onClick={handleGenerate} loading={generating} fullWidth>
              {generating ? 'Генерация архитектуры…' : 'Сгенерировать архитектуру'}
            </Button>
          </div>
        </Card>
      )}

      {/* Editable architecture output */}
      {architectureDraft && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {architectureDraft.projectType === 'website'
                ? 'Эта архитектура адаптирована для Сайта — SSR/SSG, контентный конвейер и CDN-деплой.'
                : 'Эта архитектура адаптирована для Приложения — SPA, клиентский роутинг и управление состоянием.'}
            </p>
            <Button size="sm" variant="ghost" onClick={handleCopyArchMarkdown}>
              {archCopied ? '✓ Скопировано' : '↓ Скопировать как markdown'}
            </Button>
          </div>
          <EditableArchitectureDraft arch={architectureDraft} onSave={handleSaveArch} />
        </>
      )}

      {/* Bottom action bar */}
      {architectureDraft && (
        <div className="space-y-3">
          <GateDiagnostics reasons={archGate.canAdvance || !archGate.reason ? [] : [archGate.reason]} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleGenerate} loading={generating} disabled={!specPack}>
              Перегенерировать
            </Button>
            <Button
              onClick={() => navigate('/prompt-loop')}
              disabled={!archGate.canAdvance}
              title={archGate.reason ?? undefined}
            >
              Перейти к циклу промптов →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
