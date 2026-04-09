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
import { EditableSpecPack } from '../../features/spec-output/EditableSpecPack'
import { specPackToMarkdown } from '../../shared/lib/markdown/exportArtifactToMarkdown'
import { copyMarkdown } from '../../shared/lib/clipboard/copyMarkdown'
import type { SpecPack } from '../../shared/types'

// ─── Gate banner ──────────────────────────────────────────────────────────────

function GateBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
      <span className="mt-0.5 text-lg">⚠️</span>
      <p className="text-sm text-amber-800 dark:text-amber-300">{reason}</p>
    </div>
  )
}

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
        <PageHeader title="Specification" icon="📋" description="Generate a structured product spec." />
        <EmptyState
          icon="📂"
          title="No project selected"
          description="Create a project first to reach the specification stage."
          action={{ label: 'Create project', onClick: () => navigate('/project/new') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specification"
        icon="📋"
        description="Generate a structured product spec from your research brief. Defines MVP scope, feature list, assumptions, and constraints."
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {projectType === 'website' ? '🌐 Website' : '📱 Application'}
            </Badge>
            {specPack ? <Badge variant="success">Generated</Badge> : <Badge variant="muted">Not generated</Badge>}
          </div>
        }
      />

      {/* Blocked: no research brief */}
      {!researchBrief && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Research brief required</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Complete the Research stage first.{' '}
                <button onClick={() => navigate('/research')} className="underline">
                  Go to Research →
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
            title="Generate specification"
            description="Uses your normalized Research Brief to produce a structured spec pack."
            icon="⚙️"
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">What will be generated</p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Product summary</li>
                <li>• MVP scope definition</li>
                <li>• Feature list with MoSCoW priorities</li>
                <li>• Assumptions and constraints</li>
                <li>• Acceptance notes</li>
              </ul>
            </div>
            <Button onClick={handleGenerate} loading={generating} fullWidth>
              {generating ? 'Generating spec…' : 'Generate Specification'}
            </Button>
          </div>
        </Card>
      )}

      {/* Editable spec output */}
      {specPack && (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={handleCopySpecMarkdown}>
              {specCopied ? '✓ Copied' : '↓ Copy as markdown'}
            </Button>
          </div>
          <EditableSpecPack spec={specPack} onSave={handleSaveSpec} />
        </>
      )}

      {/* Bottom action bar */}
      {specPack && (
        <div className="space-y-3">
          {!specGate.canAdvance && specGate.reason && (
            <GateBanner reason={specGate.reason} />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleGenerate} loading={generating} disabled={!researchBrief}>
              Regenerate
            </Button>
            <Button
              onClick={() => navigate('/architecture')}
              disabled={!specGate.canAdvance}
              title={specGate.reason ?? undefined}
            >
              Continue to Architecture →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
