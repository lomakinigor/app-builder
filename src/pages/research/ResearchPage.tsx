import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import type { ResearchMode, ImportedResearchArtifact, ResearchBrief } from '../../shared/types'

type ResearchTab = 'run' | 'import'

const MODE_LABELS: Record<ResearchMode, { short: string; desc: string }> = {
  quick: { short: 'Quick', desc: 'Fast summary, broad coverage' },
  pro: { short: 'Pro', desc: 'Deeper search, more sources' },
  deep: { short: 'Deep', desc: 'Comprehensive report' },
  manual: { short: 'Manual', desc: 'Write the brief yourself' },
  imported: { short: 'Import', desc: 'Use existing research' },
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

  // Stage gates
  const ideaGate = canAdvanceFromIdea(ideaDraft)
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        icon="🔍"
        description="Run research with a provider, or import previously completed research. All inputs normalize into one Research Brief."
        badge={
          researchBrief ? (
            <Badge variant="success">Brief ready</Badge>
          ) : (
            <Badge variant="muted">No brief yet</Badge>
          )
        }
        action={
          researchGate.canAdvance ? (
            <Button size="sm" onClick={() => navigate('/spec')}>
              Continue to Spec →
            </Button>
          ) : undefined
        }
      />

      {/* Stage gate: need idea first */}
      {!ideaGate.canAdvance && (
        <GateBanner
          reason={ideaGate.reason ?? 'Complete the Idea stage first.'}
          action={() => navigate('/idea')}
          actionLabel="Go to Idea →"
        />
      )}

      {/* Two-path tab switcher */}
      <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700/60 dark:bg-zinc-900">
        <button
          onClick={() => setActiveTab('run')}
          className={tabCls(activeTab === 'run')}
        >
          🔬 Run New Research
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={tabCls(activeTab === 'import')}
        >
          📥 Import Existing Research
        </button>
      </div>

      {/* ── Run new research tab ──────────────────────────────────────────── */}
      {activeTab === 'run' && (
        <Card>
          <CardHeader
            title="Research provider"
            description="Select a provider and mode. In MVP, all providers route through the mock adapter."
            icon="🔬"
          />
          <div className="space-y-4">
            {/* Provider selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Provider
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
                    {provider.status === 'coming_soon' && <Badge variant="muted">Soon</Badge>}
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
                Mode
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
              {running ? 'Running research…' : 'Run Research'}
            </Button>

            {/* Run history */}
            {researchRuns.length > 0 && (
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="mb-2 text-xs font-medium text-zinc-500">Research runs</p>
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
                        {run.status}
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
            title="Import existing research"
            description="Paste previously completed research — notes, reports, exported AI chats, or structured summaries. The normalizer will extract key sections into the Research Brief format."
            icon="📥"
          />

          {/* What the normalizer looks for */}
          <div className="mb-4 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              What gets extracted
            </p>
            <div className="grid gap-x-6 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
              {[
                'Problem / challenge',
                'Target users / audience',
                'Value proposition',
                'Competitor notes',
                'Risks and challenges',
                'Opportunities',
                'Recommended MVP / scope',
                'Open questions',
              ].map((item) => (
                <span key={item}>• {item}</span>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Labeled headings are preferred. Unlabeled text is matched by keywords. You can always edit the result.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Title
              </label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="e.g. Competitor analysis notes, Perplexity deep research export"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Source label
              </label>
              <input
                type="text"
                value={importLabel}
                onChange={(e) => setImportLabel(e.target.value)}
                placeholder="e.g. Internal notes, Perplexity export, ChatGPT conversation"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Research content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={`Paste your research here — markdown, plain text, bullet points, any format works.

Tip: labeled sections like "## Problem" or "## Target Users" improve extraction accuracy.`}
                rows={10}
                className={`${inputCls()} resize-none font-mono text-xs`}
              />
              <p className="mt-1 text-xs text-zinc-400">
                {importContent.length} characters pasted
              </p>
            </div>

            <Button
              onClick={handleImportResearch}
              disabled={!importContent.trim() || !activeProject}
              loading={normalizing}
              fullWidth
            >
              {normalizing ? 'Normalizing…' : 'Import & Normalize to Research Brief'}
            </Button>
          </div>

          {/* Imported artifacts log */}
          {importedArtifacts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500">Previously imported</p>
              {importedArtifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{artifact.title}</span>
                    <span className="ml-2 text-zinc-400">{artifact.sourceLabel}</span>
                  </div>
                  <Badge variant="info">imported</Badge>
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
            All research → one Research Brief
          </p>
          <p className="mt-0.5 text-sm text-violet-700/80 dark:text-violet-400">
            Whether you run in-app research or import from external sources, the output is always the same
            Research Brief structure. Spec, Architecture, and Prompts consume the brief — not the raw source.
          </p>
        </div>
      </div>

      {/* Research brief — editable */}
      {researchBrief ? (
        <Card>
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
                Continue to Spec →
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button disabled title={researchGate.reason ?? undefined}>
                  Continue to Spec →
                </Button>
                <p className="text-sm text-zinc-400">{researchGate.reason}</p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="📄"
          title="No research brief yet"
          description="Run new research or import existing research above. The result will appear here for review and editing."
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
