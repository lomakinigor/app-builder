import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { EmptyState } from '../../shared/ui/EmptyState'
import { mockSpecService } from '../../mocks/services/specService'
import { canAdvanceFromSpec } from '../../shared/lib/stageGates'
import { GateDiagnostics } from '../../shared/ui/GateDiagnostics'
import { EditableSpecPack } from '../../features/spec-output/EditableSpecPack'
import { specPackToMarkdown } from '../../shared/lib/markdown/exportArtifactToMarkdown'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'
import type { SpecPack } from '../../shared/types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SpecPage() {
  const navigate = useNavigate()
  const { activeProject, researchBrief, specPack, setSpecPack, updateSpecPack, setCurrentStage } = useProjectStore()
  const [generating, setGenerating] = useState(false)
  const [specCopied, setSpecCopied] = useState(false)

  const specGate = canAdvanceFromSpec(specPack)
  const projectType = activeProject?.projectType ?? 'application'

  async function handleCopySpecMarkdown() {
    if (!specPack) return
    const md = specPackToMarkdown(specPack, activeProject?.name ?? null)
    const result = await copyMarkdown(md, 'specification.md')
    if (result.method !== 'failed') {
      setSpecCopied(true)
      setTimeout(() => setSpecCopied(false), 2000)
    }
  }

  async function handleGenerate() {
    if (!researchBrief) return
    setGenerating(true)
    try {
      const spec = await mockSpecService.generateSpec(researchBrief, projectType)
      setSpecPack(spec)
      setCurrentStage('specification')
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveSpec(updated: SpecPack) {
    updateSpecPack(updated)
  }

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Спецификация" icon="📋" description="Сгенерируйте структурированную спецификацию продукта." />
        <EmptyState
          icon="📂"
          title="Проект не выбран"
          description="Сначала создайте проект, чтобы перейти к этапу спецификации."
          action={{ label: 'Создать проект', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Спецификация"
        icon="📋"
        description="Сгенерируйте структурированную спецификацию из исследовательского брифа. Определяет скоуп MVP, список фич, допущения и ограничения."
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {projectType === 'website' ? '🌐 Сайт' : '📱 Приложение'}
            </Badge>
            {specPack ? <Badge variant="success">Сгенерировано</Badge> : <Badge variant="muted">Не сгенерировано</Badge>}
          </div>
        }
      />

      {/* Blocked: no research brief */}
      {!researchBrief && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Требуется исследовательский бриф</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Сначала завершите этап исследования.{' '}
                <button onClick={() => navigate('/research')} className="underline">
                  Перейти к исследованию →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate panel — shown when brief exists but no spec yet */}
      {researchBrief && !specPack && (
        <Card>
          <CardHeader
            title="Генерация спецификации"
            description="Использует нормализованный Research Brief для создания структурированного spec pack."
            icon="⚙️"
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Что будет сгенерировано</p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Резюме продукта</li>
                <li>• Определение скоупа MVP</li>
                <li>• Список фич с приоритетами MoSCoW</li>
                <li>• Допущения и ограничения</li>
                <li>• Критерии приёмки</li>
              </ul>
            </div>
            <Button onClick={handleGenerate} loading={generating} fullWidth>
              {generating ? 'Генерация спецификации…' : 'Сгенерировать спецификацию'}
            </Button>
          </div>
        </Card>
      )}

      {/* Editable spec output */}
      {specPack && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {specPack.projectType === 'website'
                ? 'Эта спецификация адаптирована для Сайта — страницы, контент, SEO и конверсия.'
                : 'Эта спецификация адаптирована для Приложения — флоу, состояние и навигация.'}
            </p>
            <Button size="sm" variant="ghost" onClick={handleCopySpecMarkdown}>
              {specCopied ? '✓ Скопировано' : '↓ Скопировать как markdown'}
            </Button>
          </div>
          <EditableSpecPack spec={specPack} onSave={handleSaveSpec} />
        </>
      )}

      {/* Bottom action bar */}
      {specPack && (
        <div className="space-y-3">
          <GateDiagnostics reasons={specGate.canAdvance || !specGate.reason ? [] : [specGate.reason]} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleGenerate} loading={generating} disabled={!researchBrief}>
              Перегенерировать
            </Button>
            <Button
              onClick={() => navigate('/architecture')}
              disabled={!specGate.canAdvance}
              title={specGate.reason ?? undefined}
            >
              Перейти к архитектуре →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
