import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { useProjectRegistry, selectSelectedProject } from '../../app/store/projectRegistryStore'
import { getSharingApi } from '../../shared/api'
import type { SharingAuditEvent, ProjectCollaborator } from '../../shared/api'
import { isSharingEnabled } from '../../shared/config/features'
import { useCanManageSharing } from '../../app/store/viewingModeStore'
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

type InviteStatus = 'idle' | 'sending' | 'sent' | 'error'

function formatAuditEvent(event: SharingAuditEvent): string {
  const date = new Date(event.timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  switch (event.type) {
    case 'share_link_created':
      return `Ссылка создана — ${date}`
    case 'share_invite_sent':
      return `Приглашение отправлено на ${event.targetEmail ?? '—'} — ${date}`
    case 'share_link_opened':
      return `Ссылку открыл ${event.actorLabel ?? 'viewer'} — ${date}`
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [currentShareId, setCurrentShareId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer')
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('idle')
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null)
  const [auditEvents, setAuditEvents] = useState<SharingAuditEvent[] | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([])
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false)
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null)
  const [collaboratorActionError, setCollaboratorActionError] = useState<string | null>(null)
  const canManageSharing = useCanManageSharing()

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
    completedReviewTaskIds: [],
  })
  const activePhase = cyclePhases.find((p) => p.status === 'in_progress') ?? cyclePhases.find((p) => p.status === 'not_started')
  const nextAction = computeNextAction(
    cyclePhases,
    activeProject?.id === selectedProject?.id ? promptIterations : [],
  )
  const recommendedPhaseId = getRecommendedPhaseId(nextAction)

  useEffect(() => {
    if (!isSharingEnabled() || !canManageSharing || !selectedProject) return
    setAuditLoading(true)
    setAuditError(null)
    getSharingApi()
      .getAuditTrail(selectedProject.id)
      .then((events) => { setAuditEvents(events) })
      .catch((err) => {
        setAuditError(err instanceof Error ? err.message : 'Не удалось загрузить историю доступа')
      })
      .finally(() => { setAuditLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, canManageSharing])

  function loadCollaborators() {
    if (!isSharingEnabled() || !canManageSharing || !selectedProject) return
    setCollaboratorsLoading(true)
    setCollaboratorsError(null)
    getSharingApi()
      .listCollaborators(selectedProject.id)
      .then((list) => { setCollaborators(list) })
      .catch((err) => {
        setCollaboratorsError(err instanceof Error ? err.message : 'Не удалось загрузить участников')
      })
      .finally(() => { setCollaboratorsLoading(false) })
  }

  useEffect(() => {
    loadCollaborators()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, canManageSharing])

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

  async function handleShareProject() {
    if (!selectedProject) return
    setShareError(null)
    try {
      const { shareId, shareUrl } = await getSharingApi().generateShareToken(selectedProject.id)
      const fullUrl = `${window.location.origin}${shareUrl}`
      await navigator.clipboard.writeText(fullUrl).catch(() => {})
      setCurrentShareId(shareId)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Не удалось создать ссылку общего доступа')
    }
  }

  async function handleInviteByEmail() {
    if (!currentShareId || !inviteEmail.trim()) return
    setInviteStatus('sending')
    setInviteErrorMsg(null)
    try {
      await getSharingApi().inviteByEmail(currentShareId, inviteEmail.trim(), inviteRole)
      setInviteStatus('sent')
      setInviteEmail('')
      loadCollaborators()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось отправить приглашение'
      setInviteErrorMsg(msg)
      setInviteStatus('error')
    }
  }

  async function handleChangeRole(collaboratorId: string, role: 'viewer' | 'editor') {
    setCollaboratorActionError(null)
    try {
      const updated = await getSharingApi().updateCollaboratorRole(collaboratorId, role)
      setCollaborators((prev) => prev.map((c) => (c.id === collaboratorId ? updated : c)))
    } catch (err) {
      setCollaboratorActionError(err instanceof Error ? err.message : 'Не удалось изменить роль')
    }
  }

  async function handleRevoke(collaboratorId: string) {
    setCollaboratorActionError(null)
    try {
      await getSharingApi().revokeCollaborator(collaboratorId)
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
    } catch (err) {
      setCollaboratorActionError(err instanceof Error ? err.message : 'Не удалось отозвать доступ')
    }
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
            {isSharingEnabled() && canManageSharing && (
              <Button size="sm" variant="ghost" onClick={handleShareProject}>
                {shareCopied ? '✓ Ссылка скопирована' : '🔗 Поделиться'}
              </Button>
            )}
          </div>
          {shareError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400" data-testid="share-error">
              {shareError}
            </p>
          )}

          {/* Email invite panel — shown after share link is generated; owner-only (T-405/T-406) */}
          {isSharingEnabled() && canManageSharing && currentShareId && (
            <div
              className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/60 dark:bg-zinc-800/40"
              data-testid="invite-panel"
            >
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Пригласить по email
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value)
                    if (inviteStatus !== 'idle') {
                      setInviteStatus('idle')
                      setInviteErrorMsg(null)
                    }
                  }}
                  placeholder="user@example.com"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  aria-label="Email для приглашения"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                  aria-label="Роль приглашённого"
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="viewer">Просмотр</option>
                  <option value="editor">Редактор</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleInviteByEmail}
                  disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                >
                  {inviteStatus === 'sending' ? '…' : 'Пригласить'}
                </Button>
              </div>
              {inviteStatus === 'sent' && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Приглашение отправлено
                </p>
              )}
              {inviteStatus === 'error' && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {inviteErrorMsg ?? 'Ошибка отправки'}
                </p>
              )}
            </div>
          )}

          {/* Collaborator management panel — T-406 — owner-only */}
          {isSharingEnabled() && canManageSharing && (
            <div
              className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700/60 dark:bg-zinc-800/30"
              data-testid="collaborator-panel"
            >
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Участники
              </p>
              {collaboratorsLoading && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Загрузка…</p>
              )}
              {collaboratorsError && (
                <p className="text-xs text-red-600 dark:text-red-400">{collaboratorsError}</p>
              )}
              {!collaboratorsLoading && !collaboratorsError && collaborators.length === 0 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Пока нет приглашённых участников
                </p>
              )}
              {!collaboratorsLoading && collaborators.length > 0 && (
                <ul className="space-y-2">
                  {collaborators.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                      data-testid={`collaborator-row-${c.id}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.email}</span>
                      <select
                        value={c.role}
                        onChange={(e) => handleChangeRole(c.id, e.target.value as 'viewer' | 'editor')}
                        aria-label={`Роль ${c.email}`}
                        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-violet-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                      </select>
                      <span className="text-zinc-400 dark:text-zinc-500">{c.status}</span>
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="ml-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label={`Отозвать ${c.email}`}
                      >
                        Отозвать
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {collaboratorActionError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" data-testid="collaborator-action-error">
                  {collaboratorActionError}
                </p>
              )}
            </div>
          )}

          {/* Sharing audit trail — T-404 — owner-only via canManageSharing (T-405) */}
          {isSharingEnabled() && canManageSharing && (
            <div
              className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700/60 dark:bg-zinc-800/30"
              data-testid="audit-panel"
            >
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                История доступа
              </p>
              {auditLoading && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Загрузка…</p>
              )}
              {auditError && (
                <p className="text-xs text-red-600 dark:text-red-400">{auditError}</p>
              )}
              {!auditLoading && !auditError && auditEvents !== null && auditEvents.length === 0 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Пока нет действий по доступу</p>
              )}
              {!auditLoading && auditEvents && auditEvents.length > 0 && (
                <ul className="space-y-1">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                      {formatAuditEvent(event)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
